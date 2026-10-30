import { Injectable, computed, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  private readonly installed = signal<boolean>(this.detectStandalone());
  private readonly promptAvailable = signal<boolean>(false);

  readonly isInstalled = this.installed.asReadonly();

  readonly canPrompt = this.promptAvailable.asReadonly();

  readonly isIos = this.detectIos();

  readonly canShowInstall = computed(() => !this.installed());

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.promptAvailable.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.promptAvailable.set(false);
      this.installed.set(true);
    });

    if (typeof window.matchMedia === 'function') {
      window
        .matchMedia('(display-mode: standalone)')
        .addEventListener('change', (event) => this.installed.set(event.matches || this.detectStandalone()));
    }
  }

  async promptInstall(): Promise<PwaInstallOutcome> {
    const promptEvent = this.deferredPrompt;
    if (!promptEvent) return 'unavailable';

    this.deferredPrompt = null;
    this.promptAvailable.set(false);

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') this.installed.set(true);
    return outcome;
  }

  private detectStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const standaloneMedia =
      typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
    return standaloneMedia || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  private detectIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iphone|ipad|ipod/i.test(ua) || isIpadOs;
  }
}
