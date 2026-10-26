export interface CatalogProductDto {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string;
  category?: string;
  barcode?: string | null;
  defaultUnit?: string;
  imageUrl?: string | null;
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