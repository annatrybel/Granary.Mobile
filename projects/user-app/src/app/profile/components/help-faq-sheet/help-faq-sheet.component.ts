import {
  Component,
  input,
  output,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService, ContactMessageDto, APP_ICONS, SwipeToCloseDirective } from '@granary/shared';
import { TranslatePipe } from '@granary/shared';



interface FaqItem {
  id: string;
  questionKey: string;
  defaultQuestion: string;
  answerKey: string;
  defaultAnswer: string;
}


@Component({
  selector: 'app-help-faq-sheet',
  standalone: true,
  imports: [CommonModule, TranslatePipe, APP_ICONS, SwipeToCloseDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-faq-sheet.component.html',
  styleUrl: './help-faq-sheet.component.scss'
})
export class HelpFaqSheetComponent {
  private readonly profileService = inject(ProfileService);
  private readonly cdr = inject(ChangeDetectorRef);


  userEmail = input.required<string>();
  userName = input<string>('');
  closeSheet = output<void>();

  expandedFaqId = signal<string | null>('1');

  readonly topics = [
    { id: 'app_issue', labelKey: 'faq.topicIssue', defaultLabel: 'Problem z aplikacją' },
    { id: 'account', labelKey: 'faq.topicAccount', defaultLabel: 'Pytanie o konto' },
    { id: 'suggestion', labelKey: 'faq.topicSuggestion', defaultLabel: 'Sugestia' }
  ];


  selectedTopic = signal<string>('Problem z aplikacją');
  messageText = signal<string>('');
  isSending = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  errorMessage = signal<string | null>(null);


  readonly faqList: FaqItem[] = [
    {
      id: '1',
      questionKey: 'faq.q1',
      defaultQuestion: 'Jak zaprosić domowników do spiżarni?',
      answerKey: 'faq.a1',
      defaultAnswer: 'W Ustawieniach profilu przejdź do sekcji „Gospodarstwo domowe” i kliknij strzałkę. Możesz tam skopiować unikalny link zaproszenia, wysłać go mailem lub pokazać kod QR drugiemu telefonowi. Zaproszone osoby zyskają natychmiastowy dostęp do Twoich zapasów.'
    },
    {
      id: '2',
      questionKey: 'faq.q2',
      defaultQuestion: 'Jak działa dopasowywanie dań Zero-Waste?',
      answerKey: 'faq.a2',
      defaultAnswer: 'Nasz algorytm porównuje produkty w Twojej lodówce ze składnikami przepisów na podstawie unikalnych identyfikatorów. Przepisy wykorzystujące produkty o najkrótszej dacie ważności są automatycznie umieszczane na samej górze listy.'
    },
    {
      id: '3',
      questionKey: 'faq.q3',
      defaultQuestion: 'Skąd aplikacja zna datę ważności?',
      answerKey: 'faq.a3',
      defaultAnswer: 'Każdy produkt w katalogu ma przypisany domyślny czas świeżości (np. nabiał 7 dni, warzywa 5 dni). Możesz w każdej chwili zmienić datę ważności, klikając w szczegóły produktu w magazynie.'
    },
    {
      id: '4',
      questionKey: 'faq.q4',
      defaultQuestion: 'Czy mogę dodać własny produkt spoza bazy?',
      answerKey: 'faq.a4',
      defaultAnswer: 'Tak! Wpisz nazwę w wyszukiwarkę i kliknij „Dodaj własny produkt”. Zostanie on zapisany w Twojej prywatnej spiżarni, a za pomocą różdżki możesz wygenerować dla niego zdjęcie przez AI.'
    }
  ];


  toggleFaq(id: string): void {
    this.expandedFaqId.update(current => (current === id ? null : id));
  }


  selectTopic(label: string): void {
    this.selectedTopic.set(label);
  }


  sendMessage(event: Event): void {
    event.preventDefault();
    const text = this.messageText().trim();
    if (!text) return;


    this.isSending.set(true);
    this.errorMessage.set(null);


    const payload: ContactMessageDto = {
      name: this.userName() || 'Użytkownik',
      email: this.userEmail(),
      subject: this.selectedTopic(),
      message: text
    };


    this.profileService.sendContactMessage(payload).subscribe({
      next: () => {
        this.isSending.set(false);
        this.isSuccess.set(true);
        this.messageText.set('');
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSending.set(false);
        this.errorMessage.set('Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie.');
        this.cdr.markForCheck();
      }
    });
  }
}
