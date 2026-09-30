import {
  categoriesResponseSchema,
  type CategoriesResponse,
} from '@portal/contracts';

export const categoriesQueryKey = ['categories'] as const;

export async function listCategories(): Promise<CategoriesResponse> {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Não foi possível carregar as categorias.');
  return categoriesResponseSchema.parse(await response.json());
}
