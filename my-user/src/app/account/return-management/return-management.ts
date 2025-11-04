import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { ReturnBadgeService } from '../../services/return-badge.service';
import { ToastService } from '../../services/toast.service';
import { OrderService } from '../../services/order.service';

interface ReturnItem {
  id: string;
  status: string;
  date: string;
  product: Product;
  quantity: number;
  totalValue: number;
  totalAmount: number;
  allProducts?: any[]; // Tất cả sản phẩm trong đơn hàng
  orderId?: string; // Local order ID
  orderNumber?: string; // Order number for display (ORD...)
}

interface Product {
  _id: string;
  ProductName: string;
  Category: string;
  Subcategory: string;
  Price: number;
  Unit: string;
  Image: string;
  Brand: string;
}

@Component({
  selector: 'app-return-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './return-management.html',
  styleUrls: ['./return-management.css'],
})
export class ReturnManagementComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput?: ElementRef;
  @ViewChild('tabList') tabList?: ElementRef;

  searchQuery: string = '';
  activeTab: string = 'processing_return';
  canScrollLeft: boolean = false;
  canScrollRight: boolean = false;

 // Returns data
  returns: ReturnItem[] = [];

 // Track which returns are expanded to show all products
  expandedReturns: Set<string> = new Set();

 // Modal properties
  showReturnModal: boolean = false;
  selectedReturnItem: ReturnItem | null = null;
  selectedReason: string = '';
  detailedDescription: string = '';
  isModalExpanded: boolean = false;
  showSuccessModal: boolean = false;
  showCancelModal: boolean = false;
  cancelReturnItem: ReturnItem | null = null;

  tabs = [
    { id: 'processing_return', label: 'Đang chờ xử lý', count: 0 },
    { id: 'returning', label: 'Đang trả hàng', count: 0 },
    { id: 'returned', label: 'Đã trả hàng/ hoàn tiền', count: 0 },
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private returnBadgeService: ReturnBadgeService,
    private toastService: ToastService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
 // Load returns to sync with orders (don't clear data to preserve changes)
    this.loadReturns();

 // Listen for changes in orders data
    window.addEventListener('storage', (e) => {
      if (e.key === 'ordersDataChanged' || e.key === 'returnManagementDataChanged') {
        this.syncWithCompletedOrders();
      }
    });
  }

  ngAfterViewInit(): void {
    this.checkScrollButtons();
 // Thêm listener cho scroll và resize
    if (this.tabList?.nativeElement) {
      this.tabList.nativeElement.addEventListener('scroll', () => this.checkScrollButtons());
    }
    window.addEventListener('resize', () => this.checkScrollButtons());
  }

  scrollTabs(direction: number): void {
    if (this.tabList?.nativeElement) {
      this.tabList.nativeElement.scrollBy({
        left: direction,
        behavior: 'smooth',
      });
 // Kiểm tra lại sau khi scroll
      setTimeout(() => this.checkScrollButtons(), 300);
    }
  }

  checkScrollButtons(): void {
    if (!this.tabList?.nativeElement) {
      return;
    }
    const element = this.tabList.nativeElement;
    this.canScrollLeft = element.scrollLeft > 0;
    this.canScrollRight = element.scrollLeft < element.scrollWidth - element.clientWidth - 1;
  }

  loadReturns(): void {
 // Load return orders from backend
    const customerID = this.orderService.getCustomerID();
 console.log('Loading return orders for CustomerID:', customerID);

    if (customerID && customerID !== 'guest') {
      this.orderService.getOrdersByCustomer(customerID).subscribe({
        next: (response) => {
          if (response.success && response.data) {
 console.log(
              ' Loaded orders from backend for return management:',
              response.data.length
            );

 // Filter orders with return statuses
            const returnOrders = response.data.filter(
              (order: any) =>
                order.status === 'processing_return' ||
                order.status === 'returning' ||
                order.status === 'returned'
            );

 // Convert backend orders to ReturnItem format
            this.returns = returnOrders.map((order: any) => this.mapOrderToReturnItem(order));

 console.log(' Converted to return items:', this.returns.length);

            this.updateTabCounts();

 // Trigger event to update sidebar badges and notify orders component
            localStorage.setItem('returnManagementDataChanged', Date.now().toString());
            localStorage.removeItem('returnManagementDataChanged');

 // Dispatch custom event for same-window updates
            window.dispatchEvent(new Event('returnManagementDataChanged'));
          } else {
 console.log('No orders found in backend for return management');
            this.returns = [];
            this.updateTabCounts();
          }
        },
        error: (error) => {
 console.error('Error loading return orders from backend:', error);
          this.returns = [];
          this.updateTabCounts();
        },
      });
    } else {
 console.log('No customer ID or guest user');
      this.returns = [];
      this.updateTabCounts();
    }
  }

  mapOrderToReturnItem(backendOrder: any): ReturnItem {
 // Map items to allProducts format
    const allProducts = backendOrder.items.map((item: any) => ({
      product: {
        _id: item.sku || item.id,
        ProductName: item.productName,
        Category: item.category || '',
        Subcategory: item.subcategory || '',
        Price: item.price,
        Unit: item.unit || '',
        Image: item.image || '',
        Brand: '',
      },
      quantity: item.quantity,
      totalValue: item.price * item.quantity,
    }));

    return {
      id: `return_${backendOrder.OrderID}`,
      status: backendOrder.status,
      date: this.formatDate(backendOrder.createdAt),
      product: allProducts[0]?.product || {
        _id: '',
        ProductName: '',
        Category: '',
        Subcategory: '',
        Price: 0,
        Unit: '',
        Image: '',
        Brand: '',
      },
      quantity: allProducts[0]?.quantity || 0,
      totalValue: allProducts[0]?.totalValue || 0,
      totalAmount: backendOrder.totalAmount,
      allProducts: allProducts,
      orderId: backendOrder.OrderID,
      orderNumber: backendOrder.OrderID,
    };
  }

  syncWithCompletedOrders(): void {
 // This method is no longer used - kept for backward compatibility
    this.loadReturns();
  }

  hasMoreProducts(returnItem: ReturnItem): boolean {
 // Kiểm tra số lượng sản phẩm khác nhau trong đơn hàng
    return (returnItem.allProducts?.length ?? 0) > 1;
  }

  updateTabCounts(): void {
    this.tabs.forEach((tab) => {
      tab.count = this.returns.filter((returnItem) => returnItem.status === tab.id).length;
    });

 // Lưu tab counts vào localStorage để sidebar có thể đọc
    const tabCounts = this.tabs.reduce((acc, tab) => {
      acc[tab.id] = tab.count;
      return acc;
    }, {} as any);
    localStorage.setItem('returnTabCounts', JSON.stringify(tabCounts));

 // Cập nhật service để badge cập nhật ngay lập tức trong cùng tab
    const pendingCount = this.tabs.find((tab) => tab.id === 'pending')?.count || 0;
    this.returnBadgeService.setPendingCount(pendingCount);
  }

  onTabClick(tabId: string): void {
    this.activeTab = tabId;
  }

  clearSearch(): void {
    this.searchQuery = '';
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 0);
  }

  performSearch(): void {
 // Search is performed automatically when getFilteredReturns() is called
 // This method can be used for additional actions if needed
 console.log('Searching for:', this.searchQuery);
  }

  getFilteredReturns(): ReturnItem[] {
 // First filter by active tab
    let filteredReturns: ReturnItem[] = [];

    if (this.activeTab === 'all') {
      filteredReturns = [...this.returns];
    } else {
      filteredReturns = this.returns.filter((returnItem) => returnItem.status === this.activeTab);
    }

 // Then filter by search query (product name)
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      filteredReturns = filteredReturns.filter((returnItem) => {
 // Check if product name matches the search query
        const productName = (returnItem.product?.ProductName || '').toLowerCase();

 // Also check in allProducts if available
        const hasMatchingProductInAll = returnItem.allProducts?.some((productItem: any) => {
          const allProductName = (productItem.product?.ProductName || '').toLowerCase();
          return allProductName.includes(query);
        });

        return productName.includes(query) || hasMatchingProductInAll || false;
      });
    }

 // Sort by date for processing_return items (most recent first)
    if (this.activeTab === 'processing_return') {
      return filteredReturns.sort((a, b) => {
 // Convert date strings to Date objects for comparison
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
    }

    return filteredReturns;
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      delivered: 'Sản phẩm đã giao',
      processing_return: 'Đang chờ xử lý',
      returning: 'Đang trả hàng',
      returned: 'Đã trả hàng/ hoàn tiền',
    };
    return statusMap[status] || status;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  onViewMore(returnItem: ReturnItem): void {
    if (this.expandedReturns.has(returnItem.id)) {
      this.expandedReturns.delete(returnItem.id);
    } else {
      this.expandedReturns.add(returnItem.id);
    }
  }

  getDisplayProducts(returnItem: ReturnItem): any[] {
    if (this.expandedReturns.has(returnItem.id)) {
      return returnItem.allProducts || [];
    }
    return returnItem.allProducts ? [returnItem.allProducts[0]] : [];
  }

  isReturnExpanded(returnItem: ReturnItem): boolean {
    return this.expandedReturns.has(returnItem.id);
  }

  getButtonText(status: string): string {
    const buttonTextMap: { [key: string]: string } = {
      delivered: 'Yêu cầu trả hàng/ hoàn tiền',
      processing_return: 'Đang chờ xử lý',
      returning: 'Đang trả hàng',
      returned: 'Đã trả hàng/ hoàn tiền',
    };
    return buttonTextMap[status] || 'Yêu cầu trả hàng/ hoàn tiền';
  }

  onRequestReturn(returnItem: ReturnItem): void {
    if (returnItem.status === 'delivered') {
      this.selectedReturnItem = returnItem;
      this.showReturnModal = true;
      this.resetModalForm();
    }
  }

  closeReturnModal(): void {
    this.showReturnModal = false;
    this.selectedReturnItem = null;
    this.resetModalForm();
  }

  resetModalForm(): void {
    this.selectedReason = '';
    this.detailedDescription = '';
    this.isModalExpanded = false;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }

  openCancelModal(returnItem: ReturnItem): void {
    this.cancelReturnItem = returnItem;
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelReturnItem = null;
  }

  confirmCancelRequest(): void {
    if (this.cancelReturnItem) {
 console.log(' [Return Management] Cancelling return request:', this.cancelReturnItem);

 // Get orderNumber for API call
      const orderNumber = this.cancelReturnItem.orderNumber;
      if (!orderNumber) {
 console.error(' [Return Management] No orderNumber found for cancel request');
        this.toastService.show('Lỗi: Không tìm thấy mã đơn hàng', 'error');
        this.closeCancelModal();
        return;
      }

 // Update order status back to 'completed' via API
      this.orderService.updateOrderStatus(orderNumber, 'completed').subscribe({
        next: (response) => {
          if (response.success) {
 console.log(' [Return Management] Backend status reverted to completed');

 // Reload returns from backend
            this.loadReturns();

 // Close modal
            this.closeCancelModal();

 // Show success toast notification
            this.toastService.show('Đã hủy yêu cầu trả hàng thành công!', 'success');

 // Navigate to reviews page after a short delay to allow backend to update
            setTimeout(() => {
              this.router.navigate(['/account/reviews']);
            }, 100);

 console.log(' [Return Management] Return request cancelled and navigated to reviews');
          }
        },
        error: (error) => {
 console.error(' [Return Management] Error reverting status:', error);
          this.toastService.show('Lỗi khi hủy yêu cầu trả hàng', 'error');
        },
      });
    }
  }

  getModalDisplayProducts(): any[] {
    if (!this.selectedReturnItem?.allProducts) return [];

    if (this.isModalExpanded) {
      return this.selectedReturnItem!.allProducts;
    }
    return this.selectedReturnItem!.allProducts.slice(0, 2);
  }

  hasMoreModalProducts(): boolean {
    return (this.selectedReturnItem?.allProducts?.length ?? 0) > 2;
  }

  toggleModalProducts(): void {
    this.isModalExpanded = !this.isModalExpanded;
  }

  onReasonChange(): void {
    if (this.selectedReason !== 'other') {
      this.detailedDescription = '';
    }
  }

  canSubmit(): boolean {
    if (this.selectedReason === 'other') {
      return this.detailedDescription.trim() !== '';
    }
    return this.selectedReason !== '';
  }

  submitReturnRequest(): void {
    if (this.canSubmit() && this.selectedReturnItem) {
 console.log('Submitting return request:', {
        returnItem: this.selectedReturnItem,
        reason: this.selectedReason,
        description: this.detailedDescription,
      });

 // Create a new return request instead of just changing status
      const newReturnRequest = {
        id: `return_${Date.now()}_${this.selectedReturnItem.id.split('_')[1]}`,
        status: 'processing_return',
        date: new Date().toISOString().split('T')[0],
        product: this.selectedReturnItem.product,
        quantity: this.selectedReturnItem.quantity,
        totalValue: this.selectedReturnItem.totalValue,
        totalAmount: this.selectedReturnItem.totalAmount,
        allProducts: this.selectedReturnItem.allProducts,
        reason: this.selectedReason,
        description: this.detailedDescription,
        orderId: this.selectedReturnItem.id.split('_')[1], // Add order ID for reference
      };

 // Add new return request to the returns array
      this.returns.push(newReturnRequest);

 // Save updated data to localStorage
      localStorage.setItem('returnManagementData', JSON.stringify(this.returns));

 // Trigger storage event to notify orders component
      localStorage.setItem('returnManagementDataChanged', Date.now().toString());
      localStorage.removeItem('returnManagementDataChanged');

 // Update tab counts
      this.updateTabCounts();

 // Close return modal and show success modal
      this.closeReturnModal();
      this.showSuccessModal = true;

 console.log('Return request submitted successfully');
    }
  }

 // Method để reset dữ liệu (có thể gọi từ console nếu cần)
  resetReturnData(): void {
    localStorage.removeItem('returnManagementData');
    this.returns = [];
    this.loadReturns();
  }

  clearAllReturnData(): void {
 console.log('Clearing all return management data...');

 // Clear all localStorage data
    localStorage.removeItem('returnManagementData');
    localStorage.removeItem('returnManagementDataChanged');
    localStorage.removeItem('ordersDataChanged');

 // Clear returns array
    this.returns = [];

 // Update tab counts to show 0
    this.updateTabCounts();

 console.log('All return management data cleared');
  }

 // Method để xóa đơn có sản phẩm cụ thể (có thể gọi từ console)
  removeReturnItemByProductName(productName: string): void {
 console.log(`Removing return items containing product: ${productName}`);

    const returnData = JSON.parse(localStorage.getItem('returnManagementData') || '[]');

 // Filter out items that contain the specified product
    const updatedData = returnData.filter((item: any) => {
 // Check single product (old format)
      if (item.product?.ProductName && item.product.ProductName.includes(productName)) {
 console.log('Removed item with single product:', item.id);
        return false;
      }

 // Check allProducts array (new format)
      if (item.allProducts) {
        const hasProduct = item.allProducts.some(
          (p: any) => p.product?.ProductName && p.product.ProductName.includes(productName)
        );
        if (hasProduct) {
 console.log('Removed item with allProducts:', item.id);
          return false;
        }
      }

      return true;
    });

 // Save updated data
    localStorage.setItem('returnManagementData', JSON.stringify(updatedData));

 // Reload returns
    this.returns = updatedData;
    this.updateTabCounts();

 // Trigger storage event
    localStorage.setItem('returnManagementDataChanged', Date.now().toString());
    localStorage.removeItem('returnManagementDataChanged');

 console.log(
      `Removed items containing "${productName}". Remaining items: ${updatedData.length}`
    );
  }

 // Get total quantity for return item
  getTotalQuantity(returnItem: ReturnItem): number {
    if (!returnItem.allProducts) {
      return returnItem.quantity;
    }
    return returnItem.allProducts.reduce((total: number, productItem: any) => {
      return total + productItem.quantity;
    }, 0);
  }

 // Get return ID for display (use orderNumber if available, otherwise extract from ID)
  getReturnId(returnItem: ReturnItem): string {
 // If orderNumber is available, use it
    if (returnItem.orderNumber) {
      return returnItem.orderNumber;
    }

 // Fallback: Format: return_timestamp_orderId or delivered_orderId
    if (returnItem.id.startsWith('return_')) {
      const parts = returnItem.id.split('_');
      if (parts.length >= 3) {
        return 'RET' + parts[1].slice(-6); // Last 6 digits of timestamp
      }
    }
    return returnItem.id;
  }

 // Handle double click on status text to cycle through return statuses (for testing)
  onStatusDoubleClick(returnItem: ReturnItem): void {
 console.log(
      ' [Return Management] Double click on status for return:',
      returnItem.id,
      'Current status:',
      returnItem.status
    );

 // Status flow: processing_return -> returning -> returned
    const statusFlow: { [key: string]: string } = {
      processing_return: 'returning',
      returning: 'returned',
      returned: 'processing_return', // Cycle back for testing
    };

    const nextStatus = statusFlow[returnItem.status] || 'processing_return';

 console.log(' [Return Management] Changing status from', returnItem.status, 'to', nextStatus);

 // Use orderNumber if available, otherwise extract from id
    const orderId =
      returnItem.orderNumber || returnItem.id.split('_')[2] || returnItem.id.split('_')[1];

 // Update status in backend
    this.orderService.updateOrderStatus(orderId, nextStatus as any).subscribe({
      next: (response) => {
        if (response.success) {
 console.log(' [Return Management] Backend status updated successfully');

 // Reload returns from backend
          this.loadReturns();
        }
      },
      error: (error) => {
 console.error(' [Return Management] Error updating status:', error);
        this.toastService.show('Lỗi cập nhật trạng thái đơn hàng', 'error');
      },
    });
  }

  goToProductDetail(product: Product): void {
 // Lấy _id hoặc sku từ product để navigate
    const productId = product._id || (product as any).sku;
    if (productId) {
      this.router.navigate(['/product-detail', productId]);
    } else {
 console.warn('No product ID found for navigation');
    }
  }
}
