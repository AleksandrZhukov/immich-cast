import { describe, expect, test } from 'bun:test';
import { getFormatedLocation } from './geocoding';

const loc = (partial: Record<string, unknown>) => partial as never;

describe('getFormatedLocation', () => {
  test('amenity branch: amenity, locality, country', () => {
    expect(
      getFormatedLocation(loc({ address: { amenity: 'Eiffel Tower', city: 'Paris', country: 'France' } })),
    ).toBe('Eiffel Tower, Paris, France');
  });

  test('amenity branch prefers village over town/city', () => {
    expect(
      getFormatedLocation(
        loc({ address: { amenity: 'Cafe', village: 'Smallville', town: 'Townsville', city: 'Big City', country: 'X' } }),
      ),
    ).toBe('Cafe, Smallville, X');
  });

  test('tourism branch: tourism, country', () => {
    expect(getFormatedLocation(loc({ address: { tourism: 'Museum', country: 'Italy' } }))).toBe('Museum, Italy');
  });

  test('locality branch: locality, country', () => {
    expect(getFormatedLocation(loc({ address: { locality: 'Remote Spot', country: 'Canada' } }))).toBe(
      'Remote Spot, Canada',
    );
  });

  test('road fallback: road, neighbourhood, town, country', () => {
    expect(
      getFormatedLocation(
        loc({ address: { road: 'Main St', neighbourhood: 'Old Town', town: 'Springfield', country: 'USA' } }),
      ),
    ).toBe('Main St, Old Town, Springfield, USA');
  });

  test('missing address falls back to display_name', () => {
    expect(getFormatedLocation(loc({ display_name: 'Somewhere, Earth' }))).toBe('Somewhere, Earth');
  });

  test('missing address and no display_name yields empty string', () => {
    expect(getFormatedLocation(loc({}))).toBe('');
  });
});
