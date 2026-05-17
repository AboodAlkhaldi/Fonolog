/**
 * Module API — the public interface for generating learning sessions.
 *
 * Stage 4+ screens import from here:
 *   import { getModule, generateSession } from '@/domain';
 *   const questions = await generateSession('tamamla', { categoryId: '...' });
 */
import { MODULES_REGISTRY } from './modules.registry';
import { contentRepository } from './repositories/content.repository';
import type { ModuleDefinition, Question, Word } from './types';

export interface SessionOptions {
  /** Restrict to a single category (by UUID). */
  categoryId?: string;
  /** Or filter by a specific list of word UUIDs (e.g. assignment / milestone). */
  wordIds?:    string[];
  /** Overall question cap (default: defer to generator). */
  maxQuestions?: number;
}

export function getModule(moduleId: string): ModuleDefinition | undefined {
  return MODULES_REGISTRY.find((m) => m.id === moduleId);
}

export function listModules(): ModuleDefinition[] {
  return MODULES_REGISTRY;
}

/**
 * Generate a session of questions for a module.
 *
 * Loads the relevant words from the content repository, filters by
 * the supplied options, and runs the module's generator.
 *
 * When `wordIds` is provided (teacher-assigned homework), we keep the FULL
 * word pool available to the generator for distractor variety, but tell it
 * via `options.targets` that those specific words must be the subject of
 * every question. A generator that doesn't read `targets` still works — it
 * just behaves as if no filter was applied, but our maxQuestions cap and the
 * post-filter at the end ensure assignment sessions still focus on the
 * assigned words.
 */
export async function generateSession(
  moduleId: string,
  opts: SessionOptions = {},
): Promise<Question[]> {
  const def = getModule(moduleId);
  if (!def) throw new Error(`[domain] unknown module: ${moduleId}`);

  let words: Word[];
  let targets: Word[] | undefined;

  if (opts.wordIds && opts.wordIds.length > 0) {
    // Homework: keep the broad pool for distractors, mark targets explicitly.
    const all = await contentRepository.getAllWords();
    const set = new Set(opts.wordIds);
    targets = all.filter((w) => w.id && set.has(w.id));
    if (targets.length === 0) throw new Error('[domain] no words match the selection');
    words = all;
  } else if (opts.categoryId) {
    words = await contentRepository.getWordsByCategoryId(opts.categoryId);
  } else {
    words = await contentRepository.getAllWords();
  }

  if (words.length === 0) {
    throw new Error('[domain] no words match the selection');
  }

  words = shuffle(words);

  let questions = def.generator(words, targets ? { targets: shuffle(targets) } : undefined);

  if (opts.maxQuestions && questions.length > opts.maxQuestions) {
    questions = questions.slice(0, opts.maxQuestions);
  }

  return questions;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
