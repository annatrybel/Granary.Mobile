import { Directive, ElementRef, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';

const DRAG_START_THRESHOLD_PX = 4;
const UP_RESISTANCE = 0.25;
const MAX_UP_STRETCH_PX = 48;
const CLOSE_DURATION_MS = 220;
const RESET_DURATION_MS = 200;
const HEADER_ZONE_PX = 80;

@Directive({
  selector: '[appSwipeToClose]',
  exportAs: 'swipeToClose',
  standalone: true
})
export class SwipeToCloseDirective implements OnInit, OnDestroy {
  @Output() readonly appSwipeToClose = new EventEmitter<void>();

  private readonly host: HTMLElement;
  private backdrop: HTMLElement | null = null;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private touchIdentifier: number | null = null;
  private offset = 0;
  private startedInHeader = false;
  private isTrackingTouch = false;
  private isDragging = false;
  private isClosing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly onBackdropClick = (): void => this.requestClose();

  constructor(elementRef: ElementRef<HTMLElement>) {
    this.host = elementRef.nativeElement;
  }

  ngOnInit(): void {
    this.backdrop = this.host.parentElement?.querySelector<HTMLElement>(':scope > .sheet-backdrop') ?? null;
    this.backdrop?.addEventListener('click', this.onBackdropClick);
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.backdrop?.removeEventListener('click', this.onBackdropClick);
  }

  requestClose(): void {
    if (this.isClosing) return;

    this.isClosing = true;
    this.isTrackingTouch = false;
    this.isDragging = false;
    this.clearTimer();

    const duration = this.prefersReducedMotion() ? 0 : CLOSE_DURATION_MS;
    if (duration > 0) {
      const distance = this.host.getBoundingClientRect().height + MAX_UP_STRETCH_PX;
      this.host.style.transition = `translate ${duration}ms cubic-bezier(0.4, 0, 1, 1)`;
      this.host.style.translate = `0 ${distance}px`;
      if (this.backdrop) {
        this.backdrop.style.transition = `opacity ${duration}ms ease-out`;
        this.backdrop.style.opacity = '0';
      }
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      this.appSwipeToClose.emit();
      this.timer = setTimeout(() => {
        this.timer = null;
        this.isClosing = false;
        this.restoreVisuals(true);
      }, 100);
    }, duration);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (this.isClosing || event.touches.length !== 1) return;

    const touch = event.touches.item(0);
    const target = event.target;
    if (!touch || !(target instanceof Element)) return;

    const inHeader = this.isHeaderTouch(target, touch.clientY);
    if (!inHeader && !this.isContentAtTop(target)) return;

    this.clearTimer();
    this.touchIdentifier = touch.identifier;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.startedInHeader = inHeader;
    this.offset = 0;
    this.isTrackingTouch = true;
    this.isDragging = false;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isTrackingTouch || event.touches.length !== 1) return;

    const touch = Array.from(event.touches).find(item => item.identifier === this.touchIdentifier);
    if (!touch) return;

    const deltaY = touch.clientY - this.touchStartY;
    const deltaX = touch.clientX - this.touchStartX;

    if (!this.isDragging) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.isTrackingTouch = false;
        return;
      }

      const movesDown = deltaY > DRAG_START_THRESHOLD_PX;
      const movesUp = deltaY < -DRAG_START_THRESHOLD_PX;
      if (!movesDown && !(movesUp && this.startedInHeader)) return;

      this.isDragging = true;
      this.host.style.transition = 'none';
      if (this.backdrop) this.backdrop.style.transition = 'none';
    }

    this.offset = deltaY >= 0 ? deltaY : -Math.min(MAX_UP_STRETCH_PX, -deltaY * UP_RESISTANCE);
    this.applyOffset();
    event.preventDefault();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.isTrackingTouch) return;

    const touchEnded = Array.from(event.changedTouches)
      .some(touch => touch.identifier === this.touchIdentifier);
    if (!touchEnded) return;

    this.isTrackingTouch = false;
    this.touchIdentifier = null;
    if (!this.isDragging) return;

    const elapsed = Math.max(Date.now() - this.touchStartTime, 1);
    const height = this.host.getBoundingClientRect().height;
    const threshold = Math.max(80, height * 0.25);
    const isQuickSwipe = this.offset >= 30 && this.offset / elapsed >= 0.6;
    this.isDragging = false;

    if (this.offset >= threshold || isQuickSwipe) {
      this.requestClose();
      return;
    }

    this.restoreVisuals(true);
  }

  @HostListener('touchcancel')
  onTouchCancel(): void {
    if (!this.isTrackingTouch) return;

    this.isTrackingTouch = false;
    this.touchIdentifier = null;
    if (this.isDragging) {
      this.isDragging = false;
      this.restoreVisuals(true);
    }
  }

  private applyOffset(): void {
    this.host.style.translate = `0 ${this.offset}px`;
    this.host.style.setProperty('--sheet-stretch', `${Math.max(0, -this.offset)}px`);

    if (this.backdrop) {
      const height = Math.max(this.host.getBoundingClientRect().height, 1);
      const progress = Math.min(Math.max(this.offset / height, 0), 1);
      this.backdrop.style.opacity = String(1 - progress * 0.9);
    }
  }

  private restoreVisuals(animated: boolean): void {
    this.offset = 0;
    const duration = animated && !this.prefersReducedMotion() ? RESET_DURATION_MS : 0;

    this.host.style.transition = duration ? `translate ${duration}ms ease-out` : '';
    this.host.style.translate = '0 0';
    this.host.style.removeProperty('--sheet-stretch');
    if (this.backdrop) {
      this.backdrop.style.transition = duration ? `opacity ${duration}ms ease-out` : '';
      this.backdrop.style.opacity = '1';
    }

    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.host.style.transition = '';
      this.host.style.translate = '';
      if (this.backdrop) {
        this.backdrop.style.transition = '';
        this.backdrop.style.opacity = '';
      }
    }, duration);
  }

  private isHeaderTouch(target: Element, touchY: number): boolean {
    return target.closest('[data-swipe-to-close-handle], .sheet-header, header') !== null
      || touchY - this.host.getBoundingClientRect().top <= HEADER_ZONE_PX;
  }

  private isContentAtTop(target: Element): boolean {
    let element: Element | null = target;
    while (element) {
      if (element instanceof HTMLElement && element.scrollHeight > element.clientHeight) {
        const overflowY = window.getComputedStyle(element).overflowY;
        const isScrollable = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
        if (isScrollable && element.scrollTop > 0) return false;
      }

      if (element === this.host) break;
      element = element.parentElement;
    }

    return true;
  }

  private prefersReducedMotion(): boolean {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
