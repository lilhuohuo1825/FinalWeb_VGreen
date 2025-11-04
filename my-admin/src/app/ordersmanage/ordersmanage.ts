import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-ordersmanage',
  imports: [CommonModule, FormsModule],
  templateUrl: './ordersmanage.html',
  styleUrl: './ordersmanage.css',
  standalone: true
})
export class OrdersManage implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiService = inject(ApiService);
  // Statistics
  statistics = {
    total: 0,
    pending: 0,
    delivering: 0,
    unpaid: 0,
    refundRequested: 0,
    refunded: 0
  };

  // Orders data
  orders: any[] = [];
  allOrders: any[] = []; // Keep original data for search/filter
  users: any[] = [];

  selectedCount = 0;
  selectAll = false;

  // Filter state
  currentFilter: string = 'all'; // all, pending, delivering, delivered, unpaid, refund-requested, refunded, cancelled
  showFilterDropdown: boolean = false;

  // Sort state
  currentSortBy: 'date' | 'price' = 'date'; // date, price
  currentSortOrder: 'asc' | 'desc' = 'desc'; // asc: ascending, desc: descending
  showSortDropdown: boolean = false;

  constructor() {}

  ngOnInit(): void {
    this.loadData();
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.closeFilterDropdown();
      this.closeSortDropdown();
    });
  }

  /**
   * Load orders and users data
   */
  loadData(): void {
    this.loadOrders();
  }

  /**
   * Load orders data from MongoDB via API
   */
  loadOrders(): void {
    console.log('Loading orders from MongoDB...');
    // Try MongoDB first
    this.apiService.getOrders().subscribe({
      next: (ordersData) => {
        console.log(`✅ Loaded ${ordersData.length} orders from MongoDB`);
        this.allOrders = ordersData.map(order => this.transformOrder(order));
        
        // Sort by date - newest first (default)
        this.sortOrdersByDate();
        
        this.orders = [...this.allOrders];
        this.updateStatistics();
      },
      error: (error) => {
        console.error('❌ Error loading orders from MongoDB:', error);
        console.log('⚠️ Falling back to JSON file...');
        // Fallback to JSON
        this.loadOrdersFromJSON();
      }
    });
  }

  /**
   * Fallback: Load orders from JSON file
   */
  private loadOrdersFromJSON(): void {
    this.http.get<any[]>('data/orders.json').subscribe({
      next: (ordersData) => {
        console.log(`✅ Loaded ${ordersData.length} orders from JSON (fallback)`);
        this.allOrders = ordersData.map(order => this.transformOrder(order));
        
        // Sort by date - newest first (default)
        this.sortOrdersByDate();
        
        this.orders = [...this.allOrders];
        this.updateStatistics();
      },
      error: (error) => {
        console.error('❌ Error loading orders from JSON:', error);
      }
    });
  }

  /**
   * Transform order data from JSON to component format
   */
  transformOrder(orderData: any): any {
    const customerName = orderData.full_name || 'Khách hàng #' + orderData.user_id;

    // Map status based on new structure
    let status = 'pending';
    let delivery = 'pending';
    let payment = 'unpaid';
    let refund = 'none';

    // Map status
    if (orderData.status === 'Delivered') {
      status = 'confirmed';
      delivery = 'delivered';
      payment = 'paid';
    } else if (orderData.status === 'Pending') {
      status = 'pending';
      delivery = 'pending';
      payment = 'unpaid';
    } else if (orderData.status === 'Cancel Requested' || orderData.status === 'Return Requested') {
      status = 'refund-requested';
      delivery = 'delivering';
      payment = orderData.total_amount > 0 ? 'paid' : 'unpaid';
      refund = 'requested';
    } else if (orderData.status === 'Refunded') {
      status = 'refunded';
      delivery = 'none'; // Không hiển thị status giao hàng
      payment = 'unpaid';
      refund = 'refunded';
    } else if (orderData.status === 'Cancelled by User') {
      status = 'cancelled';
      delivery = 'none'; // Không hiển thị status giao hàng
      payment = 'unpaid';
      refund = 'none';
    } else if (orderData.status === 'Return Approved') {
      status = 'confirmed';
      delivery = 'delivered';
      payment = 'paid';
      refund = 'requested';
    } else if (orderData.status === 'Rejected') {
      status = 'confirmed';
      delivery = 'delivering';
      payment = 'paid';
      refund = 'none';
    }

    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = orderData.order_date.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Format amount
    const formattedAmount = this.formatCurrency(orderData.total_amount);

    return {
      id: 'VG' + orderData.order_id,
      date: formattedDate,
      customer: customerName,
      status: status,
      payment: payment,
      delivery: delivery,
      refund: refund,
      total: formattedAmount,
      selected: false,
      rawData: orderData // Keep raw data for detail page
    };
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Update statistics
   */
  updateStatistics(): void {
    this.statistics.total = this.orders.length;
    this.statistics.pending = this.orders.filter(o => o.status === 'pending').length;
    this.statistics.delivering = this.orders.filter(o => o.delivery === 'delivering').length;
    this.statistics.unpaid = this.orders.filter(o => o.payment === 'unpaid').length;
    this.statistics.refundRequested = this.orders.filter(o => o.refund === 'requested').length;
    // Đếm cả 'cancelled' và 'refunded' cho ô "HUỶ/HOÀN TIỀN"
    this.statistics.refunded = this.orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length;
  }

  /**
   * Sort orders by date
   */
  private sortOrdersByDate(order: 'asc' | 'desc' = 'desc'): void {
    this.allOrders.sort((a, b) => {
      const dateA = a.rawData?.order_date || '2000-01-01';
      const dateB = b.rawData?.order_date || '2000-01-01';
      
      if (order === 'desc') {
        // Descending (newest first)
        return dateB.localeCompare(dateA);
      } else {
        // Ascending (oldest first)
        return dateA.localeCompare(dateB);
      }
    });
    
    console.log(`✅ Orders sorted by date (${order === 'desc' ? 'newest' : 'oldest'} first)`);
  }

  /**
   * Sort orders by price/total amount
   */
  private sortOrdersByPrice(order: 'asc' | 'desc' = 'desc'): void {
    this.allOrders.sort((a, b) => {
      const priceA = a.rawData?.total_amount || 0;
      const priceB = b.rawData?.total_amount || 0;
      
      if (order === 'desc') {
        // Descending (highest first)
        return priceB - priceA;
      } else {
        // Ascending (lowest first)
        return priceA - priceB;
      }
    });
    
    console.log(`✅ Orders sorted by price (${order === 'desc' ? 'highest' : 'lowest'} first)`);
  }

  /**
   * Apply sort based on current sort state
   */
  applySort(): void {
    if (this.currentSortBy === 'date') {
      this.sortOrdersByDate(this.currentSortOrder);
    } else if (this.currentSortBy === 'price') {
      this.sortOrdersByPrice(this.currentSortOrder);
    }
    
    // Update displayed orders
    this.orders = [...this.allOrders];
    
    // Reapply current filter if any
    if (this.currentFilter !== 'all') {
      this.filterByStatus(this.currentFilter);
    }
  }

  /**
   * Toggle sort order (asc/desc)
   */
  toggleSortOrder(): void {
    this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
    this.applySort();
  }

  /**
   * Sort by date
   */
  sortByDate(order: 'asc' | 'desc' = 'desc'): void {
    this.currentSortBy = 'date';
    this.currentSortOrder = order;
    this.applySort();
    this.showSortDropdown = false;
  }

  /**
   * Sort by price
   */
  sortByPrice(order: 'asc' | 'desc' = 'desc'): void {
    this.currentSortBy = 'price';
    this.currentSortOrder = order;
    this.applySort();
    this.showSortDropdown = false;
  }

  /**
   * Toggle select all orders
   */
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.orders.forEach(order => order.selected = this.selectAll);
    this.updateSelectedCount();
  }

  /**
   * Toggle individual order selection
   */
  toggleOrder(order: any): void {
    order.selected = !order.selected;
    this.updateSelectedCount();
    this.selectAll = this.orders.every(o => o.selected);
  }

  /**
   * Update selected count
   */
  updateSelectedCount(): void {
    this.selectedCount = this.orders.filter(o => o.selected).length;
  }

  /**
   * Add new order
   */
  addOrder(): void {
    console.log('Add new order - navigating to order detail page');
    // Navigate to order detail page with 'new' as order ID
    this.router.navigate(['/orders', 'new']);
  }

  /**
   * Open sort menu
   */
  openSort(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    // Close filter dropdown when opening sort dropdown
    if (!this.showSortDropdown) {
      this.showFilterDropdown = false;
    }
    this.showSortDropdown = !this.showSortDropdown;
    console.log('Sort menu toggled:', this.showSortDropdown);
  }

  /**
   * Close sort dropdown
   */
  closeSortDropdown(): void {
    this.showSortDropdown = false;
  }

  /**
   * Print orders
   */
  printOrders(): void {
    const selected = this.orders.filter(o => o.selected);
    console.log('Print orders:', selected);
    // TODO: Implement print logic
  }

  /**
   * Edit selected orders
   */
  editOrders(): void {
    const selected = this.orders.filter(o => o.selected);
    console.log('Edit orders:', selected);
    // TODO: Implement edit logic
  }

  /**
   * Delete selected orders
   */
  deleteOrders(): void {
    const selected = this.orders.filter(o => o.selected);
    if (selected.length === 0) {
      alert('Vui lòng chọn đơn hàng cần xóa');
      return;
    }
    
    if (confirm(`Bạn có chắc chắn muốn xóa ${selected.length} đơn hàng?`)) {
      // Get selected IDs
      const selectedIds = selected.map(o => o.id);
      
      // Remove from allOrders
      this.allOrders = this.allOrders.filter(o => !selectedIds.includes(o.id));
      
      // Re-apply current filter
      this.applyFilter();
      
      this.selectedCount = 0;
      this.selectAll = false;
      this.updateStatistics();
      console.log('Deleted orders:', selectedIds);
    }
  }

  /**
   * Toggle filter dropdown
   */
  toggleFilterDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    // Close sort dropdown when opening filter dropdown
    if (!this.showFilterDropdown) {
      this.showSortDropdown = false;
    }
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  /**
   * Close filter dropdown
   */
  closeFilterDropdown(): void {
    this.showFilterDropdown = false;
  }

  /**
   * Apply filter and close dropdown
   */
  applyFilterAndClose(filterType: string): void {
    this.filterByStatus(filterType);
    this.closeFilterDropdown();
  }

  /**
   * Search orders
   */
  searchOrders(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    console.log('Search:', query);
    
    if (!query || query.trim() === '') {
      // Reset to current filter if search is empty
      this.applyFilter();
    } else {
      // Search in allOrders first
      const searchTerm = query.toLowerCase().trim();
      let results = this.allOrders.filter(order => {
        return (
          order.id.toLowerCase().includes(searchTerm) ||
          order.customer.toLowerCase().includes(searchTerm) ||
          order.total.toLowerCase().includes(searchTerm) ||
          order.date.includes(searchTerm)
        );
      });
      
      // Then apply current filter if not 'all'
      if (this.currentFilter !== 'all') {
        results = this.filterOrdersByType(results, this.currentFilter);
      }
      
      this.orders = results;
      console.log(`Search results: ${results.length} orders`);
    }
    
    // Reset selection
    this.selectedCount = 0;
    this.selectAll = false;
  }

  /**
   * Filter orders by status type
   */
  filterByStatus(filterType: string): void {
    console.log('Filter by:', filterType);
    this.currentFilter = filterType;
    this.applyFilter();
    
    // Reset selection
    this.selectedCount = 0;
    this.selectAll = false;
  }

  /**
   * Apply current filter
   */
  private applyFilter(): void {
    if (this.currentFilter === 'all') {
      this.orders = [...this.allOrders];
    } else {
      this.orders = this.filterOrdersByType(this.allOrders, this.currentFilter);
    }
  }

  /**
   * Filter orders array by type
   */
  private filterOrdersByType(orders: any[], filterType: string): any[] {
    switch (filterType) {
      case 'pending':
        return orders.filter(o => o.status === 'pending');
      
      case 'confirmed':
        return orders.filter(o => o.status === 'confirmed');
      
      case 'refund-requested':
        return orders.filter(o => o.status === 'refund-requested');
      
      case 'cancelled':
        return orders.filter(o => o.status === 'cancelled');
      
      case 'refunded':
        // Lọc cả 'cancelled' và 'refunded' cho ô "HUỶ/HOÀN TIỀN"
        return orders.filter(o => o.status === 'refunded' || o.status === 'cancelled');
      
      case 'delivering':
        return orders.filter(o => o.delivery === 'delivering');
      
      case 'delivered':
        return orders.filter(o => o.delivery === 'delivered');
      
      case 'unpaid':
        return orders.filter(o => o.payment === 'unpaid');
      
      case 'paid':
        return orders.filter(o => o.payment === 'paid');
      
      default:
        return orders;
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.currentFilter = 'all';
    this.orders = [...this.allOrders];
    
    // Reset selection
    this.selectedCount = 0;
    this.selectAll = false;
    
    console.log('Filters cleared');
  }

  /**
   * Check if a filter is active
   */
  isFilterActive(filterType: string): boolean {
    return this.currentFilter === filterType;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: any = {
      'pending': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'refund-requested': 'Yêu cầu hủy/hoàn tiền',
      'cancelled': 'Đã hủy',
      'refunded': 'Đã hoàn tiền'
    };
    return labels[status] || status;
  }

  /**
   * Get payment label
   */
  getPaymentLabel(payment: string): string {
    const labels: any = {
      'paid': 'Đã thanh toán',
      'unpaid': 'Chưa thanh toán'
    };
    return labels[payment] || payment;
  }

  /**
   * Get delivery label
   */
  getDeliveryLabel(delivery: string): string {
    const labels: any = {
      'pending': 'Chờ giao',
      'delivering': 'Đang giao',
      'delivered': 'Đã giao',
      'none': ''
    };
    return labels[delivery] || delivery;
  }

  /**
   * Get status class
   */
  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  /**
   * Get payment class
   */
  getPaymentClass(payment: string): string {
    return `payment-${payment}`;
  }

  /**
   * Get delivery class
   */
  getDeliveryClass(delivery: string): string {
    return `delivery-${delivery}`;
  }

  /**
   * Get refund label
   */
  getRefundLabel(refund: string): string {
    const labels: any = {
      'none': 'Không',
      'requested': 'Yêu cầu hoàn tiền',
      'refunded': 'Đã hoàn tiền'
    };
    return labels[refund] || refund;
  }

  /**
   * Get refund class
   */
  getRefundClass(refund: string): string {
    return `refund-${refund}`;
  }

  /**
   * View order detail
   */
  viewOrderDetail(order: any): void {
    this.router.navigate(['/orders', order.id]);
  }
}

