import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-orderdetail',
  imports: [CommonModule, FormsModule],
  templateUrl: './orderdetail.html',
  styleUrl: './orderdetail.css',
  standalone: true
})
export class OrderDetail implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);

  orderId: string = '';
  order: any = null;
  user: any = null;
  products: any[] = [];
  productsMap: Map<string, any> = new Map(); // Map để lưu products từ product.json
  promotionsMap: Map<number, any> = new Map(); // Map để lưu promotions từ promotions.json
  activePromotions: any[] = []; // List of active promotions for dropdown
  selectedPromotionId: number | null = null; // Selected promotion ID
  returnUrl: string = ''; // URL to return to when going back
  backButtonText: string = 'Quay lại trang đơn hàng'; // Dynamic back button text
  breadcrumbText: string = 'Quản lý đơn hàng'; // Dynamic breadcrumb text
  isNewOrder: boolean = false; // Flag to check if this is a new order
  users: any[] = []; // List of users for customer selection

  // Address data for delivery info
  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  selectedProvince: string = '';
  selectedDistrict: string = '';
  selectedWard: string = '';

  // Order data
  orderData = {
    id: '',
    date: '',
    customer: '',
    status: 'pending',
    delivery: 'pending',
    payment: 'unpaid',
    refund: 'none',
    items: [] as any[],
    subtotal: 0,
    discount: 0,
    shipping: 0,
    total: 0,
    promotion: {
      name: '',
      code: '',
      description: '',
      value: 0,
      type: ''
    },
    customerInfo: {
      name: '',
      phone: '',
      email: '',
      address: ''
    },
    deliveryInfo: {
      name: '',
      phone: '',
      email: '',
      address: '',
      province: '',
      district: '',
      ward: '',
      streetAddress: ''
    },
    note: '',
    paymentMethod: 'COD'
  };

  ngOnInit(): void {
    // Check if we have a returnUrl from navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || window.history.state;
    
    if (state?.['returnUrl']) {
      this.returnUrl = state['returnUrl'];
      console.log('Return URL set to:', this.returnUrl);
      
      // Set back button text and breadcrumb based on where we came from
      if (state?.['fromCustomerDetail']) {
        this.backButtonText = 'Quay lại hồ sơ khách hàng';
        this.breadcrumbText = 'Quản lý khách hàng';
      }
    }
    
    this.route.params.subscribe(params => {
      this.orderId = params['id'];
      this.isNewOrder = this.orderId === 'new';
      
      if (this.isNewOrder) {
        // Initialize empty order data for new order
        this.initNewOrder();
        this.loadProducts();
        this.loadUsers();
        this.loadAddressData();
        this.loadPromotions();
      } else {
        // Load existing order
        this.loadProducts();
      }
    });
  }

  /**
   * Load products from MongoDB via API
   */
  loadProducts(): void {
    console.log('Loading products from MongoDB...');
    // Try MongoDB first
    this.apiService.getProducts().subscribe({
      next: (products) => {
        console.log(`✅ Loaded ${products.length} products from MongoDB`);
        // Create a map of products by _id for quick lookup
        products.forEach(product => {
          this.productsMap.set(product._id, product);
        });
        console.log(`📦 Products map has ${this.productsMap.size} items`);
        
        // Now load promotions
        this.loadPromotions();
      },
      error: (error) => {
        console.error('❌ Error loading products from MongoDB:', error);
        console.log('⚠️ Falling back to JSON file...');
        // Fallback to JSON
        this.loadProductsFromJSON();
      }
    });
  }

  /**
   * Fallback: Load products from JSON file
   */
  private loadProductsFromJSON(): void {
    this.http.get<any[]>('data/product.json').subscribe({
      next: (products) => {
        console.log(`✅ Loaded ${products.length} products from JSON (fallback)`);
        products.forEach(product => {
          this.productsMap.set(product._id, product);
        });
        this.loadPromotions();
      },
      error: (error) => {
        console.error('❌ Error loading products from JSON:', error);
        this.loadPromotions();
      }
    });
  }

  /**
   * Load promotions from promotions.json
   */
  loadPromotions(): void {
    this.apiService.getPromotions().subscribe({
      next: (promotions) => {
        // Create a map of promotions by promotion_id for quick lookup
        promotions.forEach(promo => {
          this.promotionsMap.set(promo.promotion_id, promo);
        });
        
        // Filter active promotions that are currently running
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        
        this.activePromotions = promotions.filter(promo => {
          // Check status (case-insensitive, can be 'active' or 'Active')
          const status = (promo.promotion_status || promo.status || '').toLowerCase();
          if (status !== 'active') return false;
          
          // Check if promotion is within valid date range
          // Support both naming conventions: promotion_start_date/start_date
          const startDateStr = promo.promotion_start_date || promo.start_date;
          const endDateStr = promo.promotion_end_date || promo.end_date;
          
          if (startDateStr) {
            const startDate = new Date(startDateStr);
            startDate.setHours(0, 0, 0, 0);
            if (today < startDate) return false; // Not started yet
          }
          
          if (endDateStr) {
            const endDate = new Date(endDateStr);
            endDate.setHours(23, 59, 59, 999); // End of day
            if (today > endDate) return false; // Already expired
          }
          
          return true;
        });
        
        console.log(`Loaded ${promotions.length} promotions, ${this.activePromotions.length} currently active`);
        
        // Now load order details
        this.loadOrderDetail();
      },
      error: (error) => {
        console.error('Error loading promotions from API:', error);
        // Fallback to JSON
        this.http.get<any[]>('data/promotion/promotions.json').subscribe({
          next: (promotions) => {
            promotions.forEach(promo => {
              this.promotionsMap.set(promo.promotion_id, promo);
            });
            
            // Filter active promotions that are currently running
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day
            
            this.activePromotions = promotions.filter(promo => {
              // Check status (case-insensitive)
              const status = (promo.promotion_status || promo.status || '').toLowerCase();
              if (status !== 'active') return false;
              
              // Check date range
              const startDateStr = promo.promotion_start_date || promo.start_date;
              const endDateStr = promo.promotion_end_date || promo.end_date;
              
              if (startDateStr) {
                const startDate = new Date(startDateStr);
                startDate.setHours(0, 0, 0, 0);
                if (today < startDate) return false;
              }
              
              if (endDateStr) {
                const endDate = new Date(endDateStr);
                endDate.setHours(23, 59, 59, 999);
                if (today > endDate) return false;
              }
              
              return true;
            });
            
            console.log(`Loaded ${promotions.length} promotions from JSON, ${this.activePromotions.length} currently active`);
            
            this.loadOrderDetail();
          },
          error: (err) => {
            console.error('Error loading promotions from JSON:', err);
            this.loadOrderDetail();
          }
        });
      }
    });
  }

  /**
   * Initialize new order
   */
  initNewOrder(): void {
    // Set current date
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    // Initialize empty order data
    this.orderData = {
      id: 'VGNEW',
      date: formattedDate,
      customer: '',
      status: 'pending',
      delivery: 'pending',
      payment: 'unpaid',
      refund: 'none',
      items: [],
      subtotal: 0,
      discount: 0,
      shipping: 30000, // Auto set shipping fee to 30000
      total: 0,
      promotion: {
        name: '',
        code: '',
        description: '',
        value: 0,
        type: ''
      },
      customerInfo: {
        name: '',
        phone: '',
        email: '',
        address: ''
      },
      deliveryInfo: {
        name: '',
        phone: '',
        email: '',
        address: '',
        province: '',
        district: '',
        ward: '',
        streetAddress: ''
      },
      note: '',
      paymentMethod: 'COD'
    };
    
    this.backButtonText = 'Quay lại trang đơn hàng';
    this.breadcrumbText = 'Quản lý đơn hàng';
    console.log('✅ Initialized new order');
  }

  /**
   * Handle customer selection change
   */
  onCustomerChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const customerName = select.value;
    
    if (customerName) {
      // Find user by name
      const user = this.users.find(u => (u.full_name || u.name) === customerName);
      if (user) {
        this.selectCustomer(user);
      }
    } else {
      // Reset customer info
      this.orderData.customer = '';
      this.orderData.customerInfo = {
        name: '',
        phone: '',
        email: '',
        address: ''
      };
    }
  }

  /**
   * Load users for customer selection
   */
  loadUsers(): void {
    this.apiService.getUsers().subscribe({
      next: (users) => {
        console.log(`✅ Loaded ${users.length} users from MongoDB`);
        this.users = users;
      },
      error: (error) => {
        console.error('❌ Error loading users from MongoDB:', error);
        // Fallback to JSON
        this.http.get<any[]>('data/users.json').subscribe({
          next: (users) => {
            console.log(`✅ Loaded ${users.length} users from JSON (fallback)`);
            this.users = users;
          },
          error: (err) => {
            console.error('❌ Error loading users from JSON:', err);
          }
        });
      }
    });
  }

  /**
   * Load order detail
   */
  loadOrderDetail(): void {
    // Skip loading if this is a new order
    if (this.isNewOrder) {
      return;
    }
    
    // Load order details with products
    this.http.get<any[]>('data/orderdetail.json').subscribe({
      next: (orderDetails) => {
        const orderIdNum = parseInt(this.orderId.replace('VG', ''));
        this.order = orderDetails.find(o => o.order_id === orderIdNum);
        
        if (this.order) {
          this.transformOrderData();
        } else {
          console.warn('Order not found in orderdetail.json, falling back to orders.json');
          this.loadFromOrdersJson();
        }
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.loadFromOrdersJson();
      }
    });
  }

  /**
   * Fallback: Load from orders.json if orderdetail.json not available
   */
  private loadFromOrdersJson(): void {
    this.http.get<any[]>('data/orders.json').subscribe({
      next: (orders) => {
        const orderIdNum = parseInt(this.orderId.replace('VG', ''));
        this.order = orders.find(o => o.order_id === orderIdNum);
        
        if (this.order) {
          this.transformOrderData();
        }
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });
  }

  /**
   * Transform order data for display
   */
  transformOrderData(): void {
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = this.order.order_date.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    // Map status based on new structure
    let status = 'pending';
    let delivery = 'pending';
    let payment = 'unpaid';
    let refund = 'none';

    // Map status
    if (this.order.status === 'Delivered') {
      status = 'confirmed';
      delivery = 'delivered';
      payment = 'paid';
    } else if (this.order.status === 'Pending') {
      status = 'pending';
      delivery = 'pending';
      payment = 'unpaid';
    } else if (this.order.status === 'Cancel Requested' || this.order.status === 'Return Requested') {
      status = 'refund-requested';
      delivery = 'delivering';
      payment = this.order.order_total > 0 ? 'paid' : 'unpaid';
      refund = 'requested';
    } else if (this.order.status === 'Refunded') {
      status = 'refunded';
      delivery = 'none';
      payment = 'unpaid';
      refund = 'refunded';
    } else if (this.order.status === 'Cancelled by User') {
      status = 'cancelled';
      delivery = 'none';
      payment = 'unpaid';
      refund = 'none';
    } else if (this.order.status === 'Return Approved') {
      status = 'confirmed';
      delivery = 'delivered';
      payment = 'paid';
      refund = 'requested';
    } else if (this.order.status === 'Rejected') {
      status = 'confirmed';
      delivery = 'delivering';
      payment = 'paid';
      refund = 'none';
    }

    // Map products from order
    let items: any[] = [];
    
    if (this.order.products && this.order.products.length > 0) {
      // Use products from orderdetail.json and map with product.json for images
      items = this.order.products.map((product: any) => {
        // Try to find product in productsMap by product_id (which is _id in product.json)
        const productInfo = this.productsMap.get(product.product_id);
        
        return {
          name: product.product_name,
          sku: productInfo?.SKU ? 'SKU-' + productInfo.SKU : 'SKU-' + product.product_id,
          image: productInfo?.Image || 'asset/icons/image.png', // Use real image or fallback
          quantity: product.quantity,
          price: product.price,
          total: product.subtotal
        };
      });
      
      console.log('Mapped products with images:', items);
    } else {
      // Fallback to sample data
      items = [{
        name: 'Tên sản phẩm',
        sku: 'SKU',
        image: 'asset/icons/image.png',
        quantity: 1,
        price: this.order.total_amount || this.order.order_total || 0,
        total: this.order.total_amount || this.order.order_total || 0
      }];
    }

    // Calculate subtotal from products
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    // Get promotion info and calculate discount
    let discount = 0;
    let promotionInfo = {
      name: '',
      code: '',
      description: '',
      value: 0,
      type: ''
    };
    
    if (this.order.promotion_id) {
      const promotion = this.promotionsMap.get(this.order.promotion_id);
      if (promotion) {
        promotionInfo = {
          name: promotion.promotion_name,
          code: promotion.promotion_name,
          description: promotion.description || '',
          value: promotion.promotion_value,
          type: promotion.promotion_type
        };
        
        // Calculate discount based on promotion type
        if (promotion.promotion_type === 'Discount') {
          // Discount is percentage
          discount = Math.floor((subtotal * promotion.promotion_value) / 100);
        } else if (promotion.promotion_type === 'Shipping') {
          // Free shipping - will be handled in shipping calculation
          discount = 0;
        }
        
        console.log('Applied promotion:', promotionInfo, 'Discount:', discount);
      }
    }
    
    const shipping = 0; // Assume free shipping or no shipping cost
    const total = subtotal - discount + shipping;

    this.orderData = {
      id: 'VG' + this.order.order_id,
      date: formattedDate,
      customer: this.order.full_name || 'Khách hàng #' + this.order.user_id,
      status: status,
      delivery: delivery,
      payment: payment,
      refund: refund,
      items: items,
      subtotal: subtotal,
      discount: discount,
      shipping: shipping,
      total: total,
      promotion: promotionInfo,
      customerInfo: {
        name: this.order.full_name || '',
        phone: this.order.phone || '',
        email: '',
        address: this.order.address || ''
      },
      deliveryInfo: {
        name: this.order.full_name || '',
        phone: this.order.phone || '',
        email: '',
        address: this.order.address || '',
        province: '',
        district: '',
        ward: '',
        streetAddress: ''
      },
      note: this.order.notes || '',
      paymentMethod: 'COD'
    };
  }

  /**
   * Go back to orders list
   */
  goBack(): void {
    // If we have a returnUrl (from customer detail page), go back there
    // Otherwise, go back to orders list
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/orders']);
    }
  }

  /**
   * Print order
   */
  printOrder(): void {
    // Set print time
    const now = new Date();
    const printTime = now.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Set print time in footer
    const printTimeElement = document.getElementById('print-time-value');
    if (printTimeElement) {
      printTimeElement.textContent = printTime;
    }
    
    window.print();
  }

  /**
   * Confirm order
   */
  confirmOrder(): void {
    console.log('Confirm order:', this.orderId);
    // Update order status
    this.orderData.status = 'confirmed';
    this.orderData.delivery = 'delivering';
    alert('Đơn hàng đã được xác nhận!');
    // TODO: Implement API call to update order status
  }

  /**
   * Confirm refund
   */
  confirmRefund(): void {
    console.log('Confirm refund:', this.orderId);
    if (confirm('Bạn có chắc chắn muốn xác nhận huỷ/hoàn tiền cho đơn hàng này?')) {
      // Update order status
      this.orderData.refund = 'refunded';
      this.orderData.status = 'cancelled';
      alert('Đã xác nhận huỷ/hoàn tiền!');
      // TODO: Implement API call to update refund status
    }
  }

  /**
   * Reject refund
   */
  rejectRefund(): void {
    console.log('Reject refund:', this.orderId);
    if (confirm('Bạn có chắc chắn muốn từ chối yêu cầu huỷ/hoàn tiền?')) {
      // Update order status
      this.orderData.refund = 'none';
      alert('Đã từ chối yêu cầu huỷ/hoàn tiền!');
      // TODO: Implement API call to update refund status
    }
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
   * Format currency
   */
  formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Add product to order
   */
  addProductToOrder(): void {
    // TODO: Open product selection modal
    console.log('Add product to order');
    // For now, add a placeholder product
    this.orderData.items.push({
      name: 'Tên sản phẩm',
      sku: 'SKU',
      image: 'asset/icons/shop.png',
      quantity: 1,
      price: 0,
      total: 0
    });
    this.updateOrderSummary();
  }

  /**
   * Remove product from order
   */
  removeProductFromOrder(index: number): void {
    this.orderData.items.splice(index, 1);
    this.updateOrderSummary();
  }

  /**
   * Update product quantity
   */
  updateProductQuantity(index: number, quantity: number): void {
    if (quantity < 1) return;
    this.orderData.items[index].quantity = quantity;
    this.orderData.items[index].total = this.orderData.items[index].price * quantity;
    this.updateOrderSummary();
  }

  /**
   * Update product price
   */
  updateProductPrice(index: number, price: number): void {
    if (price < 0) return;
    this.orderData.items[index].price = price;
    this.orderData.items[index].total = this.orderData.items[index].quantity * price;
    this.updateOrderSummary();
  }

  /**
   * Update order summary (subtotal, total, etc.)
   */
  updateOrderSummary(): void {
    // Calculate subtotal from items
    this.orderData.subtotal = this.orderData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    // Calculate discount (if promotion applied)
    if (this.selectedPromotionId && this.orderData.subtotal > 0) {
      const promotion = this.promotionsMap.get(this.selectedPromotionId);
      if (promotion) {
        this.orderData.promotion = {
          name: promotion.promotion_name || promotion.name || '',
          code: promotion.promotion_code || promotion.code || '',
          description: promotion.promotion_description || promotion.description || '',
          value: promotion.promotion_value || promotion.discount_value || 0,
          type: promotion.promotion_type || promotion.discount_type || ''
        };
        
        // Calculate discount based on promotion type
        // Support both naming conventions: promotion_type/discount_type
        const promoType = (promotion.promotion_type || promotion.discount_type || '').toLowerCase();
        const discountValue = promotion.promotion_value || promotion.discount_value || 0;
        
        if (promoType === 'discount' || promoType === 'percent' || promoType === 'percentage') {
          // Discount is percentage
          let discount = Math.floor((this.orderData.subtotal * discountValue) / 100);
          
          // Apply max discount limit if exists
          if (promotion.max_discount_value !== undefined && promotion.max_discount_value !== null) {
            const maxDiscount = promotion.max_discount_value || 0;
            discount = Math.min(discount, maxDiscount);
          }
          
          this.orderData.discount = discount;
        } else if (promoType === 'fixed') {
          // Fixed discount amount
          this.orderData.discount = discountValue;
        } else {
          this.orderData.discount = 0;
        }
      } else {
        this.orderData.discount = 0;
      }
    } else if (!this.selectedPromotionId) {
      // No promotion selected
      this.orderData.discount = 0;
    }
    
    // Calculate total
    this.orderData.total = this.orderData.subtotal - this.orderData.discount + this.orderData.shipping;
  }

  /**
   * Handle promotion selection change
   */
  onPromotionChange(): void {
    if (this.selectedPromotionId) {
      // Promotion selected, calculate discount
      this.updateOrderSummary();
    } else {
      // No promotion selected
      this.orderData.promotion = {
        name: '',
        code: '',
        description: '',
        value: 0,
        type: ''
      };
      this.orderData.discount = 0;
      this.updateOrderSummary();
    }
  }

  /**
   * Get promotion display value for dropdown
   */
  getPromotionDisplayValue(promo: any): string {
    const promoType = (promo.promotion_type || promo.discount_type || '').toLowerCase();
    const discountValue = promo.promotion_value || promo.discount_value || 0;
    
    if (promoType === 'discount' || promoType === 'percent' || promoType === 'percentage') {
      return discountValue + '%';
    } else if (promoType === 'fixed') {
      return this.formatCurrency(discountValue);
    } else {
      // Default to percentage if type unknown
      return discountValue + '%';
    }
  }

  /**
   * Select customer
   */
  selectCustomer(user: any): void {
    this.orderData.customer = user.full_name || user.name || 'Khách hàng #' + user.user_id;
    this.orderData.customerInfo = {
      name: user.full_name || user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || ''
    };
    // Copy to delivery info if empty
    if (!this.orderData.deliveryInfo.name) {
      this.orderData.deliveryInfo = {
        name: this.orderData.customerInfo.name,
        phone: this.orderData.customerInfo.phone,
        email: this.orderData.customerInfo.email,
        address: this.orderData.customerInfo.address,
        province: '',
        district: '',
        ward: '',
        streetAddress: ''
      };
    }
  }

  /**
   * Load Vietnam address data from JSON files ONLY (no MongoDB)
   */
  loadAddressData(): void {
    console.log('🔄 Loading address data from tree_complete.json...');
    
    // Load complete tree data (provinces -> districts -> wards)
    this.http.get<any>('/data/address/tree_complete.json').subscribe({
      next: (treeData) => {
        console.log('✅ Loaded tree_complete.json from JSON file');
        
        // Convert object structure to array structure for provinces
        this.provinces = Object.values(treeData).map((province: any) => {
          const districts: any[] = [];
          
          // Convert districts object to array
          if (province['quan-huyen']) {
            Object.values(province['quan-huyen']).forEach((district: any) => {
              const wards: any[] = [];
              
              // Convert wards object to array
              if (district['xa-phuong']) {
                Object.values(district['xa-phuong']).forEach((ward: any) => {
                  wards.push({
                    code: ward.code || '',
                    name: ward.name || '',
                    fullName: ward.name_with_type || ward.name || ''
                  });
                });
              }
              
              districts.push({
                code: district.code || '',
                name: district.name || '',
                fullName: district.name_with_type || district.name || '',
                wards: wards
              });
            });
          }
          
          return {
            code: province.code || '',
            name: province.name || '',
            fullName: province.name_with_type || province.name || '',
            type: province.type || 'province',
            districts: districts
          };
        });
        
        console.log(`✅ Mapped ${this.provinces.length} provinces with districts and wards from tree_complete.json`);
        
        // Log summary
        const provincesWithDistricts = this.provinces.filter((p: any) => p.districts && p.districts.length > 0).length;
        const totalDistricts = this.provinces.reduce((sum, p: any) => sum + (p.districts?.length || 0), 0);
        const totalWards = this.provinces.reduce((sum, p: any) => 
          sum + (p.districts?.reduce((dSum: number, d: any) => dSum + (d.wards?.length || 0), 0) || 0), 0);
        
        console.log(`📊 Built ${provincesWithDistricts}/${this.provinces.length} provinces, ${totalDistricts} districts, ${totalWards} wards`);
      },
      error: (error) => {
        console.error('❌ Error loading tree_complete.json:', error);
        // Final fallback: sample data
        this.loadSampleAddressData();
      }
    });
  }

  /**
   * Fallback: Load address data from JSON files (more complete than MongoDB)
   */
  loadAddressDataFromJSON(): void {
    console.log('🔄 Loading address data from JSON files...');
    
    // Load provinces from JSON file
    this.http.get<any[]>('data/address/provinces.json').subscribe({
      next: (provincesData) => {
        console.log(`✅ Loaded ${provincesData.length} provinces from JSON file`);
        
        // Map provinces data
        this.provinces = provincesData
          .filter((p: any) => p && p.code && p.name)
          .map((p: any) => ({
            code: p.code,
            name: p.name,
            fullName: p.fullName || p.name,
            type: p.type || 'province',
            districts: []
          }));
        
        console.log(`✅ Mapped ${this.provinces.length} valid provinces from JSON`);
        
        // Load wards from JSON file
        this.http.get<any[]>('data/address/wards.json').subscribe({
          next: (wardsData) => {
            console.log(`✅ Loaded ${wardsData.length} wards from JSON file`);
            this.buildDistrictsFromWardsOnly(wardsData);
            
            // Log summary
            const provincesWithDistricts = this.provinces.filter((p: any) => p.districts && p.districts.length > 0).length;
            console.log(`✅ Built ${this.provinces.length} provinces, ${provincesWithDistricts} with districts from JSON files`);
          },
          error: (error) => {
            console.error('❌ Error loading wards from JSON:', error);
            // Even if wards fail, we still have provinces
            console.log(`⚠️ Continuing with ${this.provinces.length} provinces without districts`);
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading provinces from JSON:', error);
        // Final fallback: Try tree collection
        this.loadAddressDataFromTree();
      }
    });
  }

  /**
   * Load wards from JSON file (when MongoDB wards fail)
   */
  loadWardsFromJSON(): void {
    console.log('🔄 Loading wards from JSON file...');
    
    this.http.get<any[]>('data/address/wards.json').subscribe({
      next: (wardsData) => {
        console.log(`✅ Loaded ${wardsData.length} wards from JSON file`);
        this.buildDistrictsFromWardsOnly(wardsData);
        
        // Log summary
        const provincesWithDistricts = this.provinces.filter((p: any) => p.districts && p.districts.length > 0).length;
        console.log(`✅ Built districts for ${provincesWithDistricts}/${this.provinces.length} provinces from JSON wards`);
      },
      error: (error) => {
        console.error('❌ Error loading wards from JSON:', error);
        console.log(`⚠️ Continuing with ${this.provinces.length} provinces without districts`);
      }
    });
  }

  /**
   * Fallback: Load address data from tree collection
   */
  loadAddressDataFromTree(): void {
    console.log('🔄 Trying to load from tree collection...');
    
    this.apiService.getTree().subscribe({
      next: (treeData) => {
        console.log(`✅ Loaded ${treeData ? treeData.length : 0} provinces from MongoDB tree collection`);
        
        if (!treeData || !Array.isArray(treeData) || treeData.length === 0) {
          console.warn('⚠️ Tree collection is empty or invalid, falling back to sample data');
          this.loadSampleAddressData();
          return;
        }
        
        // Process tree data to build provinces with districts and wards
        this.provinces = treeData
          .filter(p => p && p.code && p.name) // Filter invalid provinces
          .map(province => {
            const districts: any[] = [];
            
            // If province has districts directly
            if (province.districts && Array.isArray(province.districts) && province.districts.length > 0) {
              province.districts.forEach((district: any) => {
                districts.push({
                  code: district.code || `${province.code}-${district.name?.replace(/\s+/g, '-')}`,
                  name: district.name,
                  fullName: district.fullName || `${district.name}, ${province.name}`,
                  wards: (district.wards || []).map((w: any) => ({
                    code: w.code || '',
                    name: w.name || w,
                    fullName: w.fullName || w
                  }))
                });
              });
            } else if (province.wards && Array.isArray(province.wards) && province.wards.length > 0) {
              // Province has wards directly - extract/create districts from wards
              this.buildDistrictsFromProvinceWards(province, districts);
            }
            
            return {
              code: province.code,
              name: province.name,
              fullName: province.fullName || province.name,
              type: province.type || 'province',
              districts: districts
            };
          });
        
        if (this.provinces.length === 0) {
          console.warn('⚠️ No valid provinces found in tree data, falling back to sample data');
          this.loadSampleAddressData();
          return;
        }
        
        console.log(`✅ Built ${this.provinces.length} provinces with districts and wards from MongoDB tree`);
        
        // Log sample provinces
        if (this.provinces.length > 0) {
          console.log('📋 Sample provinces from tree:', this.provinces.slice(0, 5).map(p => `${p.code}: ${p.name}`));
        }
      },
      error: (error) => {
        console.error('❌ Error loading tree from MongoDB:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        // Final fallback: Sample data
        console.log('⚠️ Falling back to sample address data');
        this.loadSampleAddressData();
      }
    });
  }


  /**
   * Build districts from wards for a specific province
   */
  buildDistrictsFromWardsForProvince(province: any, provinceWards: any[], districts: any[]): void {
    // Group wards by extracting district name from fullName
    const wardGroups = new Map<string, any[]>();
    
    provinceWards.forEach(ward => {
      const fullNameParts = ward.fullName?.split(',') || [];
      let districtKey = province.name; // Default: use province as district
      
      // If fullName has 3 parts: "Phường X, Quận Y, Province"
      if (fullNameParts.length >= 3) {
        const districtPart = fullNameParts[fullNameParts.length - 2].trim();
        // Extract district name, remove "Quận", "Huyện", "Thị xã" prefix
        districtKey = districtPart.replace(/^(Quận|Huyện|Thị xã|Thị trấn)\s*/i, '').trim();
      }
      
      if (!wardGroups.has(districtKey)) {
        wardGroups.set(districtKey, []);
      }
      
      wardGroups.get(districtKey)!.push({
        code: ward.code || '',
        name: ward.name || ward,
        fullName: ward.fullName || ward
      });
    });
    
    // Create districts from grouped wards
    wardGroups.forEach((wards, districtName) => {
      districts.push({
        code: `${province.code}-${districtName.replace(/\s+/g, '-').toLowerCase()}`,
        name: districtName,
        fullName: districtName === province.name ? province.fullName : `${districtName}, ${province.name}`,
        wards: wards
      });
    });
  }

  /**
   * Build districts from province.wards directly
   */
  buildDistrictsFromProvinceWards(province: any, districts: any[]): void {
    const wardGroups = new Map<string, any[]>();
    
    province.wards.forEach((ward: any) => {
      if (!ward || !ward.fullName) {
        return;
      }
      
      const fullNameParts = ward.fullName.split(',').map((p: string) => p.trim());
      let districtName = '';
      
      if (fullNameParts.length >= 3) {
        // Has district: "Phường X, Quận/Huyện Y, Province"
        districtName = fullNameParts[fullNameParts.length - 2];
        
        // Check if this is actually a district
        if (/^(Quận|Huyện|Thị xã|Thị trấn)\s+/i.test(districtName)) {
          districtName = districtName.replace(/^(Quận|Huyện|Thị xã|Thị trấn)\s*/i, '').trim();
        } else if (districtName === province.name || districtName === province.fullName) {
          // No district info
          districtName = 'Không xác định';
        }
      } else if (fullNameParts.length === 2) {
        // No district in fullName
        districtName = 'Không xác định';
      } else {
        // Invalid format
        return;
      }
      
      // Validate district name
      if (!districtName || districtName === province.name) {
        districtName = 'Không xác định';
      }
      
      if (!wardGroups.has(districtName)) {
        wardGroups.set(districtName, []);
      }
      
      wardGroups.get(districtName)!.push({
        code: ward.code || '',
        name: ward.name || ward,
        fullName: ward.fullName || ward
      });
    });
    
    wardGroups.forEach((wards, districtName) => {
      // Skip if district name is province name (invalid)
      if (districtName === province.name) {
        return;
      }
      
      districts.push({
        code: `${province.code}-${districtName.replace(/\s+/g, '-').toLowerCase()}`,
        name: districtName,
        fullName: districtName === province.name ? province.fullName : `${districtName}, ${province.name}`,
        wards: wards
      });
    });
  }

  /**
   * Build districts from wards data
   * Use tree.json structure or extract from wards.json
   */
  buildDistrictsFromWards(wardsData: any[]): void {
    // Use tree.json which has the full hierarchical structure (provinces -> wards)
    this.http.get<any[]>('data/address/tree.json').subscribe({
      next: (treeData) => {
        // Process tree data: provinces contain wards, need to extract/create districts
        this.provinces = treeData.map(province => {
          const districts: any[] = [];
          
          // If province has districts directly in tree.json
          if (province.districts && Array.isArray(province.districts) && province.districts.length > 0) {
            province.districts.forEach((district: any) => {
              districts.push({
                code: district.code || `${province.code}-${district.name?.replace(/\s+/g, '-')}`,
                name: district.name,
                fullName: district.fullName || `${district.name}, ${province.name}`,
                wards: (district.wards || []).map((w: any) => ({
                  code: w.code || '',
                  name: w.name || w,
                  fullName: w.fullName || w
                }))
              });
            });
          } else if (province.wards && Array.isArray(province.wards) && province.wards.length > 0) {
            // Province has wards directly - need to extract/create districts
            // Group wards to create districts (since districts are not in the data)
            // For now, create one default district per province, or extract from fullName if possible
            const districtWardsMap = new Map<string, any[]>();
            
            province.wards.forEach((ward: any) => {
              // Try to extract district from fullName format: "Phường X, Quận Y, Province" or "Phường X, Province"
              const fullNameParts = ward.fullName?.split(',') || [];
              let districtKey = province.name; // Default: use province as district
              
              // If fullName has 3 parts: "Phường X, Quận Y, Province"
              if (fullNameParts.length >= 3) {
                const districtPart = fullNameParts[fullNameParts.length - 2].trim();
                // Extract district name, remove "Quận", "Huyện", "Thị xã" prefix
                districtKey = districtPart.replace(/^(Quận|Huyện|Thị xã|Thị trấn)\s*/i, '').trim();
              }
              
              if (!districtWardsMap.has(districtKey)) {
                districtWardsMap.set(districtKey, []);
              }
              
              districtWardsMap.get(districtKey)!.push({
                code: ward.code || '',
                name: ward.name || ward,
                fullName: ward.fullName || ward
              });
            });
            
            // Create districts from grouped wards
            districtWardsMap.forEach((wards, districtName) => {
              districts.push({
                code: `${province.code}-${districtName.replace(/\s+/g, '-').toLowerCase()}`,
                name: districtName,
                fullName: districtName === province.name ? province.fullName : `${districtName}, ${province.name}`,
                wards: wards
              });
            });
          }
          
          return {
            code: province.code,
            name: province.name,
            fullName: province.fullName,
            type: province.type,
            districts: districts.length > 0 ? districts : []
          };
        });
        
        console.log(`✅ Built ${this.provinces.length} provinces with districts and wards from tree.json`);
      },
      error: (error) => {
        console.error('❌ Error loading tree.json:', error);
        // Fallback: Build districts and wards from wards.json directly
        this.buildDistrictsFromWardsOnly(wardsData);
      }
    });
  }

  /**
   * Fallback: Build districts from wards only (when tree.json unavailable)
   */
  buildDistrictsFromWardsOnly(wardsData: any[]): void {
    if (!wardsData || wardsData.length === 0) {
      console.warn('⚠️ No wards data provided to buildDistrictsFromWardsOnly');
      return;
    }
    
    console.log(`🔄 Building districts from ${wardsData.length} wards for ${this.provinces.length} provinces...`);
    
    let totalDistricts = 0;
    let totalWards = 0;
    
    // Group wards by province
    this.provinces.forEach(province => {
      // Find wards for this province
      // Try both provinceCode (string) and code (could be number)
      const provinceWards = wardsData.filter(w => {
        if (!w) return false;
        return w.provinceCode === province.code || 
               w.provinceCode === String(province.code) ||
               w.code?.startsWith(province.code);
      });
      
      if (provinceWards.length === 0) {
        console.log(`⚠️ No wards found for province ${province.code} (${province.name})`);
        province.districts = [];
        return;
      }
      
      console.log(`📍 Province ${province.name} (${province.code}): found ${provinceWards.length} wards`);
      
      // Group wards by extracting district name from fullName
      const wardGroups = new Map<string, any[]>();
      
      provinceWards.forEach(ward => {
        if (!ward || !ward.fullName) {
          // Skip invalid wards
          return;
        }
        
        const fullNameParts = ward.fullName.split(',').map((p: string) => p.trim());
        let districtName = '';
        
        if (fullNameParts.length >= 3) {
          // Has district: "Phường X, Quận/Huyện Y, Province"
          // District is the middle part (second from last)
          districtName = fullNameParts[fullNameParts.length - 2];
          
          // Check if this is actually a district (has "Quận", "Huyện", "Thị xã", "Thị trấn")
          if (/^(Quận|Huyện|Thị xã|Thị trấn)\s+/i.test(districtName)) {
            // Remove "Quận", "Huyện", "Thị xã", "Thị trấn" prefix
            districtName = districtName.replace(/^(Quận|Huyện|Thị xã|Thị trấn)\s*/i, '').trim();
          } else {
            // If middle part doesn't look like a district, check if it's a province name
            // If it matches province name, then there's no district info
            if (districtName === province.name || districtName === province.fullName) {
              // No district in fullName format - create a default district
              districtName = 'Không xác định';
            }
          }
        } else if (fullNameParts.length === 2) {
          // Format: "Phường X, Province" - no district info
          // For provinces without district structure, use province name as district
          // This will create a single district containing all wards
          districtName = province.fullName;
        } else {
          // Invalid format, skip
          console.warn(`⚠️ Invalid ward fullName format: ${ward.fullName}`);
          return;
        }
        
        // Skip if district name is empty or matches province name (invalid)
        if (!districtName) {
          districtName = province.fullName;
        }
        
        if (!wardGroups.has(districtName)) {
          wardGroups.set(districtName, []);
        }
        
        wardGroups.get(districtName)!.push({
          code: ward.code || '',
          name: ward.name || '',
          fullName: ward.fullName || ''
        });
      });
      
      // Create districts
      const districts: any[] = [];
      wardGroups.forEach((wards, districtName) => {
        // Skip if district name is empty
        if (!districtName || districtName.trim() === '') {
          console.warn(`⚠️ Skipping empty district for province ${province.name}`);
          return;
        }
        
        // If district name is province fullName, this is a single district for all wards (no sub-districts)
        // Use a generic name like "Tất cả" (All) for display
        const displayName = (districtName === province.fullName || districtName === province.name) 
          ? 'Tất cả' 
          : districtName;
        
        districts.push({
          code: `${province.code}-${districtName.replace(/\s+/g, '-').toLowerCase()}`,
          name: displayName,
          fullName: `${districtName}, ${province.name}`,
          wards: wards
        });
        totalWards += wards.length;
      });
      
      province.districts = districts;
      totalDistricts += districts.length;
      
      // Log districts created for this province (first 5 provinces only to avoid spam)
      if (totalDistricts <= 5) {
        console.log(`  ✅ Created ${districts.length} district(s) for ${province.name}:`, 
          districts.map((d: any) => `${d.name} (${d.wards.length} wards)`).join(', '));
      }
    });
    
    console.log(`✅ Built ${totalDistricts} districts with ${totalWards} wards from wards data`);
    
    // Log summary per province
    const provincesWithDistricts = this.provinces.filter(p => p.districts && p.districts.length > 0);
    console.log(`📊 ${provincesWithDistricts.length}/${this.provinces.length} provinces have districts`);
    
    if (provincesWithDistricts.length < this.provinces.length) {
      const provincesWithoutDistricts = this.provinces.filter(p => !p.districts || p.districts.length === 0);
      console.log(`⚠️ Provinces without districts: ${provincesWithoutDistricts.map(p => p.name).join(', ')}`);
    }
  }

  /**
   * Fallback: Load sample address data
   */
  loadSampleAddressData(): void {
    // Sample data for major cities and provinces in Vietnam
    this.provinces = [
      {
        code: '01',
        name: 'Hà Nội',
        fullName: 'Thành phố Hà Nội',
        districts: [
          {
            code: '01-001',
            name: 'Ba Đình',
            wards: [
              { code: '00013', name: 'Hà Đông', fullName: 'Phường Hà Đông' },
              { code: '00044', name: 'Tương Mai', fullName: 'Phường Tương Mai' }
            ]
          }
        ]
      }
    ];
  }

  /**
   * Handle province selection change
   */
  onProvinceChange(): void {
    console.log('🔄 Province changed:', this.selectedProvince);
    this.orderData.deliveryInfo.province = this.selectedProvince;
    const province = this.provinces.find(p => p.code === this.selectedProvince);
    
    console.log('📍 Selected province:', province ? { code: province.code, name: province.name } : 'Not found');
    
    if (province && province.districts && province.districts.length > 0) {
      console.log(`📊 Province ${province.name} has ${province.districts.length} districts`);
      
      // Use all districts (no filtering needed as they are now properly created)
      this.districts = province.districts.filter((d: any) => d && d.name && d.name.trim() !== '');
      
      console.log(`✅ Loaded ${this.districts.length} districts`);
      console.log('📍 Districts:', this.districts.map((d: any) => d.name));
    } else {
      console.warn('⚠️ Province has no districts:', province ? 
        { code: province.code, name: province.name, hasDistricts: province.districts?.length || 0 } : 
        'Province not found'
      );
      this.districts = [];
    }
    
    this.wards = [];
    this.selectedDistrict = '';
    this.selectedWard = '';
    this.orderData.deliveryInfo.district = '';
    this.orderData.deliveryInfo.ward = '';
    this.orderData.deliveryInfo.province = province ? province.name : '';
  }

  /**
   * Handle district selection change
   */
  onDistrictChange(): void {
    console.log('🔄 District changed:', this.selectedDistrict);
    this.orderData.deliveryInfo.district = this.selectedDistrict;
    const district = this.districts.find(d => d.code === this.selectedDistrict);
    
    console.log('📍 Found district:', district ? { code: district.code, name: district.name, wardsCount: district.wards?.length || 0 } : 'Not found');
    
    if (district && district.wards) {
      // Wards can be array of strings or array of objects
      this.wards = district.wards.map((ward: any) => {
        if (typeof ward === 'string') {
          return { code: '', name: ward, fullName: ward };
        }
        return ward;
      });
      console.log(`✅ Loaded ${this.wards.length} wards for district ${district.name}`);
    } else {
      this.wards = [];
      console.warn('⚠️ No wards found for district');
    }
    this.selectedWard = '';
    this.orderData.deliveryInfo.ward = '';
  }

  /**
   * Handle ward selection change
   */
  onWardChange(): void {
    this.orderData.deliveryInfo.ward = this.selectedWard;
    // Find ward object to get full info
    const ward = this.wards.find(w => (w.code || w.name) === this.selectedWard);
    if (ward) {
      this.orderData.deliveryInfo.ward = ward.name || ward;
    }
  }

  /**
   * Save new order
   */
  saveNewOrder(): void {
    // Validate required fields
    if (!this.orderData.customerInfo.name) {
      alert('Vui lòng chọn khách hàng');
      return;
    }
    
    if (this.orderData.items.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
      return;
    }
    
    // TODO: Implement API call to save order
    console.log('Saving new order:', this.orderData);
    alert('Đơn hàng đã được lưu thành công!');
    
    // Navigate back to orders list
    this.router.navigate(['/orders']);
  }

  /**
   * Cancel new order
   */
  cancelNewOrder(): void {
    if (confirm('Bạn có chắc chắn muốn hủy việc tạo đơn hàng mới?')) {
      this.goBack();
    }
  }
}

