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
   * Normalize customer ID to CUSxxxxxx format
   */
  private normalizeCustomerID(customerId: string): string {
    // If already in CUS format, return as is
    if (customerId.toUpperCase().startsWith('CUS')) {
      return customerId.toUpperCase();
    }
    
    // If in KH format, convert to CUS
    if (customerId.toUpperCase().startsWith('KH')) {
      const idNum = customerId.toUpperCase().replace('KH', '').replace(/^0+/, '') || '0';
      return `CUS${idNum.padStart(6, '0')}`;
    }
    
    // If just numbers, add CUS prefix
    const idNum = customerId.replace(/^0+/, '') || '0';
    return `CUS${idNum.padStart(6, '0')}`;
  }

  /**
   * Load customer detail - Try MongoDB first, fallback to JSON
   */
  loadCustomerDetail(): void {
    // Normalize customer ID to CUSxxxxxx format
    const customerID = this.normalizeCustomerID(this.customerId);
    
    console.log(`📋 Loading customer detail for: ${customerID} (original: ${this.customerId})`);
    
    // Try to load from MongoDB API first
    this.http.get<any>(`http://localhost:3000/api/users/customer/${customerID}`).subscribe({
      next: (response) => {
        if (response.success && response.customer) {
          console.log('✅ Found customer in MongoDB:', response.customer);
          this.customer = response.customer;
          this.loadCustomerOrders();
          this.loadCustomerAddresses();
        } else {
          console.log('⚠️ Customer not found in MongoDB, trying JSON...');
          this.loadCustomerFromJson(customerID);
        }
      },
      error: (error) => {
        console.log('⚠️ MongoDB API error, trying JSON file...', error);
        this.loadCustomerFromJson(customerID);
      }
    });
  }

  /**
   * Load customer from JSON file (fallback)
   */
  loadCustomerFromJson(customerID: string): void {
    this.http.get<any[]>('data/temp/users.json').subscribe({
      next: (users) => {
        // Find customer by CustomerID
        this.customer = users.find((u: any) => u.CustomerID === customerID);
        
        if (this.customer) {
          console.log('✅ Found customer in JSON:', this.customer);
          this.loadCustomerOrders();
          this.loadCustomerAddresses();
        } else {
          console.error('❌ Customer not found in JSON:', customerID);
          // Show error message to user
          alert(`Không tìm thấy khách hàng với ID: ${customerID}`);
        }
      },
      error: (error) => {
        console.error('❌ Error loading customer from JSON:', error);
        alert('Lỗi khi tải thông tin khách hàng');
      }
    });
  }

  /**
   * Load customer orders - Try MongoDB API first, fallback to JSON
   */
  loadCustomerOrders(): void {
    const customerID = this.customer.CustomerID;
    console.log(`📦 Loading orders for customer: ${customerID}`);
    
    // Try to load from MongoDB API first
    this.http.get<any>(`http://localhost:3000/api/orders/customer/${customerID}`).subscribe({
      next: (response) => {
        if (response.success && response.orders) {
          console.log(`✅ Found ${response.orders.length} orders in MongoDB`);
          this.orders = response.orders;
          this.transformCustomerData();
        } else {
          console.log('⚠️ Orders not found in MongoDB, trying JSON...');
          this.loadOrdersFromJson(customerID);
        }
      },
      error: (error) => {
        console.log('⚠️ MongoDB API error for orders, trying JSON file...', error);
        this.loadOrdersFromJson(customerID);
      }
    });
  }

  /**
   * Load orders from JSON file (fallback)
   */
  loadOrdersFromJson(customerID: string): void {
    this.http.get<any[]>('data/temp/orders.json').subscribe({
      next: (orders) => {
        // Filter orders by CustomerID
        this.orders = orders.filter((o: any) => o.CustomerID === customerID);
        console.log(`✅ Found ${this.orders.length} orders in JSON for customer ${customerID}`);
        // Transform customer data after orders are loaded
        this.transformCustomerData();
      },
      error: (error) => {
        console.error('❌ Error loading orders from JSON:', error);
        this.orders = [];
        this.transformCustomerData();
      }
    });
  }

  /**
   * Load customer addresses
   */
  loadCustomerAddresses(): void {
    // Load from data/temp/useraddresses.json
    this.http.get<any[]>('data/temp/useraddresses.json').subscribe({
      next: (userAddresses) => {
        // Find addresses for this customer
        const customerID = this.customer.CustomerID;
        const userAddress = userAddresses.find((ua: any) => ua.CustomerID === customerID);
        
        if (userAddress && userAddress.addresses && userAddress.addresses.length > 0) {
          // Transform addresses to display format
          this.addresses = userAddress.addresses.map((addr: any) => {
            // Build full address string
            const addressParts: string[] = [];
            if (addr.detail) addressParts.push(addr.detail);
            if (addr.ward) addressParts.push(addr.ward);
            if (addr.district) addressParts.push(addr.district);
            if (addr.city) addressParts.push(addr.city);
            
            return {
              id: addr._id?.$oid || Date.now(),
              fullAddress: addressParts.join(', ') || 'Chưa có địa chỉ',
              isDefault: addr.isDefault || false,
              fullName: addr.fullName,
              phone: addr.phone,
              email: addr.email,
              city: addr.city,
              district: addr.district,
              ward: addr.ward,
              detail: addr.detail
            };
          });
          
          // Sort: default address first
          this.addresses.sort((a, b) => {
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            return 0;
          });
          
          console.log(`✅ Loaded ${this.addresses.length} addresses for customer ${customerID}`);
        } else {
          console.log(`⚠️  No addresses found for customer ${customerID}`);
          this.addresses = [];
        }
      },
      error: (error) => {
        console.error('❌ Error loading addresses:', error);
        this.addresses = [];
      }
    });
  }

  /**
   * Transform customer data for display
   */
  transformCustomerData(): void {
    // Format RegisterDate from MongoDB date format (support both JSON and MongoDB format)
    let formattedDate = '---';
    if (this.customer.RegisterDate) {
      let registerDate: Date;
      if (this.customer.RegisterDate.$date) {
        // JSON format from MongoDB export
        registerDate = new Date(this.customer.RegisterDate.$date);
      } else if (this.customer.RegisterDate instanceof Date) {
        // MongoDB native Date object
        registerDate = this.customer.RegisterDate;
      } else {
        // String or other format
        registerDate = new Date(this.customer.RegisterDate);
      }
      const day = String(registerDate.getDate()).padStart(2, '0');
      const month = String(registerDate.getMonth() + 1).padStart(2, '0');
      const year = registerDate.getFullYear();
      formattedDate = `${day}/${month}/${year}`;
    }

    // Get CustomerTiering from customer data (Đồng, Bạc, Vàng)
    const memberTier = this.customer.CustomerTiering || 'Đồng';
    
    // Map CustomerTiering to customerType
    let customerType = 'Regular';
    if (memberTier === 'Vàng') {
      customerType = 'VIP';
    } else if (memberTier === 'Bạc') {
      customerType = 'Premium';
    }

    // Calculate statistics from orders
    let recentOrder = '---';
    let totalSpent = '---';
    let totalOrders = '---';

    // Use TotalSpent from customer data if available and > 0 (from MongoDB), otherwise calculate from orders
    // Note: If TotalSpent is 0, it might be outdated, so we recalculate from orders
    if (this.customer.TotalSpent !== undefined && this.customer.TotalSpent !== null && this.customer.TotalSpent > 0) {
      totalSpent = this.formatCurrency(this.customer.TotalSpent);
    }

    // Calculate order statistics
    if (this.orders.length > 0) {
      // Count completed/delivered orders (orders that are paid/finalized)
      const completedOrders = this.orders.filter((o: any) => {
        const status = (o.status || '').toLowerCase();
        // Include completed, delivered, and also shipping/processing with non-COD payment
        return status === 'completed' || status === 'delivered' ||
               (status === 'shipping' || status === 'processing' || status === 'confirmed') && 
               (o.paymentMethod || '').toLowerCase() !== 'cod';
      });
      
      // Also count all orders (for display)
      const allOrdersCount = this.orders.length;
      totalOrders = allOrdersCount.toString();
      
      // Calculate total spent - prioritize MongoDB TotalSpent, but also calculate from orders for verification
      if (this.customer.TotalSpent !== undefined && this.customer.TotalSpent !== null && this.customer.TotalSpent > 0) {
        // Use MongoDB TotalSpent if available
        totalSpent = this.formatCurrency(this.customer.TotalSpent);
      } else {
        // Calculate from orders - include completed/delivered and paid orders
        const calculatedTotal = this.orders.reduce((sum: number, order: any) => {
          const status = (order.status || '').toLowerCase();
          const paymentMethod = (order.paymentMethod || '').toLowerCase();
          const totalAmount = order.totalAmount || 0;
          
          // Skip cancelled/returned orders
          if (status === 'cancelled' || status === 'returned') {
            return sum;
          }
          
          // Count completed/delivered orders (always paid)
          if (status === 'completed' || status === 'delivered') {
            return sum + totalAmount;
          }
          
          // Count shipping/processing/confirmed orders that are not COD (already paid)
          if ((status === 'shipping' || status === 'processing' || status === 'confirmed') && 
              paymentMethod !== 'cod' && paymentMethod !== '') {
            return sum + totalAmount;
          }
          
          return sum;
        }, 0);
        
        totalSpent = this.formatCurrency(calculatedTotal);
        
        // Log for debugging
        console.log(`💰 Calculated TotalSpent from orders: ${calculatedTotal.toLocaleString('vi-VN')}đ`);
        console.log(`   - Total orders: ${allOrdersCount}`);
        console.log(`   - Completed/delivered orders: ${completedOrders.length}`);
      }
      
      // Find most recent order (any status)
      const sortedOrders = [...this.orders].sort((a: any, b: any) => {
        let dateA: Date, dateB: Date;
        
        // Handle date format from JSON or MongoDB
        if (a.createdAt?.$date) {
          dateA = new Date(a.createdAt.$date);
        } else if (a.createdAt instanceof Date) {
          dateA = a.createdAt;
        } else {
          dateA = new Date(a.createdAt || 0);
        }
        
        if (b.createdAt?.$date) {
          dateB = new Date(b.createdAt.$date);
        } else if (b.createdAt instanceof Date) {
          dateB = b.createdAt;
        } else {
          dateB = new Date(b.createdAt || 0);
        }
        
        return dateB.getTime() - dateA.getTime();
      });
      
      if (sortedOrders.length > 0) {
        let recentOrderDate: Date;
        const firstOrder = sortedOrders[0];
        
        // Handle date format from JSON or MongoDB
        if (firstOrder.createdAt?.$date) {
          recentOrderDate = new Date(firstOrder.createdAt.$date);
        } else if (firstOrder.createdAt instanceof Date) {
          recentOrderDate = firstOrder.createdAt;
        } else {
          recentOrderDate = new Date(firstOrder.createdAt || 0);
        }
        
        const day = String(recentOrderDate.getDate()).padStart(2, '0');
        const month = String(recentOrderDate.getMonth() + 1).padStart(2, '0');
        const year = recentOrderDate.getFullYear();
        recentOrder = `${day}/${month}/${year}`;
      }
    }

    // Format birthdate (support both JSON and MongoDB format)
    let birthdate = '---';
    if (this.customer.BirthDay) {
      let birthDay: Date;
      if (this.customer.BirthDay.$date) {
        // JSON format from MongoDB export
        birthDay = new Date(this.customer.BirthDay.$date);
      } else if (this.customer.BirthDay instanceof Date) {
        // MongoDB native Date object
        birthDay = this.customer.BirthDay;
      } else {
        // String or other format
        birthDay = new Date(this.customer.BirthDay);
      }
      const day = String(birthDay.getDate()).padStart(2, '0');
      const month = String(birthDay.getMonth() + 1).padStart(2, '0');
      const year = birthDay.getFullYear();
      birthdate = `${day}/${month}/${year}`;
    }

    // Format gender
    let gender = '---';
    if (this.customer.Gender) {
      gender = this.customer.Gender === 'male' ? 'Nam' : 
               this.customer.Gender === 'female' ? 'Nữ' : 
               this.customer.Gender;
    }

    // Determine if customer has account (has email and FullName)
    const hasAccount = !!(this.customer.Email && this.customer.FullName);
    
    // Email consent - assume false for now (not in JSON)
    const emailConsent = false;

    // Normalize customer ID for display
    const normalizedCustomerID = this.normalizeCustomerID(this.customerId);
    
    this.customerData = {
      id: normalizedCustomerID,
      name: this.customer.FullName || '---',
      gender: gender,
      email: this.customer.Email || '---',
      birthdate: birthdate,
      phone: this.customer.Phone || '---',
      address: this.customer.Address || '---',
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
      // Map memberTier from database format to select value
      let memberTierValue = 'bronze';
      if (this.customerData.memberTier === 'Vàng') {
        memberTierValue = 'gold';
      } else if (this.customerData.memberTier === 'Bạc') {
        memberTierValue = 'silver';
      } else if (this.customerData.memberTier === 'Đồng') {
        memberTierValue = 'bronze';
      }
      
      // Enter edit mode - copy current data to editable
      this.editableData = {
        name: this.customerData.name === '---' ? '' : this.customerData.name,
        email: this.customerData.email === '---' ? '' : this.customerData.email,
        phone: this.customerData.phone === '---' ? '' : this.customerData.phone,
        address: this.customerData.address === '---' ? '' : this.customerData.address,
        memberTier: memberTierValue,
        emailConsent: this.customerData.emailConsent,
        gender: this.customerData.gender === '---' ? '' : this.customerData.gender,
        birthdate: this.customerData.birthdate === '---' ? '' : this.customerData.birthdate
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
    // Normalize customer ID to CUSxxxxxx format
    const customerID = this.normalizeCustomerID(this.customerId);
    
    // Prepare update data
    const updateData: any = {
      name: this.editableData.name || '',
      email: this.editableData.email || '',
      phone: this.editableData.phone || '',
      gender: this.editableData.gender || '',
      birthdate: this.editableData.birthdate || '',
      memberTier: this.editableData.memberTier || 'Đồng',
      address: this.buildFullAddress() || ''
    };
    
    // Map memberTier to CustomerTiering format
    if (updateData.memberTier === 'gold') {
      updateData.memberTier = 'Vàng';
      updateData.customerType = 'VIP';
    } else if (updateData.memberTier === 'silver') {
      updateData.memberTier = 'Bạc';
      updateData.customerType = 'Premium';
    } else if (updateData.memberTier === 'bronze') {
      updateData.memberTier = 'Đồng';
      updateData.customerType = 'Regular';
    }
    
    console.log('💾 Saving customer data:', updateData);
    console.log('📱 CustomerID:', customerID);
    
    // Call API to update customer
    this.http.put(`http://localhost:3000/api/users/customer/${customerID}`, updateData).subscribe({
      next: (response: any) => {
        console.log('✅ Customer updated successfully:', response);
        
        // Update local customer data
        this.customerData.name = updateData.name || '---';
        this.customerData.email = updateData.email || '---';
        this.customerData.phone = updateData.phone || '---';
        this.customerData.address = updateData.address || '---';
        this.customerData.memberTier = updateData.memberTier || '---';
        this.customerData.gender = updateData.gender || '---';
        this.customerData.birthdate = updateData.birthdate || '---';
        this.customerData.customerType = updateData.customerType || '---';
        
        // Update customer object
        if (this.customer) {
          this.customer.FullName = updateData.name || '';
          this.customer.Email = updateData.email || '';
          this.customer.Phone = updateData.phone || '';
          this.customer.Address = updateData.address || '';
          this.customer.CustomerTiering = updateData.memberTier;
          this.customer.CustomerType = updateData.customerType;
          
          // Update gender
          if (updateData.gender === 'Nam') {
            this.customer.Gender = 'male';
          } else if (updateData.gender === 'Nữ') {
            this.customer.Gender = 'female';
          } else {
            this.customer.Gender = updateData.gender;
          }
          
          // Update birthdate
          if (updateData.birthdate && updateData.birthdate !== '---') {
            const dateParts = updateData.birthdate.split('/');
            if (dateParts.length === 3) {
              const day = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1;
              const year = parseInt(dateParts[2]);
              this.customer.BirthDay = { $date: new Date(year, month, day).toISOString() };
            }
          }
        }
        
        // Exit edit mode
        this.isEditMode = false;
        
        // Reload customer data to get latest from JSON
        setTimeout(() => {
          this.loadCustomerDetail();
        }, 1000);
        
        alert('✅ Đã cập nhật thông tin khách hàng thành công!');
      },
      error: (error) => {
        console.error('❌ Error updating customer:', error);
        alert('❌ Lỗi khi cập nhật thông tin khách hàng: ' + (error.error?.message || error.message));
      }
    });
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
  viewOrderDetail(orderId: string): void {
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
      'pending': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'processing': 'Đang xử lý',
      'shipping': 'Đang giao hàng',
      'delivered': 'Hoàn thành',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã huỷ',
      'processing_return': 'Đang xử lý hoàn trả',
      'returning': 'Đang hoàn trả',
      'returned': 'Đã hoàn trả',
      'Pending': 'Chờ xác nhận',
      'Confirmed': 'Đã xác nhận',
      'Cancel Requested': 'Yêu cầu huỷ/hoàn tiền',
      'Return Requested': 'Yêu cầu huỷ/hoàn tiền',
      'Cancelled': 'Đã huỷ',
      'Refunded': 'Đã hoàn tiền',
      'Delivered': 'Hoàn thành'
    };
    return labels[status] || status || '---';
  }

  /**
   * Get status class
   */
  getStatusClass(status: string): string {
    const classes: any = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'processing': 'status-confirmed',
      'shipping': 'status-confirmed',
      'delivered': 'status-confirmed',
      'completed': 'status-confirmed',
      'cancelled': 'status-cancelled',
      'processing_return': 'status-refund-requested',
      'returning': 'status-refund-requested',
      'returned': 'status-refunded',
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
  formatOrderDate(order: any): string {
    let date: Date;
    if (order.createdAt?.$date) {
      date = new Date(order.createdAt.$date);
    } else if (order.createdAt) {
      date = new Date(order.createdAt);
    } else if (order.order_date) {
      date = new Date(order.order_date);
    } else {
      return '---';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

