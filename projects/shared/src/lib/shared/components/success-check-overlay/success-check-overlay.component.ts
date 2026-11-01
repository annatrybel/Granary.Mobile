import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, input, output, signal } from '@angular/core';

const LEAVE_DURATION_MS = 220;

@Component({
  selector: 'app-success-check-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" role="status" aria-live="polite" [class.leaving]="leaving()">
      <div class="card">
        <svg class="check" viewBox="0 0 52 52" aria-hidden="true">
          <circle class="check-fill" cx="26" cy="26" r="24" />
          <circle class="check-circle" cx="26" cy="26" r="24" />
          <path class="check-tick" d="M14 27l8 8 16-17" />
        </svg>
        @if (message()) {
          <p class="message">{{ message() }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      pointer-events: none;
      transition: opacity 0.22s ease-out;
    }

    .overlay.leaving {
      opacity: 0;
    }

    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      min-width: 140px;
      max-width: 280px;
      padding: 24px 28px;
      border-radius: 28px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
      animation: card-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .check {
      width: 72px;
      height: 72px;
    }

    .check-fill {
      fill: var(--app-brand);
      fill-opacity: 0.15;
    }

    .check-circle,
    .check-tick {
      fill: none;
      stroke: var(--app-brand);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .check-circle {
      stroke-dasharray: 152;
      stroke-dashoffset: 152;
      animation: draw 0.45s cubic-bezier(0.65, 0, 0.45, 1) 0.1s forwards;
    }

    .check-tick {
      stroke-dasharray: 36;
      stroke-dashoffset: 36;
      animation: draw 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
    }

    .message {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
      text-align: center;
      color: var(--app-text);
    }

    @keyframes draw {
      to { stroke-dashoffset: 0; }
    }

    @keyframes card-pop {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (prefers-reduced-motion: reduce) {
      .card { animation: none; }
      .check-circle,
      .check-tick {
        animation: none;
        stroke-dashoffset: 0;
      }
    }
  `
})
export class SuccessCheckOverlayComponent implements OnInit, OnDestroy {
  readonly message = input<string>('');
  readonly durationMs = input<number>(1400);
  readonly closed = output<void>();

  protected readonly leaving = signal(false);
  private timers: ReturnType<typeof setTimeout>[] = [];

  ngOnInit(): void {
    this.timers.push(setTimeout(() => {
      this.leaving.set(true);
      this.timers.push(setTimeout(() => this.closed.emit(), LEAVE_DURATION_MS));
    }, this.durationMs()));
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }
}
