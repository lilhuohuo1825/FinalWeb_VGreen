import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private unreadCountSubject = new BehaviorSubject<number>(2);
  public unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

  constructor() {
    this.loadUnreadCount();
  }

  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
 // Lưu vào localStorage để persist 
    localStorage.setItem('notificationBadge', count.toString());
  }

  incrementUnreadCount(): void {
    const current = this.unreadCountSubject.value;
    this.setUnreadCount(current + 1);
  }

  decrementUnreadCount(): void {
    const current = this.unreadCountSubject.value;
    this.setUnreadCount(Math.max(0, current - 1));
  }

  resetUnreadCount(): void {
    this.setUnreadCount(0);
  }

  private loadUnreadCount(): void {
    const saved = localStorage.getItem('notificationBadge');
    if (saved) {
      this.unreadCountSubject.next(parseInt(saved, 10));
    }
  }
}
