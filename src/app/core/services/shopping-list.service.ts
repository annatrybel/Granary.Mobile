import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/shopping-lists`;

  /** Pobiera wszystkie listy użytkownika */
  getMyLists(): Observable<ShoppingListDto[]> {
    return this.http.get<ShoppingListDto[]>(this.baseUrl);
  }

  /** Pobiera szczegóły listy wraz z pozycjami */
  getListDetails(listId: string): Observable<ShoppingListDto> {
    return this.http.get<ShoppingListDto>(`${this.baseUrl}/${listId}`);
  }

  /** Tworzy nową listę zakupową */
  createList(dto: CreateShoppingListDto): Observable<ShoppingListDto> {
    return this.http.post<ShoppingListDto>(this.baseUrl, dto);
  }

  /** Usuwa całą listę zakupową */
  deleteList(listId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${listId}`);
  }

  /** Dodaje pozycję do listy  */
  addItem(listId: string, dto: AddShoppingItemDto): Observable<ShoppingItemDto> {
    return this.http.post<ShoppingItemDto>(`${this.baseUrl}/${listId}/items`, dto);
  }

  /** Szybkie dodanie pozycji bezpośrednio z wygasającego produktu ze spiżarni */
  addFromPantry(listId: string, pantryItemId: string): Observable<ShoppingItemDto> {
    return this.http.post<ShoppingItemDto>(`${this.baseUrl}/${listId}/items/from-pantry/${pantryItemId}`, {});
  }

  /** Aktualizacja ilości lub statusu kupienia (zaznaczenia checkboxa) */
  updateItem(listId: string, itemId: string, dto: UpdateShoppingItemDto): Observable<ShoppingItemDto> {
    return this.http.put<ShoppingItemDto>(`${this.baseUrl}/${listId}/items/${itemId}`, dto);
  }

  /** Usuwa pojedynczą pozycję */
  deleteItem(listId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${listId}/items/${itemId}`);
  }

  /** Masowe usuwanie zaznaczonych / kupionych pozycji */
  deleteSelectedItems(listId: string, itemIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${listId}/items/bulk-delete`, itemIds);
  }

  /** Przenosi kupione produkty do spiżarni */
  bulkTransfer(listId: string, dto: BulkTransferToPantryDto): Observable<{ transferredCount?: number }> {
    return this.http.post<{ transferredCount?: number }>(`${this.baseUrl}/${listId}/items/bulk-transfer`, dto);
  }
}