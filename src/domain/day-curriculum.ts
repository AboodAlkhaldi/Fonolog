/**
 * Day-based curriculum.
 *
 * Replaces the old `level` system. The student progresses through Days 1–7
 * sequentially. On any given day, only that day's games are open (except the
 * always-open set). After the student finishes all of today's games, the
 * post-completion unlock kicks in (full unlock for pro, peek-ahead for trial,
 * nothing extra for free — see src/lib/day-progress.ts for the access logic).
 *
 * To change which games belong to which day, edit DAY_CURRICULUM below.
 * Module IDs must match `src/domain/modules.registry.ts`. The lookup at the
 * bottom of this file will throw at module load time if an ID is unknown,
 * so typos surface immediately rather than silently breaking gating.
 */
import { getModule } from './modules.registry';

export const DAY_COUNT = 7;

/** Always playable regardless of day, tier (except free still respects this), or completion state. */
export const ALWAYS_OPEN_MODULES: ReadonlyArray<string> = ['kesfet', 'tani'];

/**
 * day → ordered list of module IDs the student must complete for that day to count.
 * Day index is 1-based to match user-facing language ("Day 1", "Day 2", ...).
 */
export const DAY_CURRICULUM: Readonly<Record<number, ReadonlyArray<string>>> = {
  1: ['kategori', 'harf',          'ayirtEtme',    'ran'],
  2: ['heceBirlestir', 'heceC',    'hecele',       'gorselAlgi'],
  3: ['sonHece', 'uzunKelime',     'kelimeDizisi', 'ran'],
  4: ['siraliHatirla', 'harfBirlestir', 'uyak',    'gorselAlgi'],
  5: ['ilkSes', 'sonSes',          'tamamla',      'ran'],
  6: ['fonemSilme', 'tamamlaBastan', 'uyakUretim', 'gorselAlgi'],
  7: ['ilkHeceSilme', 'sonHeceSilme', 'ran',       'gorselAlgi'],
};

/** Returns the day a module belongs to, or null if it's always-open or unscheduled. */
export function getDayForModule(moduleId: string): number | null {
  for (let d = 1; d <= DAY_COUNT; d++) {
    if (DAY_CURRICULUM[d].includes(moduleId)) return d;
  }
  return null;
}

/** Advances Day N to the next day in the 1..7 cycle (Day 7 loops back to Day 1). */
export function nextDay(day: number): number {
  return (day % DAY_COUNT) + 1;
}

// ─── Validation at load time ──────────────────────────────────────────────
// Surface unknown IDs early rather than silently locking the curriculum.
(function validate() {
  const ids = new Set<string>([...ALWAYS_OPEN_MODULES]);
  for (let d = 1; d <= DAY_COUNT; d++) {
    for (const id of DAY_CURRICULUM[d]) ids.add(id);
  }
  for (const id of ids) {
    if (!getModule(id)) {
      // eslint-disable-next-line no-console
      console.warn(`[day-curriculum] unknown module ID: ${id}`);
    }
  }
})();
