import { 
  Component, 
  input, 
  output, 
  signal, 
  computed, 
  inject, 
  OnInit, 
  ChangeDetectionStrategy, 
  ChangeDetectorRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';

import { ConfirmDeleteModalComponent, APP_ICONS } from '@granary/shared';
import { TranslatePipe } from '@granary/shared';
import { TranslationService } from '@granary/shared';
import { AuthService } from '@granary/shared';


export interface HouseholdDetailMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  isOwner: boolean;
}

@Component({
  selector: 'app-household-invite-sheet',
  standalone: true,
  imports: [CommonModule, ConfirmDeleteModalComponent, TranslatePipe, APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './household-invite-sheet.component.html',
  styleUrl: './household-invite-sheet.component.scss'
})
export class HouseholdInviteSheetComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translationService = inject(TranslationService);
  private readonly authService = inject(AuthService);

  customMembers = input<HouseholdDetailMember[]>();
  closeSheet = output<void>();
  removeMember = output<string>();

  readonly inviteUrl = computed(() => {
    const user = this.authService.currentUser();
    const host = typeof window !== 'undefined' ? window.location.host : 'granary.app';
    const userId = user?.id || 'pantry';
    return `${host}/join/${userId}`;
  });

  isCopied = signal<boolean>(false);
  qrCodeUrl = signal<string>('');
  memberToRemove = signal<HouseholdDetailMember | null>(null);

  members = signal<HouseholdDetailMember[]>([]);

  ngOnInit(): void {
    this.initMembers();
    this.generateQrCode(this.inviteUrl());
  }

  private initMembers(): void {
    const provided = this.customMembers();
    if (provided && provided.length > 0) {
      this.members.set(provided);
      return;
    }

    const currentUser = this.authService.currentUser();
    const displayName = currentUser?.name || currentUser?.userName || 'Ty';
    const email = currentUser?.email || '';

    const owner: HouseholdDetailMember = {
      id: currentUser?.id || 'owner',
      name: displayName,
      email: email,
      initials: this.getInitials(displayName),
      isOwner: true
    };

    this.members.set([owner]);
  }

  private getInitials(name: string): string {
    if (!name) return 'TY';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private async generateQrCode(url: string): Promise<void> {
    try {
      const fullUrl = `https://${url}`;
      
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 140,
        margin: 1, 
        color: {
          dark: '#1B1C18', 
          light: '#FFFFFF' 
        },
        errorCorrectionLevel: 'M' 
      });

      this.qrCodeUrl.set(dataUrl);
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Błąd generowania kodu QR:', err);
    }
  }

  copyLink(): void {
    navigator.clipboard.writeText(`https://${this.inviteUrl()}`);
    this.isCopied.set(true);
    setTimeout(() => {
      this.isCopied.set(false);
      this.cdr.markForCheck();
    }, 2000);
  }

  shareViaApps(): void {
    const shareData = {
      title: this.translationService.translate('householdInvite.shareTitle', 'Dołącz do mojej spiżarni w Smart Pantry'),
      text: this.translationService.translate('householdInvite.shareText', 'Wspólnie zarządzajmy domowymi zapasami i listą zakupów!'),
      url: `https://${this.inviteUrl()}`
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      this.copyLink();
    }
  }

  askRemoveMember(member: HouseholdDetailMember): void {
    this.memberToRemove.set(member);
  }

  cancelRemoveMember(): void {
    this.memberToRemove.set(null);
  }

  confirmRemoveMember(): void {
    const member = this.memberToRemove();
    if (member) {
      this.members.update(list => list.filter(m => m.id !== member.id));
      this.removeMember.emit(member.id);
      this.memberToRemove.set(null);
      this.cdr.markForCheck();
    }
  }
}