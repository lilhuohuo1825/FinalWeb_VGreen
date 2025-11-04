import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { AuthPopupService } from '../../services/auth-popup.service';

// Interfaces - Khớp với MongoDB schema
interface BlogPost {
  id: string; // MongoDB: id
  img: string; // MongoDB: img
  title: string; // MongoDB: title
  excerpt: string; // MongoDB: excerpt
  pubDate: string | Date; // MongoDB: pubDate (Date)
  author: string; // MongoDB: author
  categoryTag: string; // MongoDB: categoryTag
  content: string; // MongoDB: content
  status?: string; // MongoDB: status (Active/Draft/Archived)
  views?: number; // MongoDB: views
  createdAt?: Date; // MongoDB: createdAt
  updatedAt?: Date; // MongoDB: updatedAt
}

interface Product {
  id: string;
  _id?: string;
  sku?: string;
  name: string;
  productName?: string;
  price: number; // Giá hiển thị (có thể là giá khuyến mãi)
  originalPrice?: number; // Giá gốc trước khuyến mãi (chỉ có khi có khuyến mãi)
  discountPercent?: number; // Phần trăm giảm giá
  image: string;
  images?: string[];
  unit: string;
  category?: string;
  subcategory?: string;
  rating?: number;
  purchase_count?: number;
  ReviewCount?: number;
  hasPromotion?: boolean;
  promotionType?: 'normal' | 'buy1get1' | ('normal' | 'buy1get1')[];
}

@Component({
  selector: 'app-blog-detail',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './blog-detail.html',
  styleUrls: ['./blog-detail.css'],
})
export class BlogDetail implements OnInit, OnDestroy, AfterViewInit {
  // Data properties
  currentPost: BlogPost | null = null;
  relatedProducts: Product[] = [];
  prevPost: BlogPost | null = null;
  nextPost: BlogPost | null = null;

  // State properties
  isLoading = true;
  error = '';
  postId = '';

  // Newsletter
  newsletterEmail = '';

  // Wishlist
  wishlistMap: Map<string, boolean> = new Map();

  // Scroll to top button
  showScrollButton: boolean = false;
  private scrollThreshold: number = 300;

  // View references
  @ViewChild('productsContainer') productsContainer!: ElementRef;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private productService: ProductService,
    private wishlistService: WishlistService,
    private cartService: CartService,
    private toastService: ToastService,
    private authPopupService: AuthPopupService
  ) {}

  ngOnInit(): void {
    this.loadBlogData();
    this.initScrollListener();
  }

  ngAfterViewInit(): void {
    // Initialize any view-dependent functionality
    this.applyArticleStyles();
  }

  private applyArticleStyles() {
    console.log('Applying article styles...');
    setTimeout(() => {
      const articleContent = document.querySelector('.article-content');
      console.log('Article content found:', articleContent);
      if (articleContent) {
        const h2Elements = articleContent.querySelectorAll('h2');
        const h3Elements = articleContent.querySelectorAll('h3');

        console.log('Found h2 elements:', h2Elements.length);
        console.log('Found h3 elements:', h3Elements.length);

        h2Elements.forEach((h2) => {
          (h2 as HTMLElement).style.fontFamily =
            "'SF Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          (h2 as HTMLElement).style.fontSize = '30px';
          (h2 as HTMLElement).style.fontWeight = '700';
          (h2 as HTMLElement).style.color = 'black';
          (h2 as HTMLElement).style.margin = '32px 0 16px 0';
          (h2 as HTMLElement).style.lineHeight = '1.3';
        });

        h3Elements.forEach((h3) => {
          (h3 as HTMLElement).style.fontFamily =
            "'SF Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          (h3 as HTMLElement).style.fontSize = '24px';
          (h3 as HTMLElement).style.fontWeight = '700';
          (h3 as HTMLElement).style.color = 'black';
          (h3 as HTMLElement).style.margin = '24px 0 12px 0';
          (h3 as HTMLElement).style.lineHeight = '1.4';
        });
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll);
    }
  }

  private initScrollListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  private handleScroll = (): void => {
    if (typeof window !== 'undefined') {
      const scrollY = window.scrollY || window.pageYOffset;
      this.showScrollButton = scrollY > this.scrollThreshold && scrollY > 0;
    }
  };

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }

  // Load blog data
  async loadBlogData(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = '';

      // Get post ID from route params
      this.route.params.subscribe((params) => {
        this.postId = params['id'];
        if (this.postId) {
          this.loadBlogPost(this.postId);
        } else {
          this.error = 'Không tìm thấy ID bài viết';
          this.isLoading = false;
        }
      });
    } catch (err) {
      this.error = 'Không thể tải dữ liệu bài viết';
      console.error('Error loading blog data:', err);
      this.isLoading = false;
    }
  }

  // Load specific blog post
  async loadBlogPost(postId: string): Promise<void> {
    try {
      // Load blog post từ backend API
      const response = await this.http
        .get<{ success: boolean; data: BlogPost }>(`http://localhost:3000/api/blogs/${postId}`)
        .toPromise();

      if (response && response.success && response.data) {
        console.log(' [BlogDetail] Loaded from MongoDB:', response.data.id);
        this.currentPost = response.data;

        // Load all blogs để tìm prev/next posts
        const allBlogsResponse = await this.http
          .get<{ success: boolean; data: BlogPost[] }>('http://localhost:3000/api/blogs')
          .toPromise();

        if (allBlogsResponse && allBlogsResponse.success && allBlogsResponse.data) {
          await this.loadRelatedData(allBlogsResponse.data);
        }

        this.loadRelatedProducts();

        // Set page title
        document.title = `${this.currentPost.title} - VGreen Blog`;

        this.isLoading = false;

        // Apply styles to article content after data is loaded
        setTimeout(() => this.applyArticleStyles(), 200);
      } else {
        this.error = 'Không tìm thấy bài viết';
        this.isLoading = false;
      }
    } catch (err) {
      console.error(' [BlogDetail] Error loading from backend:', err);

      // Fallback: thử load từ JSON nếu backend lỗi
      try {
        const fallbackResponse = await this.http
          .get<BlogPost[]>('../../data/blog.json')
          .toPromise();
        if (fallbackResponse) {
          console.log(' [BlogDetail] Using fallback JSON data');
          this.currentPost = fallbackResponse.find((post) => post.id === postId) || null;

          if (!this.currentPost) {
            this.error = 'Không tìm thấy bài viết';
            this.isLoading = false;
            return;
          }

          await this.loadRelatedData(fallbackResponse);
          this.loadRelatedProducts();
          document.title = `${this.currentPost.title} - VGreen Blog`;
          this.isLoading = false;
          setTimeout(() => this.applyArticleStyles(), 200);
          this.error = '';
        }
      } catch (fallbackErr) {
        this.error = 'Không thể tải bài viết';
        console.error(' [BlogDetail] Fallback also failed:', fallbackErr);
        this.isLoading = false;
      }
    }
  }

  // Load related data
  async loadRelatedData(allPosts: BlogPost[]): Promise<void> {
    if (!this.currentPost) return;

    // Find prev/next posts
    const sortedPosts = allPosts.sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );

    const currentIndex = sortedPosts.findIndex((post) => post.id === this.currentPost?.id);

    if (currentIndex > 0) {
      this.nextPost = sortedPosts[currentIndex - 1];
    }

    if (currentIndex < sortedPosts.length - 1) {
      this.prevPost = sortedPosts[currentIndex + 1];
    }
  }

  // Load related products based on category tag
  loadRelatedProducts(): void {
    if (!this.currentPost || !this.currentPost.categoryTag) {
      this.relatedProducts = [];
      return;
    }

    const categoryTag = this.currentPost.categoryTag.toLowerCase().trim();
    const apiUrl = '/api';

    // Load products, promotions, and targets in parallel
    forkJoin({
      products: this.productService.getAllProducts(),
      promotions: this.http.get<any>(`${apiUrl}/promotions`),
      targets: this.http.get<any>(`${apiUrl}/promotion-targets`),
    }).subscribe({
      next: ({ products, promotions, targets }) => {
        // Filter active promotions
        const now = new Date();
        const activePromotions = (promotions.data || []).filter((p: any) => {
          const startDate = new Date(p.start_date);
          const endDate = new Date(p.end_date);
          return p.status === 'Active' && now >= startDate && now <= endDate;
        });

        // Apply promotions to products
        const productsWithPromotions = this.applyPromotionsToProducts(
          products,
          activePromotions,
          targets?.data || []
        );

        // Filter products based on category tag
        // Check if categoryTag matches:
        // 1. Product category (case-insensitive)
        // 2. Product subcategory (case-insensitive)
        // 3. Product name contains categoryTag (case-insensitive)
        this.relatedProducts = productsWithPromotions
          .filter((product) => {
            const productCategory = (product.category || '').toLowerCase().trim();
            const productSubcategory = (product.subcategory || '').toLowerCase().trim();
            const productName = (product.product_name || '').toLowerCase().trim();

            // Check if categoryTag matches category, subcategory, or is in product name
            return (
              productCategory.includes(categoryTag) ||
              categoryTag.includes(productCategory) ||
              productSubcategory.includes(categoryTag) ||
              categoryTag.includes(productSubcategory) ||
              productName.includes(categoryTag)
            );
          })
          .map((product) => {
            // Convert ProductService format to blog-detail format
            const imageArray = Array.isArray(product.image) ? product.image : [product.image || ''];

            return {
              id: product._id || '',
              _id: product._id,
              sku: product.sku || product._id,
              name: product.product_name || '',
              productName: product.product_name,
              price: product.hasPromotion ? product.discountedPrice : product.price || 0,
              originalPrice: product.hasPromotion ? product.originalPrice : undefined,
              discountPercent: product.hasPromotion ? product.discountPercent : undefined,
              image: imageArray[0] || '',
              images: imageArray,
              unit: product.unit || '',
              category: product.category || '',
              subcategory: product.subcategory || '',
              rating: product.rating ?? 0,
              purchase_count: product.purchase_count ?? 0,
              ReviewCount: 0, // Sẽ được load từ reviews
              hasPromotion: product.hasPromotion || false,
              promotionType: product.promotionType || undefined,
            };
          })
          .slice(0, 6); // Limit to 10 products max

        console.log(
          ` Loaded ${this.relatedProducts.length} related products for category tag: "${categoryTag}"`
        );

        // Load wishlist status for related products
        this.loadWishlistStatus();

        // Load review counts for related products
        this.loadReviewCounts();
      },
      error: (error) => {
        console.error(' Error loading related products:', error);
        // Fallback: load products without promotions
        this.loadRelatedProductsWithoutPromotions(categoryTag);
      },
    });
  }

  // Fallback: Load products without promotions
  private loadRelatedProductsWithoutPromotions(categoryTag: string): void {
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.relatedProducts = products
          .filter((product) => {
            const productCategory = (product.category || '').toLowerCase().trim();
            const productSubcategory = (product.subcategory || '').toLowerCase().trim();
            const productName = (product.product_name || '').toLowerCase().trim();

            return (
              productCategory.includes(categoryTag) ||
              categoryTag.includes(productCategory) ||
              productSubcategory.includes(categoryTag) ||
              categoryTag.includes(productSubcategory) ||
              productName.includes(categoryTag)
            );
          })
          .map((product) => {
            const imageArray = Array.isArray(product.image) ? product.image : [product.image || ''];

            return {
              id: product._id || '',
              _id: product._id,
              sku: product.sku || product._id,
              name: product.product_name || '',
              productName: product.product_name,
              price: product.price || 0,
              originalPrice: undefined,
              discountPercent: undefined,
              image: imageArray[0] || '',
              images: imageArray,
              unit: product.unit || '',
              category: product.category || '',
              subcategory: product.subcategory || '',
              rating: product.rating ?? 0,
              purchase_count: product.purchase_count ?? 0,
              ReviewCount: 0,
              hasPromotion: false,
              promotionType: undefined,
            };
          })
          .slice(0, 10);

        this.loadWishlistStatus();
        this.loadReviewCounts();
      },
      error: (error) => {
        console.error(' Error loading products:', error);
        this.relatedProducts = [];
      },
    });
  }

  // Apply promotions to products
  private applyPromotionsToProducts(products: any[], promotions: any[], targets: any[]): any[] {
    return products.map((product) => {
      // Tìm tất cả promotion targets áp dụng cho product này
      const applicableTargets = targets.filter((target) => {
        return this.isProductMatchTarget(product, target);
      });

      if (applicableTargets.length === 0) {
        return { ...product, hasPromotion: false };
      }

      // Tìm tất cả promotions tương ứng
      const applicablePromotions = applicableTargets
        .map((target) => promotions.find((p) => p.promotion_id === target.promotion_id))
        .filter((p): p is any => p !== undefined);

      if (applicablePromotions.length === 0) {
        return { ...product, hasPromotion: false };
      }

      // Xác định các loại promotion (có thể có cả normal và buy1get1)
      const promotionTypes: ('normal' | 'buy1get1')[] = [];
      let normalPromotion: any = null;

      applicablePromotions.forEach((p) => {
        if (p.discount_type === 'buy1get1') {
          promotionTypes.push('buy1get1');
        } else {
          promotionTypes.push('normal');
          // Ưu tiên lưu promotion normal đầu tiên để tính giá
          if (!normalPromotion) {
            normalPromotion = p;
          }
        }
      });

      // Nếu chỉ có 1 loại, trả về string, nếu có nhiều loại trả về array
      const promotionType: 'normal' | 'buy1get1' | ('normal' | 'buy1get1')[] =
        promotionTypes.length === 1 ? promotionTypes[0] : promotionTypes;

      // Tính giá sau khuyến mãi (chỉ tính cho normal promotion, buy1get1 không giảm giá)
      let discountedPrice = product.price;
      let discountAmount = 0;
      let discountPercent = 0;

      if (normalPromotion) {
        discountedPrice = this.calculateDiscountedPrice(product.price, normalPromotion);
        discountAmount = product.price - discountedPrice;
        discountPercent = Math.round((discountAmount / product.price) * 100);
      }

      // Chọn promotion đầu tiên để hiển thị tên (ưu tiên buy1get1)
      const displayPromotion =
        applicablePromotions.find((p) => p.discount_type === 'buy1get1') || applicablePromotions[0];

      return {
        ...product,
        hasPromotion: true,
        originalPrice: product.price, // Giá gốc = price ban đầu
        discountedPrice: discountedPrice,
        discountAmount: discountAmount,
        discountPercent: discountPercent,
        promotionName: displayPromotion.name,
        promotionCode: displayPromotion.code,
        promotionType: promotionType,
      };
    });
  }

  // Check if product matches promotion target
  private isProductMatchTarget(product: any, target: any): boolean {
    const { target_type, target_ref } = target;

    switch (target_type) {
      case 'Category':
        return target_ref.includes(product.category);
      case 'Subcategory':
        return target_ref.includes(product.subcategory);
      case 'Brand':
        return target_ref.includes(product.brand);
      case 'Product':
        return target_ref.includes(product.sku);
      default:
        return false;
    }
  }

  // Calculate discounted price
  private calculateDiscountedPrice(originalPrice: number, promotion: any): number {
    if (promotion.discount_type === 'percent') {
      const discountAmount = (originalPrice * promotion.discount_value) / 100;
      const maxDiscount = promotion.max_discount_value || Infinity;
      const actualDiscount = Math.min(discountAmount, maxDiscount);
      return originalPrice - actualDiscount;
    } else if (promotion.discount_type === 'fixed') {
      return Math.max(0, originalPrice - promotion.discount_value);
    }
    return originalPrice;
  }

  // Check if there are related products to show
  hasRelatedProducts(): boolean {
    return this.relatedProducts.length > 0;
  }

  // Navigate to product detail
  goToProductDetail(product: Product): void {
    const productId = product._id || product.id;
    if (productId) {
      this.router.navigate(['/product-detail', productId]);
    }
  }

  // Add product to cart
  addToCart(product: Product, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Ngăn event bubble lên card click
    }

    // Kiểm tra user đã đăng nhập chưa
    const token = localStorage.getItem('token');
    if (!token) {
      // Mở popup đăng nhập nếu chưa đăng nhập
      this.authPopupService.openPopup('login');
      return;
    }

    // Chuyển đổi Product sang CartItem format
    // Tạo id giống product-list để đảm bảo so sánh chính xác
    const createId = (): number => {
      // Ưu tiên: sku > parseInt(_id) > parseInt(id) > Date.now()
      if (product.sku) {
        // Nếu sku là số thì dùng trực tiếp, nếu không thì parseInt
        const skuNum = parseInt(product.sku.toString().replace(/\D/g, ''));
        if (!isNaN(skuNum) && skuNum > 0) {
          return skuNum;
        }
      }
      if (product._id) {
        const parsedId = parseInt(product._id.replace(/\D/g, ''));
        if (!isNaN(parsedId) && parsedId > 0) {
          return parsedId;
        }
      }
      if (product.id) {
        const parsedId = parseInt(product.id.toString().replace(/\D/g, ''));
        if (!isNaN(parsedId) && parsedId > 0) {
          return parsedId;
        }
      }
      return Date.now();
    };

    const hasPromotion = product.hasPromotion || false;
    // Only set originalPrice when there is a promotion AND originalPrice is valid (greater than price)
    // Trong blog-detail, price đã là giá sau giảm nếu có promotion (từ map ở line 314)
    const originalPrice =
      hasPromotion && product.originalPrice && product.originalPrice > product.price
        ? product.originalPrice
        : undefined;

    const cartItem = {
      id: createId(),
      sku: product.sku || product._id || product.id,
      name: product.name || product.productName || '',
      productName: product.productName || product.name || '',
      price: product.price, // Đã là giá sau giảm nếu có promotion (từ map ở line 314)
      image: product.image || (product.images && product.images[0]) || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      unit: product.unit || '',
      selected: true,
      originalPrice: originalPrice,
      hasPromotion: hasPromotion,
    };

    // Thêm vào giỏ hàng thông qua CartService
    // Toast sẽ được hiển thị tự động từ CartService
    this.cartService.addToCart(cartItem);
    console.log(' Added to cart:', cartItem.name);
  }

  // Expose Math for template
  Math = Math;

  // Get customerID from localStorage
  private getCustomerID(): string {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return 'guest';
    }
    try {
      const userData = JSON.parse(userStr);
      return userData.CustomerID || userData._id || 'guest';
    } catch (error) {
      console.error('Error parsing user data:', error);
      return 'guest';
    }
  }

  // Load wishlist status for related products
  loadWishlistStatus(): void {
    const customerID = this.getCustomerID();
    if (customerID === 'guest') {
      return; // Guest không có wishlist
    }

    this.relatedProducts.forEach((product) => {
      const sku = product.sku || product._id || product.id;
      if (!sku) return;

      this.wishlistService.isInWishlist(customerID, sku).subscribe({
        next: (isInWishlist) => {
          this.wishlistMap.set(sku, isInWishlist);
        },
      });
    });
  }

  // Load review counts for related products
  loadReviewCounts(): void {
    this.relatedProducts.forEach((product) => {
      const sku = product.sku || product._id || product.id;
      if (!sku) return;

      // Load reviews count from API
      this.http.get<any>(`/api/reviews/${sku}`).subscribe({
        next: (response) => {
          if (response.success && response.data && response.data.reviews) {
            product.ReviewCount = response.data.reviews.length;
            // Update rating if reviews exist
            if (response.data.reviews.length > 0) {
              const totalRating = response.data.reviews.reduce(
                (sum: number, review: any) => sum + (review.rating || 0),
                0
              );
              product.rating = Math.round((totalRating / response.data.reviews.length) * 10) / 10;
            }
          } else {
            product.ReviewCount = 0;
          }
        },
        error: () => {
          product.ReviewCount = 0;
        },
      });
    });
  }

  // Toggle wishlist
  toggleWishlist(product: Product, event: Event): void {
    event.stopPropagation();

    // Kiểm tra user đã đăng nhập chưa
    const token = localStorage.getItem('token');
    if (!token) {
      // Mở popup đăng nhập nếu chưa đăng nhập
      this.authPopupService.openPopup('login');
      return;
    }

    const customerID = this.getCustomerID();
    const sku = product.sku || product._id || product.id;

    if (customerID === 'guest') {
      // Mở popup đăng nhập nếu là guest
      this.authPopupService.openPopup('login');
      return;
    }

    if (!sku) {
      console.error('No SKU found for product:', product);
      return;
    }

    // Toggle local state immediately for better UX
    const currentState = this.wishlistMap.get(sku) || false;
    this.wishlistMap.set(sku, !currentState);

    // Call API
    const productName = product.productName || product.name;
    if (currentState) {
      // Remove from wishlist
      this.wishlistService.removeFromWishlist(customerID, sku).subscribe({
        error: () => {
          // Rollback on error
          this.wishlistMap.set(sku, currentState);
        },
      });
    } else {
      // Add to wishlist
      this.wishlistService.addToWishlist(customerID, sku, productName).subscribe({
        error: () => {
          // Rollback on error
          this.wishlistMap.set(sku, currentState);
        },
      });
    }
  }

  // Check if product is in wishlist
  isInWishlist(product: Product): boolean {
    const sku = product.sku || product._id || product.id;
    if (!sku) return false;
    return this.wishlistMap.get(sku) || false;
  }

  // Format rating to 1 decimal place
  formatRating(rating: number | undefined | null): string {
    if (!rating || rating === 0) {
      return '0.0';
    }
    return rating.toFixed(1);
  }

  // Check if product has reviews
  hasReviews(product: Product): boolean {
    const rating = product.rating ?? 0;
    const reviewCount = product.ReviewCount ?? 0;
    // Có reviews nếu có rating > 0 hoặc reviewCount > 0
    return rating > 0 || reviewCount > 0;
  }

  // Get purchase count formatted
  getPurchaseCount(product: Product): string {
    const purchaseCount = product.purchase_count ?? 0;
    return purchaseCount.toLocaleString('vi-VN');
  }

  /**
   * Kiểm tra xem sản phẩm có khuyến mãi Mua 1 tặng 1 không
   */
  hasBuy1Get1Promotion(product: Product): boolean {
    if (!product.hasPromotion || !product.promotionType) {
      return false;
    }
    if (Array.isArray(product.promotionType)) {
      return product.promotionType.includes('buy1get1');
    }
    return product.promotionType === 'buy1get1';
  }

  // Format date - Xử lý cả Date object và string
  formatDate(dateInput: string | Date | undefined): string {
    if (!dateInput) return '';

    let date: Date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return '';
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Format price
  formatPrice(price: number): string {
    return (
      price.toLocaleString('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }) + '₫'
    );
  }

  // Navigate to post
  navigateToPost(postId: string): void {
    this.router.navigate(['/blog', postId]);
  }

  // Subscribe to newsletter
  subscribeNewsletter(): void {
    if (!this.newsletterEmail) {
      alert('Vui lòng nhập email');
      return;
    }

    // In real app, this would be an API call
    console.log('Newsletter subscription:', this.newsletterEmail);
    alert('Đăng ký nhận tin thành công!');
    this.newsletterEmail = '';
  }

  // Share post
  sharePost(platform: string): void {
    if (!this.currentPost) return;

    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(this.currentPost.title);
    const text = encodeURIComponent(this.currentPost.excerpt);

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }

  // Copy link
  copyLink(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.toastService.show('Đã sao chép link thành công!');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.toastService.show('Đã sao chép link thành công!');
    }
  }

  // Scroll products carousel
  scrollProducts(direction: 'prev' | 'next'): void {
    if (!this.productsContainer) return;

    const container = this.productsContainer.nativeElement;
    const scrollAmount = 245; // Width of one product card (220px) + gap (25px)

    if (direction === 'prev') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  // Image loading handlers
  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '1';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/400x300?text=No+Image';
  }

  // Back to blog
  backToBlog(): void {
    this.router.navigate(['/blog']);
  }
}
