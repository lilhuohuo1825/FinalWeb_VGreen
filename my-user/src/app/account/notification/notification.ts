import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NotificationItem {
  id: number;
  type: 'order' | 'promotion' | 'other';
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.css'
})
export class Notification implements OnInit {
  @Output() unreadCountChange = new EventEmitter<number>();
  activeTab: string = 'all';
  
 // Dữ liệu thông báo hiện tại 
  notifications: NotificationItem[] = [
    {
      id: 1,
      type: 'order',
      title: 'Đơn hàng của bạn đã giao thành công',
      content: 'Đơn hàng với mã #VGR001 đã được giao thành công. Cảm ơn bạn đã tin tưởng VGreen!',
      timestamp: new Date('2024-01-15T10:30:00'),
      isRead: false
    },
    {
      id: 2,
      type: 'other',
      title: 'Thông báo khác',
      content: 'Sản phẩm từ giỏ hàng của bạn đã được cập nhật giá. Kiểm tra ngay!',
      timestamp: new Date('2024-01-14T15:20:00'),
      isRead: true
    },
    {
      id: 3,
      type: 'promotion',
      title: 'Khuyến mãi',
      content: 'Bạn có một voucher từ chương trình khuyến mãi tháng 1. Sử dụng ngay!',
      timestamp: new Date('2024-01-13T09:15:00'),
      isRead: false
    },
    {
      id: 4,
      type: 'order',
      title: 'Đơn hàng đang được xử lý',
      content: 'Đơn hàng #VGR002 của bạn đang được chuẩn bị và sẽ được giao trong 2-3 ngày tới.',
      timestamp: new Date('2024-01-12T14:45:00'),
      isRead: true
        }
  ];

  tabs = [
    { key: 'all', label: 'Tất cả thông báo' },
    { key: 'order', label: 'Cập nhật đơn hàng' },
    { key: 'promotion', label: 'Khuyến mãi' },
    { key: 'other', label: 'Thông báo khác' }
  ];

  ngOnInit(): void {
    this.updateUnreadCount();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  updateUnreadCount(): void {
    const unreadCount = this.notifications.filter(n => !n.isRead).length;
    this.unreadCountChange.emit(unreadCount);
  }

  get filteredNotifications(): NotificationItem[] {
    if (this.activeTab === 'all') {
      return this.notifications;
    }
    return this.notifications.filter(notification => notification.type === this.activeTab);
  }

  get hasNotifications(): boolean {
    return this.filteredNotifications.length > 0;
  }

  getTabBadge(tabKey: string): number {
    if (tabKey === 'all') {
      return this.notifications.filter(n => !n.isRead).length;
    }
    return this.notifications.filter(n => n.type === tabKey && !n.isRead).length;
  }

  formatTimestamp(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  markAsRead(notification: NotificationItem): void {
    if (!notification.isRead) {
      notification.isRead = true;
      this.updateUnreadCount();
    }
  }

  getNotificationIcon(type: string): string {
    switch(type) {
      case 'order':
        return 'assets/icons/order_dark.png';
      case 'promotion':
        return 'assets/icons/promotion_dark.png';
      case 'other':
        return 'assets/icons/notice_dark.png';
      default:
        return 'assets/icons/info.png';
    }
  }

  onMenuItemClicked(menuId: string): void {
 console.log('Menu item clicked:', menuId); 
  }

  deleteAllNotifications(): void {
    if (confirm('Bạn có chắc chắn muốn xóa tất cả thông báo?')) {
      this.notifications = [];
      this.updateUnreadCount();
    }
  }
}
