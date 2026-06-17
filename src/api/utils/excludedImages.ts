import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { DATA_DIR } from '../stats/recorder';

// Local, app-specific "don't show this in the slideshow" list. Unlike archive,
// this never touches Immich — the photo stays fully visible in Immich and is
// only filtered out of our slide pipeline. Persisted as a human-editable JSON
// file so an exclusion can be undone by hand-editing the file.

const FILE = path.join(DATA_DIR, 'excluded.json');

type ExcludedEntry = { id: string; excludedAt: string };

// In-memory read path so there's zero per-slide I/O. Hydrated synchronously at
// module load so the very first /api/slides request already filters correctly.
// Maps id -> excludedAt so rewriting the file preserves original timestamps.
const excluded = new Map<string, string>(load());

function load(): [string, string][] {
  try {
    const raw = readFileSync(FILE, 'utf8');
    const entries = JSON.parse(raw) as ExcludedEntry[];
    if (!Array.isArray(entries)) {
      console.warn(`[excluded] ${FILE} is not an array, starting empty`);
      return [];
    }
    return entries
      .filter((e) => e && typeof e.id === 'string')
      .map((e) => [e.id, typeof e.excludedAt === 'string' ? e.excludedAt : new Date().toISOString()]);
  } catch (err) {
    // Missing file is the normal first-run case; anything else we log and
    // degrade to an empty set rather than crashing the server.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[excluded] failed to read ${FILE}, starting empty:`, err);
    }
    return [];
  }
}

export function isExcluded(id: string): boolean {
  return excluded.has(id);
}

export async function exclude(id: string): Promise<void> {
  if (excluded.has(id)) return;
  excluded.set(id, new Date().toISOString());
  const entries: ExcludedEntry[] = [...excluded].map(([excludedId, excludedAt]) => ({ id: excludedId, excludedAt }));
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(entries, null, 2), 'utf8');
}
