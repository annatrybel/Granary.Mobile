export interface ExpiringItem {
  id: string;
  name: string;
  categoryName: string;  
  categoryIcon: string;  
  locationName: string;  
  locationIcon: string;  
  timeLeftText: string;
  daysLeft: number;
}

export interface StockSection {
  title: 'Lodówka' | 'Spiżarnia' | 'Zamrażarka';
  count: number;
  icon: string;
  type?: 'fridge' | 'pantry' | 'freezer';
}

export interface SuggestedRecipe {
  id: string | number;
  title: string;
  ingredientsUsed: string;
  durationAndPortions: string;
  imageUrl: string;
}

export interface StockSection {
  title: 'Lodówka' | 'Spiżarnia' | 'Zamrażarka';
  count: number;
  icon: string;                         
  type?: 'fridge' | 'pantry' | 'freezer'; 
}

export interface SuggestedRecipe {
  id: string | number;
  title: string;
  ingredientsUsed: string;
  durationAndPortions: string;
  imageUrl: string;
}