import { fetchMemoryImages, fetchAssetInfo } from '../services/immich';
import { isExcluded } from './excludedImages';
import { PHOTO_START_YEAR } from '../config/constants';
import type { AssetResponseDto } from '../../types';
import type { ImageInfo } from '../services/slides';

interface MemoryCard {
  asset: AssetResponseDto;
  yearsAgo: number;
}

export class MemoryDeck {
  private cards: MemoryCard[] = [];
  private cursor = 0;
  private initialized = false;
  private shuffleCount = 0;
  private totalShown = 0;
  private shownByYear: Record<number, number> = {};
  private initializedDate: string | null = null;

  private static todayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }

  async init(): Promise<void> {
    this.cards = [];
    this.cursor = 0;
    this.initialized = false;
    this.shuffleCount = 0;
    this.totalShown = 0;
    this.shownByYear = {};

    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = PHOTO_START_YEAR;

    const allCards: MemoryCard[] = [];
    const perYear: string[] = [];

    for (let year = startYear; year < currentYear; year++) {
      const yearsAgo = currentYear - year;
      const dayStart = new Date(year, now.getMonth(), now.getDate());
      const dayEnd = new Date(year, now.getMonth(), now.getDate() + 1);

      const assets = await fetchMemoryImages(dayStart.toISOString(), dayEnd.toISOString());

      for (const asset of assets) {
        allCards.push({ asset, yearsAgo });
      }

      if (assets.length > 0) {
        perYear.push(`${year}: ${assets.length}`);
      }
      this.shownByYear[yearsAgo] = 0;
    }

    this.cards = allCards;
    this.shuffle();
    this.initialized = true;
    this.initializedDate = MemoryDeck.todayKey();

    console.log(`[memory] 🃏 Initialized with ${this.cards.length} images (${perYear.join(', ')})`);
  }

  isReady(): boolean {
    return this.initialized && this.cards.length > 0;
  }

  /**
   * True once a successful init has happened on a previous calendar day. The
   * caller (slides service) routes the re-init through its single-flight guard
   * rather than re-initializing inline here, so a midnight Immich outage can't
   * reject concurrent deal()s.
   */
  needsReinit(): boolean {
    return this.initializedDate !== null && this.initializedDate !== MemoryDeck.todayKey();
  }

  async deal(count: number): Promise<ImageInfo[]> {
    if (!this.isReady()) return [];

    const dealt: ImageInfo[] = [];

    // Cap scanning at one full pass so an all-excluded deck can't spin forever;
    // excluded cards are skipped (not dealt) but still advance the cursor.
    let scanned = 0;
    while (dealt.length < count && scanned < this.cards.length) {
      if (this.cursor >= this.cards.length) {
        this.shuffle();
        console.log(
          `[memory] 🔀 Reshuffled deck (cycle #${this.shuffleCount}), total shown so far: ${this.totalShown}`,
        );
      }

      const card = this.cards[this.cursor++];
      scanned++;

      if (isExcluded(card.asset.id)) continue;

      const info = await this.cardToImageInfo(card);
      dealt.push(info);

      this.totalShown++;
      this.shownByYear[card.yearsAgo] = (this.shownByYear[card.yearsAgo] || 0) + 1;
    }

    return dealt;
  }

  getStats(): { total: number; shown: number; remaining: number; shuffles: number; byYear: Record<number, number> } {
    return {
      total: this.cards.length,
      shown: this.totalShown,
      remaining: this.cards.length - this.cursor,
      shuffles: this.shuffleCount,
      byYear: { ...this.shownByYear },
    };
  }

  private async cardToImageInfo(card: MemoryCard): Promise<ImageInfo> {
    const info = await fetchAssetInfo(card.asset.id);
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
      yearsAgo: card.yearsAgo,
    };
  }

  private shuffle(): void {
    this.cursor = 0;
    this.shuffleCount++;
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
}
