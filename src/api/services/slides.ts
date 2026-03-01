import { fetchAssetInfo, fetchRandomImages } from './immich';
import { type AssetResponseDto, ExifOrientation } from '../../types';
import { ImageHistoryTracker } from '../utils/imageHistory';

export interface ImageInfo {
  id: string;
  width: number;
  height: number;
  ownerName: string;
  ownerAvatarColor: string;
  fileCreatedAt: string;
  latitude: number | null;
  longitude: number | null;
  orientation?: string | null;
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

const imageHistory = new ImageHistoryTracker(1000);

export const isPortrait = (info: ImageInfo): boolean => {
  const value = Number(info.orientation) ?? ExifOrientation.Horizontal;

  console.log('isPortrait', info.id, value, ExifOrientation[value]);

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

export async function fetchSlides(): Promise<Slide[]> {
  let assets: AssetResponseDto[] = [];
  let attempts = 0;
  const maxAttempts = 5;

  while (assets.length < 6 && attempts < maxAttempts) {
    const fetchedAssets = await fetchRandomImages();

    const newAssets = fetchedAssets.filter((asset) => !imageHistory.hasBeenShown(asset.id));
    assets = assets.concat(newAssets);

    attempts++;

    if (assets.length < 6) {
      console.log(`Attempt ${attempts}: Have ${assets.length} new images, need 6, fetching more...`);
    }
  }

  if (assets.length < 6) {
    console.warn(`Could not find 5 new images after maximum attempts, using ${assets.length} images`);
    const additionalAssets = await fetchRandomImages();
    assets = assets.concat(additionalAssets);
  }

  assets.forEach((asset) => imageHistory.addImage(asset.id));

  const infos: ImageInfo[] = await Promise.all(
    assets.map(async (asset): Promise<ImageInfo> => {
      const info = await fetchAssetInfo(asset.id);
      const exif = info?.exifInfo || {};
      return {
        id: info.id,
        width: exif.exifImageWidth || 0,
        height: exif.exifImageHeight || 0,
        ownerName: info.owner?.name || 'Unknown',
        ownerAvatarColor: info.owner?.avatarColor || 'gray',
        fileCreatedAt: info.fileCreatedAt,
        latitude: exif.latitude || null,
        longitude: exif.longitude || null,
        orientation: exif.orientation,
      };
    }),
  );

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

  console.log(`Generated ${slides.length} slides, history size: ${imageHistory.getHistorySize()}`);

  return slides;
}
