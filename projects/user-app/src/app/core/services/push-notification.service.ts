import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { ProfileService } from '@granary/shared';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly profileService = inject(ProfileService);

  get isSupported(): boolean {
    return this.swPush.isEnabled && typeof Notification !== 'undefined';
  }

  get permission(): NotificationPermission | 'unsupported' {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  }

  async subscribe(): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const { publicKey } = await firstValueFrom(this.profileService.getPushPublicKey());
      const sub = await this.swPush.requestSubscription({ serverPublicKey: publicKey });
      return await this.sendToServer(sub);
    } catch (err) {
      console.error('Nie udało się włączyć powiadomień push:', err);
      return false;
    }
  }

  async syncIfGranted(): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') return;
    await this.subscribe();
  }

  private async sendToServer(sub: PushSubscription): Promise<boolean> {
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.['p256dh'] || !json.keys?.['auth']) return false;

    await firstValueFrom(this.profileService.savePushSubscription({
      endpoint: json.endpoint,
      p256dh: json.keys['p256dh'],
      auth: json.keys['auth'],
    }));
    return true;
  }
}
