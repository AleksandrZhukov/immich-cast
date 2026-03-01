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

  async init(): Promise<void> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = 2017;

    const allCards: MemoryCard[] = [];

    for (let year = startYear; year < currentYear; year++) {
      const yearsAgo = currentYear - year;
      const center = new Date(year, now.getMonth(), now.getDate());
      const after = new Date(center);
      after.setDate(after.getDate() - 7);
      const before = new Date(center);
      before.setDate(before.getDate() + 7);

      const assets = await fetchMemoryImages(after.toISOString(), before.toISOString());

      for (const asset of assets) {
        allCards.push({ asset, yearsAgo });
      }

      console.log(`Memory deck: ${year} (${yearsAgo}y ago) — ${assets.length} images`);
    }

    this.cards = allCards;
    this.shuffle();
    this.initialized = true;

    console.log(`Memory deck initialized: ${this.cards.length} total images`);
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
      }

      const card = this.cards[this.cursor++];
      const info = await this.cardToImageInfo(card);
      dealt.push(info);
    }

    return dealt;
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
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
}
