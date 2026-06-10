import { describe, expect, test } from 'bun:test';
import { getFormattedLocation } from './geocoding';

const loc = (partial: Record<string, unknown>) => partial as never;

describe('getFormattedLocation', () => {
  test('amenity branch: amenity, locality, country', () => {
    expect(
      getFormattedLocation(loc({ address: { amenity: 'Eiffel Tower', city: 'Paris', country: 'France' } })),
    ).toBe('Eiffel Tower, Paris, France');
  });

  test('amenity branch prefers village over town/city', () => {
    expect(
      getFormattedLocation(
        loc({ address: { amenity: 'Cafe', village: 'Smallville', town: 'Townsville', city: 'Big City', country: 'X' } }),
      ),
    ).toBe('Cafe, Smallville, X');
  });

  test('tourism branch: tourism, country', () => {
    expect(getFormattedLocation(loc({ address: { tourism: 'Museum', country: 'Italy' } }))).toBe('Museum, Italy');
  });

  test('locality branch: locality, country', () => {
    expect(getFormattedLocation(loc({ address: { locality: 'Remote Spot', country: 'Canada' } }))).toBe(
      'Remote Spot, Canada',
    );
  });

  test('road fallback: road, neighbourhood, town, country', () => {
    expect(
      getFormattedLocation(
        loc({ address: { road: 'Main St', neighbourhood: 'Old Town', town: 'Springfield', country: 'USA' } }),
      ),
    ).toBe('Main St, Old Town, Springfield, USA');
  });

  test('missing address falls back to display_name', () => {
    expect(getFormattedLocation(loc({ display_name: 'Somewhere, Earth' }))).toBe('Somewhere, Earth');
  });

  test('missing address and no display_name yields empty string', () => {
    expect(getFormattedLocation(loc({}))).toBe('');
  });
});
