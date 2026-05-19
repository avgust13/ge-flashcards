import type { Category } from '../types';

export const CATEGORIES: Category[] = [];

export async function loadCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}categories.json`, { signal });
  if (!response.ok) throw new Error(`Failed to load categories.json: ${response.status}`);
  const data = (await response.json()) as Category[];
  CATEGORIES.splice(0, CATEGORIES.length, ...data);
  return CATEGORIES;
}
