export type StorageCategory = 'all' | 'lodowka' | 'zamrazarka' | 'spizarnia';

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