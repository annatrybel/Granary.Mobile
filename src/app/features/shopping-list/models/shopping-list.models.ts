export interface ShoppingListItem {
  id: string;
  productId?: string | null; 
  name: string;
  categoryName: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
}

export interface RestockSuggestion {
  id: string;
  name: string;
  categoryName: string;
  locationName: string;
  quantityDesc: string;
  timeLeftText: string;
}

export interface CatalogProductDto {
  id: string;
  name: string;
  categoryName?: string;
  category?: string;
  defaultUnit?: string;
  imageUrl?: string;
}