import { appendFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

type SlideServedEvent = {
  type: 'slide_served';
  ts: string;
  imageId: string;
  ownerId: string;
  ownerName: string;
  capturedAt: string | null;
  isMemory: boolean;
  yearsAgo?: number;
};

type CastEvent = {
  type: 'cast_event';
  ts: string;
  kind: 'idle_relaunch' | 'outside_hours_stop' | 'reconnect' | 'connected';
  detail?: string;
};

export type Event = SlideServedEvent | CastEvent;

let ensureDirPromise: Promise<void> | null = null;
async function ensureDir(): Promise<void> {
  if (!ensureDirPromise) {
    ensureDirPromise = mkdir(DATA_DIR, { recursive: true }).then(() => undefined);
  }
  return ensureDirPromise;
}

function fileFor(ts: Date): string {
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, '0');
  const d = String(ts.getDate()).padStart(2, '0');
  return path.join(DATA_DIR, `events-${y}-${m}-${d}.jsonl`);
}

async function append(event: Event): Promise<void> {
  try {
    await ensureDir();
    const line = JSON.stringify(event) + '\n';
    await appendFile(fileFor(new Date(event.ts)), line, 'utf8');
  } catch (err) {
    console.error('[stats] failed to append event:', err);
  }
}

export function recordSlideServed(input: Omit<SlideServedEvent, 'type' | 'ts'>): void {
  void append({ type: 'slide_served', ts: new Date().toISOString(), ...input });
}

export function recordCastEvent(kind: CastEvent['kind'], detail?: string): void {
  void append({ type: 'cast_event', ts: new Date().toISOString(), kind, detail });
}

export { DATA_DIR };
