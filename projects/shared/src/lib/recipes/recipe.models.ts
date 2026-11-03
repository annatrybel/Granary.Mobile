import type { PagedResult } from '../shared/models/common.models';

export enum DietaryPreference {
  Standard = 'Standard',
  Vegetarian = 'Vegetarian',
  Vegan = 'Vegan',
  Pescetarian = 'Pescetarian',
  Keto = 'Keto'
}

export const DIETARY_PREFERENCE_OPTIONS = [
  { value: DietaryPreference.Standard, key: 'dietary.standard', label: 'Standard' },
  { value: DietaryPreference.Vegetarian, key: 'dietary.vegetarian', label: 'Wegetariańska' },
  { value: DietaryPreference.Vegan, key: 'dietary.vegan', label: 'Wegańska' },
  { value: DietaryPreference.Pescetarian, key: 'dietary.pescetarian', label: 'Pescetariańska' },
  { value: DietaryPreference.Keto, key: 'dietary.keto', label: 'Keto' }
] as const;

export function getDietaryPreferenceLabel(preference?: DietaryPreference | null) {
  if (preference == null || preference === DietaryPreference.Standard) return null;
  return DIETARY_PREFERENCE_OPTIONS.find(option => option.value === preference) ?? null;
}

export function parseDietaryPreference(value: unknown): DietaryPreference {
  const stringValue = typeof value === 'string' ? value.toLowerCase() : null;
  const option = DIETARY_PREFERENCE_OPTIONS.find(item =>
    item.value === value || item.value.toLowerCase() === stringValue
  );
  if (option) return option.value;

  if (typeof value === 'number' && Number.isInteger(value)) {
    return DIETARY_PREFERENCE_OPTIONS[value]?.value ?? DietaryPreference.Standard;
  }

  return DietaryPreference.Standard;
}

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

export interface RecipeMatchDto {
  recipeId: string;
  title: string;
  imageUrl?: string;
  prepTimeMinutes: number;
  servings: number;
  calories?: number | null;
  dietaryPreference: DietaryPreference;
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
  dietaryPreference: DietaryPreference;
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
  diet: DietaryPreference | null;
}

export interface RecipeQueryParams {
  scope: RecipeTabScope;
  page: number;
  pageSize: number;
  query?: string;
  items?: string; 
  maxTime?: number | null;
  sortBy?: 'match' | 'time' | 'calories' | 'rating';
  diet?: DietaryPreference | null;
}

export type PagedRecipesResult = PagedResult<RecipeMatchDto>;

export interface CreateRecipeIngredientPayload {
  productId?: string;
  name: string;
  quantity: string;
}

export interface CreateCustomRecipePayload {
  title: string;
  dietaryPreference: DietaryPreference;
  servings: number;
  calories?: number | null;
  prepTimeMinutes: number;
  imageUrl?: string;
  ingredients: CreateRecipeIngredientPayload[];
  steps: string[];
}