import { Component, ChangeDetectionStrategy, inject, input, output, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminModalComponent } from '../../../shared/components/admin-modal/admin-modal.component';
import { extractApiError } from '../../../shared/utils/api-error';
import { AdminUsersService, RoleDto, UserDto } from '../../services/admin-users.service';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, AdminModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-modal
      [title]="isEdit() ? 'Edytuj użytkownika' : 'Dodaj użytkownika'"
      [subtitle]="isEdit() ? user()!.email : 'Użytkownik otrzyma e-mail z linkiem do ustawienia hasła.'"
      (close)="cancel.emit()">

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4" novalidate>
        <div class="flex flex-col gap-1.5">
          <label for="user-name" class="text-xs font-bold text-neutral-700">Nazwa użytkownika</label>
          <input id="user-name" type="text" formControlName="userName" autocomplete="off"
                 class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                 [class.border-rose-400]="isInvalid('userName')"
                 [class.border-neutral-200]="!isInvalid('userName')" />
          @if (isInvalid('userName')) {
            <span class="text-[11px] font-semibold text-rose-600">Nazwa użytkownika jest wymagana.</span>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="user-email" class="text-xs font-bold text-neutral-700">E-mail</label>
          <input id="user-email" type="email" formControlName="email" autocomplete="off"
                 class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                 [class.border-rose-400]="isInvalid('email')"
                 [class.border-neutral-200]="!isInvalid('email')" />
          @if (isInvalid('email')) {
            <span class="text-[11px] font-semibold text-rose-600">Podaj poprawny adres e-mail.</span>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="user-role" class="text-xs font-bold text-neutral-700">Rola</label>
          <select id="user-role" formControlName="roleId"
                  class="h-11 px-3 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500] cursor-pointer"
                  [class.border-rose-400]="isInvalid('roleId')"
                  [class.border-neutral-200]="!isInvalid('roleId')">
            <option value="" disabled>Wybierz rolę…</option>
            @for (role of roles(); track role.id) {
              <option [value]="role.id">{{ role.name }}</option>
            }
          </select>
          @if (isInvalid('roleId')) {
            <span class="text-[11px] font-semibold text-rose-600">Wybierz rolę użytkownika.</span>
          }
        </div>

        @if (errorMessage()) {
          <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {{ errorMessage() }}
          </div>
        }

        <div class="flex justify-end gap-2.5 pt-2">
          <button type="button" (click)="cancel.emit()" [disabled]="isSaving()"
                  class="h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs cursor-pointer disabled:opacity-50">
            Anuluj
          </button>
          <button type="submit" [disabled]="isSaving()"
                  class="h-10 px-5 rounded-xl bg-[#536500] hover:bg-[#435200] text-white font-bold text-xs shadow-md shadow-[#536500]/20 cursor-pointer disabled:opacity-60">
            {{ isSaving() ? 'Zapisywanie…' : (isEdit() ? 'Zapisz zmiany' : 'Utwórz użytkownika') }}
          </button>
        </div>
      </form>
    </app-admin-modal>
  `
})
export class UserFormModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly usersService = inject(AdminUsersService);

  /** Użytkownik do edycji; `null` oznacza tryb dodawania. */
  readonly user = input<UserDto | null>(null);
  readonly roles = input<RoleDto[]>([]);

  readonly saved = output<void>();
  readonly cancel = output<void>();

  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    userName: ['', [Validators.required, Validators.maxLength(256)]],
    email: ['', [Validators.required, Validators.email]],
    roleId: ['', Validators.required]
  });

  isEdit = () => this.user() !== null;

  ngOnInit(): void {
    const user = this.user();
    if (user) {
      this.form.patchValue({ userName: user.userName, email: user.email, roleId: user.roleId });
    }
  }

  isInvalid(controlName: 'userName' | 'email' | 'roleId'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const user = this.user();
    const request$ = user
      ? this.usersService.updateUser(user.userId, value)
      : this.usersService.createUser(value);

    this.isSaving.set(true);
    this.errorMessage.set(null);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(extractApiError(err, 'Nie udało się zapisać użytkownika.'));
      }
    });
  }
}
