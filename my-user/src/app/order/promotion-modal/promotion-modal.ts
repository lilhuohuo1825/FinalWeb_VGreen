import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ScrollLockService } from '../../services/scroll-lock.service';

export interface Promotion {
  id: string;
  code: string; // Mã khuyến mãi (VD: FREESHIP, SALE50)
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expiryDate: string;
  expiryLabel: string;
  expiryValue: string;
  isActive: boolean;
  promotionType?: string; // Thêm field để phân biệt Shipping vs Product promotions
}

export interface PromotionJson {
  promotion_id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  scope: string;
  discount_type: string;
  discount_value: number;
  max_discount_value: number;
  min_order_value: number;
  usage_limit: number;
  user_limit: number;
  is_first_order_only: boolean;
  start_date: string;
  end_date: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PromotionResult {
  selectedPromotion: Promotion | null;
  discountAmount: number;
  finalAmount: number;
}

@Component({
  selector: 'app-promotion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotion-modal.html',
  styleUrl: './promotion-modal.css',
})
export class PromotionModalComponent implements OnInit, OnDestroy {
  @Input() cartAmount: number = 0;
  @Input() availablePromotions: Promotion[] = [];
  @Input() currentSelectedPromotion: Promotion | null = null;
  @Output() promotionApplied = new EventEmitter<PromotionResult>();
  @Output() closeModal = new EventEmitter<void>();
  @Output() confirmPromotion = new EventEmitter<void>();

  selectedPromotionId: string = '';
  manualPromoCode: string = '';
  isApplying = false;
  errorMessage = '';
  rawPromotionsData: PromotionJson[] = [];
  isValidCode = false;
  isCodeValidated = false;
  hasError = false;

  get hasValidPromotion(): boolean {
    return this.selectedPromotionId !== '' || this.isCodeValidated;
  }

 // Nút "Tìm kiếm" - chỉ cần đủ 4 ký tự 
  get canSearchCode(): boolean {
    return this.manualPromoCode.trim().length >= 4 && !this.hasError;
  }

 // Nút "Áp dụng" - chỉ kích hoạt khi có promotion được chọn 
  get canApplyPromotion(): boolean {
    return this.hasValidPromotion;
  }

  constructor(private http: HttpClient, private scrollLock: ScrollLockService) {}

  ngOnInit() {
    this.loadPromotions();

 // Khôi phục trạng thái đã chọn 
    if (this.currentSelectedPromotion) {
      this.selectedPromotionId = this.currentSelectedPromotion.id;
      this.manualPromoCode = '';
    }

 // Lock scroll khi modal mở 
    this.scrollLock.lock();
  }

  ngOnDestroy() {
 // Unlock scroll khi modal đóng 
    this.scrollLock.unlock();
  }

  loadPromotions() {
 // Gọi API MongoDB thay vì đọc file JSON 
    this.http
      .get<{ success: boolean; data: PromotionJson[]; count: number }>(
        'http://localhost:3000/api/promotions/active'
      )
      .subscribe({
        next: (response) => {
 console.log(' [Promotions] Loaded from MongoDB:', response.count); 
          this.rawPromotionsData = response.data;
          this.availablePromotions = this.filterAndTransformPromotions(response.data);
 console.log(' [Promotions] Filtered promotions:', this.availablePromotions.length); 
 console.log(' [Promotions] Available promotions:', this.availablePromotions); 
        },
        error: (error) => {
 console.error(' [Promotions] Error loading from MongoDB:', error); 
          this.rawPromotionsData = [];
          this.availablePromotions = [];
        },
      });
  }

  private filterAndTransformPromotions(jsonData: PromotionJson[]): Promotion[] {
 console.log(' [Promotions] Transforming promotions from MongoDB:', jsonData.length); 

 // Backend đã filter Active, không Admin, trong vòng 2 tuần, còn usage_limit 
 // Frontend chỉ cần transform và sort 
    const promotions = jsonData.map((promo) => {
 console.log(' [Promotions] Processing:', { 
        id: promo.promotion_id,
        name: promo.name,
        type: promo.type,
        scope: promo.scope,
        endDate: promo.end_date,
      });
      return this.transformPromotion(promo);
    });

 // Sắp xếp: mã có thể sử dụng lên đầu, mã chưa đủ điều kiện xuống dưới 
 // Trong mỗi nhóm, sắp xếp theo thời gian hết hạn (gần hết hạn lên đầu) 
    return promotions.sort((a, b) => {
      const aCanUse = this.canUsePromotion(a);
      const bCanUse = this.canUsePromotion(b);

 // Nếu một mã có thể dùng và một mã không thể dùng 
      if (aCanUse && !bCanUse) return -1; // a lên đầu
      if (!aCanUse && bCanUse) return 1; // b lên đầu

 // Nếu cả hai đều có thể dùng hoặc không thể dùng, sắp xếp theo thời gian hết hạn 
      const aExpiry = new Date(a.expiryDate);
      const bExpiry = new Date(b.expiryDate);
      return aExpiry.getTime() - bExpiry.getTime(); // Gần hết hạn lên đầu
    });
  }

  private canUsePromotion(promotion: Promotion): boolean {
 // Kiểm tra xem mã có thể sử dụng được không 
    return this.cartAmount >= promotion.minOrderAmount;
  }

  private transformPromotion(jsonPromo: PromotionJson): Promotion {
    const discountValue = jsonPromo.discount_value;
    const minOrderAmount = jsonPromo.min_order_value || 0;
    const endDate = new Date(jsonPromo.end_date);
    const currentDate = new Date();
    const daysUntilExpiry = Math.ceil(
      (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let expiryLabel: string;
    let expiryValue: string;
    if (daysUntilExpiry <= 3) {
      expiryLabel = 'Hết hạn trong:';
      expiryValue = `${daysUntilExpiry} ngày`;
    } else {
      expiryLabel = 'HSD:';
      expiryValue = this.formatDate(jsonPromo.end_date);
    }

    return {
      id: jsonPromo.promotion_id,
      code: jsonPromo.code, //  Map mã khuyến mãi
      name: jsonPromo.name,
      description: jsonPromo.description,
      discountType: this.getDiscountType(jsonPromo.discount_type),
      discountValue: discountValue,
      minOrderAmount: minOrderAmount,
      maxDiscount: jsonPromo.max_discount_value > 0 ? jsonPromo.max_discount_value : undefined,
      expiryDate: jsonPromo.end_date, // Lưu format ISO (YYYY-MM-DD) để sort đúng
      expiryLabel: expiryLabel,
      expiryValue: expiryValue,
      isActive: jsonPromo.status === 'Active',
      promotionType: jsonPromo.scope, // Dùng 'scope' để phân biệt Order/Shipping/Category/Product
    };
  }

  private getDiscountType(promoType: string): 'percentage' | 'fixed' {
    switch (promoType) {
      case 'percent':
        return 'percentage';
      case 'fixed':
        return 'fixed';
      case 'buy1get1':
        return 'fixed'; // Treat buy1get1 as fixed for now
      default:
        return 'fixed';
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  }

  onPromotionSelect(promotionId: string) {
    this.selectedPromotionId = promotionId;
    this.errorMessage = '';
    this.isValidCode = false;
    this.isCodeValidated = false;
  }

  onManualCodeChange() {
    this.errorMessage = '';
    this.hasError = false;
    const trimmedCode = this.manualPromoCode.trim();
    this.isValidCode = trimmedCode.length >= 4;
    this.isCodeValidated = false;

 console.log('Manual code change:', { 
      original: this.manualPromoCode,
      trimmed: trimmedCode,
      length: trimmedCode.length,
      isValidCode: this.isValidCode,
      canSearchCode: this.canSearchCode,
      canApplyPromotion: this.canApplyPromotion,
      isCodeValidated: this.isCodeValidated,
    });

    if (trimmedCode.length > 0) {
      this.selectedPromotionId = '';
    }
  }

  onCompositionEnd() {
    this.errorMessage = '';
    this.hasError = false;
    const trimmedCode = this.manualPromoCode.trim();
    this.isValidCode = trimmedCode.length >= 4;
    this.isCodeValidated = false;

 console.log('Composition end:', { 
      original: this.manualPromoCode,
      trimmed: trimmedCode,
      length: trimmedCode.length,
      isValidCode: this.isValidCode,
      canSearchCode: this.canSearchCode,
      canApplyPromotion: this.canApplyPromotion,
      isCodeValidated: this.isCodeValidated,
    });

    if (trimmedCode.length > 0) {
      this.selectedPromotionId = '';
    }
  }

  onClearCode(inputElement: HTMLInputElement) {
    this.manualPromoCode = '';
    this.errorMessage = '';
    this.isValidCode = false;
    this.isCodeValidated = false;
    inputElement.focus();
  }

 // Hàm này chỉ dùng cho nút "Tìm kiếm" 
  async onSearchPromotion() {
    if (!this.manualPromoCode.trim()) {
      this.errorMessage = 'Vui lòng nhập mã khuyến mãi';
      return;
    }

    this.errorMessage = '';

    try {
      const selectedPromotion = await this.validateManualCode(this.manualPromoCode.trim());

      if (!selectedPromotion) {
        this.errorMessage = 'Mã khuyến mãi không hợp lệ';
        this.hasError = true;
        return;
      }

 // Check if promotion is applicable 
      if (this.cartAmount < selectedPromotion.minOrderAmount) {
        this.errorMessage = `Đơn hàng tối thiểu ${selectedPromotion.minOrderAmount.toLocaleString(
          'vi-VN'
        )}₫ để áp dụng khuyến mãi này`;
        this.hasError = true;
        return;
      }

 // Calculate discount 
      const discountAmount = this.calculateDiscount(selectedPromotion);
      const finalAmount = this.cartAmount - discountAmount;

 // Mark code as validated successfully 
      this.isCodeValidated = true;
      this.selectedPromotionId = selectedPromotion.id;

 // KHÔNG emit result ở đây - chỉ khi nhấn "Áp dụng" 
 // this.promotionApplied.emit({ 
 // selectedPromotion, 
 // discountAmount, 
 // finalAmount, 
 // }); 

      this.errorMessage = '';
 console.log('Mã khuyến mãi tìm thấy:', selectedPromotion.name); 
    } catch (error) {
      this.errorMessage = 'Có lỗi xảy ra khi tìm kiếm khuyến mãi';
      this.hasError = true;
    }
  }

 // Hàm này chỉ dùng cho nút "Áp dụng" - chỉ xác nhận và đóng modal 
  async onApplyPromotion() {
    if (!this.hasValidPromotion) {
      this.errorMessage = 'Vui lòng chọn hoặc tìm kiếm mã khuyến mãi trước';
      return;
    }

    let selectedPromotion: Promotion | null = null;

    if (this.selectedPromotionId) {
      selectedPromotion =
        this.availablePromotions.find((p) => p.id === this.selectedPromotionId) || null;
    }

    if (!selectedPromotion) {
      this.errorMessage = 'Không tìm thấy khuyến mãi đã chọn';
      return;
    }

 // Calculate discount 
    const discountAmount = this.calculateDiscount(selectedPromotion);
    const finalAmount = this.cartAmount - discountAmount;

 // Emit final result 
    this.promotionApplied.emit({
      selectedPromotion,
      discountAmount,
      finalAmount,
    });

 // Close modal 
    this.closeModal.emit();
  }

  async onConfirmPromotion() {
    this.confirmPromotion.emit();
  }

  private async validateManualCode(code: string): Promise<Promotion | null> {
    try {
 // Gọi API để tìm promotion theo code 
      const response = await this.http
        .get<{ success: boolean; data: PromotionJson }>(
          `http://localhost:3000/api/promotions/code/${code}`
        )
        .toPromise();

      if (response && response.success && response.data) {
 console.log(' [Promotions] Found code in MongoDB:', response.data.code); 
        return this.transformPromotion(response.data);
      }

 console.log(' [Promotions] Code not found in MongoDB:', code); 
      return null;
    } catch (error) {
 console.error(' [Promotions] Error validating code:', error); 
      return null;
    }
  }

  private calculateDiscount(promotion: Promotion): number {
 // Kiểm tra điều kiện tối thiểu trước khi tính discount 
    if (this.cartAmount < promotion.minOrderAmount) {
      return 0;
    }

 // Kiểm tra nếu là Shipping promotion - không trừ vào total amount 
    if (this.isShippingPromotion(promotion)) {
      return 0; // Shipping promotions không ảnh hưởng đến giá sản phẩm
    }

    let discount = 0;

    if (promotion.discountType === 'percentage') {
      discount = (this.cartAmount * promotion.discountValue) / 100;
      if (promotion.maxDiscount && discount > promotion.maxDiscount) {
        discount = promotion.maxDiscount;
      }
    } else {
      discount = promotion.discountValue;
    }

    return Math.min(discount, this.cartAmount);
  }

 // Kiểm tra nếu là Shipping promotion 
  private isShippingPromotion(promotion: Promotion): boolean {
    return promotion.promotionType === 'Shipping'; // promotionType đã được map từ 'scope'
  }

  onRemovePromotion() {
    this.selectedPromotionId = '';
    this.manualPromoCode = '';
    this.promotionApplied.emit({
      selectedPromotion: null,
      discountAmount: 0,
      finalAmount: this.cartAmount,
    });
  }

  onRemoveAllPromotions() {
    this.selectedPromotionId = '';
    this.manualPromoCode = '';
    this.promotionApplied.emit({
      selectedPromotion: null,
      discountAmount: 0,
      finalAmount: this.cartAmount,
    });
    this.closeModal.emit();
  }

  onClose() {
    this.closeModal.emit();
  }

  isPromotionApplicable(promotion: Promotion): boolean {
    return this.cartAmount >= promotion.minOrderAmount;
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + '₫';
  }

  getSelectedPromotionName(): string {
    if (this.selectedPromotionId) {
      const promotion = this.availablePromotions.find((p) => p.id === this.selectedPromotionId);
      return promotion?.name || '';
    } else if (this.manualPromoCode.trim()) {
      return 'Mã: ' + this.manualPromoCode;
    }
    return '';
  }
}
