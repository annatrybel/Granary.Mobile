import { Component, input, output, signal, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import * as QRCode from 'qrcode'; // <-- 1. Import biblioteki

import { ConfirmDeleteModalComponent } from '../../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

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
  imports: [
    CommonModule, 
    LucideAngularModule,
    ConfirmDeleteModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './household-invite-sheet.component.html',
  styleUrl: './household-invite-sheet.component.scss'
})
export class HouseholdInviteSheetComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  closeSheet = output<void>();
  removeMember = output<string>();

  readonly inviteUrl = 'smartpantry.app/join/spizarnia-kowalscy';
  isCopied = signal<boolean>(false);

  members = signal<HouseholdDetailMember[]>([
    { id: '1', name: 'Anna Kowalska', email: 'anna.kowalska@email.com', initials: 'AK', isOwner: true },
    { id: '2', name: 'Marek Kowalski', email: 'marek.k@email.com', initials: 'MK', isOwner: false },
    { id: '3', name: 'Jan Kowalski', email: 'jasiu@email.com', initials: 'JK', isOwner: false }
  ]);

  qrCodeUrl = signal<string>('');
  memberToRemove = signal<HouseholdDetailMember | null>(null);

  ngOnInit(): void {
    this.generateQrCode(this.inviteUrl);
  }

  private async generateQrCode(url: string): Promise<void> {
    try {
      const fullUrl = `https://${url}`;
      
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 128,
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
      console.error('Błąd generowania kodu QR offline:', err);
    }
  }

  copyLink(): void {
    navigator.clipboard.writeText(`https://${this.inviteUrl}`);
    this.isCopied.set(true);
    setTimeout(() => {
      this.isCopied.set(false);
      this.cdr.markForCheck();
    }, 2000);
  }

  shareViaApps(): void {
    const shareData = {
      title: 'Dołącz do mojej spiżarni w Smart Pantry',
      text: 'Wspólnie zarządzajmy domowymi zapasami i listą zakupów!',
      url: `https://${this.inviteUrl}`
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
    }
  }
}