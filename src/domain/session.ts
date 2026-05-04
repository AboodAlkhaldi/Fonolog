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
 */
export async function generateSession(
  moduleId: string,
  opts: SessionOptions = {},
): Promise<Question[]> {
  const def = getModule(moduleId);
  if (!def) throw new Error(`[domain] unknown module: ${moduleId}`);

  // Narrow the word pool
  let words: Word[];
  if (opts.wordIds && opts.wordIds.length > 0) {
    const all = await contentRepository.getAllWords();
    const set = new Set(opts.wordIds);
    words = all.filter((w) => w.id && set.has(w.id));
  } else if (opts.categoryId) {
    words = await contentRepository.getWordsByCategoryId(opts.categoryId);
  } else {
    words = await contentRepository.getAllWords();
  }

  if (words.length === 0) {
    throw new Error('[domain] no words match the selection');
  }

  let questions = def.generator(words);

  if (opts.maxQuestions && questions.length > opts.maxQuestions) {
    questions = questions.slice(0, opts.maxQuestions);
  }

  return questions;
}
