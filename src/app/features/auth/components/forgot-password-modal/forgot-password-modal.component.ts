import { Component, input, output, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password-modal.component.html',
  styleUrl: './forgot-password-modal.component.scss'
})
export class ForgotPasswordModalComponent implements OnInit {
  private authService = inject(AuthService);

  initialEmail = input<string>('');
  closeModal = output<void>();

  email = signal<string>('');
  isLoading = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (this.initialEmail()) {
      this.email.set(this.initialEmail());
    }
  }

  onSubmit(): void {
    const emailVal = this.email().trim();
    if (!emailVal) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.requestPasswordReset(emailVal).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Nie udało się wysłać linku. Spróbuj ponownie.');
      }
    });
  }
}