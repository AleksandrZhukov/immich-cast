import { fetchMemoryImages, fetchAssetInfo } from '../services/immich';
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

  async init(): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = 2017;

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

    console.log(`[memory] 🃏 Initialized with ${this.cards.length} images (${perYear.join(', ')})`);
  }

  isReady(): boolean {
    return this.initialized && this.cards.length > 0;
  }

  async deal(count: number): Promise<ImageInfo[]> {
    if (!this.isReady()) return [];

    const dealt: ImageInfo[] = [];

    for (let i = 0; i < count; i++) {
      if (this.cursor >= this.cards.length) {
        this.shuffle();
        console.log(
          `[memory] 🔀 Reshuffled deck (cycle #${this.shuffleCount}), total shown so far: ${this.totalShown}`,
        );
      }

      const card = this.cards[this.cursor++];
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
