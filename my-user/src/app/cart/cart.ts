import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import {
  PromotionModalComponent,
  Promotion,
  PromotionResult,
} from '../order/promotion-modal/promotion-modal';
import { CartService } from '../services/cart.service';

export interface Product {
  SKU: number;
  ProductName: string;
  Category: string;
  Subcategory: string;
  Price: number;
  Image: string;
  ManufactureDate: string;
  ExpiryDate: string;
  Stock: number;
  Description: string;
  Rating?: number;
  Discount?: number;
  Promotion?: string[];
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
  subcategory: string;
  unit: string;
  selected: boolean;
  sku?: string; // SKU để tìm product _id
  originalPrice?: number; // Giá gốc trước khuyến mãi
  hasPromotion?: boolean; // Có khuyến mãi không
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, PromotionModalComponent],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CartComponent implements OnInit, OnDestroy, OnChanges {
  @Input() cartItems: CartItem[] = [];
  @Input() selectedItems: CartItem[] = [];
  @Input() totalAmount: number = 0;
  @Input() selectedCount: number = 0;
  @Input() totalCount: number = 0; // Tổng số sản phẩm trong giỏ
  @Input() isCheckoutEnabled: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() itemSelect = new EventEmitter<number>();
  @Output() updateQuantity = new EventEmitter<{ itemId: number; quantity: number }>();
  @Output() removeItem = new EventEmitter<number>();
  @Output() checkout = new EventEmitter<void>();
  @Output() selectAll = new EventEmitter<void>();

  showPromotionModal = signal<boolean>(false);
  selectedPromotion: Promotion | null = null;
  availablePromotions: Promotion[] = [];
  discountAmount: number = 0; // Tiết kiệm từ promotion
  productDiscountAmount: number = 0; // Tiết kiệm từ giảm giá sản phẩm
  totalSavings: number = 0; // Tổng tiết kiệm (promotion + giảm giá sản phẩm)
  finalAmount: number = 0;
  isCartOpen: boolean = false;
  showDeleteConfirmModal: boolean = false;

 // Computed property để kiểm tra trạng thái "select all"
  get isAllSelected(): boolean {
    if (this.cartItems.length === 0) return false;
    return this.cartItems.every((item) => item.selected);
  }

 // TrackBy function để tối ưu DOM rendering
  trackByItemId(index: number, item: any): number {
    return item.id;
  }

  goToProductList(): void {
    this.router.navigate(['/product-list']);
    this.onClose(); // Đóng cart sidebar khi navigate
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private elementRef: ElementRef,
    private cartService: CartService,
    private productService: ProductService
  ) {}

  ngOnInit() {
 // Component giờ nhận data từ parent, không cần load từ localStorage
 // Hiển thị cart khi component được load
    setTimeout(() => {
      this.isCartOpen = true;
 // Thêm class vào body để quản lý trạng thái
      document.body.classList.add('cart-open');
 console.log('Cart opened - body classes:', document.body.className);

 // Tính toán tiết kiệm từ sản phẩm ban đầu
      this.calculateProductDiscount();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges) {
 // Khi totalAmount hoặc selectedItems thay đổi, tính toán lại discount và product savings
    if (changes['totalAmount'] || changes['selectedItems']) {
      this.calculateProductDiscount();
      if (this.selectedPromotion) {
        this.calculatePromotionDiscount();
      } else {
 // Nếu không có promotion, chỉ cập nhật tổng tiết kiệm từ sản phẩm
        this.updateTotalSavings();
      }
    }
  }

  ngOnDestroy() {
 // Xóa class khỏi body khi component bị destroy
    document.body.classList.remove('cart-open');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
 // Kiểm tra nếu click bên ngoài cart sidebar
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.onClose();
    }
  }

  onItemSelect(itemId: number) {
    this.itemSelect.emit(itemId);
  }

  onSelectAll() {
    this.selectAll.emit();
  }

  onUpdateQuantity(itemId: number, newQuantity: number) {
 // Tìm item hiện tại để kiểm tra quantity
    const currentItem = this.cartItems.find((item) => item.id === itemId);

 // Nếu quantity hiện tại = 1 và muốn giảm xuống 0, không cho phép
    if (currentItem && currentItem.quantity <= 1 && newQuantity < 1) {
      return; // Không thực hiện gì cả
    }

 // Không cần kiểm tra giới hạn khi tăng số lượng vì đã có sản phẩm này trong cart
    this.updateQuantity.emit({ itemId, quantity: newQuantity });
  }

  onRemoveItem(itemId: number) {
    this.removeItem.emit(itemId);
  }

 // Mở modal xác nhận xóa
  onDeleteSelected() {
    if (this.selectedCount > 0) {
      this.showDeleteConfirmModal = true;
    }
  }

 // Xác nhận xóa tất cả sản phẩm đã chọn
  confirmDeleteSelected() {
 // Lọc ra các SKU của items đã chọn
    const selectedSkus = this.selectedItems
      .map((item) => item.sku)
      .filter((sku): sku is string => !!sku); // Lọc bỏ undefined/null

    if (selectedSkus.length === 0) {
 console.warn(' [Cart] No valid SKUs to delete');
      this.showDeleteConfirmModal = false;
      return;
    }

 // Kiểm tra nếu xóa hết tất cả items, sử dụng clearCart
    if (selectedSkus.length === this.cartItems.length) {
 console.log(' [Cart] Deleting all items - using clearCart');
      this.cartService.clearCart().subscribe({
        next: () => {
 console.log(' [Cart] All items deleted, cart cleared');
          this.showDeleteConfirmModal = false;
        },
        error: (error) => {
 console.error(' [Cart] Error clearing cart:', error);
          this.showDeleteConfirmModal = false;
        },
      });
    } else {
 // Xóa nhiều items sử dụng remove-multiple API
 console.log(` [Cart] Deleting ${selectedSkus.length} selected items`);
      this.cartService.removeMultipleItems(selectedSkus).subscribe({
        next: (response) => {
 console.log(' [Cart] Items deleted successfully:', response);
 // Reload cart để đảm bảo đồng bộ
          this.cartService.loadCart();
          this.showDeleteConfirmModal = false;
        },
        error: (error) => {
 console.error(' [Cart] Error deleting items:', error);
          this.showDeleteConfirmModal = false;
        },
      });
    }
  }

 // Hủy xóa
  cancelDeleteSelected() {
    this.showDeleteConfirmModal = false;
  }

 // Navigate to product detail from cart item
  goToProductDetail(item: CartItem): void {
 // Close cart first
    this.onClose();

 // Try to find product by SKU to get _id
    if (item.sku) {
      this.productService.getProductBySku(item.sku).subscribe({
        next: (product) => {
          if (product && product._id) {
            this.router.navigate(['/product-detail', product._id]);
          } else {
 console.warn('Product not found for SKU:', item.sku);
          }
        },
        error: (error) => {
 console.error('Error fetching product by SKU:', error);
        },
      });
    } else {
 console.warn('Cart item has no SKU:', item);
    }
  }

  onCheckout() {
 // Đóng cart trước khi điều hướng
    this.onClose();

 // Set flag để order component biết cần mở address modal
    this.cartService.setShouldOpenAddressModal(true);

 // Điều hướng đến trang order
    this.router.navigate(['/order']);

 // Emit event cho parent component
    this.checkout.emit();
  }

  onClose() {
    this.isCartOpen = false;
 // Xóa class khỏi body
    document.body.classList.remove('cart-open');
 // Delay để animation hoàn thành trước khi emit
    setTimeout(() => {
      this.close.emit();
    }, 300);
  }

  onPromotionClick() {
    this.showPromotionModal.set(true);
  }

  onPromotionApplied(result: PromotionResult) {
    this.selectedPromotion = result.selectedPromotion;
    this.discountAmount = result.discountAmount;
    this.finalAmount = result.finalAmount;
    this.calculatePromotionDiscount(); // Tính lại để đảm bảo đồng bộ
    this.showPromotionModal.set(false);

 // Lưu promotion vào CartService
    this.cartService.setPromotion(
      result.selectedPromotion,
      result.discountAmount,
      result.finalAmount
    );

 console.log('Promotion applied:', result);
  }

 // Tính toán tiết kiệm từ giảm giá sản phẩm (chênh lệch giữa originalPrice và price)
  calculateProductDiscount() {
    this.productDiscountAmount = this.selectedItems.reduce((total, item) => {
      if (item.hasPromotion && item.originalPrice && item.originalPrice > item.price) {
        const itemDiscount = (item.originalPrice - item.price) * item.quantity;
        return total + itemDiscount;
      }
      return total;
    }, 0);

 // Cập nhật tổng tiết kiệm (bao gồm cả promotion nếu có)
    this.updateTotalSavings();
  }

 // Tính toán lại discount khi có thay đổi
  calculatePromotionDiscount() {
 // Tính lại tiết kiệm từ sản phẩm trước
    this.calculateProductDiscount();

    if (!this.selectedPromotion) {
      this.discountAmount = 0;
      this.finalAmount = this.totalAmount;
      this.updateTotalSavings();
      return;
    }

 // Kiểm tra điều kiện tối thiểu của promotion
    if (this.totalAmount < this.selectedPromotion.minOrderAmount) {
 // Tự động bỏ promotion nếu không đủ điều kiện
      this.selectedPromotion = null;
      this.discountAmount = 0;
      this.finalAmount = this.totalAmount;
      this.updateTotalSavings(); // Vẫn tính tiết kiệm từ sản phẩm
 console.log('Promotion removed due to insufficient order amount');
      return;
    }

 // Kiểm tra nếu là Shipping promotion - không trừ vào total amount
    if (this.isShippingPromotion(this.selectedPromotion)) {
      this.discountAmount = 0; // Không hiển thị savings từ promotion
      this.finalAmount = this.totalAmount; // Không trừ vào total
      this.updateTotalSavings(); // Vẫn tính tiết kiệm từ sản phẩm
 console.log('Shipping promotion applied - no discount to total amount');
      return;
    }

    let discount = 0;
    const currentTotal = this.totalAmount;

    if (this.selectedPromotion.discountType === 'percentage') {
      discount = (currentTotal * this.selectedPromotion.discountValue) / 100;
      if (this.selectedPromotion.maxDiscount && discount > this.selectedPromotion.maxDiscount) {
        discount = this.selectedPromotion.maxDiscount;
      }
    } else {
      discount = this.selectedPromotion.discountValue;
    }

 // Đảm bảo discount không vượt quá tổng tiền
    this.discountAmount = Math.min(discount, currentTotal);
    this.finalAmount = currentTotal - this.discountAmount;

 // Cập nhật tổng tiết kiệm
    this.updateTotalSavings();
  }

 // Cập nhật tổng tiết kiệm (promotion + giảm giá sản phẩm)
  updateTotalSavings() {
    this.totalSavings = this.productDiscountAmount + this.discountAmount;
  }

 // Kiểm tra nếu là Shipping promotion
  private isShippingPromotion(promotion: Promotion): boolean {
    return promotion.promotionType === 'Shipping';
  }

  onClosePromotionModal() {
    this.showPromotionModal.set(false);
  }

 // Kiểm tra xem có thể thêm sản phẩm mới không (giới hạn 100 sản phẩm khác nhau)
  canAddNewItem(): boolean {
    return this.cartItems.length < 100;
  }

 // Kiểm tra và hiển thị thông báo nếu đã đạt giới hạn
  checkCartLimit(): void {
    if (this.cartItems.length >= 100) {
      alert(
        'Giỏ hàng đã đạt giới hạn tối đa 100 sản phẩm khác nhau. Vui lòng xóa bớt sản phẩm để tiếp tục mua sắm.'
      );
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(price);
  }
}
