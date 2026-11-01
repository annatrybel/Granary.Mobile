import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUsersService, RoleDto, UserDto } from './services/admin-users.service';
import { APP_ICONS } from '@granary/shared';
import { AdminSearchBarComponent } from '../shared/components/admin-search-bar/admin-search-bar.component';
import { UserFormModalComponent } from './components/user-form-modal/user-form-modal.component';


@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSearchBarComponent, UserFormModalComponent, APP_ICONS],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsersComponent implements OnInit {
  private readonly usersService = inject(AdminUsersService);

  readonly users = signal<UserDto[]>([]);
  readonly roles = signal<RoleDto[]>([]);
  readonly totalRecords = signal<number>(0);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly editedUser = signal<UserDto | null | undefined>(undefined);

  readonly searchQuery = signal<string>('');
  readonly pageIndex = signal<number>(0); 
  readonly pageSize = signal<number>(10);

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadRoles(): void {
    this.usersService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles || []),
      error: () => this.roles.set([])
    });
  }

  openCreate(): void {
    this.editedUser.set(null);
  }

  openEdit(user: UserDto): void {
    this.editedUser.set(user);
  }

  closeModal(): void {
    this.editedUser.set(undefined);
  }

  onUserSaved(): void {
    this.closeModal();
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.usersService.getUsers(this.pageIndex() + 1, this.pageSize(), this.searchQuery().trim()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.users.set(res.items || []);
        this.totalRecords.set(res.totalCount || 0);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || err?.error?.message || 'Błąd pobierania użytkowników.');
      }
    });
  }

  onSearch(): void {
    this.pageIndex.set(0);
    this.loadUsers();
  }

  nextPage(): void {
    if ((this.pageIndex() + 1) * this.pageSize() < this.totalRecords()) {
      this.pageIndex.update(p => p + 1);
      this.loadUsers();
    }
  }

  prevPage(): void {
    if (this.pageIndex() > 0) {
      this.pageIndex.update(p => p - 1);
      this.loadUsers();
    }
  }

  toggleLock(user: UserDto): void {
    const action$ = user.isLocked 
      ? this.usersService.unlockUser(user.userId)
      : this.usersService.lockUser(user.userId);

    action$.subscribe({
      next: () => {
        this.users.update(list => 
          list.map(u => u.userId === user.userId ? { ...u, isLocked: !u.isLocked } : u)
        );
      },
      error: (err) => {
        alert(err?.error?.message || 'Wystąpił błąd podczas zmiany blokady konta.');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  }
}