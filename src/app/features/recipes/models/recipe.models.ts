export interface MissingIngredientDto {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

export interface RecipeMatchDto {
  recipeId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  prepTimeMinutes: number;
  servings: number;
  matchPercentage: number;
  ownedIngredientsCount: number;
  totalIngredientsCount: number;
  expiringIngredientsSaved: number;
  canBeCookedNow: boolean;
  isFavorite: boolean; 
  usedIngredientsSummary?: string;
  durationAndPortions?: string;
  missingIngredients: MissingIngredientDto[];
}

export interface RecipeIngredientDto {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
  isOwnedInPantry: boolean;
}

export interface RecipeDetailDto {
  id: string;
  title: string;
  description: string;
  instructions: string;
  imageUrl?: string;
  prepTimeMinutes: number;
  servings: number;
  calories?: number | null;
  isFavorite: boolean;    
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

export interface RecipeTag {
  id: string;
  name: string;
}

export interface RecipeFilters {
  availability: 'all' | 'ready' | 'missing2'; 
  maxTime: number | null; 
  sortBy: 'match' | 'time' | 'calories' | 'rating';
  mealType: string | null; 
  diet: string | null;
}

export interface CreateRecipeIngredientPayload {
  name: string;
  quantity: string;
}

export interface CreateCustomRecipePayload {
  title: string;
  category: string;
  servings: number;
  prepTimeMinutes: number;
  imageUrl?: string;
  ingredients: CreateRecipeIngredientPayload[];
  steps: string[];
}