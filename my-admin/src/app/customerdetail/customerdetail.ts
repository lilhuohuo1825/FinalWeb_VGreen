import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-customerdetail',
  imports: [CommonModule, FormsModule],
  templateUrl: './customerdetail.html',
  styleUrl: './customerdetail.css',
  standalone: true
})
export class CustomerDetail implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  customerId: string = '';
  customer: any = null;
  orders: any[] = [];
  
  // Edit mode
  isEditMode = false;
  editableData: any = {};

  // Address data
  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  
  selectedProvince: string = '';
  selectedDistrict: string = '';
  selectedWard: string = '';
  streetAddress: string = '';

  // Multiple addresses
  addresses: any[] = [];
  isAddingNewAddress: boolean = false;
  editingAddressIndex: number = -1;

  // Customer data
  customerData = {
    id: '',
    name: '',
    gender: '',
    email: '',
    birthdate: '',
    phone: '',
    address: '',
    memberTier: '',
    customerType: '',
    joinDate: '',
    recentOrder: '---',
    totalSpent: '---',
    totalOrders: '---',
    hasAccount: false,
    emailConsent: false
  };

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.customerId = params['id'];
      this.loadCustomerDetail();
    });

    // Check if we should enter edit mode
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || window.history.state;
    if (state?.['editMode']) {
      this.isEditMode = true;
    }

    // Load address data
    this.loadAddressData();
    
    // Initialize addresses (sample data)
    this.initializeAddresses();
  }

  /**
   * Initialize sample addresses
   */
  initializeAddresses(): void {
    this.addresses = [
      {
        id: 1,
        fullAddress: 'Phường Phạm Ngũ Lão, Quận 1, Hồ Chí Minh',
        isDefault: true
      },
      {
        id: 2,
        fullAddress: 'Số 10, Ngõ 5, Đường Nguyễn Trãi, Phường Văn Miếu, Đống Đa, Hà Nội',
        isDefault: false
      }
    ];
  }

  /**
   * Load Vietnam address data
   */
  loadAddressData(): void {
    // Sample data for major cities and provinces in Vietnam
    this.provinces = [
      {
        code: 'HN',
        name: 'Hà Nội',
        districts: [
          {
            code: 'HN-BA',
            name: 'Ba Đình',
            wards: ['Phường Ngọc Hà', 'Phường Điện Biên', 'Phường Đội Cấn', 'Phường Nguyễn Trung Trực', 'Phường Quán Thánh']
          },
          {
            code: 'HN-HK',
            name: 'Hoàn Kiếm',
            wards: ['Phường Hàng Bạc', 'Phường Hàng Bồ', 'Phường Hàng Gai', 'Phường Lý Thái Tổ', 'Phường Tràng Tiền']
          },
          {
            code: 'HN-CG',
            name: 'Cầu Giấy',
            wards: ['Phường Dịch Vọng', 'Phường Nghĩa Đô', 'Phường Mai Dịch', 'Phường Yên Hòa', 'Phường Quan Hoa']
          },
          {
            code: 'HN-DD',
            name: 'Đống Đa',
            wards: ['Phường Văn Miếu', 'Phường Quốc Tử Giám', 'Phường Láng Thượng', 'Phường Ô Chợ Dừa', 'Phường Khâm Thiên']
          },
          {
            code: 'HN-HM',
            name: 'Hai Bà Trưng',
            wards: ['Phường Bạch Mai', 'Phường Thanh Nhàn', 'Phường Minh Khai', 'Phường Bạch Đằng', 'Phường Đồng Nhân']
          }
        ]
      },
      {
        code: 'HCM',
        name: 'Hồ Chí Minh',
        districts: [
          {
            code: 'HCM-Q1',
            name: 'Quận 1',
            wards: ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Nguyễn Thái Bình', 'Phường Phạm Ngũ Lão', 'Phường Tân Định']
          },
          {
            code: 'HCM-Q3',
            name: 'Quận 3',
            wards: ['Phường 01', 'Phường 02', 'Phường 03', 'Phường 04', 'Phường 05']
          },
          {
            code: 'HCM-PN',
            name: 'Phú Nhuận',
            wards: ['Phường 01', 'Phường 02', 'Phường 03', 'Phường 04', 'Phường 05']
          },
          {
            code: 'HCM-BT',
            name: 'Bình Thạnh',
            wards: ['Phường 01', 'Phường 02', 'Phường 03', 'Phường 05', 'Phường 06']
          },
          {
            code: 'HCM-TD',
            name: 'Thủ Đức',
            wards: ['Phường Linh Đông', 'Phường Linh Tây', 'Phường Linh Trung', 'Phường Tam Bình', 'Phường Tam Phú']
          }
        ]
      },
      {
        code: 'DN',
        name: 'Đà Nẵng',
        districts: [
          {
            code: 'DN-HC',
            name: 'Hải Châu',
            wards: ['Phường Thanh Bình', 'Phường Thạch Thang', 'Phường Hải Châu I', 'Phường Hải Châu II', 'Phường Phước Ninh']
          },
          {
            code: 'DN-SH',
            name: 'Sơn Trà',
            wards: ['Phường Thọ Quang', 'Phường Nại Hiên Đông', 'Phường Mân Thái', 'Phường An Hải Bắc', 'Phường Phước Mỹ']
          },
          {
            code: 'DN-CL',
            name: 'Cẩm Lệ',
            wards: ['Phường Hòa Phát', 'Phường Hòa An', 'Phường Hòa Thọ Tây', 'Phường Hòa Thọ Đông', 'Phường Khuê Trung']
          }
        ]
      },
      {
        code: 'HP',
        name: 'Hải Phòng',
        districts: [
          {
            code: 'HP-HK',
            name: 'Hồng Bàng',
            wards: ['Phường Quán Toan', 'Phường Hùng Vương', 'Phường Sở Dầu', 'Phường Thượng Lý', 'Phường Hạ Lý']
          },
          {
            code: 'HP-LC',
            name: 'Lê Chân',
            wards: ['Phường Cát Dài', 'Phường An Biên', 'Phường Lam Sơn', 'Phường An Dương', 'Phường Trần Nguyên Hãn']
          }
        ]
      },
      {
        code: 'CT',
        name: 'Cần Thơ',
        districts: [
          {
            code: 'CT-NK',
            name: 'Ninh Kiều',
            wards: ['Phường Cái Khế', 'Phường An Hòa', 'Phường Thới Bình', 'Phường An Nghiệp', 'Phường An Cư']
          },
          {
            code: 'CT-BT',
            name: 'Bình Thủy',
            wards: ['Phường Bình Thủy', 'Phường Trà An', 'Phường Trà Nóc', 'Phường Thới An Đông', 'Phường An Thới']
          }
        ]
      }
    ];
  }

  /**
   * Load customer detail
   */
  loadCustomerDetail(): void {
    this.http.get<any[]>('data/users.json').subscribe({
      next: (users) => {
        // Extract customer ID number from format KH0001
        const customerIdNum = parseInt(this.customerId.replace('KH', ''));
        this.customer = users.find(u => u.user_id === customerIdNum);
        
        if (this.customer) {
          this.loadCustomerOrders();
        }
      },
      error: (error) => {
        console.error('Error loading customer:', error);
      }
    });
  }

  /**
   * Load customer orders
   */
  loadCustomerOrders(): void {
    // Try to load from orderdetail.json first, fallback to orders.json
    this.http.get<any[]>('data/orderdetail.json').subscribe({
      next: (orders) => {
        this.orders = orders.filter(o => o.user_id === this.customer.user_id);
        console.log(`Found ${this.orders.length} orders for customer from orderdetail.json`);
        // Transform customer data after orders are loaded
        this.transformCustomerData();
      },
      error: (error) => {
        console.error('Error loading orders from orderdetail.json, trying orders.json:', error);
        // Fallback to orders.json
        this.http.get<any[]>('data/orders.json').subscribe({
          next: (orders) => {
            this.orders = orders.filter(o => o.user_id === this.customer.user_id);
            console.log(`Found ${this.orders.length} orders for customer from orders.json`);
            this.transformCustomerData();
          },
          error: (err) => {
            console.error('Error loading orders:', err);
            this.transformCustomerData();
          }
        });
      }
    });
  }

  /**
   * Transform customer data for display
   */
  transformCustomerData(): void {
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = this.customer.register_date.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Map customer_type to memberTier
    let memberTier = 'Đồng';
    let customerType = this.customer.customer_type || 'Regular';
    
    if (this.customer.customer_type === 'VIP') {
      memberTier = 'Vàng';
    } else if (this.customer.customer_type === 'Premium') {
      memberTier = 'Bạc';
    } else if (this.customer.customer_type === 'Regular') {
      memberTier = 'Đồng';
    }

    // Default values - will be updated when orders are loaded
    let recentOrder = '---';
    let totalSpent = '---';
    let totalOrders = '---';

    if (this.orders.length > 0) {
      // Calculate total spent - use order_total from orderdetail.json or total_amount from orders.json
      const total = this.orders.reduce((sum, order) => sum + (order.order_total || order.total_amount || 0), 0);
      totalSpent = this.formatCurrency(total);
      totalOrders = this.orders.length.toString();
      
      // Find most recent order
      const sortedOrders = [...this.orders].sort((a, b) => 
        new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
      );
      
      // Format recent order date
      const recentOrderDate = new Date(sortedOrders[0].order_date);
      const day = String(recentOrderDate.getDate()).padStart(2, '0');
      const month = String(recentOrderDate.getMonth() + 1).padStart(2, '0');
      const year = recentOrderDate.getFullYear();
      recentOrder = `${day}/${month}/${year}`;
    }

    // Determine if customer has account (has email and full_name)
    const hasAccount = !!(this.customer.email && this.customer.full_name);
    
    // Email consent - assume false for now (not in JSON)
    const emailConsent = false;

    this.customerData = {
      id: this.customerId,
      name: this.customer.full_name || '(Chưa cập nhật)',
      gender: 'Nam', // Default, not in JSON
      email: this.customer.email || '(Chưa cập nhật)',
      birthdate: '01/01/2000', // Default, not in JSON
      phone: this.customer.phone || '(Chưa cập nhật)',
      address: this.customer.address || '(Chưa cập nhật)',
      memberTier: memberTier,
      customerType: customerType,
      joinDate: formattedDate,
      recentOrder: recentOrder,
      totalSpent: totalSpent,
      totalOrders: totalOrders,
      hasAccount: hasAccount,
      emailConsent: emailConsent
    };
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Go back to customers list
   */
  goBack(): void {
    if (this.isEditMode) {
      // If in edit mode, just cancel edit
      this.cancelEdit();
    } else {
      this.router.navigate(['/customers']);
    }
  }

  /**
   * View all orders
   */
  viewAllOrders(): void {
    // Navigate to orders page with customer filter
    this.router.navigate(['/orders'], { 
      queryParams: { customer: this.customer.user_id } 
    });
  }

  /**
   * Edit address - Enter edit mode
   */
  editAddress(): void {
    if (!this.isEditMode) {
      this.toggleEditMode();
    }
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode(): void {
    if (!this.isEditMode) {
      // Enter edit mode - copy current data to editable
      this.editableData = {
        name: this.customerData.name === '(Chưa cập nhật)' ? '' : this.customerData.name,
        email: this.customerData.email === '(Chưa cập nhật)' ? '' : this.customerData.email,
        phone: this.customerData.phone,
        address: this.customerData.address === '(Chưa cập nhật)' ? '' : this.customerData.address,
        memberTier: this.customerData.memberTier,
        emailConsent: this.customerData.emailConsent,
        gender: this.customerData.gender === 'Nam' ? 'Nam' : this.customerData.gender === 'Nữ' ? 'Nữ' : '',
        birthdate: this.customerData.birthdate
      };
      
      // Parse existing address if available
      this.parseAddress(this.customerData.address);
      
      this.isEditMode = true;
    } else {
      // Cancel edit mode
      this.cancelEdit();
    }
  }

  /**
   * Parse existing address into components
   */
  parseAddress(address: string): void {
    // Reset selections
    this.selectedProvince = '';
    this.selectedDistrict = '';
    this.selectedWard = '';
    this.streetAddress = '';
  }

  /**
   * Start adding new address
   */
  startAddingAddress(): void {
    this.isAddingNewAddress = true;
    this.editingAddressIndex = -1;
    this.selectedProvince = '';
    this.selectedDistrict = '';
    this.selectedWard = '';
    this.streetAddress = '';
    this.districts = [];
    this.wards = [];
  }

  /**
   * Start editing address
   */
  startEditingAddress(index: number): void {
    this.isAddingNewAddress = false;
    this.editingAddressIndex = index;
    // Parse the existing address back to form (simplified - just clear for now)
    this.selectedProvince = '';
    this.selectedDistrict = '';
    this.selectedWard = '';
    this.streetAddress = this.addresses[index].fullAddress;
  }

  /**
   * Save new or edited address
   */
  saveAddress(): void {
    const fullAddress = this.buildFullAddress();
    
    if (!fullAddress) {
      alert('Vui lòng nhập đầy đủ thông tin địa chỉ');
      return;
    }

    if (this.editingAddressIndex >= 0) {
      // Edit existing address
      this.addresses[this.editingAddressIndex].fullAddress = fullAddress;
    } else {
      // Add new address
      const isFirstAddress = this.addresses.length === 0;
      const newAddress = {
        id: Date.now(),
        fullAddress: fullAddress,
        isDefault: isFirstAddress // First address is default
      };
      
      if (isFirstAddress) {
        // First address - just add it
        this.addresses.push(newAddress);
      } else {
        // Not first address - add at the end (not default)
        this.addresses.push(newAddress);
      }
    }

    this.cancelAddressEdit();
  }

  /**
   * Cancel adding/editing address
   */
  cancelAddressEdit(): void {
    this.isAddingNewAddress = false;
    this.editingAddressIndex = -1;
    this.selectedProvince = '';
    this.selectedDistrict = '';
    this.selectedWard = '';
    this.streetAddress = '';
    this.districts = [];
    this.wards = [];
  }

  /**
   * Set default address and move to top
   */
  setDefaultAddress(index: number): void {
    // Get the selected address
    const selectedAddress = this.addresses[index];
    
    // Set all addresses as non-default
    this.addresses.forEach(addr => {
      addr.isDefault = false;
    });
    
    // Set selected as default
    selectedAddress.isDefault = true;
    
    // Remove from current position
    this.addresses.splice(index, 1);
    
    // Insert at the beginning
    this.addresses.unshift(selectedAddress);
  }

  /**
   * Delete address
   */
  deleteAddress(index: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
      const wasDefault = this.addresses[index].isDefault;
      this.addresses.splice(index, 1);
      
      // If deleted default, set first address as default
      if (wasDefault && this.addresses.length > 0) {
        this.addresses[0].isDefault = true;
      }
    }
  }

  /**
   * Get default address
   */
  getDefaultAddress(): any {
    return this.addresses.find(addr => addr.isDefault);
  }

  /**
   * On province change
   */
  onProvinceChange(): void {
    const province = this.provinces.find(p => p.code === this.selectedProvince);
    if (province) {
      this.districts = province.districts;
    } else {
      this.districts = [];
    }
    this.wards = [];
    this.selectedDistrict = '';
    this.selectedWard = '';
  }

  /**
   * On district change
   */
  onDistrictChange(): void {
    const district = this.districts.find(d => d.code === this.selectedDistrict);
    if (district) {
      this.wards = district.wards;
    } else {
      this.wards = [];
    }
    this.selectedWard = '';
  }

  /**
   * Build full address from components
   */
  buildFullAddress(): string {
    const parts: string[] = [];
    
    if (this.streetAddress) {
      parts.push(this.streetAddress);
    }
    
    if (this.selectedWard) {
      parts.push(this.selectedWard);
    }
    
    if (this.selectedDistrict) {
      const district = this.districts.find(d => d.code === this.selectedDistrict);
      if (district) {
        parts.push(district.name);
      }
    }
    
    if (this.selectedProvince) {
      const province = this.provinces.find(p => p.code === this.selectedProvince);
      if (province) {
        parts.push(province.name);
      }
    }
    
    return parts.join(', ');
  }

  /**
   * Save customer changes
   */
  saveCustomer(): void {
    // Update customer data
    this.customerData.name = this.editableData.name || '(Chưa cập nhật)';
    this.customerData.email = this.editableData.email || '(Chưa cập nhật)';
    this.customerData.phone = this.editableData.phone;
    
    // Build full address from components
    const fullAddress = this.buildFullAddress();
    this.customerData.address = fullAddress || '(Chưa cập nhật)';
    
    this.customerData.memberTier = this.editableData.memberTier;
    this.customerData.emailConsent = this.editableData.emailConsent;
    this.customerData.gender = this.editableData.gender;
    this.customerData.birthdate = this.editableData.birthdate;

    // Update customer type label
    if (this.editableData.memberTier === 'gold') {
      this.customerData.customerType = 'VIP';
    } else if (this.editableData.memberTier === 'silver') {
      this.customerData.customerType = 'Premium';
    } else {
      this.customerData.customerType = 'Regular';
    }

    // Exit edit mode
    this.isEditMode = false;

    console.log('Saved customer data:', this.customerData);
  }

  /**
   * Cancel edit mode
   */
  cancelEdit(): void {
    this.isEditMode = false;
    this.editableData = {};
    this.selectedProvince = '';
    this.selectedDistrict = '';
    this.selectedWard = '';
    this.streetAddress = '';
    this.districts = [];
    this.wards = [];
  }

  /**
   * View order detail
   */
  viewOrderDetail(orderId: number): void {
    // Navigate to order detail with state to know we came from customer detail
    this.router.navigate(['/orders', orderId], { 
      state: { 
        returnUrl: `/customers/${this.customerId}`,
        fromCustomerDetail: true 
      } 
    });
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: any = {
      'Pending': 'Chờ xác nhận',
      'Confirmed': 'Đã xác nhận',
      'Cancel Requested': 'Yêu cầu huỷ/hoàn tiền',
      'Return Requested': 'Yêu cầu huỷ/hoàn tiền',
      'Cancelled': 'Đã huỷ',
      'Refunded': 'Đã hoàn tiền',
      'Delivered': 'Đã giao'
    };
    return labels[status] || status;
  }

  /**
   * Get status class
   */
  getStatusClass(status: string): string {
    const classes: any = {
      'Pending': 'status-pending',
      'Confirmed': 'status-confirmed',
      'Cancel Requested': 'status-refund-requested',
      'Return Requested': 'status-refund-requested',
      'Cancelled': 'status-cancelled',
      'Refunded': 'status-refunded',
      'Delivered': 'status-confirmed'
    };
    return classes[status] || 'status-pending';
  }

  /**
   * Format order date
   */
  formatOrderDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

