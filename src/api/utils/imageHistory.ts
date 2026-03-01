export class ImageHistoryTracker {
  private readonly maxSize: number;
  private shownImages: Set<string>;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.shownImages = new Set();
  }

  addImage(imageId: string): void {
    // If already in history, don't add again
    if (this.shownImages.has(imageId)) {
      return;
    }

    // Add to set
    this.shownImages.add(imageId);

    // If we exceed max size, remove the oldest (first) item
    if (this.shownImages.size > this.maxSize) {
      const [first] = this.shownImages;
      this.shownImages.delete(first);
    }
  }

  hasBeenShown(imageId: string): boolean {
    return this.shownImages.has(imageId);
  }

  clear(): void {
    this.shownImages.clear();
  }

  getHistorySize(): number {
    return this.shownImages.size;
  }
}
