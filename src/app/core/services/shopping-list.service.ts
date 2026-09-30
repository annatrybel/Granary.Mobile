import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type{
  ShoppingListDto,
  ShoppingItemDto,
  CreateShoppingListDto,
  AddShoppingItemDto,
  UpdateShoppingItemDto,
  BulkTransferToPantryDto,
  BulkTransferResultDto
} from '../../features/shopping-list/models/shopping-list.models';

import {
  ShoppingListDto,
  ShoppingItemDto,
  CreateShoppingListDto,
  AddShoppingItemDto,
  UpdateShoppingItemDto,
  BulkTransferToPantryDto,
  BulkTransferResultDto
} from '../../features/shopping-list/models/shopping-list.models';

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/shopping-lists`;

  getMyLists(): Observable<ShoppingListDto[]> {
    return this.http.get<ShoppingListDto[]>(this.baseUrl);
  }

  getListDetails(listId: string): Observable<ShoppingListDto> {
    return this.http.get<ShoppingListDto>(`${this.baseUrl}/${listId}`);
  }

  createList(dto: CreateShoppingListDto): Observable<ShoppingListDto> {
    return this.http.post<ShoppingListDto>(this.baseUrl, dto);
  }

  deleteList(listId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${listId}`);
  }

  addItem(listId: string, dto: AddShoppingItemDto): Observable<ShoppingItemDto> {
    return this.http.post<ShoppingItemDto>(`${this.baseUrl}/${listId}/items`, dto);
  }

  addFromPantry(listId: string, pantryItemId: string): Observable<ShoppingItemDto> {
    return this.http.post<ShoppingItemDto>(`${this.baseUrl}/${listId}/items/from-pantry/${pantryItemId}`, {});
  }

  updateItem(listId: string, itemId: string, dto: UpdateShoppingItemDto): Observable<ShoppingItemDto> {
    return this.http.put<ShoppingItemDto>(`${this.baseUrl}/${listId}/items/${itemId}`, dto);
  }

  deleteItem(listId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${listId}/items/${itemId}`);
  }

  deleteSelectedItems(listId: string, itemIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${listId}/items/bulk-delete`, itemIds);
  }

  bulkTransfer(listId: string, dto: BulkTransferToPantryDto): Observable<BulkTransferResultDto> {
    return this.http.post<BulkTransferResultDto>(`${this.baseUrl}/${listId}/items/bulk-transfer`, dto);
  }
}