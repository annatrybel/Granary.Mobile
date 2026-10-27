export interface ExpiringItem {
  id: string;
  name: string;
  categoryName: string;
  categoryIcon: string | null;
  locationName: string;
  locationIcon: string;
  timeLeftText: string;
  daysLeft: number;
  productImageUrl?: string | null;
}

export interface StockSection {
  title: string;
  count: number;
  icon: string;
  type: 'fridge' | 'pantry' | 'freezer';
}
