/**
 * SupabaseContentRepository — Stage 10 update.
 *
 * Strategy:
 *  1. On first read: try MMKV → if hit, return immediately + refresh in bg (stale-while-revalidate)
 *  2. On miss/TTL expiry: fetch from Supabase, fill MMKV
 *  3. invalidate() clears both memory + MMKV so next read is a fresh fetch
 */
import { supabase } from '@/lib/supabase';
import { offlineCache } from '@/lib/offline-cache';
import { wordsFromRows, categoryFromRow } from '@/domain/adapters';
import type { Word, Category } from '@/domain/types';
import type { CategoryRow, WordRow } from '@/lib/database.types';
import type { IContentRepository } from '@/domain/interfaces/content-repository.interface';

class SupabaseContentRepository implements IContentRepository {
  private categoriesCache: Category[] | null = null;
  private wordsCache:      Word[]     | null = null;
  private categoryRowsCache: Map<string, CategoryRow> | null = null;

  async getCategories(): Promise<Category[]> {
    if (this.categoriesCache) return this.categoriesCache;
    const cached = await offlineCache.getCategories();
    if (cached) {
      this.categoriesCache = cached;
      this.refreshInBackground();
      return cached;
    }
    await this.loadAll();
    return this.categoriesCache!;
  }

  async getAllWords(): Promise<Word[]> {
    if (this.wordsCache) return this.wordsCache;
    const cached = await offlineCache.getWords();
    if (cached) {
      this.wordsCache = cached;
      this.refreshInBackground();
      return cached;
    }
    await this.loadAll();
    return this.wordsCache!;
  }

  async getWordsByCategory(categoryName: string): Promise<Word[]> {
    const all = await this.getAllWords();
    return all.filter((w) => w.kat === categoryName);
  }

  async getWordsByCategoryId(categoryId: string): Promise<Word[]> {
    if (!this.categoryRowsCache) await this.loadAll();
    const cat = this.categoryRowsCache?.get(categoryId);
    if (!cat) return [];
    return this.getWordsByCategory(cat.name);
  }

  invalidate(): void {
    this.categoriesCache    = null;
    this.wordsCache         = null;
    this.categoryRowsCache  = null;
    offlineCache.clear();
  }

  private async loadAll(): Promise<void> {
    const [catsRes, wordsRes] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('display_order'),
      supabase.from('words').select('*').eq('is_active', true).order('word_text'),
    ]);
    if (catsRes.error)  throw new Error(`[content] categories: ${catsRes.error.message}`);
    if (wordsRes.error) throw new Error(`[content] words: ${wordsRes.error.message}`);

    const catRows: CategoryRow[] = catsRes.data ?? [];
    const wRows:   WordRow[]     = wordsRes.data ?? [];

    this.categoryRowsCache = new Map(catRows.map((c) => [c.id, c]));
    this.categoriesCache   = catRows.map(categoryFromRow);
    this.wordsCache        = wordsFromRows(wRows, this.categoryRowsCache);

    await offlineCache.setCategories(this.categoriesCache);
    await offlineCache.setWords(this.wordsCache);
  }

  private refreshInBackground(): void {
    this.loadAll().catch((e) => console.warn('[content] bg refresh', e));
  }
}

export const contentRepository: IContentRepository & { invalidate: () => void } =
  new SupabaseContentRepository();
