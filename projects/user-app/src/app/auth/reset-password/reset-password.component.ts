import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, APP_ICONS, TranslatePipe } from '@granary/shared';

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink, TranslatePipe, APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly token = signal<string>('');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly showPassword = signal<boolean>(false);

  readonly isLoading = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly hasValidLink = computed(() => !!this.token() && !!this.email());
  readonly isTooShort = computed(() => this.password().length > 0 && this.password().length < MIN_PASSWORD_LENGTH);
  readonly isMismatch = computed(() => this.confirmPassword().length > 0 && this.password() !== this.confirmPassword());
  readonly canSubmit = computed(() =>
    this.hasValidLink() &&
    this.password().length >= MIN_PASSWORD_LENGTH &&
    this.password() === this.confirmPassword() &&
    !this.isLoading()
  );

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.token.set(params.get('token') ?? '');
    this.email.set(params.get('email') ?? '');

    // Token jednorazowy nie powinien zostać w pasku adresu ani w historii przeglądarki.
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.resetPassword({
      email: this.email(),
      token: this.token(),
      newPassword: this.password()
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.detail || err.error?.message || 'Nie udało się ustawić hasła. Link mógł wygasnąć.'
        );
      }
    });
  }
}
