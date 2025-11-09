import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { WishlistService } from '../../services/wishlist.service';
import { ReturnBadgeService } from '../../services/return-badge.service';
import { ReviewBadgeService } from '../../services/review-badge.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Logout } from '../../auth/logout/logout';

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  route: string;
  badge?: number;
  isActive?: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  memberSince?: string;
  phone?: string;
  address?: string;
  customerType?: string;
  totalSpent?: number;
}

@Component({
  selector: 'app-sidebar-customer',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, Logout],
  templateUrl: './sidebar-customer.html',
  styleUrl: './sidebar-customer.css',
})
export class SidebarCustomer implements OnInit, OnChanges, OnDestroy {
  @Output() menuItemClicked = new EventEmitter<string>();
  @Input() notificationBadge: number = 0;

  // Mobile sidebar state
  isMobileSidebarOpen = false;
  // Logout popup state
  isLogoutPopupOpen = false;

  // Wishlist subscription
  private wishlistSubscription: Subscription = new Subscription();
  // Return badge subscription
  private returnBadgeSubscription: Subscription = new Subscription();
  // Review badge subscription
  private reviewBadgeSubscription: Subscription = new Subscription();
  // Router subscription
  private routerSubscription?: Subscription;

  // User info (get from service)
  userProfile: UserProfile = {
    name: 'Thu Hà',
    email: 'alice@email.com',
    avatar: '/assets/image/avt.png',
    memberSince: '2024',
    phone: '123456789',
    address: 'Hà Nội',
    customerType: 'Regular',
  };

  // Display info based on priority (Họ tên => SĐT => Email)
  getDisplayInfo(): { primary: string; secondary: string } {
    const { name, phone, email } = this.userProfile;

    // Always show name as primary
    const primary = name || 'Khách hàng';

    // Show phone as secondary if available, otherwise email
    const secondary = phone || email || '';

    return { primary, secondary };
  }

  // Check if secondary info is phone
  isSecondaryPhone(): boolean {
    return !!this.userProfile.phone;
  }

  // Calculate points from TotalSpent (10k = 1 điểm)
  getCustomerPoints(): number {
    const totalSpent = this.userProfile.totalSpent || 0;
    return Math.floor(totalSpent / 10000);
  }

  // Get tooltip text for customer badge
  getCustomerBadgeTooltip(): string {
    const points = this.getCustomerPoints();
    const totalSpent = this.userProfile.totalSpent || 0;
    // Format: "Điểm tích lũy: X điểm | Tổng chi tiêu: Y đ"
    return `Điểm tích lũy: ${points.toLocaleString(
      'vi-VN'
    )} điểm | Tổng chi tiêu: ${totalSpent.toLocaleString('vi-VN')} đ`;
  }

  // Menu items
  menuItems: MenuItem[] = [
    {
      id: 'profile',
      icon: '/assets/icons/person.png',
      label: 'Tài khoản cá nhân',
      route: '/account/profile',
      isActive: false,
    },
    {
      id: 'addresses',
      icon: '/assets/icons/map.png',
      label: 'Sổ địa chỉ',
      route: '/account/address',
      badge: 0,
      isActive: false,
    },
    {
      id: 'orders',
      icon: '/assets/icons/order.png',
      label: 'Quản lý đơn hàng',
      route: '/account/orders',
      badge: 0,
      isActive: true,
    },
    {
      id: 'returns',
      icon: '/assets/icons/return.png',
      label: 'Quản lý đổi trả',
      route: '/account/return-management',
      badge: 0,
      isActive: false,
    },
    {
      id: 'reviews',
      icon: '/assets/icons/star_outline.png',
      label: 'Đánh giá đơn hàng',
      route: '/account/reviews',
      badge: 0,
      isActive: false,
    },
    {
      id: 'wishlist',
      icon: '/assets/icons/heart_outline.png',
      label: 'Sản phẩm yêu thích',
      route: '/account/wishlist',
      badge: 0,
      isActive: false,
    },
    {
      id: 'notifications',
      icon: '/assets/icons/notice.png',
      label: 'Thông báo',
      route: '/account/notifications',
      badge: 0,
      isActive: false,
    },
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private wishlistService: WishlistService,
    private returnBadgeService: ReturnBadgeService,
    private reviewBadgeService: ReviewBadgeService
  ) {}

  ngOnInit(): void {
    // Get current route and set active
    this.setActiveMenuItem(this.router.url);
    this.loadUserProfile();
    this.updateNotificationBadge();
    this.subscribeToWishlist();
    this.subscribeToReturnBadge();
    this.subscribeToReviewBadge();
    this.updateReviewsBadge();
    this.updateReturnsBadge();

    // Listen for router navigation events
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.setActiveMenuItem(event.urlAfterRedirects || this.router.url);
      });

    // Listen for storage changes to update badges (cross-tab only, same-tab uses services)
    window.addEventListener('storage', (e: StorageEvent) => {
      if (
        e.key === 'returnManagementData' ||
        e.key === 'returnManagementDataChanged' ||
        e.key === 'returnTabCounts'
      ) {
        this.updateReturnsBadge();
      }
      if (e.key === 'reviewBadgeCount') {
        this.updateReviewsBadge();
      }
      // Listen for user info updates (including TotalSpent updates)
      if (e.key === 'user' || e.key === 'userInfo' || e.key === 'userDataRefreshed') {
        this.loadUserProfile();
      }
    });

    // Listen for custom events to update user profile in real-time (same tab)
    window.addEventListener('userInfoUpdated', () => {
      this.loadUserProfile();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['notificationBadge']) {
      this.updateNotificationBadge();
    }
  }

  updateNotificationBadge(): void {
    const notificationItem = this.menuItems.find((item) => item.id === 'notifications');
    if (notificationItem) {
      notificationItem.badge = this.notificationBadge;
    }
  }

  // Subscribe to wishlist changes
  subscribeToWishlist(): void {
    this.wishlistSubscription = this.wishlistService.wishlist$.subscribe((wishlist) => {
      this.updateWishlistBadge(wishlist.length);
    });
  }

  // Subscribe to return badge changes
  subscribeToReturnBadge(): void {
    this.returnBadgeSubscription = this.returnBadgeService.pendingCount$.subscribe(
      (count: number) => {
        this.updateReturnBadgeFromService(count);
      }
    );
  }

  // Subscribe to review badge changes
  subscribeToReviewBadge(): void {
    this.reviewBadgeSubscription = this.reviewBadgeService.unreviewedCount$.subscribe(
      (count: number) => {
        this.updateReviewBadgeFromService(count);
      }
    );
  }

  // Update wishlist badge
  updateWishlistBadge(count: number): void {
    const wishlistItem = this.menuItems.find((item) => item.id === 'wishlist');
    if (wishlistItem) {
      wishlistItem.badge = count;
    }
  }

  // Update reviews badge from localStorage (fallback/initial load)
  updateReviewsBadge(): void {
    const saved = localStorage.getItem('reviewBadgeCount');
    if (saved) {
      const count = parseInt(saved, 10);
      this.updateReviewBadgeFromService(count);
    }
  }

  // Update review badge from service (real-time update)
  updateReviewBadgeFromService(count: number): void {
    const reviewsItem = this.menuItems.find((item) => item.id === 'reviews');
    if (reviewsItem) {
      reviewsItem.badge = count;
    }
  }

  // Update returns badge based on tab count from return-management component
  updateReturnsBadge(): void {
    let pendingCount = 0;

    // Lấy tab counts từ return-management component
    const tabCountsData = localStorage.getItem('returnTabCounts');
    if (tabCountsData) {
      try {
        const tabCounts = JSON.parse(tabCountsData);
        // Lấy count của tab "Đang chờ xử lý" (id: 'processing_return')
        pendingCount = tabCounts['processing_return'] || 0;
      } catch (e) {
        console.error('Error parsing return tab counts:', e);
      }
    }

    this.updateReturnBadgeFromService(pendingCount);
  }

  // Update return badge from service (real-time update)
  updateReturnBadgeFromService(count: number): void {
    const returnsItem = this.menuItems.find((item) => item.id === 'returns');
    if (returnsItem) {
      returnsItem.badge = count;
    }
  }

  // Load user profile from backend (MongoDB) first, fallback to localStorage
  loadUserProfile(): void {
    // Lấy CustomerID từ localStorage
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      console.log(' [Sidebar] No user data in localStorage');
      this.userProfile.avatar = '/assets/image/avt.png';
      return;
    }

    try {
      const user = JSON.parse(savedUser);
      const customerID = user.CustomerID;

      if (!customerID || customerID === 'guest') {
        console.log(' [Sidebar] No CustomerID found, using localStorage data');
        this.loadUserProfileFromLocalStorage(user);
        return;
      }

      // Load từ backend trước (MongoDB)
      this.http.get<any>(`/api/auth/user/${customerID}`).subscribe({
        next: (response) => {
          if (response.success && response.user) {
            const backendUser = response.user;
            console.log(' [Sidebar] Loaded user profile from backend:', backendUser);

            // Cập nhật user profile từ backend
            this.userProfile = {
              name: backendUser.FullName || '',
              email: backendUser.Email || '',
              avatar: '/assets/image/avt.png',
              phone: backendUser.Phone || '',
              address: backendUser.Address || '',
              customerType: backendUser.CustomerTiering || 'Đồng',
              totalSpent: backendUser.TotalSpent || 0,
              memberSince: backendUser.RegisterDate
                ? new Date(backendUser.RegisterDate).getFullYear().toString()
                : '2024',
            };

            // Cập nhật localStorage với dữ liệu mới nhất từ backend
            const updatedUser = {
              ...user,
              FullName: backendUser.FullName || '',
              Email: backendUser.Email || '',
              Phone: backendUser.Phone || '',
              Address: backendUser.Address || '',
              CustomerTiering: backendUser.CustomerTiering || 'Đồng',
              TotalSpent: backendUser.TotalSpent || 0,
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            console.log(' [Sidebar] Updated localStorage with backend data');
          } else {
            console.warn(' [Sidebar] Backend response invalid, using localStorage');
            this.loadUserProfileFromLocalStorage(user);
          }
        },
        error: (error) => {
          console.error(' [Sidebar] Error loading user from backend:', error);
          console.log(' [Sidebar] Falling back to localStorage');
          this.loadUserProfileFromLocalStorage(user);
        },
      });
    } catch (error) {
      console.error(' [Sidebar] Error parsing user data:', error);
      this.userProfile.avatar = '/assets/image/avt.png';
    }
  }

  // Load user profile from localStorage (fallback)
  private loadUserProfileFromLocalStorage(user: any): void {
    // Prioritize FullName/fullName from localStorage['user'] (from API update)
    // If FullName/fullName is null or empty string, it means user deleted the name
    let userName = '';
    if (user.FullName !== undefined) {
      userName = user.FullName || '';
    } else if (user.fullName !== undefined) {
      userName = user.fullName || '';
    } else {
      // Fallback to other fields only if FullName/fullName not explicitly set
      userName = user.full_name || user.name || '';
    }

    this.userProfile = {
      name: userName,
      email: user.Email || user.email || '',
      avatar: user.avatar || '/assets/image/avt.png',
      phone: user.Phone || user.phoneNumber || user.phone || '',
      address: user.Address || user.address || '',
      customerType: user.CustomerTiering || user.CustomerType || user.customer_type || 'Đồng',
      totalSpent: user.TotalSpent || user.totalSpent || 0,
      memberSince:
        user.RegisterDate || user.register_date || user.createdAt
          ? new Date(user.RegisterDate || user.register_date || user.createdAt)
              .getFullYear()
              .toString()
          : '2024',
    };

    // Load additional info from userInfo if available
    const userInfoStr = localStorage.getItem('userInfo');
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        // Always update from userInfo if it exists (even if empty, to handle deletion)
        if (userInfo.fullName !== undefined) {
          this.userProfile.name = userInfo.fullName || '';
        }
        if (userInfo.phone && !this.userProfile.phone) {
          this.userProfile.phone = userInfo.phone;
        }
        if (userInfo.email && !this.userProfile.email) {
          this.userProfile.email = userInfo.email;
        }
        if (userInfo.avatar) {
          this.userProfile.avatar = userInfo.avatar;
        }
      } catch (error) {
        console.error('Error parsing userInfo:', error);
      }
    }

    console.log(' [Sidebar] Loaded user profile from localStorage:', this.userProfile);
  }

  // Set active menu item based on route
  setActiveMenuItem(route: string): void {
    // First, reset all items to inactive
    this.menuItems.forEach((item) => {
      item.isActive = false;
    });

    // Sort by route length (longest first) to handle overlapping routes
    const sortedItems = [...this.menuItems].sort((a, b) => b.route.length - a.route.length);

    // Set active the first matching item
    for (const item of sortedItems) {
      if (route === item.route || route.startsWith(item.route + '/')) {
        const originalItem = this.menuItems.find((m) => m.id === item.id);
        if (originalItem) {
          originalItem.isActive = true;
        }
        break; // Only activate the first (longest) match
      }
    }
  }

  // Handle menu click
  onMenuItemClick(item: MenuItem): void {
    // Set active
    this.menuItems.forEach((m) => (m.isActive = false));
    item.isActive = true;

    // Navigate
    this.router.navigate([item.route]);

    // Close mobile sidebar after navigation
    this.closeMobileSidebar();

    // Emit event
    this.menuItemClicked.emit(item.id);
  }

  // Toggle mobile sidebar
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  // Close mobile sidebar
  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }

  // Handle overlay click to close sidebar
  onOverlayClick(): void {
    this.closeMobileSidebar();
  }

  // Logout
  onLogout(): void {
    // Đóng sidebar khi nhấn nút logout (nếu đang mở ở mobile)
    this.closeMobileSidebar();
    // Mở popup xác nhận logout
    this.isLogoutPopupOpen = true;
  }

  confirmLogout(): void {
    // Clear user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    sessionStorage.clear();

    console.log(' User confirmed logout - clearing session');

    // Close popup and redirect to home
    this.isLogoutPopupOpen = false;
    window.location.href = '/';
  }

  cancelLogout(): void {
    this.isLogoutPopupOpen = false;
  }

  ngOnDestroy(): void {
    if (this.wishlistSubscription) {
      this.wishlistSubscription.unsubscribe();
    }
    if (this.returnBadgeSubscription) {
      this.returnBadgeSubscription.unsubscribe();
    }
    if (this.reviewBadgeSubscription) {
      this.reviewBadgeSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
