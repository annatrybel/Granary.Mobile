export interface CatalogProductDto {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string;
  category?: string;
  defaultUnit?: string;
  imageUrl?: string | null;
  categoryImageUrl?: string | null;
}

export interface ProductDetailUpdatePayload {
  locationName: 'Lodówka' | 'Zamrażarka' | 'Spiżarnia';
  quantity: number;
  unit: string;
  expirationDate: string;
  categoryImageUrl?: string | null;
}

export interface CategoryDto {
  id: string;
  name: string;
  imageUrl?: string | null;
  displayOrder: number;
}