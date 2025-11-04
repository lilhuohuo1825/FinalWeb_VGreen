import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

interface UserJSON {
  _id: any;
  user_id: number;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  register_date: string;
  customer_type: string;
  password: string;
}

interface Customer {
  id: string;
  joinDate: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  memberTier: string;
  totalOrders: string;
  selected: boolean;
  group?: string;
}

@Component({
  selector: 'app-customersmanage',
  imports: [CommonModule, FormsModule],
  templateUrl: './customersmanage.html',
  styleUrl: './customersmanage.css',
  standalone: true
})
export class CustomersManage implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiService = inject(ApiService);

  customers: Customer[] = [];
  allCustomers: Customer[] = []; // Keep original data for search/filter
  isLoading = false;
  loadError = '';

  selectedCount = 0;
  selectAll = false;

  // Filter states
  currentFilter: string = 'all';
  showFilterDialog = false;
  showFilterDropdown = false;
  showSortDropdown = false;
  showFilterModal = false;
  showSortModal = false;
  filterOptions = {
    memberTier: 'all',
    group: 'all',
    minSpending: 0,
    maxSpending: 999999999
  };
  
  // Temporary filter options for modal
  tempFilterOptions = {
    memberTier: 'all',
    group: 'all',
    minSpending: 0,
    maxSpending: 999999999
  };

  // Group modal
  showGroupModal = false;
  newGroupName = '';
  allGroupNames: string[] = [];

  // Customer detail modal
  showCustomerDetailModal = false;
  currentCustomer: Customer | null = null;
  editingCustomer = false;

  // Sort state
  currentSortField: keyof Customer = 'joinDate';
  currentSortOrder: 'asc' | 'desc' = 'desc';
  
  // Sort options for modal
  sortOptions = [
    { field: 'name' as keyof Customer, label: 'Tên khách hàng', icon: '👤' },
    { field: 'joinDate' as keyof Customer, label: 'Ngày tham gia', icon: '📅' },
    { field: 'totalOrders' as keyof Customer, label: 'Tổng đơn hàng', icon: '📦' },
    { field: 'memberTier' as keyof Customer, label: 'Hạng thành viên', icon: '⭐' }
  ];

  // Batch edit modal
  showBatchEditModal = false;
  batchEditOption: string = '';
  selectedTier: string = '';
  selectedGroupForBatch: string = '';

  ngOnInit(): void {
    this.loadCustomers();
    this.extractAllGroupNames();
  }

  /**
   * Load customers from MongoDB via API
   */
  loadCustomers(): void {
    this.isLoading = true;
    this.loadError = '';
    
    console.log('🔄 Attempting to load customers from MongoDB API...');
    console.log('API URL:', 'http://localhost:3000/api/users');
    
    // Call API to get users from MongoDB
    this.apiService.getUsers().subscribe({
      next: (data) => {
        console.log('✅ SUCCESS: Loaded customers from MongoDB!');
        console.log(`📊 Total customers: ${data.length}`);
        console.log('🗄️ Data source: MongoDB via API');
        
        // Map MongoDB data to Customer interface
        this.allCustomers = data.map(user => this.mapUserToCustomer(user));
        this.customers = [...this.allCustomers];
        
        // Load orders to calculate total spending
        this.loadOrdersForCustomers();
        
        this.isLoading = false;
        console.log('✅ Customers displayed:', this.customers.length);
      },
      error: (error) => {
        console.error('❌ ERROR loading from MongoDB:', error);
        console.error('Error details:', error.message);
        console.error('Error status:', error.status);
        
        this.loadError = '❌ Không thể kết nối MongoDB API. Backend có đang chạy không?';
        this.isLoading = false;
        
        // DO NOT FALLBACK - Show error instead
        console.error('⚠️ FALLBACK DISABLED - Please fix MongoDB connection!');
        alert('Lỗi kết nối MongoDB!\n\nKiểm tra:\n1. Backend đang chạy tại http://localhost:3000\n2. MongoDB đang chạy\n3. Database "VGreen" tồn tại\n4. Collection "users" có dữ liệu');
      }
    });
  }

  /**
   * REMOVED: No longer using JSON fallback - MongoDB only!
   */

  /**
   * Load orders for customers to calculate total spending - MongoDB ONLY
   */
  private loadOrdersForCustomers(): void {
    console.log('🔄 Loading orders from MongoDB API...');
    
    this.apiService.getOrders().subscribe({
      next: (orders) => {
        console.log('✅ SUCCESS: Loaded orders from MongoDB!');
        console.log(`📊 Total orders: ${orders.length}`);
        console.log('🗄️ Data source: MongoDB via API');
        this.processOrders(orders);
      },
      error: (error) => {
        console.error('❌ ERROR loading orders from MongoDB:', error);
        console.error('⚠️ Cannot calculate customer spending without orders data');
        // Don't fallback - just set total orders to 0
        this.allCustomers.forEach(customer => {
          customer.totalOrders = '0đ';
        });
        this.customers = [...this.allCustomers];
      }
    });
  }

  /**
   * Process orders data to calculate customer spending
   */
  private processOrders(orders: any[]): void {
    // Calculate total spending for each customer
    const customerTotals = new Map<number, number>();
    
    orders.forEach(order => {
      const current = customerTotals.get(order.user_id) || 0;
      customerTotals.set(order.user_id, current + (order.total_amount || 0));
    });

    // Update customer total orders
    this.allCustomers.forEach(customer => {
      const customerId = parseInt(customer.id.replace('KH', ''));
      const total = customerTotals.get(customerId) || 0;
      customer.totalOrders = this.formatCurrency(total);
    });

    // Update displayed customers
    this.customers = [...this.allCustomers];
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Map UserJSON to Customer
   */
  private mapUserToCustomer(user: UserJSON): Customer {
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = user.register_date.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Map customer_type to memberTier
    let memberTier = 'bronze';
    if (user.customer_type === 'VIP') {
      memberTier = 'gold';
    } else if (user.customer_type === 'Premium') {
      memberTier = 'silver';
    } else if (user.customer_type === 'Regular') {
      memberTier = 'bronze';
    }

    return {
      id: 'KH' + String(user.user_id).padStart(4, '0'),
      joinDate: formattedDate,
      name: user.full_name || '(Chưa cập nhật)',
      phone: user.phone,
      email: user.email,
      address: user.address || '(Chưa cập nhật)',
      memberTier: memberTier,
      totalOrders: '0đ',
      selected: false,
      group: undefined
    };
  }

  /**
   * Load sample data as fallback
   */
  private loadSampleData(): void {
    console.log('Loading sample data as fallback');
    this.allCustomers = [
      {
        id: 'KH0001',
        joinDate: '20/10/2025',
        name: 'Khách hàng #1',
        phone: '123456789',
        email: 'customer1@email.com',
      address: '123/4 Đường số 16, Thủ Đức',
      memberTier: 'gold',
      totalOrders: '100.000đ',
      selected: false
    },
    {
        id: 'KH0002',
      joinDate: '20/01/2025',
        name: 'Khách hàng #2',
        phone: '987654321',
        email: 'customer2@email.com',
        address: '456 Nguyễn Văn Linh, Quận 7',
      memberTier: 'silver',
        totalOrders: '50.000đ',
      selected: false
    }
  ];
    this.customers = [...this.allCustomers];
  }

  /**
   * Toggle select all customers
   */
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.customers.forEach(customer => customer.selected = this.selectAll);
    this.updateSelectedCount();
  }

  /**
   * Toggle individual customer selection
   */
  toggleCustomer(customer: any): void {
    customer.selected = !customer.selected;
    this.updateSelectedCount();
    this.selectAll = this.customers.every(c => c.selected);
  }

  /**
   * Update selected count
   */
  updateSelectedCount(): void {
    this.selectedCount = this.customers.filter(c => c.selected).length;
  }

  /**
   * Manage customer groups - Open group modal
   */
  manageGroups(): void {
    const selected = this.customers.filter(c => c.selected);
    
    if (selected.length < 2) {
      return; // Do nothing if less than 2 customers selected
    }

    this.newGroupName = '';
    this.showGroupModal = true;
  }

  /**
   * Close group modal
   */
  closeGroupModal(): void {
    this.showGroupModal = false;
    this.newGroupName = '';
  }

  /**
   * Create group and assign to selected customers
   */
  createGroup(): void {
    if (!this.newGroupName || this.newGroupName.trim() === '') {
      return; // Do nothing if empty
    }

    const groupName = this.newGroupName.trim();
    const selected = this.customers.filter(c => c.selected);

    selected.forEach(customer => {
      customer.group = groupName;
      const allCustomer = this.allCustomers.find(c => c.id === customer.id);
      if (allCustomer) {
        allCustomer.group = groupName;
      }
    });

    this.extractAllGroupNames();
    
    // Deselect all
    this.customers.forEach(c => c.selected = false);
    this.selectAll = false;
    this.updateSelectedCount();
    
    this.closeGroupModal();
  }

  /**
   * Extract all unique group names from customers
   */
  extractAllGroupNames(): void {
    const groupsSet = new Set<string>();
    this.allCustomers.forEach(customer => {
      if (customer.group) {
        groupsSet.add(customer.group);
      }
    });
    this.allGroupNames = Array.from(groupsSet).sort();
  }

  /**
   * Edit selected customers - Navigate to detail page with edit mode
   */
  editCustomers(): void {
    const selected = this.customers.filter(c => c.selected);
    
    if (selected.length === 0) {
      return; // Do nothing if no selection
    }

    if (selected.length === 1) {
      // Edit single customer - navigate to detail page with edit mode
      this.router.navigate(['/customers', selected[0].id], {
        state: { editMode: true }
      });
    } else {
      // Batch edit multiple customers - open batch edit modal
      this.showBatchEditModal = true;
    }
  }

  /**
   * Close batch edit modal
   */
  closeBatchEditModal(): void {
    this.showBatchEditModal = false;
    this.batchEditOption = '';
  }

  /**
   * Apply batch edit
   */
  applyBatchEdit(): void {
    const selected = this.customers.filter(c => c.selected);
    
    if (this.batchEditOption === 'tier' && this.selectedTier) {
      selected.forEach(customer => {
        customer.memberTier = this.selectedTier;
        const allCustomer = this.allCustomers.find(c => c.id === customer.id);
        if (allCustomer) allCustomer.memberTier = this.selectedTier;
      });
    } else if (this.batchEditOption === 'group' && this.selectedGroupForBatch) {
      selected.forEach(customer => {
        customer.group = this.selectedGroupForBatch;
        const allCustomer = this.allCustomers.find(c => c.id === customer.id);
        if (allCustomer) allCustomer.group = this.selectedGroupForBatch;
      });
      this.extractAllGroupNames();
    } else if (this.batchEditOption === 'removeGroup') {
      selected.forEach(customer => {
        delete customer.group;
        const allCustomer = this.allCustomers.find(c => c.id === customer.id);
        if (allCustomer) delete allCustomer.group;
      });
    }

    // Deselect all
    this.customers.forEach(c => c.selected = false);
    this.selectAll = false;
    this.updateSelectedCount();
    
    this.closeBatchEditModal();
  }

  /**
   * Delete selected customers
   */
  deleteCustomers(): void {
    const selected = this.customers.filter(c => c.selected);
    
    if (selected.length === 0) {
      return; // Do nothing if no selection
    }

    // Show confirmation in UI (you could use a modal here too)
    if (confirm(`Xóa ${selected.length} khách hàng? Hành động này không thể hoàn tác!`)) {
      const selectedIds = selected.map(c => c.id);
      this.customers = this.customers.filter(c => !selectedIds.includes(c.id));
      this.allCustomers = this.allCustomers.filter(c => !selectedIds.includes(c.id));
      
      this.selectedCount = 0;
      this.selectAll = false;
      
      console.log('Deleted customers:', selectedIds);
    }
  }

  /**
   * Open filter dialog
   */
  openFilter(): void {
    const filterChoice = prompt(
      'Chọn bộ lọc:\n\n' +
      '1 - Lọc theo hạng thành viên\n' +
      '2 - Lọc theo tổng chi tiêu\n' +
      '3 - Lọc theo nhóm\n' +
      '4 - Xóa tất cả bộ lọc\n\n' +
      'Nhập số (1-4):'
    );

    if (filterChoice === '1') {
      this.filterByMemberTier();
    } else if (filterChoice === '2') {
      this.filterBySpending();
    } else if (filterChoice === '3') {
      this.filterByGroup();
    } else if (filterChoice === '4') {
      this.clearFilters();
    }
  }

  /**
   * Filter by member tier
   */
  private filterByMemberTier(): void {
    const tier = prompt('Chọn hạng thành viên:\n1 - Vàng\n2 - Bạc\n3 - Đồng\n\nNhập số (1-3):');
    
    let filterTier = '';
    if (tier === '1') filterTier = 'gold';
    else if (tier === '2') filterTier = 'silver';
    else if (tier === '3') filterTier = 'bronze';
    
    if (filterTier) {
      this.customers = this.allCustomers.filter(c => c.memberTier === filterTier);
      this.currentFilter = `memberTier:${filterTier}`;
      alert(`Đã lọc ${this.customers.length} khách hàng hạng ${this.getMemberTierLabel(filterTier)}.`);
    }
  }

  /**
   * Filter by spending
   */
  private filterBySpending(): void {
    const minStr = prompt('Nhập tổng chi tiêu tối thiểu (VNĐ):\n(Ví dụ: 1000000 cho 1 triệu đồng)');
    const maxStr = prompt('Nhập tổng chi tiêu tối đa (VNĐ):\n(Để trống nếu không giới hạn)');
    
    const min = minStr ? parseFloat(minStr) : 0;
    const max = maxStr ? parseFloat(maxStr) : 999999999;
    
    if (!isNaN(min) && !isNaN(max)) {
      this.customers = this.allCustomers.filter(customer => {
        const total = parseFloat(customer.totalOrders.replace(/[.đ]/g, ''));
        return total >= min && total <= max;
      });
      
      this.currentFilter = `spending:${min}-${max}`;
      alert(`Đã lọc ${this.customers.length} khách hàng với chi tiêu từ ${min.toLocaleString('vi-VN')}đ đến ${max.toLocaleString('vi-VN')}đ.`);
    }
  }

  /**
   * Filter by group
   */
  private filterByGroup(): void {
    // Get unique groups from customers
    const groups = Array.from(new Set(
      this.allCustomers
        .filter(c => c.group)
        .map(c => c.group)
    ));
    
    if (groups.length === 0) {
      alert('Chưa có khách hàng nào được phân nhóm.');
      return;
    }
    
    const groupList = groups.map((g, i) => `${i + 1} - ${g}`).join('\n');
    const choice = prompt(`Chọn nhóm:\n\n${groupList}\n\nNhập số (1-${groups.length}):`);
    
    const index = choice ? parseInt(choice) - 1 : -1;
    if (index >= 0 && index < groups.length) {
      const selectedGroup = groups[index];
      this.customers = this.allCustomers.filter(c => c.group === selectedGroup);
      this.currentFilter = `group:${selectedGroup}`;
      alert(`Đã lọc ${this.customers.length} khách hàng trong nhóm "${selectedGroup}".`);
    }
  }

  /**
   * Clear all filters
   */
  private clearFilters(): void {
    this.customers = [...this.allCustomers];
    this.currentFilter = 'all';
    this.filterOptions = {
      memberTier: 'all',
      group: 'all',
      minSpending: 0,
      maxSpending: 999999999
    };
    alert('Đã xóa tất cả bộ lọc.');
  }

  /**
   * Search customers
   */
  searchCustomers(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    console.log('Search:', query);
    
    if (!query || query.trim() === '') {
      // Reset to all customers if search is empty
      this.customers = [...this.allCustomers];
    } else {
      // Search customers by query
      const searchTerm = query.toLowerCase().trim();
      this.customers = this.allCustomers.filter(customer => {
        return (
          customer.name.toLowerCase().includes(searchTerm) ||
          customer.id.toLowerCase().includes(searchTerm) ||
          customer.phone.includes(searchTerm) ||
          customer.email.toLowerCase().includes(searchTerm) ||
          customer.address.toLowerCase().includes(searchTerm)
        );
      });
      console.log(`Search results: ${this.customers.length} customers`);
    }
    
    // Reset selection
    this.selectedCount = 0;
    this.selectAll = false;
  }

  /**
   * Get member tier label
   */
  getMemberTierLabel(tier: string): string {
    const labels: any = {
      'gold': 'Vàng',
      'silver': 'Bạc',
      'bronze': 'Đồng'
    };
    return labels[tier] || tier;
  }

  /**
   * Get member tier class
   */
  getMemberTierClass(tier: string): string {
    return `tier-${tier}`;
  }

  /**
   * View customer detail
   */
  viewCustomerDetail(customer: Customer): void {
    // Navigate to customer detail page with customer ID
    this.router.navigate(['/customers', customer.id]);
  }

  /**
   * Toggle filter dropdown
   */
  toggleFilterDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showFilterDropdown = !this.showFilterDropdown;
    if (this.showFilterDropdown) {
      this.showSortDropdown = false;
    }
  }

  /**
   * Toggle sort dropdown
   */
  toggleSortDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showSortDropdown = !this.showSortDropdown;
    if (this.showSortDropdown) {
      this.showFilterDropdown = false;
    }
  }

  /**
   * Close all dropdowns when clicking outside
   */
  closeDropdowns(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.showFilterDropdown = false;
      this.showSortDropdown = false;
    }
  }

  /**
   * Open filter modal
   */
  openFilterModal(): void {
    this.showFilterModal = true;
  }

  /**
   * Close filter modal
   */
  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  /**
   * Apply filters from modal
   */
  applyFilterModal(): void {
    this.applyAllFilters();
    this.closeFilterModal();
  }

  /**
   * Reset filters
   */
  resetFilters(): void {
    this.filterOptions = {
      memberTier: 'all',
      group: 'all',
      minSpending: 0,
      maxSpending: 999999999
    };
    this.applyAllFilters();
  }

  /**
   * Open sort modal
   */
  openSortModal(): void {
    this.showSortModal = true;
  }

  /**
   * Close sort modal
   */
  closeSortModal(): void {
    this.showSortModal = false;
  }

  /**
   * Apply sort from modal
   */
  applySortModal(field: keyof Customer, order: 'asc' | 'desc'): void {
    this.currentSortField = field;
    this.currentSortOrder = order;
    this.applyAllFilters();
    this.closeSortModal();
  }

  /**
   * Set member tier filter (radio-like behavior)
   */
  toggleMemberTierFilter(tier: string): void {
    // Simply set the filter, don't toggle
    console.log('Filter by member tier:', tier);
    this.filterOptions.memberTier = tier;
    this.applyAllFilters();
    console.log('Filtered customers:', this.customers.length);
  }

  /**
   * Set group filter (radio-like behavior)
   */
  toggleGroupFilterDropdown(group: string): void {
    // Simply set the filter, don't toggle
    this.filterOptions.group = group;
    this.applyAllFilters();
  }

  /**
   * Apply all filters
   */
  private applyAllFilters(): void {
    let filtered = [...this.allCustomers];
    console.log('Total customers before filter:', filtered.length);

    // Filter by member tier
    if (this.filterOptions.memberTier !== 'all') {
      console.log('Filtering by memberTier:', this.filterOptions.memberTier);
      filtered = filtered.filter(c => {
        console.log(`Customer ${c.id} has memberTier: ${c.memberTier}`);
        return c.memberTier === this.filterOptions.memberTier;
      });
      console.log('After memberTier filter:', filtered.length);
    }

    // Filter by group
    if (this.filterOptions.group !== 'all') {
      filtered = filtered.filter(c => c.group === this.filterOptions.group);
    }

    // Filter by spending
    if (this.filterOptions.minSpending > 0 || this.filterOptions.maxSpending < 999999999) {
      filtered = filtered.filter(customer => {
        const total = parseFloat(customer.totalOrders.replace(/[.đ]/g, ''));
        return total >= this.filterOptions.minSpending && total <= this.filterOptions.maxSpending;
      });
    }

    // Apply sort
    if (this.currentSortField) {
      filtered = this.sortCustomersByField(filtered, this.currentSortField, this.currentSortOrder);
    }

    this.customers = filtered;
    console.log('Final filtered customers:', this.customers.length);
  }

  /**
   * Sort customers by field
   */
  private sortCustomersByField(
    customers: Customer[],
    field: keyof Customer,
    order: 'asc' | 'desc' = 'asc'
  ): Customer[] {
    const sorted = [...customers].sort((a, b) => {
      let aVal: any = a[field];
      let bVal: any = b[field];
      
      // Handle string comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }

  /**
   * Sort by field (from dropdown)
   */
  sortBy(field: keyof Customer): void {
    if (this.currentSortField === field) {
      this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSortField = field;
      this.currentSortOrder = 'desc';
    }
    this.applyAllFilters();
    
    // Keep dropdown open after sorting
    // setTimeout(() => {
    //   this.showSortDropdown = false;
    // }, 150);
  }

  /**
   * Clear all filters (new version)
   */
  clearAllFilters(): void {
    this.filterOptions = {
      memberTier: 'all',
      group: 'all',
      minSpending: 0,
      maxSpending: 999999999
    };
    this.currentFilter = 'all';
    this.applyAllFilters();
  }
}

