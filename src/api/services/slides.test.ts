import { describe, expect, test } from 'bun:test';
import { isPortrait, interleave, type ImageInfo } from './slides';
import { ExifOrientation } from '../../types';

function img(overrides: Partial<ImageInfo> = {}): ImageInfo {
  return {
    id: overrides.id ?? 'id',
    width: overrides.width ?? 100,
    height: overrides.height ?? 100,
    ownerId: 'owner',
    ownerName: 'Owner',
    ownerAvatarColor: 'gray',
    fileCreatedAt: '2024-01-01T00:00:00.000Z',
    latitude: null,
    longitude: null,
    orientation: overrides.orientation,
    yearsAgo: overrides.yearsAgo,
  };
}

describe('isPortrait', () => {
  // Orientations 5–8 are rotated 90/270°, so they are always portrait
  // regardless of the stored pixel dimensions.
  test.each([
    [ExifOrientation.MirrorHorizontalRotate270CW, '5'],
    [ExifOrientation.Rotate90CW, '6'],
    [ExifOrientation.MirrorHorizontalRotate90CW, '7'],
    [ExifOrientation.Rotate270CW, '8'],
  ])('rotated orientation %i is always portrait', (_o, value) => {
    // Landscape dimensions but rotated → portrait.
    expect(isPortrait(img({ orientation: value, width: 200, height: 100 }))).toBe(true);
  });

  // Orientations 1–4 keep pixel dimensions, so portrait is decided by h >= w.
  test.each(['1', '2', '3', '4'])('unrotated orientation %s falls back to dimensions', (value) => {
    expect(isPortrait(img({ orientation: value, width: 100, height: 200 }))).toBe(true);
    expect(isPortrait(img({ orientation: value, width: 200, height: 100 }))).toBe(false);
  });

  test('square (h === w) counts as portrait', () => {
    expect(isPortrait(img({ orientation: '1', width: 100, height: 100 }))).toBe(true);
  });

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['non-numeric string', 'abc'],
  ])('missing/invalid orientation (%s) falls back to dimensions', (_label, value) => {
    expect(isPortrait(img({ orientation: value as never, width: 100, height: 200 }))).toBe(true);
    expect(isPortrait(img({ orientation: value as never, width: 200, height: 100 }))).toBe(false);
  });
});

describe('interleave', () => {
  const g = (n: number) => Array.from({ length: n }, (_, i) => img({ id: `g${i}` }));
  const m = (n: number) => Array.from({ length: n }, (_, i) => img({ id: `m${i}`, yearsAgo: i + 1 }));

  test('empty memories returns general unchanged', () => {
    const general = g(3);
    expect(interleave(general, [])).toBe(general);
  });

  test('empty general returns memories unchanged', () => {
    const memories = m(3);
    expect(interleave([], memories)).toBe(memories);
  });

  test('every input appears exactly once', () => {
    const general = g(5);
    const memories = m(2);
    const out = interleave(general, memories);
    const ids = out.map((x) => x.id).sort();
    expect(ids).toEqual([...general, ...memories].map((x) => x.id).sort());
    expect(out.length).toBe(general.length + memories.length);
  });

  test('more memories than general: all are appended, none dropped', () => {
    const general = g(2);
    const memories = m(5);
    const out = interleave(general, memories);
    expect(out.length).toBe(7);
    for (const item of [...general, ...memories]) {
      expect(out.filter((x) => x.id === item.id).length).toBe(1);
    }
  });
});
