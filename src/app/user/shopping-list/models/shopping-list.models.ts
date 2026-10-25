export interface ShoppingItemDto {
  id: string;
  productId?: string | null;
  name?: string;
  productName?: string;
  categoryName?: string;
  category?: string;
  quantity: number;
  unit: string;
  isBought?: boolean;
}

export interface ShoppingListDto {
  id: string;
  name: string;
  title?: string;
  items?: ShoppingItemDto[];
  createdAt?: string;
}

export interface CreateShoppingListDto {
  name: string;
}

export interface AddShoppingItemDto {
  productId?: string | null;
  productName?: string;
  customName?: string;
  categoryName?: string;
  quantity: number;
  unit: string;
}

export interface UpdateShoppingItemDto {
  name?: string;
  quantity?: number;
  unit?: string;
  isBought?: boolean;
  categoryName?: string;
}

export interface BulkTransferToPantryDto {
  itemIds: string[];
  destinationLocation?: string;
  defaultExpirationDate?: string | null;
}

export interface BulkTransferResultDto {
  transferredCount?: number;
  message?: string;
}


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