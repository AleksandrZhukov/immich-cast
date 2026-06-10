import { fetchAssetInfo, fetchRandomImages } from './immich';
import { type AssetResponseDto, ExifOrientation } from '../../types';
import { ImageHistoryTracker } from '../utils/imageHistory';
import { MemoryDeck } from '../utils/memoryDeck';
import { recordSlideServed } from '../stats/recorder';

export interface ImageInfo {
  id: string;
  width: number;
  height: number;
  ownerId: string;
  ownerName: string;
  ownerAvatarColor: string;
  fileCreatedAt: string;
  latitude: number | null;
  longitude: number | null;
  orientation?: string | null;
  yearsAgo?: number;
}

const enum SlideType {
  SINGLE = 'single',
  DOUBLE = 'double',
}

export type SingleSlide = {
  type: SlideType.SINGLE;
  id: string;
  isPortrait: boolean;
  items: [ImageInfo];
};
export type DoubleSlide = {
  type: SlideType.DOUBLE;
  id: string;
  items: [ImageInfo, ImageInfo];
};

export type Slide = SingleSlide | DoubleSlide;

const imageHistory = new ImageHistoryTracker(10000);
const memoryDeck = new MemoryDeck();

let memoryDeckInitPromise: Promise<void> | null = null;
let memoryDeckInitInFlight = false;
let slideFetchCount = 0;

export function getMemoryDeckStats() {
  return memoryDeck.getStats();
}

function ensureMemoryDeck(): Promise<void> {
  // (Re)initialize when there's no deck yet, or when a new calendar day has
  // rolled over. The day-rollover re-init goes through this same single-flight
  // promise (guarded by memoryDeckInitInFlight) so concurrent /api/slides
  // requests at midnight share one init instead of double-initializing — and
  // if Immich is down, init() resolves (the .catch swallows) and deal() simply
  // returns [], degrading gracefully rather than 500-ing the route.
  const needsInit = !memoryDeckInitPromise || (!memoryDeckInitInFlight && memoryDeck.needsReinit());

  if (needsInit) {
    if (memoryDeckInitPromise && memoryDeck.needsReinit()) {
      console.log('[memory] New day detected, reinitializing memory deck');
    }
    memoryDeckInitInFlight = true;
    memoryDeckInitPromise = memoryDeck
      .init()
      .catch((error) => {
        console.error('[memory] ❌ Failed to initialize:', error);
        // Leave the deck re-initializable on the next request.
        memoryDeckInitPromise = null;
      })
      .finally(() => {
        memoryDeckInitInFlight = false;
      });
  }

  return memoryDeckInitPromise!;
}

export const isPortrait = (info: ImageInfo): boolean => {
  const value = Number(info.orientation ?? ExifOrientation.Horizontal);

  switch (value) {
    case ExifOrientation.Rotate90CW:
    case ExifOrientation.Rotate270CW:
    case ExifOrientation.MirrorHorizontalRotate90CW:
    case ExifOrientation.MirrorHorizontalRotate270CW:
      return true;
    case ExifOrientation.Horizontal:
    case ExifOrientation.MirrorHorizontal:
    case ExifOrientation.Rotate180:
    case ExifOrientation.MirrorVertical:
    default:
      return info.height >= info.width;
  }
};
let pendingPortrait: ImageInfo | null = null;

export async function fetchGeneralImages(count: number): Promise<ImageInfo[]> {
  let assets: AssetResponseDto[] = [];
  let attempts = 0;
  const maxAttempts = 5;

  while (assets.length < count && attempts < maxAttempts) {
    const fetchedAssets = await fetchRandomImages();
    const newAssets = fetchedAssets.filter((asset) => !imageHistory.hasBeenShown(asset.id));
    assets = assets.concat(newAssets);
    attempts++;
  }

  if (assets.length < count) {
    console.warn(`[slides] ⚠️ History full (${imageHistory.getHistorySize()}), clearing and retrying`);
    imageHistory.clear();
    const additionalAssets = await fetchRandomImages();
    assets = assets.concat(additionalAssets);
  }

  assets.forEach((asset) => imageHistory.addImage(asset.id));

  return Promise.all(
    assets.slice(0, count).map(async (asset): Promise<ImageInfo> => {
      const info = await fetchAssetInfo(asset.id);
      const exif = info?.exifInfo || {};
      return {
        id: info.id,
        width: exif.exifImageWidth || 0,
        height: exif.exifImageHeight || 0,
        ownerId: info.ownerId,
        ownerName: info.owner?.name || 'Unknown',
        ownerAvatarColor: info.owner?.avatarColor || 'gray',
        fileCreatedAt: info.fileCreatedAt,
        latitude: exif.latitude || null,
        longitude: exif.longitude || null,
        orientation: exif.orientation,
      };
    }),
  );
}

export function interleave(general: ImageInfo[], memories: ImageInfo[]): ImageInfo[] {
  if (memories.length === 0) return general;
  if (general.length === 0) return memories;

  const result: ImageInfo[] = [];
  const spacing = Math.floor(general.length / (memories.length + 1));

  let memIdx = 0;
  for (let i = 0; i < general.length; i++) {
    result.push(general[i]);
    if (memIdx < memories.length && (i + 1) % Math.max(spacing, 2) === 0) {
      result.push(memories[memIdx++]);
    }
  }

  while (memIdx < memories.length) {
    result.push(memories[memIdx++]);
  }

  return result;
}

export async function fetchSlides(): Promise<Slide[]> {
  await ensureMemoryDeck();

  const memoryCount = 1;
  const generalCount = 5;

  const [memoryImages, generalImages] = await Promise.all([
    memoryDeck.deal(memoryCount),
    fetchGeneralImages(generalCount),
  ]);

  const infos = interleave(generalImages, memoryImages);

  for (const info of infos) {
    recordSlideServed({
      imageId: info.id,
      ownerId: info.ownerId,
      ownerName: info.ownerName,
      capturedAt: info.fileCreatedAt || null,
      isMemory: info.yearsAgo !== undefined,
      yearsAgo: info.yearsAgo,
    });
  }

  const slides: Slide[] = [];

  for (const info of infos) {
    if (isPortrait(info)) {
      if (pendingPortrait) {
        slides.push({
          type: SlideType.DOUBLE,
          id: `${pendingPortrait.id}_${info.id}`,
          items: [pendingPortrait, info],
        });
        pendingPortrait = null;
      } else {
        pendingPortrait = info;
      }
    } else {
      slides.push({
        type: SlideType.SINGLE,
        id: info.id,
        isPortrait: false,
        items: [info],
      });
    }
  }

  slideFetchCount++;
  const memStats = memoryDeck.getStats();
  const memYears = Object.entries(memStats.byYear)
    .filter(([, count]) => count > 0)
    .map(([y, count]) => `${y}y:${count}`)
    .join(' ');

  console.log(
    `[slides] 🖼️ #${slideFetchCount} — ${slides.length} slides (${memoryImages.length}m/${generalImages.length}g) | history: ${imageHistory.getHistorySize()} | memory: ${memStats.shown}/${memStats.total} shown, ${memStats.remaining} left, ${memStats.shuffles} shuffles | ${memYears}`,
  );

  return slides;
}
