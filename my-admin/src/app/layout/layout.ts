import { Component, computed, effect, OnInit, OnDestroy, ElementRef, ViewChild, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService, AdminNotification } from '../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  standalone: true
})
export class Layout implements OnInit, OnDestroy {
  @ViewChild('userDropdownWrapper') userDropdownWrapper!: ElementRef;
  
  currentPageTitle: string = 'Tổng quan';
  isSidebarCollapsed: boolean = false;
  showNotificationDropdown: boolean = false;
  showUserDropdown: boolean = false;
  showLogoutPopup: boolean = false;
  
  // Dark mode state
  isDarkMode = signal<boolean>(false);
  
  // Notifications
  notifications: AdminNotification[] = [];
  unreadCount: number = 0;
  private notificationSubscription: Subscription = new Subscription();

  // Danh sách các trang
  private pages: { [key: string]: { title: string, route: string } } = {
    'dashboard': { 
      title: 'Tổng quan', 
      route: '/dashboard'
    },
    'products': { 
      title: 'Sản phẩm', 
      route: '/products'
    },
    'orders': { 
      title: 'Đơn hàng', 
      route: '/orders'
    },
    'customers': { 
      title: 'Khách hàng', 
      route: '/customers'
    },
    'promotions': { 
      title: 'Khuyến mãi', 
      route: '/promotions'
    },
    'posts': { 
      title: 'Bài viết', 
      route: '/posts'
    },
    'settings': { 
      title: 'Cài đặt', 
      route: '/settings'
    }
  };

  // Computed signals từ AuthService
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  currentUser = computed(() => this.authService.currentUser());
  userDisplayName = computed(() => 
    this.isAuthenticated() 
      ? this.currentUser()?.name || 'Quản trị viên'
      : 'Đăng nhập'
  );

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    // Effect để redirect về login nếu không authenticated
    // CHỈ redirect khi đang ở trong layout route và không authenticated
    effect(() => {
      const url = this.router.url;
      const isAuthenticated = this.isAuthenticated();
      
      // Chỉ redirect nếu:
      // 1. Không authenticated
      // 2. Không phải trang login
      // 3. URL không chứa 'undefined' hoặc lỗi routing
      if (!isAuthenticated && url && !url.includes('/login') && !url.includes('undefined')) {
        console.log('Layout: Not authenticated, redirecting to login');
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnInit(): void {
    // Đã setup trong constructor
    // Load theme preference from localStorage
    this.loadTheme();
    
    // Load notifications
    this.notificationService.loadNotifications();
    this.notificationService.loadUnreadCount();
    
    // Subscribe to notifications
    const notifSub = this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications.slice(0, 5); // Show only latest 5 in dropdown
    });
    this.notificationSubscription.add(notifSub);
    
    // Subscribe to unread count
    const countSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
    this.notificationSubscription.add(countSub);
  }

  ngOnDestroy(): void {
    this.notificationSubscription.unsubscribe();
  }

  /**
   * Đóng dropdown khi click ra ngoài
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.showUserDropdown) {
      const clickedElement = event.target as HTMLElement;
      
      // Kiểm tra ViewChild đã được khởi tạo chưa
      if (this.userDropdownWrapper?.nativeElement) {
        const wrapperElement = this.userDropdownWrapper.nativeElement;
        
        // Nếu click không phải trong dropdown wrapper, đóng dropdown
        if (!wrapperElement.contains(clickedElement)) {
          this.showUserDropdown = false;
        }
      } else {
        // Nếu ViewChild chưa sẵn sàng, kiểm tra bằng class
        const userInfoElement = clickedElement.closest('.top-user-info');
        const dropdownElement = clickedElement.closest('.user-dropdown');
        
        // Nếu click không phải vào user info hoặc dropdown, đóng dropdown
        if (!userInfoElement && !dropdownElement) {
          this.showUserDropdown = false;
        }
      }
    }
  }

  /**
   * Điều hướng đến trang khi click menu
   */
  navigateTo(pageKey: string, event: Event): void {
    event.preventDefault();
    
    // Kiểm tra authentication
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    const page = this.pages[pageKey];
    if (page) {
      // Cập nhật tiêu đề
      this.currentPageTitle = page.title;
      
      // Navigate to route
      this.router.navigate([page.route]);
      
      // Cập nhật active state
      this.updateActiveMenu(event.target as HTMLElement);
      
      // Tự động đóng sidebar trên mobile
      if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          sidebar.classList.remove('active');
        }
      }
    }
  }

  /**
   * Cập nhật trạng thái active cho menu
   */
  private updateActiveMenu(element: HTMLElement): void {
    // Xóa active khỏi tất cả menu links
    const allLinks = document.querySelectorAll('.menu-link');
    allLinks.forEach(link => link.classList.remove('active'));
    
    // Thêm active cho link được click
    const menuLink = element.closest('.menu-link');
    if (menuLink) {
      menuLink.classList.add('active');
    }
  }

  /**
   * Toggle sidebar collapse/expand
   */
  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  /**
   * Hiển thị popup xác nhận đăng xuất
   */
  logout(): void {
    this.showLogoutPopup = true;
  }

  /**
   * Xác nhận đăng xuất
   */
  confirmLogout(): void {
    this.showLogoutPopup = false;
    this.authService.logout();
  }

  /**
   * Hủy đăng xuất
   */
  cancelLogout(): void {
    this.showLogoutPopup = false;
  }

  /**
   * Xử lý click vào user info (hiển thị dropdown nếu đã authenticated, chuyển login nếu chưa)
   */
  onUserInfoClick(event: Event): void {
    event.stopPropagation(); // Ngăn event bubble để không trigger onClickOutside
    
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
    } else {
      // Toggle user dropdown
      this.showUserDropdown = !this.showUserDropdown;
      // Đóng các dropdown khác
      this.showNotificationDropdown = false;
    }
  }

  /**
   * Đóng user dropdown khi click ra ngoài
   */
  closeUserDropdown(): void {
    this.showUserDropdown = false;
  }


  /**
   * Đánh dấu thông báo đã đọc
   */
  markAsRead(notificationId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!notificationId) {
      return;
    }
    this.notificationService.markAsRead(notificationId);
    // Reload unread count immediately
    setTimeout(() => {
      this.notificationService.loadUnreadCount();
    }, 100);
  }

  /**
   * Xử lý click vào notification - điều hướng đến trang tương ứng
   */
  onNotificationClick(notification: AdminNotification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    // Đóng dropdown notification
    this.showNotificationDropdown = false;
    
    // Đánh dấu đã đọc nếu chưa đọc
    if (!notification.read) {
      const notificationId = notification._id || notification.id || '';
      if (notificationId) {
        this.markAsRead(notificationId);
      }
    }
    
    // Điều hướng dựa trên loại notification
    if (notification.orderId) {
      // Điều hướng đến trang chi tiết đơn hàng
      this.router.navigate(['/orders', notification.orderId]);
    } else {
      // Nếu không có orderId, điều hướng đến trang đơn hàng chung
      this.router.navigate(['/orders']);
    }
  }

  /**
   * Xem tất cả thông báo
   */
  viewAllNotifications(): void {
    this.showNotificationDropdown = false;
    this.router.navigate(['/orders']); // Navigate to orders page for now
  }

  /**
   * Get notification title
   */
  getNotificationTitle(notification: AdminNotification): string {
    if (notification.title) {
      return notification.title;
    }
    
    switch (notification.type) {
      case 'order_cancellation_request':
        return `Yêu cầu hủy đơn hàng #${notification.orderId}`;
      case 'new_order':
        return `Đơn hàng mới #${notification.orderId}`;
      case 'return_request':
        return `Yêu cầu trả hàng #${notification.orderId}`;
      case 'system':
        return 'Thông báo hệ thống';
      default:
        return 'Thông báo';
    }
  }

  /**
   * Get notification message
   */
  getNotificationMessage(notification: AdminNotification): string {
    if (notification.message) {
      return notification.message;
    }
    
    switch (notification.type) {
      case 'order_cancellation_request':
        return `Khách hàng ${notification.customerId} yêu cầu hủy đơn hàng ${notification.orderId}. Lý do: ${notification.reason || 'Không có lý do'}`;
      case 'new_order':
        return `Có đơn hàng mới từ khách hàng ${notification.customerId} với tổng giá trị ${notification.orderTotal?.toLocaleString('vi-VN') || 0}₫`;
      case 'return_request':
        return `Khách hàng ${notification.customerId} yêu cầu trả hàng cho đơn hàng ${notification.orderId}`;
      default:
        return '';
    }
  }

  /**
   * Format timestamp
   */
  formatTimeAgo(date: Date | string): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  }

  /**
   * Get notification icon
   */
  getNotificationIcon(notification: AdminNotification): string {
    switch (notification.type) {
      case 'order_cancellation_request':
        return 'asset/icons/trash_red.png';
      case 'new_order':
        return 'asset/icons/order.png';
      case 'return_request':
        return 'asset/icons/return.png';
      case 'system':
        return 'asset/icons/info.png';
      default:
        return 'asset/icons/order.png';
    }
  }

  /**
   * Load theme preference from localStorage
   */
  private loadTheme(): void {
    const savedTheme = localStorage.getItem('admin_theme');
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      this.isDarkMode.set(isDark);
      this.applyTheme(isDark);
    } else {
      // Default to light mode
      this.isDarkMode.set(false);
      this.applyTheme(false);
    }
  }

  /**
   * Toggle theme between dark and light mode
   */
  toggleTheme(): void {
    const newMode = !this.isDarkMode();
    this.isDarkMode.set(newMode);
    this.applyTheme(newMode);
    localStorage.setItem('admin_theme', newMode ? 'dark' : 'light');
  }

  /**
   * Apply theme to document
   */
  private applyTheme(isDark: boolean): void {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    if (isDark) {
      htmlElement.classList.add('dark-mode');
      bodyElement.classList.add('dark-mode');
    } else {
      htmlElement.classList.remove('dark-mode');
      bodyElement.classList.remove('dark-mode');
    }
  }
}
