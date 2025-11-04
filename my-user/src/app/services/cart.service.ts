import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { ToastService } from './toast.service';

interface CartItem {
  sku: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  unit: string;
  category: string;
  subcategory: string;
  originalPrice?: number;
  hasPromotion?: boolean;
 // Frontend specific fields
  id?: number;
  name?: string;
  selected?: boolean;
}

interface Cart {
  CustomerID: string;
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private apiUrl = 'http://localhost:3000/api/cart';

  private isOpen = signal(false);
  private cartItems = signal<any[]>([]);
  private selectedPromotion = signal<any>(null);
  private discountAmount = signal<number>(0);
  private finalAmount = signal<number>(0);
  private shouldOpenAddressModal = signal<boolean>(false);
  private isLoading = signal<boolean>(false);

  constructor() {
 // Auto-load cart from backend when service initializes
    this.loadCart();
  }

 // Computed signals
  selectedItems = computed(() => this.cartItems().filter((item) => item.selected));
  selectedCount = computed(() => this.selectedItems().length);
  totalAmount = computed(() =>
    this.selectedItems().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  isCheckoutEnabled = computed(() => this.selectedCount() > 0);

 // Computed cho tổng số lượng sản phẩm trong cart
  totalQuantity = computed(() =>
    this.cartItems().reduce((total, item) => total + item.quantity, 0)
  );

 // Computed cho số sản phẩm khác nhau (totalCount)
  totalCount = computed(() => this.cartItems().length);

 // Computed để kiểm tra xem đã đạt giới hạn chưa (100 sản phẩm khác nhau)
  isAtLimit = computed(() => this.totalCount() >= 100);

 // Getters
  getIsOpen() {
    return this.isOpen.asReadonly();
  }

  getCartItems() {
    return this.cartItems.asReadonly();
  }

  getSelectedPromotion() {
    return this.selectedPromotion.asReadonly();
  }

  getDiscountAmount() {
    return this.discountAmount.asReadonly();
  }

  getFinalAmount() {
    return this.finalAmount.asReadonly();
  }

  getShouldOpenAddressModal() {
    return this.shouldOpenAddressModal.asReadonly();
  }

  getTotalQuantity() {
    return this.totalQuantity;
  }

  getTotalCount() {
    return this.totalCount;
  }

  getIsAtLimit() {
    return this.isAtLimit;
  }

  getIsLoading() {
    return this.isLoading.asReadonly();
  }

 // Helper methods
  private getCustomerID(): string {
 // Try to get from localStorage (từ auth service)
    const userStr = localStorage.getItem('user'); //  Key đúng là 'user', không phải 'currentUser'

    if (!userStr) {
 console.log(' [CartService] No user in localStorage using guest');
      return 'guest';
    }

    try {
      const userData = JSON.parse(userStr);
      const customerId = userData.CustomerID || userData._id || 'guest';
 console.log(` [CartService] User found CustomerID: ${customerId}`);
      return customerId;
    } catch (error) {
 console.error(' [CartService] Error parsing user data:', error);
      return 'guest';
    }
  }

  private mapToBackendItem(item: any): CartItem {
    return {
      sku: item.sku || item.id?.toString() || '',
      productName: item.name || item.productName || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      image: item.image || '',
      unit: item.unit || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      originalPrice: item.originalPrice,
      hasPromotion: item.hasPromotion || false,
    };
  }

  private mapToFrontendItem(item: CartItem): any {
 // Validate: Nếu có promotion và có originalPrice hợp lệ, hiển thị promotion
 // Chỉ hiển thị khi originalPrice > price (có giảm giá thực sự)
 // Cho phép một chút sai số do làm tròn (tolerance = 1%)
    const priceTolerance = item.price * 0.01;
    const hasValidPromotion =
      item.hasPromotion &&
      item.originalPrice !== undefined &&
      item.originalPrice !== null &&
      typeof item.originalPrice === 'number' &&
      typeof item.price === 'number' &&
      item.originalPrice > item.price - priceTolerance; // Cho phép sai số nhỏ do làm tròn

    return {
      id: parseInt(item.sku) || 0,
      sku: item.sku,
      name: item.productName,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
      unit: item.unit,
      category: item.category,
      subcategory: item.subcategory,
      selected: true,
      originalPrice: hasValidPromotion ? item.originalPrice : undefined,
      hasPromotion: hasValidPromotion,
    };
  }

 // Load cart from backend
  loadCart() {
    const customerID = this.getCustomerID();
 console.log(' [CartService] Loading cart for:', customerID);

    this.isLoading.set(true);

    this.http
      .get<any>(`${this.apiUrl}/${customerID}`)
      .pipe(
        tap((response) => {
 console.log(' [CartService] Cart loaded:', response);
          if (response.success && response.data) {
            const frontendItems = response.data.items.map((item: CartItem) =>
              this.mapToFrontendItem(item)
            );
            this.cartItems.set(frontendItems);
          }
          this.isLoading.set(false);
        }),
        catchError((error) => {
 console.error(' [CartService] Error loading cart:', error);
          this.isLoading.set(false);
 // Fallback to empty cart
          this.cartItems.set([]);
          return of(null);
        })
      )
      .subscribe();
  }

 // Cart state management
  openCart() {
    this.isOpen.set(true);
  }

  closeCart() {
    this.isOpen.set(false);
  }

  setShouldOpenAddressModal(shouldOpen: boolean) {
    this.shouldOpenAddressModal.set(shouldOpen);
  }

  toggleCart() {
    this.isOpen.set(!this.isOpen());
  }

 // Cart items management
  addToCart(item: any, showToast: boolean = true) {
    const customerID = this.getCustomerID();

 // Kiểm tra xem user đã đăng nhập chưa
    if (customerID === 'guest') {
 console.warn(' [CartService] Guest user cannot add to cart - login required');
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
      return;
    }

 // So sánh bằng cả id và sku để đảm bảo tìm đúng sản phẩm
 // Ưu tiên so sánh bằng sku (nhất quán hơn), sau đó mới đến id
    const existingItem = this.cartItems().find((cartItem) => {
 // So sánh bằng sku trước (nếu có)
      if (cartItem.sku && item.sku) {
        return cartItem.sku === item.sku;
      }
 // Nếu không có sku, so sánh bằng id (convert về cùng kiểu để đảm bảo)
      const cartItemId = typeof cartItem.id === 'string' ? parseInt(cartItem.id) : cartItem.id;
      const itemId = typeof item.id === 'string' ? parseInt(item.id) : item.id;
      return cartItemId === itemId;
    });

    if (existingItem) {
 // Tăng số lượng và đưa sản phẩm lên đầu danh sách, đảm bảo selected = true
 // Cập nhật originalPrice và hasPromotion từ item mới nếu có (để đảm bảo thông tin promotion luôn mới nhất)
      const updatedItem = {
        ...existingItem,
        quantity: existingItem.quantity + 1,
        selected: true,
 // Giữ lại originalPrice và hasPromotion từ item mới nếu có, nếu không thì giữ từ item cũ
        originalPrice:
          item.originalPrice !== undefined ? item.originalPrice : existingItem.originalPrice,
        hasPromotion:
          item.hasPromotion !== undefined ? item.hasPromotion : existingItem.hasPromotion,
      };

 // Lọc ra các item khác (không phải item này) - sử dụng cùng logic so sánh
      const otherItems = this.cartItems().filter((cartItem) => {
 // So sánh bằng sku trước (nếu có)
        if (cartItem.sku && item.sku) {
          return cartItem.sku !== item.sku;
        }
 // Nếu không có sku, so sánh bằng id
        const cartItemId = typeof cartItem.id === 'string' ? parseInt(cartItem.id) : cartItem.id;
        const itemId = typeof item.id === 'string' ? parseInt(item.id) : item.id;
        return cartItemId !== itemId;
      });

 // Đưa sản phẩm đã cập nhật lên đầu danh sách
      const updatedItems = [updatedItem, ...otherItems];
      this.cartItems.set(updatedItems);

 // Hiển thị toast notification nếu được bật
      if (showToast) {
        this.toastService.show('Đã thêm vào giỏ hàng!');
      }

 // Update backend
      const backendItem = this.mapToBackendItem({ ...item, quantity: 1 });
      this.http
        .post<any>(`${this.apiUrl}/${customerID}/add`, backendItem)
        .pipe(
          tap((response) => {
 console.log(
              ' [CartService] Item quantity updated in backend and moved to top:',
              response
            );
          }),
          catchError((error) => {
 console.error(' [CartService] Error updating item in backend:', error);
 // Rollback nếu backend lỗi
            if (error.status === 401) {
              alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
            }
            return of(null);
          })
        )
        .subscribe();
    } else {
 // Thêm sản phẩm mới - kiểm tra giới hạn 100 sản phẩm khác nhau
      if (this.cartItems().length >= 100) {
 // Hiển thị toast màu đỏ cảnh báo giới hạn
        this.toastService.show(
          'Giỏ hàng đã đạt giới hạn tối đa 100 sản phẩm. Vui lòng xóa bớt sản phẩm trong giỏ hàng!',
          'error'
        );
        return;
      }

      const newItem = {
        ...item,
        quantity: 1,
        selected: true,
      };

 // Thêm vào frontend
      this.cartItems.set([newItem, ...this.cartItems()]);

 // Hiển thị toast notification nếu được bật
      if (showToast) {
        this.toastService.show('Đã thêm vào giỏ hàng!');
      }

 // Add to backend
      const backendItem = this.mapToBackendItem(newItem);
 console.log(' [CartService] Adding to cart:', backendItem);

      this.http
        .post<any>(`${this.apiUrl}/${customerID}/add`, backendItem)
        .pipe(
          tap((response) => {
 console.log(' [CartService] Item added to backend:', response);
          }),
          catchError((error) => {
 console.error(' [CartService] Error adding to backend:', error);
            return of(null);
          })
        )
        .subscribe();
    }
  }

  removeFromCart(itemId: number) {
    const customerID = this.getCustomerID();
    const item = this.cartItems().find((item) => item.id === itemId);

    if (!item) return;

 // Remove from frontend
    const updatedItems = this.cartItems().filter((item) => item.id !== itemId);
    this.cartItems.set(updatedItems);

 // Nếu sau khi xóa không còn items nào, clear cart
    if (updatedItems.length === 0) {
 console.log(' [CartService] Cart is empty after removal, clearing cart');
      this.clearCart().subscribe({
        next: () => {
 console.log(' [CartService] Cart cleared after removing last item');
        },
        error: (error) => {
 console.error(' [CartService] Error clearing empty cart:', error);
        },
      });
      return;
    }

 // Remove from backend
    const sku = item.sku || itemId.toString();
    this.http
      .delete<any>(`${this.apiUrl}/${customerID}/remove/${sku}`)
      .pipe(
        tap((response) => {
 console.log(' [CartService] Item removed from backend:', response);
        }),
        catchError((error) => {
 console.error(' [CartService] Error removing from backend:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  updateQuantity(itemId: number, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(itemId);
      return;
    }

    const customerID = this.getCustomerID();
    const item = this.cartItems().find((item) => item.id === itemId);

    if (!item) return;

 // Update frontend
    const updatedItems = this.cartItems().map((item) =>
      item.id === itemId ? { ...item, quantity: quantity } : item
    );
    this.cartItems.set(updatedItems);

 // Update backend
    const sku = item.sku || itemId.toString();
    this.http
      .put<any>(`${this.apiUrl}/${customerID}/update/${sku}`, { quantity })
      .pipe(
        tap((response) => {
 console.log(' [CartService] Quantity updated in backend:', response);
        }),
        catchError((error) => {
 console.error(' [CartService] Error updating quantity in backend:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  toggleItemSelection(itemId: number) {
    const updatedItems = this.cartItems().map((item) =>
      item.id === itemId ? { ...item, selected: !item.selected } : item
    );
    this.cartItems.set(updatedItems);
  }

 // Promotion management
  setPromotion(promotion: any, discountAmount: number, finalAmount: number) {
    this.selectedPromotion.set(promotion);
    this.discountAmount.set(discountAmount);
    this.finalAmount.set(finalAmount);
  }

  clearPromotion() {
    this.selectedPromotion.set(null);
    this.discountAmount.set(0);
    this.finalAmount.set(0);
  }

 // Xóa một item khỏi cart
  removeItem(itemId: number) {
    const customerID = this.getCustomerID();
    const item = this.cartItems().find((item) => item.id === itemId);

    if (!item) return;

 // Remove from frontend
    const currentItems = this.cartItems();
    const updatedItems = currentItems.filter((item) => item.id !== itemId);
    this.cartItems.set(updatedItems);
 console.log(`Removed item ${itemId} from cart. Remaining items:`, updatedItems.length);

 // Nếu sau khi xóa không còn items nào, clear cart
    if (updatedItems.length === 0) {
 console.log(' [CartService] Cart is empty after removal, clearing cart');
      this.clearCart().subscribe({
        next: () => {
 console.log(' [CartService] Cart cleared after removing last item');
        },
        error: (error) => {
 console.error(' [CartService] Error clearing empty cart:', error);
        },
      });
      return;
    }

 // Remove from backend
    const sku = item.sku || itemId.toString();
    this.http
      .delete<any>(`${this.apiUrl}/${customerID}/remove/${sku}`)
      .pipe(
        tap((response) => {
 console.log(' [CartService] Item removed from backend:', response);
        }),
        catchError((error) => {
 console.error(' [CartService] Error removing from backend:', error);
          return of(null);
        })
      )
      .subscribe();
  }

 // Toggle select all items
  toggleSelectAll() {
    const currentItems = this.cartItems();
    const allSelected = currentItems.every((item) => item.selected);

 // Nếu tất cả đã được chọn, bỏ chọn tất cả
 // Nếu chưa tất cả được chọn, chọn tất cả
    const updatedItems = currentItems.map((item) => ({
      ...item,
      selected: !allSelected,
    }));

    this.cartItems.set(updatedItems);
 console.log(`Toggle select all: ${!allSelected ? 'Select all' : 'Deselect all'}`);
  }

 // Deselect all items (for repurchase functionality)
  deselectAllItems() {
    const currentItems = this.cartItems();
    const updatedItems = currentItems.map((item) => ({
      ...item,
      selected: false,
    }));
    this.cartItems.set(updatedItems);
 console.log(' [CartService] Deselected all items');
  }

 // Add or update item with specific quantity (for repurchase functionality)
  addOrUpdateItemWithQuantity(item: any, targetQuantity: number, showToast: boolean = false) {
    const customerID = this.getCustomerID();

 // Kiểm tra xem user đã đăng nhập chưa
    if (customerID === 'guest') {
 console.warn(' [CartService] Guest user cannot add to cart - login required');
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
      return;
    }

 // So sánh bằng cả id và sku để đảm bảo tìm đúng sản phẩm
    const existingItem = this.cartItems().find((cartItem) => {
 // So sánh bằng sku trước (nếu có)
      if (cartItem.sku && item.sku) {
        return cartItem.sku === item.sku;
      }
 // Nếu không có sku, so sánh bằng id
      const cartItemId = typeof cartItem.id === 'string' ? parseInt(cartItem.id) : cartItem.id;
      const itemId = typeof item.id === 'string' ? parseInt(item.id) : item.id;
      return cartItemId === itemId;
    });

    if (existingItem) {
 // Cập nhật số lượng theo targetQuantity và đưa lên đầu danh sách
      const updatedItem = { ...existingItem, quantity: targetQuantity, selected: true };

 // Lọc ra các item khác
      const otherItems = this.cartItems().filter((cartItem) => {
        if (cartItem.sku && item.sku) {
          return cartItem.sku !== item.sku;
        }
        const cartItemId = typeof cartItem.id === 'string' ? parseInt(cartItem.id) : cartItem.id;
        const itemId = typeof item.id === 'string' ? parseInt(item.id) : item.id;
        return cartItemId !== itemId;
      });

      const updatedItems = [updatedItem, ...otherItems];
      this.cartItems.set(updatedItems);

 // Update backend
      const backendItem = this.mapToBackendItem({ ...item, quantity: targetQuantity });
      this.http
        .put<any>(`${this.apiUrl}/${customerID}/update/${backendItem.sku}`, {
          quantity: targetQuantity,
        })
        .pipe(
          tap((response) => {
 console.log(' [CartService] Item quantity updated in backend:', response);
          }),
          catchError((error) => {
 console.error(' [CartService] Error updating quantity in backend:', error);
            return of(null);
          })
        )
        .subscribe();
    } else {
 // Thêm sản phẩm mới với số lượng cụ thể
      if (this.cartItems().length >= 100) {
        this.toastService.show(
          'Giỏ hàng đã đạt giới hạn tối đa 100 sản phẩm. Vui lòng xóa bớt sản phẩm trong giỏ hàng!',
          'error'
        );
        return;
      }

      const newItem = {
        ...item,
        quantity: targetQuantity,
        selected: true,
      };

 // Thêm vào frontend
      this.cartItems.set([newItem, ...this.cartItems()]);

 // Add to backend
      const backendItem = this.mapToBackendItem(newItem);
 console.log(' [CartService] Adding to cart:', backendItem);

      this.http
        .post<any>(`${this.apiUrl}/${customerID}/add`, backendItem)
        .pipe(
          tap((response) => {
 console.log(' [CartService] Item added to backend:', response);
          }),
          catchError((error) => {
 console.error(' [CartService] Error adding to backend:', error);
            return of(null);
          })
        )
        .subscribe();
    }
  }

 // Clear entire cart
  clearCart(): Observable<any> {
    const customerID = this.getCustomerID();
 console.log(' [CartService] Clearing cart for:', customerID);

 // Clear frontend state immediately
    this.cartItems.set([]);
    this.clearPromotion();

 // Return Observable để caller có thể subscribe
    return this.http.delete<any>(`${this.apiUrl}/${customerID}/clear`).pipe(
      tap((response) => {
 console.log(' [CartService] Cart cleared in backend:', response);
      }),
      catchError((error) => {
 console.error(' [CartService] Error clearing cart in backend:', error);
        return of(null);
      })
    );
  }

 // Remove multiple items from cart (used after order placement or delete selected)
  removeMultipleItems(skus: string[]): Observable<any> {
    const customerID = this.getCustomerID();
 console.log(' [CartService] Removing multiple items:', skus);

 // Remove from frontend state
    const currentItems = this.cartItems();
    const updatedItems = currentItems.filter((item) => !skus.includes(item.sku));
    this.cartItems.set(updatedItems);

 // Nếu sau khi xóa không còn items nào, clear cart thay vì gọi remove-multiple
    if (updatedItems.length === 0) {
 console.log(' [CartService] Cart will be empty after removal, using clearCart');
      return this.clearCart();
    }

 // Call backend API
    return this.http.post<any>(`${this.apiUrl}/${customerID}/remove-multiple`, { skus }).pipe(
      tap((response) => {
 console.log(` [CartService] Removed ${response.removedCount} items from backend`);
 // Update cart counts from backend response
        if (response.data) {
          this.loadCart();
        }
      }),
      catchError((error) => {
 console.error(' [CartService] Error removing items from backend:', error);
 // Keep frontend state even if backend fails
        return of(null);
      })
    );
  }

 // Sync cart to backend (useful after login)
  syncCart() {
    const customerID = this.getCustomerID();
    const items = this.cartItems().map((item) => this.mapToBackendItem(item));

 console.log(' [CartService] Syncing cart to backend:', items.length, 'items');

    this.http
      .post<any>(`${this.apiUrl}/${customerID}/sync`, { items })
      .pipe(
        tap((response) => {
 console.log(' [CartService] Cart synced to backend:', response);
        }),
        catchError((error) => {
 console.error(' [CartService] Error syncing cart:', error);
          return of(null);
        })
      )
      .subscribe();
  }
}
