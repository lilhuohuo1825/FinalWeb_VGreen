import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarCustomer } from '../sidebar-customer/sidebar-customer';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarCustomer],
  templateUrl: './account-layout.html',
  styleUrl: './account-layout.css',
})
export class AccountLayout implements OnInit, OnDestroy {
  notificationBadge: number = 0;
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
 // Subscribe to notification count changes 
    const sub = this.notificationService.unreadCount$.subscribe((count: number) => {
      this.notificationBadge = count;
    });
    this.subscription.add(sub);

 // Get initial count 
    this.notificationBadge = this.notificationService.getUnreadCount();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
