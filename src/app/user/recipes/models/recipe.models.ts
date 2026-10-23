import { PagedResult } from '../../../shared/models/common.models';

export interface MissingIngredientDto {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

export interface RecipeIngredientDto {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
  isOwnedInPantry: boolean;
}

export interface CatalogProductDto {
  id: string;
  name: string;
  categoryId?: string | null;
  imageUrl?: string | null;
  barcode?: string | null;
}

export interface RecipeMatchDto {
  recipeId: string;
  title: string;
  imageUrl?: string;
  prepTimeMinutes: number;
  servings: number;
  calories?: number | null;
  matchPercentage: number;
  ownedIngredientsCount: number;
  totalIngredientsCount: number;
  expiringIngredientsSaved: number;
  canBeCookedNow: boolean;
  isFavorite: boolean;
  isCustom: boolean;
  usedIngredientsSummary?: string;
  missingIngredients: MissingIngredientDto[];
}

export interface RecipeDetailDto {
  id: string;
  title: string;
  instructions: string;
  imageUrl?: string;
  prepTimeMinutes: number;
  servings: number;
  calories?: number | null;
  isFavorite: boolean;
  isCustom?: boolean;
  likesCount: number;
  dislikesCount: number;
  userVote?: boolean | null;
  ingredients: RecipeIngredientDto[];
}

export interface VoteRecipeRequest {
  isLike: boolean;
}

export interface VoteResultDto {
  likesCount: number;
  dislikesCount: number;
  userVote: boolean | null;
}

export type RecipeTabScope = 'all' | 'favorites' | 'custom';

export interface RecipeFilters {
  maxTime: number | null;
  sortBy: 'match' | 'time' | 'calories' | 'rating';
  mealType: string | null;
  diet: string | null;
}

export interface RecipeQueryParams {
  scope: RecipeTabScope;
  page: number;
  pageSize: number;
  query?: string;
  items?: string; 
  maxTime?: number | null;
  sortBy?: 'match' | 'time' | 'calories' | 'rating';
  mealType?: string | null;
  diet?: string | null;
}

export type PagedRecipesResult = PagedResult<RecipeMatchDto>;

export interface CreateRecipeIngredientPayload {
  productId?: string;
  name: string;
  quantity: string;
}

export interface CreateCustomRecipePayload {
  title: string;
  category: string;
  servings: number;
  calories?: number | null;
  prepTimeMinutes: number;
  imageUrl?: string;
  ingredients: CreateRecipeIngredientPayload[];
  steps: string[];
}