import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

/**
 * ============================================================================
 * INTERFACES & TYPES
 * ============================================================================
 */

/**
 * Promotion JSON structure from data file
 */
interface PromotionJSON {
  promotion_id: string;
  code: string;
  name: string;
  description?: string;
  type?: string;
  scope?: string;
  discount_type: string;
  discount_value: number | string;
  max_discount_value?: number;
  min_order_value?: number;
  usage_limit?: number | string;
  user_limit?: number | string;
  is_first_order_only?: boolean;
  start_date: string;
  end_date: string;
  status: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Promotion interface for application use
 */
export interface Promotion {
  id?: number;
  code: string;
  name: string;
  description?: string;
  type?: 'User' | 'Admin';
  scope?: 'Order' | 'Shipping' | 'Category' | 'Brand' | 'Product';
  discountType: 'percentage' | 'fixed' | 'buy1get1';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  userLimit?: number;
  usageCount: number;
  isFirstOrderOnly?: boolean;
  status: 'active' | 'upcoming' | 'expired';
  targetProducts?: string[];
  targetCategories?: string[];
  updatedAt?: string;
  selected?: boolean;
  groups?: string[];
}

/**
 * Filter criteria interface
 */
export interface FilterCriteria {
  status?: 'active' | 'upcoming' | 'expired';
  type?: 'User' | 'Admin';
  discountType?: 'percentage' | 'fixed' | 'buy1get1';
  scope?: 'All' | 'Product' | 'Category';
  minDiscount?: number;
  maxDiscount?: number;
  group?: string;
}

/**
 * ============================================================================
 * COMPONENT
 * ============================================================================
 */

@Component({
  selector: 'app-promotionmanage',
  templateUrl: './promotionmanage.html',
  styleUrls: ['./promotionmanage.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PromotionManage implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  // Data
  promotions: Promotion[] = [];
  filteredPromotions: Promotion[] = [];
  allPromotions: Promotion[] = [];

  // UI State
  isLoading: boolean = true;
  showSortDropdown: boolean = false;
  showGroupModal: boolean = false;
  showAddEditModal: boolean = false;
  showDetailModal: boolean = false;
  editMode: boolean = false;
  currentPromotion: Promotion | null = null;
  selectedPromotion: Promotion | null = null;

  // Search & Sort
  searchQuery: string = '';
  currentSortBy: 'updated' | 'usage' = 'updated';
  currentSortOrder: 'asc' | 'desc' = 'desc';
  selectedSort: string = '';
  selectedStatFilter: 'total' | 'expired' | 'active' | 'upcoming' | null = null;

  // Stats
  totalCount: number = 0;
  activeCount: number = 0;
  upcomingCount: number = 0;
  expiredCount: number = 0;

  // Available filters
  availableGroups: string[] = [];

  /**
   * ============================================================================
   * LIFECYCLE HOOKS
   * ============================================================================
   */

  ngOnInit(): void {
    this.loadPromotions();
    
    // Global click listener to close dropdowns
    document.addEventListener('click', () => {
      this.showSortDropdown = false;
      this.cdr.detectChanges();
    });
  }

  /**
   * ============================================================================
   * DATA LOADING
   * ============================================================================
   */

  loadPromotions(): void {
    this.isLoading = true;
    
    // Load from data/promotion/promotions.json
    this.http.get<PromotionJSON[]>('data/promotion/promotions.json').subscribe({
      next: (data) => {
        this.allPromotions = this.transformPromotionsData(data);
        this.promotions = [...this.allPromotions];
        this.sortByUpdated('desc'); // Default sort
        this.calculateStats();
        this.extractAvailableGroups();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading promotions:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  transformPromotionsData(data: PromotionJSON[]): Promotion[] {
    return data.map((item, index) => {
      const status = this.getPromotionStatus(item.start_date, item.end_date, item.status);
      
      // Convert discount_type
      let discountType: 'percentage' | 'fixed' | 'buy1get1' = 'percentage';
      if (item.discount_type === 'percent') {
        discountType = 'percentage';
      } else if (item.discount_type === 'fixed') {
        discountType = 'fixed';
      } else if (item.discount_type === 'buy1get1') {
        discountType = 'buy1get1';
      }
      
      return {
        id: index + 1,
        code: item.code,
        name: item.name,
        description: item.description,
        type: (item.type as 'User' | 'Admin') || 'User',
        scope: (item.scope as any) || 'Order',
        discountType: discountType,
        discountValue: typeof item.discount_value === 'number' ? item.discount_value : 0,
        minPurchase: item.min_order_value,
        maxDiscount: item.max_discount_value,
        startDate: item.start_date,
        endDate: item.end_date,
        usageLimit: typeof item.usage_limit === 'number' ? item.usage_limit : 0,
        userLimit: typeof item.user_limit === 'number' ? item.user_limit : 0,
        usageCount: 0, // We don't have usage_count in the JSON, default to 0
        isFirstOrderOnly: item.is_first_order_only || false,
        status: status,
        updatedAt: item.updated_at,
        selected: false,
        groups: []
      };
    });
  }

  getPromotionStatus(startDate: string, endDate: string, jsonStatus?: string): 'active' | 'upcoming' | 'expired' {
    // If status is Draft, treat as upcoming regardless of dates
    if (jsonStatus === 'Draft') {
      return 'upcoming';
    }
    
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return 'upcoming';
    } else if (now > end) {
      return 'expired';
    } else {
      return 'active';
    }
  }

  /**
   * ============================================================================
   * STATISTICS
   * ============================================================================
   */

  calculateStats(): void {
    this.totalCount = this.promotions.length;
    this.activeCount = this.promotions.filter(p => p.status === 'active').length;
    this.upcomingCount = this.promotions.filter(p => p.status === 'upcoming').length;
    this.expiredCount = this.promotions.filter(p => p.status === 'expired').length;
  }

  /**
   * ============================================================================
   * SELECTION
   * ============================================================================
   */

  get selectedCount(): number {
    return this.filteredPromotions.filter(p => p.selected).length;
  }

  get allSelected(): boolean {
    return this.filteredPromotions.length > 0 && 
           this.filteredPromotions.every(p => p.selected);
  }

  toggleSelectAll(): void {
    const newState = !this.allSelected;
    this.filteredPromotions.forEach(p => p.selected = newState);
  }

  toggleSelect(promotion: Promotion): void {
    promotion.selected = !promotion.selected;
  }

  /**
   * ============================================================================
   * SEARCH & SORT
   * ============================================================================
   */

  searchPromotions(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchQuery = query;
    this.applySearch();
  }

  applySearch(): void {
    let result = [...this.promotions];

    // Apply search
    if (this.searchQuery) {
      result = result.filter(p => 
        p.code.toLowerCase().includes(this.searchQuery) ||
        p.name.toLowerCase().includes(this.searchQuery) ||
        (p.description && p.description.toLowerCase().includes(this.searchQuery))
      );
    }

    this.filteredPromotions = result;
  }

  /**
   * Sort by updated date
   */
  sortByUpdated(order: 'asc' | 'desc' = 'desc'): void {
    this.currentSortBy = 'updated';
    this.currentSortOrder = order;
    
    this.promotions.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.startDate).getTime();
      const dateB = new Date(b.updatedAt || b.startDate).getTime();
      
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    console.log(`📊 Sorted promotions by date: ${order}`);
    this.applySearch();
    this.closeSortDropdown();
  }

  /**
   * Sort by usage count
   */
  sortByUsage(order: 'asc' | 'desc' = 'desc'): void {
    this.currentSortBy = 'usage';
    this.currentSortOrder = order;
    
    this.promotions.sort((a, b) => {
      const usageA = a.usageCount || 0;
      const usageB = b.usageCount || 0;
      
      return order === 'asc' ? usageA - usageB : usageB - usageA;
    });
    
    console.log(`📊 Sorted promotions by usage: ${order}`);
    this.applySearch();
    this.closeSortDropdown();
  }

  /**
   * Toggle sort order (asc <-> desc)
   */
  toggleSortOrder(): void {
    const newOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
    
    if (this.currentSortBy === 'updated') {
      this.sortByUpdated(newOrder);
    } else if (this.currentSortBy === 'usage') {
      this.sortByUsage(newOrder);
    }
  }

  /**
   * Filter by stat card
   */
  filterByStatus(status: 'total' | 'expired' | 'active' | 'upcoming'): void {
    if (this.selectedStatFilter === status) {
      // Unselect if clicking the same card
      this.selectedStatFilter = null;
      this.promotions = [...this.allPromotions];
    } else {
      // Select new status
      this.selectedStatFilter = status;
      if (status === 'total') {
        // Show all promotions
        this.promotions = [...this.allPromotions];
      } else {
        // Filter by status
        this.promotions = this.allPromotions.filter(p => p.status === status);
      }
    }
    
    // Re-apply current sort
    if (this.currentSortBy === 'updated') {
      this.sortByUpdated(this.currentSortOrder);
    } else {
      this.sortByUsage(this.currentSortOrder);
    }
  }

  /**
   * ============================================================================
   * ACTIONS
   * ============================================================================
   */

  addPromotion(): void {
    this.editMode = false;
    this.currentPromotion = {
      code: '',
      name: '',
      description: '',
      type: 'User',
      scope: 'Order',
      discountType: 'percentage',
      discountValue: 0,
      minPurchase: 0,
      maxDiscount: 0,
      startDate: '',
      endDate: '',
      usageLimit: 0,
      userLimit: 0,
      usageCount: 0,
      isFirstOrderOnly: false,
      status: 'upcoming'
    };
    this.showAddEditModal = true;
  }

  editPromotions(): void {
    const selected = this.filteredPromotions.filter(p => p.selected);
    if (selected.length === 1) {
      this.editMode = true;
      this.currentPromotion = { ...selected[0] };
      this.showAddEditModal = true;
    } else if (selected.length > 1) {
      alert('Vui lòng chỉ chọn 1 khuyến mãi để chỉnh sửa');
    }
  }

  deletePromotions(): void {
    const selected = this.filteredPromotions.filter(p => p.selected);
    if (selected.length === 0) return;

    const confirmed = confirm(`Bạn có chắc muốn xóa ${selected.length} khuyến mãi đã chọn?`);
    if (confirmed) {
      selected.forEach(promotion => {
        const index = this.promotions.findIndex(p => p.id === promotion.id);
        if (index > -1) {
          this.promotions.splice(index, 1);
        }
      });
      this.applySearch();
      this.calculateStats();
      alert('Đã xóa khuyến mãi thành công!');
    }
  }

  savePromotion(): void {
    if (!this.currentPromotion) return;

    if (this.editMode) {
      // Update existing promotion
      const index = this.promotions.findIndex(p => p.id === this.currentPromotion!.id);
      if (index > -1) {
        this.promotions[index] = { ...this.currentPromotion };
      }
    } else {
      // Add new promotion
      const newPromotion = {
        ...this.currentPromotion,
        id: this.promotions.length + 1,
        usageCount: 0,
        selected: false,
        groups: []
      };
      this.promotions.push(newPromotion);
    }

    this.applySearch();
    this.calculateStats();
    this.closeAddEditModal();
    alert(this.editMode ? 'Đã cập nhật khuyến mãi!' : 'Đã thêm khuyến mãi mới!');
  }

  /**
   * ============================================================================
   * GROUPING
   * ============================================================================
   */

  openGroupModal(): void {
    const selected = this.filteredPromotions.filter(p => p.selected);
    if (selected.length < 2) {
      alert('Vui lòng chọn ít nhất 2 khuyến mãi để nhóm');
      return;
    }
    this.showGroupModal = true;
  }

  closeGroupModal(): void {
    this.showGroupModal = false;
  }

  createGroup(groupName: string): void {
    if (!groupName.trim()) {
      alert('Vui lòng nhập tên nhóm');
      return;
    }

    const selected = this.filteredPromotions.filter(p => p.selected);
    selected.forEach(promotion => {
      if (!promotion.groups) {
        promotion.groups = [];
      }
      if (!promotion.groups.includes(groupName)) {
        promotion.groups.push(groupName);
      }
    });

    this.extractAvailableGroups();
    this.closeGroupModal();
    alert(`Đã nhóm ${selected.length} khuyến mãi vào "${groupName}"`);
  }

  extractAvailableGroups(): void {
    const groups = new Set<string>();
    this.promotions.forEach(p => {
      if (p.groups) {
        p.groups.forEach(g => groups.add(g));
      }
    });
    this.availableGroups = Array.from(groups);
  }

  /**
   * ============================================================================
   * UI HELPERS
   * ============================================================================
   */

  toggleSortDropdown(event: Event): void {
    event.stopPropagation();
    this.showSortDropdown = !this.showSortDropdown;
    console.log('🔄 Toggle dropdown:', this.showSortDropdown);
    this.cdr.detectChanges();
  }

  closeSortDropdown(): void {
    this.showSortDropdown = false;
    this.cdr.detectChanges();
  }

  closeDropdowns(event: Event): void {
    this.showSortDropdown = false;
  }

  /**
   * Sort promotions based on selected option
   */
  sortPromotions(): void {
    if (!this.selectedSort) {
      // Reset to original order if no sort selected
      this.filteredPromotions = [...this.promotions];
      return;
    }

    const sorted = [...this.filteredPromotions];

    switch (this.selectedSort) {
      case 'date_desc':
        // Sort by updated date - newest first
        sorted.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        });
        break;

      case 'date_asc':
        // Sort by updated date - oldest first
        sorted.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateA - dateB;
        });
        break;

      case 'usage_desc':
        // Sort by usage count - highest first
        sorted.sort((a, b) => b.usageCount - a.usageCount);
        break;

      case 'usage_asc':
        // Sort by usage count - lowest first
        sorted.sort((a, b) => a.usageCount - b.usageCount);
        break;
    }

    this.filteredPromotions = sorted;
    console.log(`📊 Sorted promotions by: ${this.selectedSort}`);
  }

  closeAddEditModal(): void {
    this.showAddEditModal = false;
    this.currentPromotion = null;
  }

  /**
   * View promotion detail
   */
  viewPromotionDetail(promotion: Promotion): void {
    this.selectedPromotion = { ...promotion };
    this.showDetailModal = true;
    this.cdr.detectChanges();
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedPromotion = null;
  }

  /**
   * Save changes from detail modal
   */
  saveDetailChanges(): void {
    if (!this.selectedPromotion) return;

    // Update promotion in arrays
    const index = this.allPromotions.findIndex(p => p.code === this.selectedPromotion!.code);
    if (index !== -1) {
      this.allPromotions[index] = { ...this.selectedPromotion };
    }

    const filteredIndex = this.filteredPromotions.findIndex(p => p.code === this.selectedPromotion!.code);
    if (filteredIndex !== -1) {
      this.filteredPromotions[filteredIndex] = { ...this.selectedPromotion };
    }

    const promotionIndex = this.promotions.findIndex(p => p.code === this.selectedPromotion!.code);
    if (promotionIndex !== -1) {
      this.promotions[promotionIndex] = { ...this.selectedPromotion };
    }

    // Recalculate stats
    this.calculateStats();
    
    this.closeDetailModal();
    alert('Đã cập nhật khuyến mãi!');
    this.cdr.detectChanges();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'upcoming':
        return 'status-upcoming';
      case 'expired':
        return 'status-expired';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active':
        return 'Đang diễn ra';
      case 'upcoming':
        return 'Sắp diễn ra';
      case 'expired':
        return 'Đã kết thúc';
      default:
        return status;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}


