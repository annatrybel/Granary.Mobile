export interface CatalogProductDto {
  id: string;
  name: string;
  categoryName?: string;
  category?: string;
  defaultUnit?: string;
  imageUrl?: string;
}

export interface ProductDetailUpdatePayload {
  locationName: 'Lodówka' | 'Zamrażarka' | 'Spiżarnia';
  quantity: number;
  unit: string;
  expirationDate: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  imageUrl?: string | null;
  displayOrder: number;
}