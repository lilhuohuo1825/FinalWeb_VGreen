import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin, fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { AuthPopupService } from '../../services/auth-popup.service';

interface Product {
  _id: string;
  Category: string;
  Subcategory: string;
  ProductName: string;
  Brand: string;
  Unit: string;
  Price: number;
  Image: string[]; // Đổi từ string sang string[] (array of images)
  sku: string; // lowercase để match với product.json
  Origin: string;
  Weight: string;
  Ingredients: string;
  Usage: string;
  Storage: string;
  ManufactureDate: string;
  ExpiryDate: string;
  Producer: string;
  SafetyWarning: string;
  ResponsibleOrg: string;
  Color: any;
  Rating?: number;
  Promotion?: string;
  OriginalPrice?: number;
  Discount?: number;
  ReviewCount?: number;
  Reviews?: any[];
  PurchaseCount?: number; // Thêm trường purchase_count
  PostDate?: string; // Thêm trường post_date
  hasPromotion?: boolean;
  discountedPrice?: number;
  discountPercent?: number;
  promotionType?: 'normal' | 'buy1get1' | ('normal' | 'buy1get1')[]; // Loại khuyến mãi: có thể là 1 loại hoặc mảng các loại
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: 'product-list.html',
  styleUrl: 'product-list.css',
})
export class ProductListComponent implements OnInit, AfterViewInit, OnDestroy {
  // -----------------------------
  // 🎯 ViewChild References
  // -----------------------------
  @ViewChild('filtersContainer') filtersContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('sidebar') sidebar!: ElementRef<HTMLDivElement>;
  @ViewChild('productMainContent') productMainContent!: ElementRef<HTMLDivElement>;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // -----------------------------
  // 🧱 Cấu trúc dữ liệu chính
  // -----------------------------
  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  sortOption: string = 'price-low';
  categorySort: string = 'name';
  priceSort: string = 'price-low';
  isLoading: boolean = true;
  hasError: boolean = false;
  itemsPerPage: number = 24;
  hasMoreProducts: boolean = true;

  // -----------------------------
  // 🎯 Scroll to Top Properties
  // -----------------------------
  showScrollButton: boolean = false;
  private scrollThreshold: number = 300; // Hiển thị button sau khi scroll 300px

  // -----------------------------
  //  Mobile Sidebar Properties
  // -----------------------------
  isMobileSidebarOpen: boolean = false;

  // -----------------------------
  // 🧩 Bộ lọc
  // -----------------------------
  selectedCategories: string[] = [];
  selectedSubcategories: string[] = [];
  selectedPromotions: string[] = [];
  selectedColors: string[] = [];
  selectedRating: number | null = null;

  //  Các biến thanh trượt giá
  minPrice: number = 0;
  maxPrice: number = 1000000;
  priceRange: number[] = [0, 1000000];
  actualMaxPrice: number = 1000000; // Max price của products hiện tại
  initialMinPrice: number = 0; // Giá min ban đầu để so sánh
  initialMaxPrice: number = 1000000; // Giá max ban đầu để so sánh

  // -----------------------------
  // 🧰 Dữ liệu lựa chọn có sẵn
  // -----------------------------
  categories: string[] = [];
  subcategories: string[] = [];
  promotions: string[] = ['Giảm giá', 'Mua 1 tặng 1'];
  colors: string[] = [];
  ratings: number[] = [5, 4, 3, 2, 1];

  // -----------------------------
  // 🧭 Trạng thái hiển thị
  // -----------------------------
  currentView: 'categories' | 'subcategories' = 'categories';
  currentCategory: string = '';
  currentSubcategory: string = '';
  breadcrumb: string[] = ['Trang chủ', 'Sản phẩm'];
  searchQuery: string = ''; // Từ khóa tìm kiếm từ URL

  // -----------------------------
  // 📁 Giao diện điều khiển mở rộng
  // -----------------------------
  expandedSections: { [key: string]: boolean } = {
    price: true,
    rating: true,
    promotion: true,
    color: true,
    brand: true,
  };

  // -----------------------------
  //  Các bộ lọc đang hoạt động
  // -----------------------------
  activeFilters: Array<{ type: string; value: string; label: string }> = [];

  // -----------------------------
  // 🎯 Favorite Properties
  // -----------------------------
  favoriteProducts: string[] = [];

  // -----------------------------
  // 🎯 Promotion Box Properties
  // -----------------------------
  currentBoxIndex: number = 0;
  totalBoxes: number = 6;

  // -----------------------------
  // 🎯 Khởi tạo
  // -----------------------------
  private apiUrl = '/api'; // Use proxy configuration

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private authService: AuthService,
    private productService: ProductService,
    private authPopupService: AuthPopupService
  ) {}

  ngOnInit(): void {
    console.log('ProductListComponent ngOnInit - Starting to load products');
    console.log('Initial state - isLoading:', this.isLoading, 'hasError:', this.hasError);
    this.loadProducts();
    this.loadFavoriteProducts();
    // handleQueryParams() will be called after products are loaded

    //  Thêm scroll listener
    this.initScrollListener();
  }

  ngAfterViewInit(): void {
    // Set sidebar height based on product grid
    this.updateSidebarHeight();

    // Re-check on window resize and when products change
    const resizeSub = fromEvent(window, 'resize')
      .pipe(debounceTime(200))
      .subscribe(() => this.updateSidebarHeight());

    this.subscriptions.push(resizeSub);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());

    //  Cleanup scroll listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleScroll);
    }
  }

  // -----------------------------
  // 🎯 Sidebar Height Management
  // -----------------------------
  private updateSidebarHeight(): void {
    if (!this.sidebar || !this.productMainContent) {
      console.log(' updateSidebarHeight: sidebar or productMainContent not found', {
        sidebar: !!this.sidebar,
        productMainContent: !!this.productMainContent,
      });
      return;
    }

    const sidebarElement = this.sidebar.nativeElement;
    const mainContentElement = this.productMainContent.nativeElement;

    // Get the actual height of the product main content (includes banner + grid + etc.)
    const mainContentHeight = mainContentElement.offsetHeight;

    console.log('📏 updateSidebarHeight called - Main content height:', mainContentHeight);

    if (mainContentHeight > 0) {
      // Set sidebar max-height to match main content height
      sidebarElement.style.maxHeight = `${mainContentHeight}px`;
      console.log(' Sidebar max-height set to:', mainContentHeight, 'px');
    } else {
      // Fallback to viewport height if main content not loaded yet
      sidebarElement.style.maxHeight = 'calc(100vh - 40px)';
      console.log(' Main content height is 0, using viewport fallback');
    }
  }

  // -----------------------------
  // 🎯 Scroll Handling Methods
  // -----------------------------
  private initScrollListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  private handleScroll = (): void => {
    if (typeof window !== 'undefined') {
      // Hiển thị button khi scroll xuống > threshold
      const scrollY = window.scrollY || window.pageYOffset;
      // Hiển thị button khi scroll > threshold, ẩn khi ở đầu trang (scrollY <= 0)
      this.showScrollButton = scrollY > this.scrollThreshold && scrollY > 0;
    }
  };

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      // Smooth scroll lên đầu trang
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }

  // -----------------------------
  //  Mobile Sidebar Methods
  // -----------------------------
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    if (this.isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
    document.body.style.overflow = '';
  }

  onOverlayClick(): void {
    this.closeMobileSidebar();
  }

  // -----------------------------
  //  Xử lý Query Parameters
  // -----------------------------
  handleQueryParams(): void {
    this.route.queryParams.subscribe((params) => {
      console.log('Query params received:', params);

      //  Check for search parameter - Priority check
      if (params['search']) {
        this.searchQuery = params['search'];
        this.breadcrumb = ['Trang chủ', 'Sản phẩm', `Kết quả tìm kiếm: "${this.searchQuery}"`];
        this.currentView = 'categories';
        this.currentCategory = '';
        this.currentSubcategory = '';
        this.selectedCategories = [];
        this.selectedSubcategories = [];
        console.log(' Search query set to:', this.searchQuery);

        // Apply filters with search query
        setTimeout(() => {
          this.applyFilters();
          this.updatePageTitle();
        }, 100);
        return; // Don't process other params when searching
      } else {
        // Clear search query if not present
        this.searchQuery = '';
      }

      //  Check for sort parameter
      if (params['sort']) {
        const sortValue = params['sort'];
        if (sortValue === 'newest' || sortValue === 'bestseller') {
          this.categorySort = sortValue;
          console.log(' Sort set to:', sortValue);
        }
      }

      //  Check for promotion filter parameter
      if (params['promotion']) {
        const promotionValue = params['promotion'];
        if (promotionValue === 'true') {
          this.selectedPromotions = ['Giảm giá'];
          console.log(' Promotion filter enabled');
        }
      }

      if (params['category']) {
        const category = this.convertSlugToCategory(params['category']);
        console.log(' Query param - category slug:', params['category']);
        console.log(' Converted to category:', category);
        this.currentCategory = category;
        this.currentView = 'subcategories'; // Hiển thị subcategories view
        this.breadcrumb = ['Trang chủ', 'Sản phẩm', category];
        this.selectedCategories = [category];

        if (params['subcategory']) {
          const subcategory = this.convertSlugToSubcategory(params['subcategory']);
          console.log(' Query param - subcategory slug:', params['subcategory']);
          console.log(' Converted to subcategory:', subcategory);
          this.currentSubcategory = subcategory;
          this.breadcrumb = ['Trang chủ', 'Sản phẩm', category, subcategory];
          this.selectedSubcategories = [subcategory];
        } else {
          // Chọn "Tất cả sản phẩm" - không filter theo subcategory
          this.currentSubcategory = '';
          this.selectedSubcategories = [];
        }

        // Apply filters after products are loaded
        setTimeout(() => {
          this.updateSubcategories();
          this.updateSortOption();
          this.applyFilters();
          this.updatePageTitle();
        }, 100);
      } else {
        // Không có query parameters - hiển thị trang product-list thông thường
        this.currentView = 'categories';
        this.currentCategory = '';
        this.currentSubcategory = '';
        this.breadcrumb = ['Trang chủ', 'Sản phẩm'];
        this.selectedCategories = [];
        this.selectedSubcategories = [];

        // Apply filters
        setTimeout(() => {
          this.updateSubcategories();
          this.updateSortOption();
          this.applyFilters();
          this.updatePageTitle();
        }, 100);
      }
    });
  }

  convertSlugToCategory(slug: string): string {
    const categoryMap: { [key: string]: string } = {
      'rau-cu': 'Rau củ',
      'rau-củ': 'Rau củ',
      'trai-cay': 'Trái cây',
      'trái-cây': 'Trái cây',
      'luong-thuc-ngu-coc': 'Lương thực - ngũ cốc',
      'lương-thực---ngũ-cốc': 'Lương thực - ngũ cốc',
      'thuc-pham-kho': 'Thực phẩm khô',
      'thực-phẩm-khô': 'Thực phẩm khô',
      'tra-thao-moc': 'Trà xanh',
      'trà-xanh': 'Trà xanh',
      'ca-phe-cacao': 'Cà phê, Cacao',
      'cà-phê,-cacao': 'Cà phê, Cacao',
      'thuc-pham-boi-bo': 'Thực phẩm bồi bổ',
      'thực-phẩm-bồi-bổ': 'Thực phẩm bồi bổ',
      'rong-bien': 'Rong biển',
      'rong-biển': 'Rong biển',
    };

    console.log(' convertSlugToCategory - input:', slug);
    const result = categoryMap[slug] || slug.replace(/-/g, ' ');
    console.log(' convertSlugToCategory - output:', result);
    return result;
  }

  convertSlugToSubcategory(slug: string): string {
    console.log(' convertSlugToSubcategory - input:', slug);

    // If products are already loaded, dynamically create slug mapping from actual subcategories
    if (this.products && this.products.length > 0) {
      const uniqueSubcategories = [...new Set(this.products.map((p) => p.Subcategory))];

      // Try to match the slug with actual subcategories
      for (const subcat of uniqueSubcategories) {
        const subcatSlug = this.createSlug(subcat);
        if (subcatSlug === slug) {
          console.log(' convertSlugToSubcategory - output (dynamic):', subcat);
          return subcat;
        }
      }
    }

    // Fallback: return slug with hyphens replaced by spaces and capitalized
    const result = slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    console.log(' convertSlugToSubcategory - output (fallback):', result);
    return result;
  }

  /**
   * Create URL-friendly slug from Vietnamese text
   * Removes accents and special characters, converts to lowercase, replaces spaces with hyphens
   */
  private createSlug(text: string): string {
    return this.removeVietnameseAccents(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Remove Vietnamese accents/diacritics
   */
  private removeVietnameseAccents(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  // -----------------------------
  //  Tải dữ liệu
  // -----------------------------
  loadProducts(): void {
    console.log('loadProducts() called - Fetching from MongoDB API');
    this.hasError = false; // Reset error state

    // Load products, promotions, and targets in parallel
    forkJoin({
      products: this.productService.getAllProducts(),
      promotions: this.http.get<any>(`${this.apiUrl}/promotions`),
      targets: this.http.get<any>(`${this.apiUrl}/promotion-targets`),
    }).subscribe({
      next: ({ products, promotions, targets }) => {
        console.log(' API request successful - Raw data length:', products.length);

        // Filter active promotions
        const now = new Date();
        const allPromotions = promotions.data || [];
        console.log(` Tổng số promotions từ API: ${allPromotions.length}`);

        const activePromotions = allPromotions.filter((p: any) => {
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

        // Chuẩn hóa tên trường: MongoDB trả về snake_case, frontend dùng PascalCase
        this.products = productsWithPromotions.map((p) => ({
          _id: p._id,
          ProductName: p.product_name ?? '',
          Category: p.category ?? '',
          Subcategory: p.subcategory ?? '',
          Brand: p.brand ?? '',
          Unit: p.unit ?? '',
          Price: p.hasPromotion ? p.discountedPrice : p.price ?? 0,
          Image: Array.isArray(p.image) ? p.image : [p.image || ''],
          sku: p.sku ?? '',
          Origin: p.origin ?? '',
          Weight: p.weight ?? '',
          Ingredients: p.ingredients ?? '',
          Usage: p.usage ?? '',
          Storage: p.storage ?? '',
          ManufactureDate: p.manufacture_date ?? '',
          ExpiryDate: p.expiry_date ?? '',
          Producer: p.producer ?? '',
          SafetyWarning: p.safety_warning ?? '',
          ResponsibleOrg: '',
          Color: p.color,
          Rating: p.rating ?? 0,
          Promotion: undefined,
          OriginalPrice: p.hasPromotion ? p.originalPrice : p.base_price,
          Discount: p.hasPromotion ? p.discountPercent : undefined,
          ReviewCount: 0,
          Reviews: [],
          PurchaseCount: p.purchase_count ?? 0,
          PostDate: p.post_date?.$date ?? p.post_date ?? '',
          hasPromotion: p.hasPromotion || false,
          discountedPrice: p.hasPromotion ? p.discountedPrice : undefined,
          discountPercent: p.hasPromotion ? p.discountPercent : undefined,
          promotionType: p.promotionType || undefined,
        }));

        // Debug: Kiểm tra promotionType sau khi map
        const buy1get1AfterMap = this.products.filter((p) => {
          if (Array.isArray(p.promotionType)) {
            return p.promotionType.includes('buy1get1');
          }
          return p.promotionType === 'buy1get1';
        });
        const multiplePromotionsAfterMap = this.products.filter((p) => {
          return Array.isArray(p.promotionType) && p.promotionType.length > 1;
        });
        console.log(
          `🎁 [MAP CHECK] Sản phẩm có promotionType = 'buy1get1' sau khi map: ${buy1get1AfterMap.length}`
        );
        console.log(
          `🎁 [MAP CHECK] Sản phẩm có nhiều promotions sau khi map: ${multiplePromotionsAfterMap.length}`
        );
        if (buy1get1AfterMap.length > 0) {
          console.log(
            '   Danh sách buy1get1:',
            buy1get1AfterMap
              .slice(0, 3)
              .map((p) => `${p.ProductName} (${p.sku}) - type: ${JSON.stringify(p.promotionType)}`)
          );
        }
        if (multiplePromotionsAfterMap.length > 0) {
          console.log(
            '   Danh sách multiple promotions:',
            multiplePromotionsAfterMap
              .slice(0, 3)
              .map((p) => `${p.ProductName} (${p.sku}) - types: ${JSON.stringify(p.promotionType)}`)
          );
        }
        console.log(' Mapped products:', this.products.length);
        this.initializeFilterOptions();
        this.filteredProducts = [...this.products];
        this.sortProducts();
        this.updatePagination();
        this.isLoading = false;
        this.loadPromotionProducts();
        console.log(
          ' Final state - Products:',
          this.products.length,
          'Filtered:',
          this.filteredProducts.length,
          'Displayed:',
          this.displayedProducts.length
        );
        console.log(' Categories:', this.categories);

        // Debug: Show unique categories and subcategories from loaded data
        const uniqueCategories = [...new Set(this.products.map((p) => p.Category))];
        const uniqueSubcategories = [...new Set(this.products.map((p) => p.Subcategory))];
        console.log(' Unique categories in data:', uniqueCategories);
        console.log('Unique subcategories in data:', uniqueSubcategories.slice(0, 20));

        // Handle query parameters after products are loaded
        this.handleQueryParams();
      },
      error: (error) => {
        console.error(' API request failed:', error);
        this.isLoading = false;
        this.hasError = true;
        this.products = [];
        this.filteredProducts = [];
        console.log('💥 Error state - hasError:', this.hasError, 'isLoading:', this.isLoading);
      },
    });
  }

  // -----------------------------
  //  Sắp xếp & Phân trang
  // -----------------------------
  sortProducts(): void {
    switch (this.sortOption) {
      case 'price-low':
        this.filteredProducts.sort((a, b) => a.Price - b.Price);
        break;
      case 'price-high':
        this.filteredProducts.sort((a, b) => b.Price - a.Price);
        break;
      case 'brand':
        this.filteredProducts.sort((a, b) => a.Brand.localeCompare(b.Brand));
        break;
      case 'newest':
        // Sắp xếp theo ngày đăng sản phẩm (post_date) giảm dần (mới nhất lên đầu)
        this.filteredProducts.sort((a, b) => {
          const dateA = a.PostDate ? new Date(a.PostDate).getTime() : 0;
          const dateB = b.PostDate ? new Date(b.PostDate).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'bestseller':
        // Sắp xếp theo lượt mua giảm dần (cao nhất lên đầu)
        this.filteredProducts.sort((a, b) => (b.PurchaseCount || 0) - (a.PurchaseCount || 0));
        break;
      default:
        this.filteredProducts.sort((a, b) => a.ProductName.localeCompare(b.ProductName));
    }

    console.log(' Filtered products:', this.filteredProducts.length);
    if (this.filteredProducts.length > 0 && this.filteredProducts.length <= 5) {
      console.log(' Sample products:');
      this.filteredProducts.slice(0, 5).forEach((p) => {
        console.log(
          `   - ${p.ProductName} (${p.Category} > ${p.Subcategory}) - Lượt mua: ${
            p.PurchaseCount || 0
          }`
        );
      });
    }

    // Log thêm thông tin khi sort theo bestseller
    if (this.sortOption === 'bestseller' && this.filteredProducts.length > 0) {
      console.log('Top 3 bán chạy nhất:');
      this.filteredProducts.slice(0, 3).forEach((p, index) => {
        console.log(`   ${index + 1}. ${p.ProductName} - Lượt mua: ${p.PurchaseCount || 0}`);
      });
    }

    // Log thêm thông tin khi sort theo newest
    if (this.sortOption === 'newest' && this.filteredProducts.length > 0) {
      console.log('Top 3 sản phẩm mới nhất:');
      this.filteredProducts.slice(0, 3).forEach((p, index) => {
        const postDate = p.PostDate ? new Date(p.PostDate).toLocaleDateString('vi-VN') : 'N/A';
        console.log(`   ${index + 1}. ${p.ProductName} - Ngày đăng: ${postDate}`);
      });
    }

    this.updateDisplayedProducts();
  }

  updatePagination(): void {
    this.itemsPerPage = 24;
    this.updateDisplayedProducts();
  }

  updateDisplayedProducts(): void {
    this.displayedProducts = this.filteredProducts.slice(0, this.itemsPerPage);
    this.hasMoreProducts = this.filteredProducts.length > this.itemsPerPage;

    //  Update sidebar height after products are rendered - use requestAnimationFrame for accurate measurement
    requestAnimationFrame(() => {
      setTimeout(() => this.updateSidebarHeight(), 0);
    });

    console.log(
      'Updated displayed products:',
      this.displayedProducts.length,
      'from',
      this.filteredProducts.length,
      'filtered products'
    );
    console.log('First displayed product:', this.displayedProducts[0]?.ProductName || 'None');
  }

  // -----------------------------
  // 🧠 Áp dụng lọc
  // -----------------------------
  applyFilters(): void {
    console.log(' applyFilters() called');
    console.log(' Selected categories:', this.selectedCategories);
    console.log('📁 Selected subcategories:', this.selectedSubcategories);
    console.log('🔎 Search query:', this.searchQuery);
    console.log(' Total products before filter:', this.products.length);

    let categoryMatchCount = 0;
    let subcategoryMatchCount = 0;

    this.filteredProducts = this.products.filter((p) => {
      // Search query filter (filter by product name) - Priority filter
      if (this.searchQuery && this.searchQuery.trim() !== '') {
        const productName = (p.ProductName || '').toLowerCase();
        const query = this.searchQuery.toLowerCase().trim();
        if (!productName.includes(query)) {
          return false;
        }
      }

      // Category filter
      if (this.selectedCategories.length > 0) {
        const categoryMatches = this.selectedCategories.includes(p.Category);
        if (!categoryMatches) {
          return false;
        }
        categoryMatchCount++;
      }

      // Subcategory filter
      if (this.selectedSubcategories.length > 0) {
        const subcategoryMatches = this.selectedSubcategories.includes(p.Subcategory);
        if (!subcategoryMatches) {
          // Debug: log first 3 mismatches
          if (subcategoryMatchCount < 3) {
            console.log(' Subcategory mismatch:');
            console.log('   Expected:', this.selectedSubcategories[0]);
            console.log('   Got:', p.Subcategory);
            console.log('   Category:', p.Category);
            console.log('   Product:', p.ProductName);
          }
          return false;
        }
        subcategoryMatchCount++;
      }

      // Promotion filter - kiểm tra promotionType (hỗ trợ cả string và array)
      if (this.selectedPromotions.length > 0) {
        const hasDiscountFilter = this.selectedPromotions.includes('Giảm giá');
        const hasBuy1Get1Filter = this.selectedPromotions.includes('Mua 1 tặng 1');

        // Kiểm tra promotionType là array hay string
        const hasNormalPromo = Array.isArray(p.promotionType)
          ? p.promotionType.includes('normal')
          : p.promotionType === 'normal';
        const hasBuy1Get1Promo = Array.isArray(p.promotionType)
          ? p.promotionType.includes('buy1get1')
          : p.promotionType === 'buy1get1';

        // Nếu chọn "Giảm giá" - hiển thị sản phẩm có promotionType là 'normal'
        // Nếu chọn "Mua 1 tặng 1" - hiển thị sản phẩm có promotionType là 'buy1get1'
        if (hasDiscountFilter && hasBuy1Get1Filter) {
          // Chọn cả 2: hiển thị tất cả sản phẩm có promotion
          if (!p.hasPromotion) {
            return false;
          }
        } else if (hasDiscountFilter) {
          // Chỉ chọn "Giảm giá"
          if (!p.hasPromotion || !hasNormalPromo) {
            return false;
          }
        } else if (hasBuy1Get1Filter) {
          // Chỉ chọn "Mua 1 tặng 1"
          if (!p.hasPromotion || !hasBuy1Get1Promo) {
            return false;
          }
        } else {
          // Không khớp với bất kỳ filter nào
          return false;
        }
      }

      // Color filter - hỗ trợ sản phẩm có nhiều màu
      if (!this.productMatchesColorFilter(p)) {
        return false;
      }

      // Rating filter
      if (this.selectedRating !== null) {
        if (!p.Rating || p.Rating < this.selectedRating) {
          return false;
        }
      }

      // Price filter
      if (p.Price < this.minPrice || p.Price > this.maxPrice) {
        return false;
      }

      return true;
    });

    console.log(' Category matches:', categoryMatchCount);
    console.log(' Subcategory matches:', subcategoryMatchCount);
    console.log(' Total filtered products:', this.filteredProducts.length);

    this.updateActiveFilters();
    this.sortProducts();
    this.updatePagination();
  }

  initializeFilterOptions(): void {
    // Load categories from product.json
    this.categories = [...new Set(this.products.map((p) => p.Category))].sort();
    this.updateSubcategories();

    // Initialize price range based on actual product prices (min is 0)
    const prices = this.products.map((p) => p.Price);
    this.minPrice = 0;
    this.maxPrice = Math.max(...prices);
    this.actualMaxPrice = Math.max(...prices);
    this.priceRange = [this.minPrice, this.maxPrice];

    // Promotions are already set as default values, no need to load from product.json

    // Load colors from product.json
    const allColors = this.products
      .map((p) => p.Color)
      .filter((color) => {
        // Chỉ lấy color là string và không phải 'NaN'
        if (!color) return false;
        if (typeof color === 'object') return false; // Skip { "$numberDouble": "NaN" }
        if (typeof color !== 'string') return false;
        if (color === 'NaN' || color.trim() === '') return false;
        return true;
      })
      .flatMap((color) => color.split(',').map((c: string) => c.trim()))
      .filter((color) => color.length > 0);

    this.colors = [...new Set(allColors)].sort();
    this.ratings = [5, 4, 3, 2, 1];

    console.log('Filter options initialized:');
    console.log('- Categories:', this.categories);
    console.log('- Promotions:', this.promotions);
    console.log('- Colors:', this.colors);
    console.log(
      '- Sample products with colors:',
      this.products
        .filter((p) => p.Color && typeof p.Color === 'string' && p.Color !== 'NaN')
        .slice(0, 5)
        .map((p) => ({ name: p.ProductName, color: p.Color }))
    );
    console.log('- Price range:', this.minPrice, '-', this.maxPrice);
  }

  updateSubcategories(): void {
    if (this.currentCategory) {
      this.subcategories = [
        ...new Set(
          this.products.filter((p) => p.Category === this.currentCategory).map((p) => p.Subcategory)
        ),
      ].sort();
      console.log('Subcategories for', this.currentCategory, ':', this.subcategories);
    } else {
      this.subcategories = [...new Set(this.products.map((p) => p.Subcategory))].sort();
    }

    // Update price range based on current category/subcategory selection
    this.updatePriceRange();
  }

  updatePriceRange(): void {
    let productsToCheck = this.products;

    // Filter by category if selected
    if (this.currentCategory) {
      productsToCheck = productsToCheck.filter((p) => p.Category === this.currentCategory);

      // Filter by subcategory if selected
      if (this.currentSubcategory) {
        productsToCheck = productsToCheck.filter((p) => p.Subcategory === this.currentSubcategory);
      }
    }

    // Calculate max price from filtered products (min stays at 0)
    if (productsToCheck.length > 0) {
      const prices = productsToCheck.map((p) => p.Price);
      const newMaxPrice = Math.max(...prices);

      // Only update if we have valid prices
      if (!isNaN(newMaxPrice)) {
        this.minPrice = 0;
        this.maxPrice = newMaxPrice;
        this.actualMaxPrice = newMaxPrice;
        this.priceRange = [this.minPrice, this.maxPrice];

        // Lưu giá ban đầu để so sánh
        this.initialMinPrice = 0;
        this.initialMaxPrice = newMaxPrice;

        console.log(' Updated price range:', this.minPrice, '-', this.maxPrice);
      }
    }
  }

  // -----------------------------
  // 💰 Thanh chọn khoảng giá (Range Slider)
  // -----------------------------
  onMinSliderChange(event: any): void {
    const newMin = parseInt(event.target.value);
    // Prevent min from exceeding max
    if (newMin >= this.maxPrice) {
      this.minPrice = Math.max(0, this.maxPrice - 1000);
    } else {
      this.minPrice = newMin;
    }
    this.priceRange[0] = this.minPrice;
    // Force update the slider value to prevent cross-over
    event.target.value = this.minPrice;
    this.applyFilters();
  }

  onMaxSliderChange(event: any): void {
    const newMax = parseInt(event.target.value);
    // Limit to actualMaxPrice
    const clampedMax = Math.min(newMax, this.actualMaxPrice);
    // Prevent max from going below min
    if (clampedMax <= this.minPrice) {
      this.maxPrice = Math.min(this.actualMaxPrice, this.minPrice + 1000);
    } else {
      this.maxPrice = clampedMax;
    }
    this.priceRange[1] = this.maxPrice;
    // Force update the slider value to prevent cross-over
    event.target.value = this.maxPrice;
    this.applyFilters();
  }

  onMinInputChange(event: any): void {
    const value = this.parseCurrency(event.target.value);
    if (value <= this.maxPrice) {
      this.minPrice = value;
    } else {
      this.minPrice = this.maxPrice;
    }
    this.priceRange[0] = this.minPrice;
    event.target.value = this.formatPrice(this.minPrice);
    this.applyFilters();
  }

  onMaxInputChange(event: any): void {
    const value = this.parseCurrency(event.target.value);
    // Limit to actualMaxPrice
    const clampedMax = Math.min(value, this.actualMaxPrice);
    if (clampedMax >= this.minPrice) {
      this.maxPrice = clampedMax;
    } else {
      this.maxPrice = this.minPrice;
    }
    this.priceRange[1] = this.maxPrice;
    event.target.value = this.formatPrice(this.maxPrice);
    this.applyFilters();
  }

  getSliderLeft(): number {
    return (this.minPrice / this.actualMaxPrice) * 100;
  }

  getSliderRight(): number {
    return 100 - (this.maxPrice / this.actualMaxPrice) * 100;
  }

  // Format rating to always show 1 decimal place (e.g., 3.0, 4.5, 5.0)
  formatRating(rating: number | undefined | null): string {
    if (!rating || rating === 0) {
      return '0.0';
    }
    return rating.toFixed(1);
  }

  formatPrice(value: number): string {
    return value.toLocaleString('vi-VN') + '₫';
  }

  parseCurrency(value: string): number {
    return parseInt(value.replace(/[₫.]/g, '')) || 0;
  }

  // -----------------------------
  // 🧭 Navigation methods
  // -----------------------------
  onCategoryClick(category: string): void {
    this.currentCategory = category;
    this.currentView = 'subcategories';
    this.breadcrumb = ['Trang chủ', 'Sản phẩm', category];
    this.selectedCategories = [category];
    this.updateSubcategories();
    // Update brands based on selected category
    this.applyFilters();
    console.log('Clicked category:', category);
    console.log('Current view:', this.currentView);
    console.log('Subcategories loaded:', this.subcategories);
  }

  onSubcategoryClick(subcategory: string, event?: any): void {
    this.currentSubcategory = subcategory;
    this.breadcrumb = ['Trang chủ', 'Sản phẩm', this.currentCategory];
    this.selectedSubcategories = [subcategory];
    this.updateSubcategories(); // This will call updatePriceRange()
    this.applyFilters();
  }

  onBreadcrumbClick(item: string, index: number): void {
    if (index === 0 || index === 1) {
      // Click vào "Trang chủ" hoặc "Sản phẩm" - chuyển về categories view
      this.currentView = 'categories';
      this.currentCategory = '';
      this.currentSubcategory = '';
      this.breadcrumb = ['Trang chủ', 'Sản phẩm'];
      this.selectedCategories = [];
      this.selectedSubcategories = [];
      this.updateSubcategories();
    } else if (index === 2) {
      // Click vào category - chuyển về subcategories view
      this.currentView = 'subcategories';
      this.currentSubcategory = '';
      this.breadcrumb = ['Trang chủ', 'Sản phẩm', this.currentCategory];
      this.selectedSubcategories = [];
      this.updateSubcategories();
    }
    this.applyFilters();
    console.log('Breadcrumb clicked:', item, 'at index:', index);
    console.log('Current view after click:', this.currentView);
  }

  // -----------------------------
  //  Clear filters
  // -----------------------------
  clearAllFilters(): void {
    this.selectedCategories = [];
    this.selectedPromotions = [];
    this.selectedColors = [];
    this.selectedRating = null;
    this.currentView = 'categories';
    this.currentCategory = '';
    this.currentSubcategory = '';
    this.breadcrumb = ['Trang chủ', 'Sản phẩm'];
    this.activeFilters = [];
    this.updateSubcategories();
    this.applyFilters();
  }

  // -----------------------------
  // 📄 Load More methods
  // -----------------------------
  loadMoreProducts(): void {
    if (this.hasMoreProducts) {
      this.itemsPerPage += 24;
      this.updateDisplayedProducts();
    }
  }

  // -----------------------------
  //  Active filters management
  // -----------------------------
  removeFilter(filter: { type: string; value: string }): void {
    switch (filter.type) {
      case 'category':
        this.selectedCategories = this.selectedCategories.filter((c) => c !== filter.value);
        break;
      case 'brand':
        break;
      case 'promotion':
        this.selectedPromotions = this.selectedPromotions.filter((p) => p !== filter.value);
        break;
      case 'color':
        this.selectedColors = this.selectedColors.filter((c) => c !== filter.value);
        break;
      case 'rating':
        this.selectedRating = null;
        break;
      case 'price':
        this.minPrice = this.initialMinPrice;
        this.maxPrice = this.initialMaxPrice;
        this.priceRange = [this.initialMinPrice, this.initialMaxPrice];
        break;
    }
    this.applyFilters();
  }

  updateActiveFilters(): void {
    this.activeFilters = [];

    // KHÔNG thêm categories và subcategories vào activeFilters
    // Chỉ hiển thị filter từ filter-section (price, rating, promotion, color)

    this.selectedPromotions.forEach((promotion) => {
      this.activeFilters.push({
        type: 'promotion',
        value: promotion,
        label: promotion,
      });
    });

    this.selectedColors.forEach((color) => {
      this.activeFilters.push({
        type: 'color',
        value: color,
        label: color,
      });
    });

    if (this.selectedRating !== null) {
      this.activeFilters.push({
        type: 'rating',
        value: this.selectedRating.toString(),
        label: this.selectedRating === 5 ? '5 sao' : `${this.selectedRating} sao trở lên`,
      });
    }

    // Chỉ hiển thị filter chip giá nếu người dùng đã thay đổi khoảng giá
    if (this.minPrice !== this.initialMinPrice || this.maxPrice !== this.initialMaxPrice) {
      this.activeFilters.push({
        type: 'price',
        value: `${this.minPrice}-${this.maxPrice}`,
        label: `${this.formatPrice(this.minPrice)} - ${this.formatPrice(this.maxPrice)}`,
      });
    }
  }

  getActiveFilters(): Array<{ type: string; value: string; label: string }> {
    return this.activeFilters;
  }

  // -----------------------------
  // 🎯 Sort Methods
  // -----------------------------
  onSortChange(sortValue: string): void {
    if (sortValue === 'newest' || sortValue === 'bestseller') {
      if (
        (sortValue === 'newest' && this.categorySort === 'newest') ||
        (sortValue === 'bestseller' && this.categorySort === 'bestseller')
      ) {
        this.categorySort = 'name';
      } else {
        this.categorySort = sortValue;
      }
    }
    this.updateSortOption();
    this.sortProducts();
  }

  togglePriceSort(): void {
    if (this.priceSort === 'price-low') {
      this.priceSort = 'price-high';
    } else {
      this.priceSort = 'price-low';
    }
    this.updateSortOption();
    this.sortProducts();
  }

  updateSortOption(): void {
    if (this.categorySort !== 'name') {
      this.sortOption = this.categorySort;
    } else {
      this.sortOption = this.priceSort;
    }
  }

  getPriceSortText(): string {
    if (this.priceSort === 'price-low') {
      return 'Giá thấp đến cao';
    } else if (this.priceSort === 'price-high') {
      return 'Giá cao đến thấp';
    }
    return 'Giá thấp đến cao';
  }

  // -----------------------------
  //  Các method điều khiển filter sections
  // -----------------------------
  toggleSection(section: string): void {
    this.expandedSections[section] = !this.expandedSections[section];

    // Re-check sidebar height after animation completes
    setTimeout(() => this.updateSidebarHeight(), 300);
  }

  // -----------------------------
  //  Các method xử lý filter changes
  // -----------------------------

  onPromotionChange(promotion: string, checked: boolean): void {
    if (checked) {
      this.selectedPromotions.push(promotion);
    } else {
      this.selectedPromotions = this.selectedPromotions.filter((p) => p !== promotion);
    }
    this.applyFilters();
  }

  onColorChange(color: string, checked: boolean): void {
    if (checked) {
      this.selectedColors.push(color);
    } else {
      this.selectedColors = this.selectedColors.filter((c) => c !== color);
    }
    this.applyFilters();
  }

  onRatingChange(rating: number): void {
    if (this.selectedRating === rating) {
      this.selectedRating = null;
    } else {
      this.selectedRating = rating;
    }
    this.applyFilters();
  }

  // -----------------------------
  // 🎯 Helper Methods
  // -----------------------------

  /**
   * Kiểm tra xem các sản phẩm ĐANG ĐƯỢC LỌC có màu sắc không
   * Nếu không có sản phẩm nào có màu trong filtered set => ẩn bộ lọc màu sắc
   */
  hasColors(): boolean {
    // Lấy sản phẩm đã được lọc theo category/subcategory (KHÔNG bao gồm color filter)
    const baseProducts = this.products.filter((p) => {
      // Category filter
      if (this.selectedCategories.length > 0 && !this.selectedCategories.includes(p.Category)) {
        return false;
      }

      // Subcategory filter
      if (
        this.selectedSubcategories.length > 0 &&
        !this.selectedSubcategories.includes(p.Subcategory)
      ) {
        return false;
      }

      return true;
    });

    // Kiểm tra xem có sản phẩm nào có màu hợp lệ không
    const hasValidColors = baseProducts.some((p) => {
      // Color phải là string và không phải 'NaN' hoặc object
      if (!p.Color) return false;
      if (typeof p.Color === 'object') return false; // Skip { "$numberDouble": "NaN" }
      if (typeof p.Color !== 'string') return false;
      if (p.Color === 'NaN' || p.Color.trim() === '') return false;
      return true;
    });

    console.log('hasColors() check:', {
      currentView: this.currentView,
      totalProducts: this.products.length,
      filteredProducts: baseProducts.length,
      selectedCategories: this.selectedCategories,
      selectedSubcategories: this.selectedSubcategories,
      hasValidColors: hasValidColors,
      sampleColorsFound: baseProducts
        .filter((p) => p.Color && typeof p.Color === 'string' && p.Color !== 'NaN')
        .slice(0, 3)
        .map((p) => ({ name: p.ProductName, color: p.Color })),
    });

    return hasValidColors;
  }

  /**
   * Get available colors from currently filtered products (based on category/subcategory only)
   * This ensures the color filter only shows colors that actually exist in the visible products
   */
  getAvailableColors(): string[] {
    // Lấy sản phẩm đã được lọc theo category/subcategory (KHÔNG bao gồm color filter)
    const baseProducts = this.products.filter((p) => {
      // Category filter
      if (this.selectedCategories.length > 0 && !this.selectedCategories.includes(p.Category)) {
        return false;
      }

      // Subcategory filter
      if (
        this.selectedSubcategories.length > 0 &&
        !this.selectedSubcategories.includes(p.Subcategory)
      ) {
        return false;
      }

      return true;
    });

    // Extract unique colors from filtered products only
    const allColors = baseProducts
      .map((p) => p.Color)
      .filter((color) => {
        // Chỉ lấy color là string và không phải 'NaN'
        if (!color) return false;
        if (typeof color === 'object') return false; // Skip { "$numberDouble": "NaN" }
        if (typeof color !== 'string') return false;
        if (color === 'NaN' || color.trim() === '') return false;
        return true;
      })
      .flatMap((color) => color.split(',').map((c: string) => c.trim()))
      .filter((color) => color.length > 0);

    const availableColors = [...new Set(allColors)].sort();

    console.log('getAvailableColors():', {
      totalProducts: this.products.length,
      filteredProducts: baseProducts.length,
      availableColorsCount: availableColors.length,
      availableColors: availableColors,
    });

    return availableColors;
  }

  /**
   * Kiểm tra xem có sản phẩm nào có khuyến mãi trong filtered set không
   */
  hasPromotions(): boolean {
    // Lấy sản phẩm đã được lọc theo category/subcategory (KHÔNG bao gồm promotion filter)
    const baseProducts = this.products.filter((p) => {
      // Category filter
      if (this.selectedCategories.length > 0 && !this.selectedCategories.includes(p.Category)) {
        return false;
      }

      // Subcategory filter
      if (
        this.selectedSubcategories.length > 0 &&
        !this.selectedSubcategories.includes(p.Subcategory)
      ) {
        return false;
      }

      return true;
    });

    // Kiểm tra xem có sản phẩm nào có promotion không
    const hasAnyPromotions = baseProducts.some((p) => {
      return p.hasPromotion === true;
    });

    console.log('🎁 hasPromotions() check:', {
      totalProducts: this.products.length,
      filteredProducts: baseProducts.length,
      hasAnyPromotions: hasAnyPromotions,
      samplePromotionsFound: baseProducts
        .filter((p) => p.hasPromotion)
        .slice(0, 3)
        .map((p) => ({ name: p.ProductName, promotionType: p.promotionType })),
    });

    return hasAnyPromotions;
  }

  /**
   * Get available promotions from currently filtered products
   */
  getAvailablePromotions(): string[] {
    // Lấy sản phẩm đã được lọc theo category/subcategory
    const baseProducts = this.products.filter((p) => {
      if (this.selectedCategories.length > 0 && !this.selectedCategories.includes(p.Category)) {
        return false;
      }
      if (
        this.selectedSubcategories.length > 0 &&
        !this.selectedSubcategories.includes(p.Subcategory)
      ) {
        return false;
      }
      return true;
    });

    const availablePromotions: string[] = [];

    // Kiểm tra xem có sản phẩm nào có normal promotion không
    const hasNormalPromotion = baseProducts.some((p) => {
      if (!p.hasPromotion) return false;
      if (Array.isArray(p.promotionType)) {
        return p.promotionType.includes('normal');
      }
      return p.promotionType === 'normal';
    });
    if (hasNormalPromotion) {
      availablePromotions.push('Giảm giá');
    }

    // Kiểm tra xem có sản phẩm nào có buy1get1 promotion không
    const hasBuy1Get1 = baseProducts.some((p) => {
      if (!p.hasPromotion) return false;
      if (Array.isArray(p.promotionType)) {
        return p.promotionType.includes('buy1get1');
      }
      return p.promotionType === 'buy1get1';
    });
    if (hasBuy1Get1) {
      availablePromotions.push('Mua 1 tặng 1');
    }

    console.log('🎁 getAvailablePromotions():', {
      totalProducts: this.products.length,
      filteredProducts: baseProducts.length,
      availablePromotionsCount: availablePromotions.length,
      availablePromotions: availablePromotions,
    });

    return availablePromotions;
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

  /**
   * Kiểm tra xem sản phẩm có khớp với màu đã chọn không
   * Hỗ trợ sản phẩm có nhiều màu (format: "màu A, màu B, màu C")
   *
   * Ví dụ:
   * - Sản phẩm: "Đỏ, Vàng, Cam"
   * - Filter chọn: ["Đỏ"] =>  Hiển thị (vì "Đỏ" nằm trong danh sách)
   * - Filter chọn: ["Vàng"] =>  Hiển thị (vì "Vàng" nằm trong danh sách)
   * - Filter chọn: ["Xanh"] =>  Ẩn (vì "Xanh" không nằm trong danh sách)
   */
  private productMatchesColorFilter(product: Product): boolean {
    if (this.selectedColors.length === 0) {
      return true; // Không có filter màu => pass tất cả sản phẩm
    }

    const productColor = product.Color || '';
    if (typeof productColor === 'string' && productColor !== 'NaN' && productColor.length > 0) {
      // Split màu sắc theo dấu phẩy và trim (ví dụ: "Đỏ, Vàng, Cam" => ["Đỏ", "Vàng", "Cam"])
      const productColors = productColor.split(',').map((c) => c.trim());

      // Kiểm tra xem có bất kỳ màu nào được chọn nằm trong danh sách màu của sản phẩm không
      const hasMatch = this.selectedColors.some((selectedColor) =>
        productColors.includes(selectedColor)
      );

      // Debug log (có thể comment out sau khi test xong)
      if (this.selectedColors.length > 0) {
        console.log(
          `Color filter check:`,
          `Product colors: [${productColors.join(', ')}]`,
          `| Selected: [${this.selectedColors.join(', ')}]`,
          `| Match: ${hasMatch ? 'Yes' : 'No'}`
        );
      }

      return hasMatch;
    }

    // Nếu sản phẩm không có màu hợp lệ thì không hiển thị khi filter theo màu
    return false;
  }

  getCurrentTitle(): string {
    // Ưu tiên hiển thị "Kết quả tìm kiếm" nếu có search query
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      return `Kết quả tìm kiếm: "${this.searchQuery}"`;
    }
    // Khi ở subcategories view, luôn hiển thị category
    if (this.currentView === 'subcategories' && this.currentCategory) {
      return this.currentCategory;
    }
    // Fallback cho các trường hợp khác
    if (this.currentSubcategory) {
      return this.currentSubcategory;
    } else if (this.currentCategory) {
      return this.currentCategory;
    }
    return 'Sản phẩm';
  }

  updatePageTitle(): void {
    const title = this.getCurrentTitle();
    document.title = `${title} - VGreen`;
  }

  getCurrentCategoryTitle(): string {
    // Ưu tiên hiển thị "Kết quả tìm kiếm" nếu có search query
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      return `Kết quả tìm kiếm: "${this.searchQuery}"`;
    }
    if (this.currentSubcategory) {
      return this.currentSubcategory;
    } else if (this.currentCategory) {
      return this.currentCategory;
    }
    return 'Sản phẩm';
  }

  getCurrentCategoryCount(): string {
    const productCount = this.filteredProducts.length;
    return `(có ${productCount} sản phẩm)`;
  }

  addToCart(product: Product): void {
    // Kiểm tra user đã đăng nhập chưa
    const token = localStorage.getItem('token');
    if (!token) {
      // Mở popup đăng nhập nếu chưa đăng nhập
      this.authPopupService.openPopup('login');
      return;
    }

    // Chuyển đổi Product sang CartItem format
    // Nếu có promotion: price là giá sau giảm, originalPrice là giá gốc
    // Nếu không có promotion: price là giá bình thường, originalPrice là undefined
    const hasPromotion = product.hasPromotion || false;
    // Chỉ set originalPrice khi có promotion VÀ có OriginalPrice hợp lệ (lớn hơn price)
    const originalPrice =
      hasPromotion && product.OriginalPrice && product.OriginalPrice > product.Price
        ? product.OriginalPrice
        : undefined;

    const cartItem = {
      id: product.sku || parseInt(product._id.replace(/\D/g, '')) || Date.now(), // Sử dụng sku hoặc parse từ _id
      sku: product.sku || product._id, //  Thêm SKU cho backend
      name: product.ProductName,
      productName: product.ProductName, //  Thêm productName cho backend
      price: product.Price, // Giá hiện tại (có thể là giá sau giảm nếu có promotion)
      image: this.getProductImage(product), // Lấy ảnh đầu tiên từ array
      category: product.Category,
      subcategory: product.Subcategory,
      unit: product.Unit,
      selected: true,
      originalPrice: originalPrice,
      hasPromotion: hasPromotion,
    };

    // Thêm vào giỏ hàng thông qua CartService
    this.cartService.addToCart(cartItem);
    console.log('Added to cart:', product.ProductName);
  }

  goToProductDetail(productId: string): void {
    this.router.navigate(['/product-detail', productId]);
  }

  // -----------------------------
  // 🎯 Favorite Methods
  // -----------------------------
  toggleFavorite(product: Product): void {
    // Kiểm tra user đã đăng nhập chưa
    const token = localStorage.getItem('token');
    if (!token) {
      // Mở popup đăng nhập nếu chưa đăng nhập
      this.authPopupService.openPopup('login');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      // Mở popup đăng nhập nếu không tìm thấy user
      this.authPopupService.openPopup('login');
      return;
    }

    // Lấy CustomerID từ localStorage
    const userDataStr = localStorage.getItem('user');
    let customerID: string = '';

    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        customerID = userData.CustomerID || '';
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    // Fallback: thử lấy từ currentUser
    if (!customerID && currentUser) {
      customerID = (currentUser as any).CustomerID || '';
    }

    if (!customerID) {
      console.error('Không tìm thấy CustomerID hợp lệ');
      return;
    }

    const sku = product.sku;
    const productName = product.ProductName;

    // Toggle wishlist using WishlistService
    this.wishlistService.toggleWishlist(customerID, sku, productName).subscribe({
      next: (isAdded) => {
        // Update local array for UI
        const index = this.favoriteProducts.indexOf(sku);
        if (isAdded && index === -1) {
          this.favoriteProducts.push(sku);
        } else if (!isAdded && index > -1) {
          this.favoriteProducts.splice(index, 1);
        }
      },
      error: (error) => {
        console.error('Lỗi khi toggle wishlist:', error);
      },
    });
  }

  isFavorite(product: Product): boolean {
    const wishlist = this.wishlistService.getCurrentWishlist();
    return wishlist.some((item) => item.sku === product.sku);
  }

  loadFavoriteProducts(): void {
    // Load from WishlistService instead of localStorage
    const wishlist = this.wishlistService.getCurrentWishlist();
    this.favoriteProducts = wishlist.map((item) => item.sku);
  }

  // -----------------------------
  // 🎯 Promotion Methods
  // -----------------------------
  private applyPromotionsToProducts(products: any[], promotions: any[], targets: any[]): any[] {
    console.log(` [ProductList] Applying promotions to ${products.length} products...`);
    console.log(
      `   Available promotions: ${promotions
        .map((p: any) => `${p.code} (${p.discount_type})`)
        .join(', ')}`
    );
    console.log(`   Available targets: ${targets.length}`);

    let matchedCount = 0;

    const result = products.map((product) => {
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

      matchedCount++;

      // Chọn promotion đầu tiên để hiển thị tên (ưu tiên buy1get1)
      const displayPromotion =
        applicablePromotions.find((p) => p.discount_type === 'buy1get1') || applicablePromotions[0];

      return {
        ...product,
        hasPromotion: true,
        originalPrice: product.price,
        discountedPrice: discountedPrice,
        discountAmount: discountAmount,
        discountPercent: discountPercent,
        promotionName: displayPromotion.name,
        promotionCode: displayPromotion.code,
        promotionType: promotionType,
      };
    });

    console.log(` [ProductList] Matched ${matchedCount} products with promotions`);

    return result;
  }

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
        // Chuyển đổi cả product.sku và target_ref về string để so sánh chắc chắn
        const productSku = String(product.sku || '').trim();
        const targetSkus = target_ref.map((s: any) => String(s).trim());
        return targetSkus.includes(productSku);
      default:
        return false;
    }
  }

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

  // -----------------------------
  // 🎯 Product Discount Methods
  // -----------------------------
  hasDiscount(product: Product): boolean {
    return !!(
      product.hasPromotion &&
      product.OriginalPrice &&
      product.OriginalPrice > product.Price
    );
  }

  getOriginalPrice(product: Product): number {
    return product.OriginalPrice || product.Price;
  }

  getDiscountPercent(product: Product): number {
    return product.discountPercent || product.Discount || 0;
  }

  // Get purchase count from product data
  getPurchaseCount(product: Product): string {
    // Trả về giá trị PurchaseCount từ JSON với format số có dấu phẩy
    const count = product.PurchaseCount || 0;
    return count.toLocaleString('vi-VN');
  }

  // Kiểm tra sản phẩm có đánh giá hay không
  // Chỉ cần Rating > 0 là đủ, không cần ReviewCount vì ReviewCount có thể chưa được load
  hasReviews(product: Product): boolean {
    return (product.Rating ?? 0) > 0;
  }

  // Get first image from product images array
  getProductImage(product: Product): string {
    // Lấy ảnh đầu tiên từ array, hoặc empty string nếu không có
    return product.Image && product.Image.length > 0 ? product.Image[0] : '';
  }

  // -----------------------------
  // 🎯 Promotion Box Carousel
  // -----------------------------
  getVisibleBoxes(): Product[] {
    const visibleBoxes = [];
    for (let i = 0; i < 3; i++) {
      const boxIndex = this.currentBoxIndex + i;
      if (boxIndex < this.promotionProducts.length) {
        visibleBoxes.push(this.promotionProducts[boxIndex]);
      }
    }
    return visibleBoxes;
  }

  getBoxDots(): number[] {
    const dots = [];
    for (let i = 0; i < this.promotionProducts.length - 2; i++) {
      dots.push(i);
    }
    return dots;
  }

  prevPromotionBox(): void {
    if (this.currentBoxIndex > 0) {
      this.currentBoxIndex--;
    }
  }

  nextPromotionBox(): void {
    if (this.currentBoxIndex < this.promotionProducts.length - 3) {
      this.currentBoxIndex++;
    }
  }

  goToBox(index: number): void {
    this.currentBoxIndex = index;
  }

  // -----------------------------
  // 🎯 Navigation Arrows
  // -----------------------------
  scrollFilters(direction: 'left' | 'right'): void {
    if (!this.filtersContainer) {
      return;
    }

    const container = this.filtersContainer.nativeElement;
    const scrollAmount = 200; // Scroll 200px mỗi lần click

    if (direction === 'left') {
      container.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth',
      });
    } else {
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  }

  // -----------------------------
  // 🎯 Promotion Products
  // -----------------------------
  loadPromotionProducts(): void {
    this.promotionProducts = this.products
      .filter((p) => p.hasPromotion)
      .sort((a, b) => {
        return (b.discountPercent || 0) - (a.discountPercent || 0);
      })
      .slice(0, 6);
    console.log('Promotion products loaded:', this.promotionProducts.length);
  }

  // -----------------------------
  // 🎯 Promotion Box Properties
  // -----------------------------
  promotionProducts: Product[] = [];
  currentPromotionIndex: number = 0;
  promotionVisible: boolean = true;

  // -----------------------------
  // 🎯 Sort Options
  // -----------------------------
  sortOptions = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'bestseller', label: 'Bán chạy' },
    { value: 'price-low', label: 'Giá thấp → cao' },
    { value: 'price-high', label: 'Giá cao → thấp' },
  ];
  currentSort: string = 'newest';

  // -----------------------------
  // 🎯 Rating Count
  // -----------------------------
  getRatingCount(rating: number): number {
    // Đếm từ products đã lọc theo category, subcategory, price, promotion, color
    // NHƯNG KHÔNG tính rating filter để hiển thị đúng số lượng cho mỗi mức sao
    const baseProducts = this.products.filter((p) => {
      // Category filter
      if (this.selectedCategories.length > 0 && !this.selectedCategories.includes(p.Category)) {
        return false;
      }

      // Subcategory filter
      if (
        this.selectedSubcategories.length > 0 &&
        !this.selectedSubcategories.includes(p.Subcategory)
      ) {
        return false;
      }

      // Promotion filter - kiểm tra promotionType (hỗ trợ cả string và array)
      if (this.selectedPromotions.length > 0) {
        const hasDiscountFilter = this.selectedPromotions.includes('Giảm giá');
        const hasBuy1Get1Filter = this.selectedPromotions.includes('Mua 1 tặng 1');

        // Kiểm tra promotionType là array hay string
        const hasNormalPromo = Array.isArray(p.promotionType)
          ? p.promotionType.includes('normal')
          : p.promotionType === 'normal';
        const hasBuy1Get1Promo = Array.isArray(p.promotionType)
          ? p.promotionType.includes('buy1get1')
          : p.promotionType === 'buy1get1';

        // Nếu chọn "Giảm giá" - hiển thị sản phẩm có promotionType là 'normal'
        // Nếu chọn "Mua 1 tặng 1" - hiển thị sản phẩm có promotionType là 'buy1get1'
        if (hasDiscountFilter && hasBuy1Get1Filter) {
          // Chọn cả 2: hiển thị tất cả sản phẩm có promotion
          if (!p.hasPromotion) {
            return false;
          }
        } else if (hasDiscountFilter) {
          // Chỉ chọn "Giảm giá"
          if (!p.hasPromotion || !hasNormalPromo) {
            return false;
          }
        } else if (hasBuy1Get1Filter) {
          // Chỉ chọn "Mua 1 tặng 1"
          if (!p.hasPromotion || !hasBuy1Get1Promo) {
            return false;
          }
        } else {
          // Không khớp với bất kỳ filter nào
          return false;
        }
      }

      // Color filter - hỗ trợ sản phẩm có nhiều màu
      if (!this.productMatchesColorFilter(p)) {
        return false;
      }

      // Price filter
      if (p.Price < this.minPrice || p.Price > this.maxPrice) {
        return false;
      }

      return true;
    });

    if (rating === 5) {
      // Đếm sản phẩm có đúng 5 sao
      return baseProducts.filter((p) => p.Rating === 5).length;
    } else {
      // Đếm sản phẩm có rating >= rating đã chọn
      return baseProducts.filter((p) => (p.Rating || 0) >= rating).length;
    }
  }
}
