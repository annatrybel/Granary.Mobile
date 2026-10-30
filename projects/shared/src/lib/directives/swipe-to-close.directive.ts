import { Directive, ElementRef, EventEmitter, HostListener, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[appSwipeToClose]',
  standalone: true
})
export class SwipeToCloseDirective implements OnDestroy {
  @Output() readonly appSwipeToClose = new EventEmitter<void>();

  private readonly host: HTMLElement;
  private readonly originalTransform: string;
  private readonly originalTransition: string;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private touchIdentifier: number | null = null;
  private dragDistance = 0;
  private isTrackingTouch = false;
  private isDragging = false;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(elementRef: ElementRef<HTMLElement>) {
    this.host = elementRef.nativeElement;
    this.originalTransform = this.host.style.transform;
    this.originalTransition = this.host.style.transition;
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;

    const touch = event.touches.item(0);
    const target = event.target;
    if (!touch || !(target instanceof Element)) return;
    if (!this.isAtTopOfScrollableContent(target, touch.clientY)) return;

    this.touchIdentifier = touch.identifier;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.dragDistance = 0;
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

    if (!this.isDragging && Math.abs(deltaX) > Math.abs(deltaY)) {
      this.isTrackingTouch = false;
      return;
    }

    if (deltaY <= 0) {
      if (this.isDragging) {
        this.dragDistance = 0;
        this.host.style.transform = 'translateY(0)';
        event.preventDefault();
      }
      return;
    }

    this.isDragging = true;
    this.dragDistance = deltaY;
    this.clearResetTimer();
    this.host.style.transition = 'none';
    this.host.style.transform = `translateY(${deltaY}px)`;
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

    const elapsed = Math.max(Date.now() - this.touchStartTime, 1);
    const isQuickSwipe = this.dragDistance >= 30 && this.dragDistance / elapsed >= 0.6;
    if (this.dragDistance >= 100 || isQuickSwipe) {
      this.appSwipeToClose.emit();
      return;
    }

    this.resetPosition();
  }

  @HostListener('touchcancel')
  onTouchCancel(): void {
    if (!this.isTrackingTouch) return;

    this.isTrackingTouch = false;
    this.touchIdentifier = null;
    this.resetPosition();
  }

  ngOnDestroy(): void {
    this.clearResetTimer();
  }

  private isAtTopOfScrollableContent(target: Element, touchY: number): boolean {
    const isHeaderTouch = target.closest('[data-swipe-to-close-handle], .sheet-header, header') !== null
      || touchY - this.host.getBoundingClientRect().top <= 80;
    if (isHeaderTouch) return true;

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

  private resetPosition(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.host.style.transition = 'transform 0.2s ease-out';
    this.host.style.transform = 'translateY(0)';
    this.clearResetTimer();
    this.resetTimer = setTimeout(() => {
      this.host.style.transform = this.originalTransform;
      this.host.style.transition = this.originalTransition;
      this.resetTimer = null;
    }, 200);
  }

  private clearResetTimer(): void {
    if (this.resetTimer !== null) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}
