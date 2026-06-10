import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import type { AssetResponseDto } from '../../types';

let randomAssets: AssetResponseDto[] = [];

const asset = (id: string) => ({ id }) as AssetResponseDto;
const assets = (ids: string[]) => ids.map(asset);

beforeAll(() => {
  mock.module('./immich', () => ({
    fetchRandomImages: async () => randomAssets,
    fetchMemoryImages: async () => [],
    fetchAssetInfo: async (id: string) => ({
      id,
      exifInfo: {},
      ownerId: 'owner',
      owner: { name: 'Owner', avatarColor: 'gray' },
      fileCreatedAt: '2024-01-01T00:00:00.000Z',
    }),
  }));
});

afterAll(() => {
  mock.restore();
});

describe('fetchGeneralImages history-clear fallback', () => {
  test('clears history and refetches when only already-shown ids come back', async () => {
    const { fetchGeneralImages } = await import('./slides');

    randomAssets = assets(['a', 'b', 'c', 'd', 'e']);
    const first = await fetchGeneralImages(5);
    expect(first.length).toBe(5);

    // Second call: Immich keeps returning the SAME (now already-shown) ids, so
    // every fetch is filtered to empty. Without the history-clear fallback this
    // would return 0; the fallback clears history and refetches, yielding 5.
    const second = await fetchGeneralImages(5);
    expect(second.length).toBe(5);
    expect(second.map((i) => i.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
