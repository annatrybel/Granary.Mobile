export type StorageLocation = 'Lodówka' | 'Spiżarnia' | 'Zamrażarka';
export type ProductStatus = 'official' | 'pending';

export interface AdminProductItem {
  id: string;
  name: string;
  ean?: string;
  packageInfo: string;
  category: string;
  categoryBadgeClass: string;
  storageLocation: StorageLocation;
  shelfLifeDays: number;
  unit: string;
  householdsCount: number;
  status: ProductStatus;
  submittedBy?: string;
  iconBgClass: string;
  iconColorClass: string;
  iconName: string;
}

export interface AdminProductsKpis {
  totalCount: number;
  weeklyGrowth: number;
  categoriesCount: number;
  categoriesList: string;
  pendingCount: number;
  householdsTotalItems: number;
}