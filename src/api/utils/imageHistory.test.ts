import { describe, expect, test } from 'bun:test';
import { ImageHistoryTracker } from './imageHistory';

describe('ImageHistoryTracker', () => {
  test('records and reports shown images', () => {
    const t = new ImageHistoryTracker(10);
    expect(t.hasBeenShown('a')).toBe(false);
    t.addImage('a');
    expect(t.hasBeenShown('a')).toBe(true);
    expect(t.getHistorySize()).toBe(1);
  });

  test('duplicate adds do not grow the set', () => {
    const t = new ImageHistoryTracker(10);
    t.addImage('a');
    t.addImage('a');
    t.addImage('a');
    expect(t.getHistorySize()).toBe(1);
  });

  test('evicts the oldest entry once maxSize is exceeded', () => {
    const t = new ImageHistoryTracker(3);
    t.addImage('a');
    t.addImage('b');
    t.addImage('c');
    expect(t.getHistorySize()).toBe(3);

    t.addImage('d');
    expect(t.getHistorySize()).toBe(3);
    expect(t.hasBeenShown('a')).toBe(false);
    expect(t.hasBeenShown('b')).toBe(true);
    expect(t.hasBeenShown('c')).toBe(true);
    expect(t.hasBeenShown('d')).toBe(true);
  });

  test('eviction continues in FIFO order past maxSize', () => {
    const t = new ImageHistoryTracker(2);
    t.addImage('a');
    t.addImage('b');
    t.addImage('c'); // evicts a
    t.addImage('d'); // evicts b
    expect(t.hasBeenShown('a')).toBe(false);
    expect(t.hasBeenShown('b')).toBe(false);
    expect(t.hasBeenShown('c')).toBe(true);
    expect(t.hasBeenShown('d')).toBe(true);
    expect(t.getHistorySize()).toBe(2);
  });

  test('clear empties the history', () => {
    const t = new ImageHistoryTracker(10);
    t.addImage('a');
    t.addImage('b');
    t.clear();
    expect(t.getHistorySize()).toBe(0);
    expect(t.hasBeenShown('a')).toBe(false);
  });
});
