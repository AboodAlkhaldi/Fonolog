import type { Word, Category } from '../types';

/**
 * Reads the static content (categories + words). This data changes only
 * via admin actions (Stage 7), so we cache aggressively in the impl.
 */
export interface IContentRepository {
  /** All active categories, ordered by display_order. */
  getCategories(): Promise<Category[]>;

  /** All active words, with their category name embedded. */
  getAllWords(): Promise<Word[]>;

  /** Words filtered to a specific category by name. */
  getWordsByCategory(categoryName: string): Promise<Word[]>;

  /** Words filtered to a specific category by id. */
  getWordsByCategoryId(categoryId: string): Promise<Word[]>;
}
