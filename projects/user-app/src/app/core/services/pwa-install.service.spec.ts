import { TestBed } from '@angular/core/testing';
import { PwaInstallService } from './pwa-install.service';

function createPromptEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: string; platform: string }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome, platform: 'web' });
  return event;
}

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PwaInstallService);
  });

  it('is not installable until the browser fires beforeinstallprompt', async () => {
    expect(service.canPrompt()).toBe(false);
    expect(await service.promptInstall()).toBe('unavailable');
  });

  it('captures beforeinstallprompt and prevents the default mini-infobar', () => {
    const event = createPromptEvent('accepted');
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(service.canPrompt()).toBe(true);
  });

  it('marks the app as installed after an accepted prompt', async () => {
    const event = createPromptEvent('accepted');
    window.dispatchEvent(event);

    expect(await service.promptInstall()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(service.isInstalled()).toBe(true);
    expect(service.canPrompt()).toBe(false);
  });

  it('keeps the install option after a dismissed prompt', async () => {
    window.dispatchEvent(createPromptEvent('dismissed'));

    expect(await service.promptInstall()).toBe('dismissed');
    expect(service.isInstalled()).toBe(false);
    expect(service.canShowInstall()).toBe(true);
  });

  it('hides the install option after appinstalled', () => {
    window.dispatchEvent(new Event('appinstalled'));

    expect(service.isInstalled()).toBe(true);
    expect(service.canShowInstall()).toBe(false);
  });
});
