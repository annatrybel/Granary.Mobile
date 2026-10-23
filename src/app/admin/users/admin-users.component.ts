import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminUsersService, UserDto } from './services/admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule], // ⬅️ zwykły import
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsersComponent implements OnInit {
  private readonly usersService = inject(AdminUsersService);

  readonly users = signal<UserDto[]>([]);
  readonly totalRecords = signal<number>(0);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly pageIndex = signal<number>(0); // 0-based dla backendu (Start = pageIndex * pageSize)
  readonly pageSize = signal<number>(10);
  private drawCounter = 0;

  ngOnInit(): void {
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