import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AddressFormComponent, AddressInfo as FormAddressInfo } from './address-form/address-form';
import {
  PaymentMethodComponent,
  PaymentInfo,
  PaymentResult,
} from './payment-method/payment-method';
import {
  PromotionModalComponent,
  Promotion,
  PromotionResult,
} from './promotion-modal/promotion-modal';
import { InformationList } from './information-list/information-list';
import { CartService } from '../services/cart.service';
import { AddressService, AddressInfo as ServiceAddressInfo } from '../services/address.service';
import { OrderService, CreateOrderRequest, OrderItem } from '../services/order.service';
import { ToastService } from '../services/toast.service';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
  subcategory: string;
  sku?: string; // Thêm SKU để xóa items sau khi đặt hàng
  unit?: string; // Thêm unit để hiển thị trong order
}

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddressFormComponent,
    PaymentMethodComponent,
    PromotionModalComponent,
    InformationList,
  ],
  templateUrl: './order.html',
  styleUrl: './order.css',
})
export class OrderComponent implements OnInit, OnDestroy {
 // UI States
  showAddressModal = false;
  showPaymentModal = false;
  showPromotionModal = false;
  showAddressListModal = false;
  showOrderSuccessModal = false;
  createdOrderId: string = '';

 // Address management
  addressMode: 'add' | 'edit' = 'add';
  currentEditingIndex = -1;
  addressList: FormAddressInfo[] = [];
  selectedAddressIndex = 0;

 // Delivery addresses (fixed list)
  deliveryAddresses = [
    '20 Đường Lê Lợi, phường Cái Khế, Quận Ninh Kiều, TP. Cần Thơ',
    '1 Đ. Lê Đức Thọ, Mỹ Đình, Nam Từ Liêm, Hà Nội',
    '15 Lạch Tray, Lê Lợi, Ngô Quyền, Hải Phòng',
    '138 Đ. Đào Duy Từ, Phường 6, Quận 10, Hồ Chí Minh',
    'Số 9 Phố Trịnh Hoài Đức, Phường Cát Linh, Quận Đống Đa, TP. Hà Nội',
    'Góc đường 30/4 và Đại lộ Bình Dương, phường Phú Thọ, thành phố Thủ Dầu Một, tỉnh Bình Dương',
  ];
  selectedDeliveryAddress = '';
  showDeliveryDropdown = false;

 // Order Data
  addressInfo: FormAddressInfo = {
    fullName: '',
    phone: '',
    email: '',
    city: '',
    district: '',
    ward: '',
    detail: '',
    deliveryMethod: 'standard',
  };

  wantInvoice = false;
  invoiceInfo = {
    companyName: '',
    taxId: '',
    invoiceEmail: '',
    invoiceAddress: '',
  };
  invoiceErrors: any = {};

  consultantCode = ''; // Mã nhân viên tư vấn
  isStickyBottom = false; // Trạng thái nút thanh toán: false = fixed, true = sticky

  paymentInfo: PaymentInfo = {
    method: 'cod',
    amount: 0,
    orderId: '',
  };

  selectedPromotion: Promotion | null = null;
  discountAmount = 0;
  finalAmount = 0;

 // Cart items from CartService
  cartItems: CartItem[] = [];

  subtotal = 0; // Tổng tiền hàng (chưa VAT)
  subtotalWithVAT = 0; // Tổng tiền hàng (đã gồm VAT) - dùng để hiển thị
  shippingFee = 30000;
  vatRate = 10;
  vatAmount = 0;
  totalAmount = 0;

 // Subscription
  private addressSubscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private cartService: CartService,
    private addressService: AddressService,
    private orderService: OrderService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
 // Force reload CustomerID từ localStorage trước
    this.addressService.reloadCustomerID();

 // Subscribe to address changes from AddressService
    this.addressSubscription = this.addressService.addresses$.subscribe((addresses) => {
 // console.log('� [Order] Addresses updated from service:', addresses);

 // Convert ServiceAddressInfo to FormAddressInfo (bao gồm isDefault)
      this.addressList = addresses.map((addr) => ({
        fullName: addr.fullName,
        phone: addr.phone,
        email: addr.email,
        city: addr.city,
        district: addr.district,
        ward: addr.ward,
        detail: addr.detail,
        notes: addr.notes,
        deliveryMethod: addr.deliveryMethod,
        isDefault: addr.isDefault,
      }));

 // console.log(' [Order] AddressList length:', this.addressList.length);

 // Auto-select default address or first address
      if (this.addressList.length > 0) {
        const defaultAddress = addresses.find((addr) => addr.isDefault);
        if (defaultAddress) {
          const defaultIndex = addresses.indexOf(defaultAddress);
          this.selectedAddressIndex = defaultIndex >= 0 ? defaultIndex : 0;
        } else {
          this.selectedAddressIndex = 0;
        }

 // Set addressInfo
        this.addressInfo = { ...this.addressList[this.selectedAddressIndex] };
 // console.log(' [Order] Selected address:', this.addressInfo);
 // console.log(' [Order] Has addresses - NO popup');
      } else {
        this.selectedAddressIndex = -1;
        this.addressInfo = {
          fullName: '',
          phone: '',
          email: '',
          city: '',
          district: '',
          ward: '',
          detail: '',
          deliveryMethod: 'standard',
        };
 // console.log('ℹ [Order] No addresses available');
      }
    });

 // Đợi 500ms để AddressService load xong data từ backend, rồi check và popup nếu cần
    setTimeout(() => {
      if (this.addressList.length === 0) {
 // console.log(' [Order] Still no addresses after 500ms Show popup');
        this.onOpenAddressModal();
      }
    }, 500);

 // Lấy dữ liệu cart từ CartService
    const allCartItems = this.cartService.getCartItems()();
    const selectedItems = this.cartService.selectedItems();

 // Chỉ lấy những sản phẩm đã được chọn
    this.cartItems = selectedItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      category: item.category,
      subcategory: item.subcategory,
      sku: item.sku, // Thêm SKU để xóa items sau khi đặt hàng
      unit: item.unit, // Thêm unit để hiển thị trong order
    }));

 // Lấy thông tin promotion từ CartService
    this.selectedPromotion = this.cartService.getSelectedPromotion()();
    this.discountAmount = this.cartService.getDiscountAmount()();
    this.finalAmount = this.cartService.getFinalAmount()();

 // Set default delivery address
    this.selectedDeliveryAddress = this.deliveryAddresses[0];

 // Calculate totals and set payment amount
    this.calculateTotals();

 // REMOVED: Auto-open popup logic moved to subscribe callback
 // Logic mở popup tự động đã được di chuyển vào subscribe callback
 // để đảm bảo addressList đã được load xong

 // Setup scroll listener for mobile button positioning
    if (window.innerWidth <= 1024) {
      this.setupScrollListener();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (event.target.innerWidth <= 1024) {
      this.setupScrollListener();
    } else {
      this.removeScrollListener();
    }
  }

  private scrollHandler: (() => void) | null = null;

  setupScrollListener(): void {
    if (this.scrollHandler) {
      return; // Đã có listener rồi
    }

    this.scrollHandler = () => {
      if (window.innerWidth > 1024) {
        return;
      }

      const paymentDetailsSection = document.getElementById('payment-details-section');
      if (!paymentDetailsSection) {
        return;
      }

      const paymentDetailsRect = paymentDetailsSection.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset;

 // Kiểm tra xem payment details section đã scroll qua chưa
 // Khi bottom của payment details section vượt qua bottom của viewport
      if (paymentDetailsRect.bottom <= windowHeight) {
 // Đã scroll qua payment details section -> chuyển sang sticky (absolute position)
        this.isStickyBottom = true;
      } else {
 // Chưa scroll qua -> giữ fixed
        this.isStickyBottom = false;
      }
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });
 // Gọi lần đầu để set đúng trạng thái
    setTimeout(() => this.scrollHandler?.(), 100);
  }

  removeScrollListener(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
      this.isStickyBottom = false;
    }
  }

  ngOnDestroy() {
    if (this.addressSubscription) {
      this.addressSubscription.unsubscribe();
    }
    this.removeScrollListener();
  }

  calculateTotals() {
 // Tính tổng tiền hàng chưa VAT
    this.subtotal = this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

 // Tính VAT
    this.vatAmount = Math.round((this.subtotal * this.vatRate) / 100);

 // Tổng tiền hàng đã gồm VAT (để hiển thị)
    this.subtotalWithVAT = this.subtotal + this.vatAmount;

 // Miễn phí vận chuyển nếu subtotal >= 200,000 VND (trước khi áp khuyến mãi)
    const baseShippingFee = 30000;
    const isFreeShipping = this.subtotal >= 200000;
    const actualShippingFee = isFreeShipping ? 0 : baseShippingFee;

    if (this.selectedPromotion && this.isShippingPromotion(this.selectedPromotion)) {
 // Nếu đã miễn phí vận chuyển thì không áp dụng promotion shipping nữa
      const finalShippingFee = isFreeShipping
        ? 0
        : Math.max(0, actualShippingFee - this.getActualShippingDiscount());
 // Tổng = tổng tiền hàng (đã gồm VAT) + phí ship
      this.totalAmount = this.subtotalWithVAT + finalShippingFee;
    } else {
 // Giữ shippingFee = baseShippingFee để hiển thị (sẽ có dòng discount riêng nếu free shipping)
      this.shippingFee = baseShippingFee;
 // Tổng = tổng tiền hàng (đã gồm VAT) + phí ship - giảm giá sản phẩm
      this.totalAmount = this.subtotalWithVAT + actualShippingFee - this.discountAmount;
    }

    this.paymentInfo.amount = this.totalAmount;
  }

  isShippingPromotion(promotion: Promotion): boolean {
    return promotion.promotionType === 'Shipping';
  }

  getFinalShippingFee(): number {
    if (this.selectedPromotion && this.isShippingPromotion(this.selectedPromotion)) {
      const shippingDiscount = Math.min(this.selectedPromotion.discountValue, this.shippingFee);
      return this.shippingFee - shippingDiscount;
    }
    return this.shippingFee;
  }

  getActualShippingDiscount(): number {
    if (this.selectedPromotion && this.isShippingPromotion(this.selectedPromotion)) {
      return Math.min(this.selectedPromotion.discountValue, this.shippingFee);
    }
    return 0;
  }

 /**
 * Kiểm tra xem đơn hàng có được miễn phí vận chuyển không (subtotal >= 200,000 VND)
 */
  isFreeShipping(): boolean {
    return this.subtotal >= 200000;
  }

 // Address Modal Handlers
  onOpenAddressModal() {
    this.addressMode = 'add';
    this.currentEditingIndex = -1;
    this.addressInfo = {
      fullName: '',
      phone: '',
      email: '',
      city: '',
      district: '',
      ward: '',
      detail: '',
      deliveryMethod: 'standard',
    };
    this.showAddressModal = true;
  }

  onEditAddress(index: number) {
    const address = this.addressList[index];
    if (!address) return;

    this.addressMode = 'edit';
    this.currentEditingIndex = index;
    this.addressInfo = { ...address };
    this.showAddressModal = true;
  }

  onAddressComplete(addressInfo: FormAddressInfo) {
    const serviceAddress: ServiceAddressInfo = {
      fullName: addressInfo.fullName,
      phone: addressInfo.phone,
      email: addressInfo.email,
      city: addressInfo.city,
      district: addressInfo.district,
      ward: addressInfo.ward,
      detail: addressInfo.detail,
      notes: addressInfo.notes,
      deliveryMethod: addressInfo.deliveryMethod,
      isDefault: addressInfo.isDefault, // Thêm isDefault vào serviceAddress
    };

    if (this.addressMode === 'add') {
 // QUAN TRỌNG: Phải subscribe để Observable chạy
      this.addressService.addAddress(serviceAddress).subscribe({
        next: (success) => {
          if (success) {
 console.log(' Đã thêm địa chỉ thành công');
 // Chờ subscription cập nhật addressList rồi chọn địa chỉ mới
            setTimeout(() => {
              this.selectedAddressIndex = this.addressList.length - 1;
              if (this.addressList[this.selectedAddressIndex]) {
                this.addressInfo = { ...this.addressList[this.selectedAddressIndex] };
 console.log(' Đã chọn địa chỉ mới:', this.addressInfo);
              }
            }, 100); // Tăng timeout lên 100ms để đảm bảo đã cập nhật
          } else {
 console.error(' Thêm địa chỉ thất bại');
          }
        },
        error: (error) => {
 console.error(' Lỗi khi thêm địa chỉ:', error);
        },
      });
    } else if (this.addressMode === 'edit' && this.currentEditingIndex >= 0) {
      const addresses = this.addressService.getAddresses();
      const addressId = addresses[this.currentEditingIndex]?._id;
      if (addressId) {
 // QUAN TRỌNG: Phải subscribe để Observable chạy
        this.addressService.updateAddress(addressId, serviceAddress).subscribe({
          next: (success) => {
            if (success) {
 console.log(' Đã cập nhật địa chỉ thành công');
              setTimeout(() => {
                if (this.addressList[this.currentEditingIndex]) {
                  this.selectedAddressIndex = this.currentEditingIndex;
                  this.addressInfo = { ...this.addressList[this.currentEditingIndex] };
 console.log(' Đã cập nhật addressInfo:', this.addressInfo);
                }
              }, 100);
            } else {
 console.error(' Cập nhật địa chỉ thất bại');
            }
          },
          error: (error) => {
 console.error(' Lỗi khi cập nhật địa chỉ:', error);
          },
        });
      }
    }

    this.showAddressModal = false;
  }

  onCloseAddressModal() {
    this.showAddressModal = false;
  }

 // Address List Modal Handlers
  onOpenAddressListModal() {
    this.showAddressListModal = true;
  }

  onCloseAddressListModal() {
    this.showAddressListModal = false;
  }

  onSelectAddressFromList(index: number) {
    this.selectAddress(index);
    this.showAddressListModal = false;
  }

  onEditAddressFromList(index: number) {
    this.onEditAddress(index);
    this.showAddressListModal = false;
  }

  onDeleteAddress(index: number) {
    const addresses = this.addressService.getAddresses();
    const addressId = addresses[index]?._id;
    if (!addressId) return;

 // QUAN TRỌNG: Phải subscribe để Observable chạy
    this.addressService.deleteAddress(addressId).subscribe({
      next: (success) => {
        if (success) {
 console.log(' Đã xóa địa chỉ thành công');
          setTimeout(() => {
            if (this.selectedAddressIndex >= this.addressList.length) {
              this.selectedAddressIndex = Math.max(0, this.addressList.length - 1);
            }

            if (this.addressList.length > 0 && this.addressList[this.selectedAddressIndex]) {
              this.addressInfo = { ...this.addressList[this.selectedAddressIndex] };
 console.log(' Đã chọn địa chỉ mới sau khi xóa:', this.addressInfo);
            }
          }, 100);
        } else {
 console.error(' Xóa địa chỉ thất bại');
        }
      },
      error: (error) => {
 console.error(' Lỗi khi xóa địa chỉ:', error);
      },
    });
  }

  onAddNewAddressFromList() {
    this.onOpenAddressModal();
    this.showAddressListModal = false;
  }

 // Invoice Handlers
  onInvoiceInfoChange(invoiceInfo: any) {
    this.invoiceInfo = invoiceInfo;
  }

  onInvoiceToggleExpanded(expanded: boolean) {
 // Handle invoice form toggle
  }

  onTaxIdInput() {
    if (this.invoiceErrors && this.invoiceErrors.taxId) {
      delete this.invoiceErrors.taxId;
    }
  }

  onTaxIdBlur() {
    this.validateTaxId();
  }

  onInvoiceEmailInput() {
    if (this.invoiceErrors && this.invoiceErrors.invoiceEmail) {
      delete this.invoiceErrors.invoiceEmail;
    }
  }

  onInvoiceEmailBlur() {
    this.validateInvoiceEmail();
  }

  validateTaxId() {
    if (!this.wantInvoice) return;

    if (!this.invoiceInfo.taxId || this.invoiceInfo.taxId.trim() === '') {
      this.invoiceErrors = { ...this.invoiceErrors, taxId: 'Mã số thuế là bắt buộc' };
    } else if (!this.isValidTaxId(this.invoiceInfo.taxId)) {
      this.invoiceErrors = {
        ...this.invoiceErrors,
        taxId: 'Mã số thuế không hợp lệ (10 hoặc 13 chữ số)',
      };
    } else {
      this.invoiceErrors = { ...this.invoiceErrors };
      delete this.invoiceErrors.taxId;
    }
  }

  validateInvoiceEmail() {
    if (!this.wantInvoice) return;

    if (!this.invoiceInfo.invoiceEmail || this.invoiceInfo.invoiceEmail.trim() === '') {
      this.invoiceErrors = {
        ...this.invoiceErrors,
        invoiceEmail: 'Email nhận hóa đơn là bắt buộc',
      };
    } else if (!this.isValidInvoiceEmail(this.invoiceInfo.invoiceEmail)) {
      this.invoiceErrors = { ...this.invoiceErrors, invoiceEmail: 'Email không hợp lệ' };
    } else {
      this.invoiceErrors = { ...this.invoiceErrors };
      delete this.invoiceErrors.invoiceEmail;
    }
  }

  clearInvoiceField(fieldName: string, inputElement: HTMLInputElement) {
    (this.invoiceInfo as any)[fieldName] = '';

    if (this.invoiceErrors[fieldName]) {
      delete this.invoiceErrors[fieldName];
      this.invoiceErrors = { ...this.invoiceErrors };
    }

    setTimeout(() => {
      inputElement.focus();
    }, 0);
  }

 // Payment Modal Handlers
  onOpenPaymentModal() {
    if (!this.isAddressComplete()) {
      this.onOpenAddressModal();
      return;
    }

    this.calculateTotals();
    this.paymentInfo.amount = this.totalAmount;
    this.showPaymentModal = true;
  }

  onPaymentComplete(result: PaymentResult) {
    this.showPaymentModal = false;
    if (result.success) {
 // Tạo đơn hàng sau khi thanh toán thành công
      this.createOrder();
    } else {
      this.showPaymentError(result.error || 'Thanh toán thất bại');
    }
  }

  onClosePaymentModal() {
    this.showPaymentModal = false;
  }

  removePurchasedItemsFromCart() {
 // console.log(' [Order] Removing purchased items from cart');

 // Lấy danh sách SKU của các items đã đặt hàng
    const purchasedSkus = this.cartItems
      .map((item) => item.sku)
      .filter((sku): sku is string => sku !== undefined && sku !== '');

 // console.log(` [Order] SKUs to remove (${purchasedSkus.length}):`, purchasedSkus);

    if (purchasedSkus.length === 0) {
 // console.warn(' [Order] No SKUs found to remove');
      return;
    }

 // Xóa chỉ những items đã đặt hàng (không xóa toàn bộ cart)
    this.cartService.removeMultipleItems(purchasedSkus).subscribe({
      next: () => {
 console.log(` [Order] Removed ${purchasedSkus.length} purchased items from cart`);
      },
      error: (error: any) => {
 console.error(' [Order] Error removing purchased items:', error);
      },
    });

 // Clear promotion
    this.cartService.clearPromotion();
  }

 // Promotion Modal Handlers
  onOpenPromotionModal() {
    this.showPromotionModal = true;
  }

  onPromotionApplied(result: PromotionResult) {
    this.selectedPromotion = result.selectedPromotion;
    this.discountAmount = result.discountAmount;
    this.finalAmount = result.finalAmount;
    this.calculateTotals();
  }

  onClosePromotionModal() {
    this.calculateTotals();
    this.showPromotionModal = false;
  }

  onConfirmPromotion() {
    this.calculateTotals();
    this.showPromotionModal = false;
  }

 // Validation
  isAddressComplete(): boolean {
    const currentAddress = this.getCurrentAddress();
    if (!currentAddress) {
      return false;
    }

    return !!(
      currentAddress.fullName &&
      currentAddress.phone &&
      currentAddress.city &&
      currentAddress.district &&
      currentAddress.ward &&
      currentAddress.detail
    );
  }

  isDeliveryMethodSelected(): boolean {
    return !!this.addressInfo.deliveryMethod;
  }

  isDeliveryAddressSelected(): boolean {
    return !!(this.selectedDeliveryAddress && this.selectedDeliveryAddress.trim() !== '');
  }

  isPaymentMethodSelected(): boolean {
    return !!this.paymentInfo.method;
  }

  isInvoiceInfoComplete(): boolean {
    if (!this.wantInvoice) {
      return true;
    }

    return !!(
      this.invoiceInfo.companyName &&
      this.invoiceInfo.taxId &&
      this.invoiceInfo.invoiceEmail &&
      this.invoiceInfo.invoiceAddress &&
      this.isValidTaxId(this.invoiceInfo.taxId) &&
      this.isValidInvoiceEmail(this.invoiceInfo.invoiceEmail)
    );
  }

  isValidTaxId(taxId: string): boolean {
    if (!taxId || taxId.trim() === '') {
      return false;
    }

    const cleanTaxId = taxId.replace(/[\s-]/g, '');

    if (!/^\d+$/.test(cleanTaxId)) {
      return false;
    }

    if (cleanTaxId.length !== 10 && cleanTaxId.length !== 13) {
      return false;
    }

    return true;
  }

  isValidInvoiceEmail(email: string): boolean {
    if (!email || email.trim() === '') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  isAllRequiredFieldsComplete(): boolean {
    return (
      this.isAddressComplete() &&
      this.isDeliveryMethodSelected() &&
      this.isDeliveryAddressSelected() &&
      this.isPaymentMethodSelected() &&
      this.isInvoiceInfoComplete()
    );
  }

  hasAddressInfo(): boolean {
    return this.addressList.length > 0;
  }

  getCurrentAddress(): FormAddressInfo | null {
    if (this.addressList.length === 0 || this.selectedAddressIndex < 0) {
      return null;
    }
    return this.addressList[this.selectedAddressIndex];
  }

  isAddressSelected(index: number): boolean {
    return index === this.selectedAddressIndex;
  }

  selectAddress(index: number) {
    if (index >= 0 && index < this.addressList.length) {
      this.selectedAddressIndex = index;
      this.addressInfo = { ...this.addressList[index] };
    }
  }

 // Delivery address dropdown methods
  toggleDeliveryDropdown() {
    this.showDeliveryDropdown = !this.showDeliveryDropdown;
  }

  closeDeliveryDropdown() {
    this.showDeliveryDropdown = false;
  }

  selectDeliveryAddress(address: string) {
    this.selectedDeliveryAddress = address;
    this.closeDeliveryDropdown();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const deliverySelect = target.closest('.delivery-select');

    if (!deliverySelect && this.showDeliveryDropdown) {
      this.closeDeliveryDropdown();
    }
  }

 // Order Processing
  onPlaceOrder() {
    if (!this.isAllRequiredFieldsComplete()) {
      if (!this.isAddressComplete()) {
        this.onOpenAddressModal();
        return;
      }
      alert('Vui lòng điền đầy đủ tất cả thông tin bắt buộc');
      return;
    }

    if (this.paymentInfo.method === 'cod') {
      this.processCODOrder();
    } else {
      this.onOpenPaymentModal();
    }
  }

  private processCODOrder() {
 // console.log('� [Order] Processing COD order...');
    this.createOrder();
  }

 /**
 * Tạo đơn hàng và gửi lên MongoDB
 */
  private createOrder() {
    const customerID = this.orderService.getCustomerID();

    if (customerID === 'guest') {
      alert('Vui lòng đăng nhập để đặt hàng');
      return;
    }

 // Prepare order items
    const orderItems: OrderItem[] = this.cartItems.map((item) => ({
      sku: item.sku || String(item.id),
      productName: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
      unit: item.unit || '',
      category: item.category,
      subcategory: item.subcategory,
    }));

 // Calculate shipping discount and product discount
 // Kiểm tra free shipping (subtotal >= 200000)
    const isFreeShipping = this.subtotal >= 200000;
    const baseShippingFee = 30000;

    let shippingDiscount = 0;
    if (isFreeShipping) {
 // Miễn phí vận chuyển = giảm 30,000
      shippingDiscount = baseShippingFee;
    } else if (this.selectedPromotion && this.isShippingPromotion(this.selectedPromotion)) {
 // Áp dụng promotion shipping discount
      shippingDiscount = this.getActualShippingDiscount();
    }

    const productDiscount =
      this.selectedPromotion && !this.isShippingPromotion(this.selectedPromotion)
        ? this.discountAmount
        : 0;

 // Prepare order request
    const orderRequest: CreateOrderRequest = {
      CustomerID: customerID,
      shippingInfo: {
        fullName: this.addressInfo.fullName,
        phone: this.addressInfo.phone,
        email: this.addressInfo.email || '',
        address: {
          city: this.addressInfo.city,
          district: this.addressInfo.district,
          ward: this.addressInfo.ward,
          detail: this.addressInfo.detail,
        },
        deliveryMethod: this.addressInfo.deliveryMethod,
        warehouseAddress: this.selectedDeliveryAddress,
        notes: this.addressInfo.notes || '',
      },
      items: orderItems,
      paymentMethod: this.paymentInfo.method as any,
      subtotal: this.subtotal,
      shippingFee: baseShippingFee, // Luôn gửi base shipping fee (30000)
      shippingDiscount: shippingDiscount, // Discount sẽ bao gồm free shipping hoặc promotion
      discount: productDiscount,
      vatRate: this.vatRate,
      vatAmount: this.vatAmount,
      totalAmount: this.totalAmount,
      code: this.selectedPromotion?.code || '',
      promotionName: this.selectedPromotion?.name || '',
      wantInvoice: this.wantInvoice,
      invoiceInfo: this.wantInvoice ? this.invoiceInfo : {},
      consultantCode: this.consultantCode,
    };

 // console.log(' [Order] Sending order to backend:', orderRequest);

 // Call OrderService to create order
    this.orderService.createOrder(orderRequest).subscribe({
      next: (response) => {
        if (response.success && response.data) {
 // console.log(' [Order] Order created successfully:', response.data);
          this.removePurchasedItemsFromCart();
          this.showOrderSuccess(response.data.OrderID);
        } else {
 // console.error(' [Order] Failed to create order:', response.message);
 // Hiển thị toast màu đỏ cho lỗi
          this.toastService.show(
            'Lỗi tạo đơn hàng: ' + (response.message || 'Unknown error'),
            'error'
          );
        }
      },
      error: (error) => {
 // console.error(' [Order] Error creating order:', error);
 // Hiển thị toast màu đỏ cho lỗi
        const errorMessage = error.message || 'Có lỗi xảy ra khi tạo đơn hàng';
        this.toastService.show('Lỗi tạo đơn hàng: ' + errorMessage, 'error');
      },
    });
  }

  private showOrderSuccess(orderId: string) {
 // Lưu order ID để hiển thị trong modal
    this.createdOrderId = orderId;
    this.showOrderSuccessModal = true;

 // Trigger storage event để orders component biết có order mới
    localStorage.setItem('newOrderCreated', Date.now().toString());
    localStorage.removeItem('newOrderCreated');
  }

  onViewOrders(): void {
    this.showOrderSuccessModal = false;
    this.router.navigate(['/account/orders'], { queryParams: { tab: 'pending' } });
  }

  onGoToHome(): void {
    this.showOrderSuccessModal = false;
    this.router.navigate(['/']);
  }

  private showPaymentError(error: string) {
    alert('Lỗi thanh toán: ' + error);
  }

 // Utility methods
  formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + '₫';
  }

  getAddressDisplay(): { name: string; address: string } {
    if (!this.hasAddressInfo()) {
      return {
        name: 'Thông tin người dùng nhập lúc này',
        address: '',
      };
    }

    const cityName = this.addressService.getCityNameFromId(this.addressInfo.city);
    const districtName = this.addressService.getDistrictNameFromId(this.addressInfo.district);
    const wardName = this.addressService.getWardNameFromId(this.addressInfo.ward);

    const addressParts = [this.addressInfo.detail, wardName, districtName, cityName].filter(
      (part) => part && part.trim() !== ''
    );

    return {
      name: this.addressInfo.fullName,
      address: addressParts.join(', '),
    };
  }

  getAddressString(address: FormAddressInfo): string {
    const cityName = this.addressService.getCityNameFromId(address.city);
    const districtName = this.addressService.getDistrictNameFromId(address.district);
    const wardName = this.addressService.getWardNameFromId(address.ward);

    const addressParts = [address.detail, wardName, districtName, cityName].filter(
      (part) => part && part.trim() !== ''
    );

    return addressParts.join(', ');
  }

  getAddressNameWithPhone(address: FormAddressInfo): string {
    return `${address.fullName} - ${address.phone}`;
  }

 // Kiểm tra xem địa chỉ có phải là địa chỉ mặc định không
  isDefaultAddress(index: number): boolean {
    const addresses = this.addressService.getAddresses();
    if (index >= 0 && index < addresses.length) {
      return addresses[index]?.isDefault || false;
    }
    return false;
  }
}
