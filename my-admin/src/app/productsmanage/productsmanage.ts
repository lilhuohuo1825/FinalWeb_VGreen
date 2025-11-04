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
 * Product JSON structure from data file
 */
interface ProductJSON {
  _id: string;
  category: string;
  subcategory: string;
  product_name: string;
  brand: string;
  unit: string;
  price: number;
  image: string[] | string;
  sku: string;
  origin?: string;
  weight?: string;
  ingredients?: string;
  usage?: string;
  storage?: string;
  manufacture_date?: string;
  expiry_date?: string;
  producer?: string;
  safety_warning?: string;
  responsible_org?: string;
  color?: any;
  base_price?: number;
  rating?: number;
  purchase_count?: number;
  status?: string;
  post_date?: any;
  liked?: number;
}

/**
 * Product interface for application use
 */
export interface Product {
  id?: number;
  name: string;
  code: string;
  sku?: string;
  brand?: string;
  category: string;
  subcategory?: string;
  color?: string;
  stock: number;
  unit: string;
  originalPrice?: number;
  price: number;
  salePrice?: number;
  images?: string[];
  image?: string;
  rating?: number;
  updated?: string;
  selected?: boolean;
  origin?: string;
  weight?: string;
  ingredients?: string;
  usage?: string;
  storage?: string;
  producer?: string;
  manufactureDate?: string;
  expiryDate?: string;
  safetyWarning?: string;
  responsibleOrg?: string;
  groups?: string[]; // Danh sách các nhóm mà sản phẩm thuộc về
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Filter criteria interface
 */
export interface FilterCriteria {
  category?: string;
  subcategory?: string;
  stockStatus?: 'in-stock' | 'out-of-stock' | 'low-stock';
  minPrice?: number;
  maxPrice?: number;
  rating?: number; // Exact rating, not minimum
  group?: string;
}

/**
 * ============================================================================
 * HELPER FUNCTIONS (Business Logic)
 * ============================================================================
 */

/**
 * Map ProductJSON from data file to Product interface
 */
function mapProductFromJSON(json: ProductJSON, index: number): Product {
  // Handle image field - can be array or string
  let imageUrl = '';
  let imageArray: string[] = [];
  
  if (Array.isArray(json.image)) {
    imageArray = json.image;
    imageUrl = json.image[0] || '';
  } else if (typeof json.image === 'string') {
    imageUrl = json.image;
    imageArray = [json.image];
  }
  
  return {
    id: index + 1,
    name: json.product_name || '',
    code: json._id || '', // Use _id from JSON as product code
    sku: json.sku || undefined,
    brand: json.brand || '',
    category: json.category || '',
    subcategory: json.subcategory || '',
    color: json.color && typeof json.color === 'string' ? json.color : undefined,
    unit: json.unit || '',
    price: json.price || 0,
    originalPrice: json.base_price || json.price || 0,
    salePrice: 0,
    stock: Math.floor(Math.random() * 100), // Random stock since not in JSON
    rating: json.rating || Math.floor(Math.random() * 5) + 1,
    image: imageUrl,
    images: imageArray,
    origin: json.origin,
    weight: json.weight,
    ingredients: json.ingredients,
    usage: json.usage,
    storage: json.storage,
    producer: json.producer,
    manufactureDate: json.manufacture_date,
    expiryDate: json.expiry_date,
    safetyWarning: json.safety_warning,
    responsibleOrg: json.responsible_org,
    updated: parsePostDate(json.post_date), // Use post_date from JSON
    selected: false,
    groups: [] // Initialize groups
  };
}

/**
 * Select diverse products from different categories
 * @param products - All products from JSON
 * @param targetCount - Target number of products (default 100)
 * @returns Filtered products representing different categories
 */
function selectDiverseProducts(products: ProductJSON[], targetCount: number = 100): ProductJSON[] {
  // Group products by category and subcategory
  const grouped = new Map<string, ProductJSON[]>();
  
  products.forEach(product => {
    const key = `${product.category}|${product.subcategory}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(product);
  });
  
  console.log(`Found ${grouped.size} unique category-subcategory combinations`);
  
  // Calculate products per group
  const groupCount = grouped.size;
  const productsPerGroup = Math.max(1, Math.floor(targetCount / groupCount));
  
  // Select products from each group
  const selectedProducts: ProductJSON[] = [];
  
  grouped.forEach((groupProducts, key) => {
    const [category, subcategory] = key.split('|');
    
    // Take first N products from this group
    const selected = groupProducts.slice(0, productsPerGroup);
    selectedProducts.push(...selected);
    
    console.log(`${category} > ${subcategory}: Selected ${selected.length} of ${groupProducts.length} products`);
  });
  
  // If we don't have enough, add more from larger groups
  if (selectedProducts.length < targetCount) {
    const remaining = targetCount - selectedProducts.length;
    const sortedGroups = Array.from(grouped.entries())
      .sort((a, b) => b[1].length - a[1].length);
    
    let added = 0;
    let currentIndex = productsPerGroup; // Start from the next index after initial selection
    
    // Keep looping through groups until we have enough products
    while (added < remaining) {
      let addedInThisRound = 0;
      
      for (const [key, groupProducts] of sortedGroups) {
        if (added >= remaining) break;
        
        // Add one more product from this group if available at current index
        if (groupProducts.length > currentIndex) {
          selectedProducts.push(groupProducts[currentIndex]);
          added++;
          addedInThisRound++;
        }
      }
      
      // Move to next index for next round
      currentIndex++;
      
      // If no products were added in this round, we've exhausted all groups
      if (addedInThisRound === 0) break;
    }
    
    console.log(`Added ${added} more products to reach target`);
  }
  
  // Limit to target count
  const result = selectedProducts.slice(0, targetCount);
  console.log(`Final selection: ${result.length} products from ${grouped.size} categories`);
  
  return result;
}

/**
 * Get current date in DD-MM-YYYY format
 */
function getCurrentDate(): string {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Parse post_date from MongoDB format and convert to DD-MM-YYYY
 */
function parsePostDate(postDate: any): string {
  if (!postDate) {
    return getCurrentDate();
  }
  
  try {
    // Handle MongoDB date format: { "$date": "2025-05-05T03:30:06.567Z" }
    let dateString: string;
    
    if (typeof postDate === 'object' && postDate.$date) {
      dateString = postDate.$date;
    } else if (typeof postDate === 'string') {
      dateString = postDate;
    } else {
      return getCurrentDate();
    }
    
    const date = new Date(dateString);
    
    // Check if valid date
    if (isNaN(date.getTime())) {
      return getCurrentDate();
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error parsing post_date:', error);
    return getCurrentDate();
  }
}

/**
 * Get next product ID
 */
function getNextProductId(products: Product[]): number {
  if (products.length === 0) return 1;
  const maxId = Math.max(...products.map(p => p.id || 0));
  return maxId + 1;
}

/**
 * Create empty product object
 */
function createEmptyProduct(): Product {
  return {
    name: '',
    code: '',
    sku: '',
    brand: '',
    category: '',
    color: '',
    stock: 0,
    unit: '',
    originalPrice: 0,
    price: 0,
    salePrice: 0,
    images: [],
    groups: []
  };
}

/**
 * Count selected products
 */
function countSelectedProducts(products: Product[]): number {
  return products.filter(p => p.selected).length;
}

/**
 * Get selected products
 */
function getSelectedProducts(products: Product[]): Product[] {
  return products.filter(p => p.selected);
}

/**
 * Validate product data
 */
function validateProduct(product: Product): ValidationResult {
  const errors: string[] = [];
  
  if (!product.name || product.name.trim() === '') {
    errors.push('Tên sản phẩm không được để trống');
  }
  
  if (!product.code || product.code.trim() === '') {
    errors.push('Mã sản phẩm không được để trống');
  }
  
  if (!product.category || product.category.trim() === '') {
    errors.push('Danh mục không được để trống');
  }
  
  if (product.price < 0) {
    errors.push('Giá bán phải lớn hơn hoặc bằng 0');
  }
  
  if (product.stock < 0) {
    errors.push('Số lượng tồn kho phải lớn hơn hoặc bằng 0');
  }
  
  if (product.salePrice && product.salePrice > 0 && product.salePrice >= product.price) {
    errors.push('Giá khuyến mãi phải nhỏ hơn giá bán');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Save product (add new or update existing)
 */
function saveProductData(
  products: Product[],
  currentProduct: Product,
  isEditing: boolean
): Product[] {
  if (isEditing) {
    // Update existing product
    return products.map(p => 
      p.id === currentProduct.id 
        ? { ...currentProduct, updated: getCurrentDate() }
        : p
    );
  } else {
    // Add new product
    const newProduct: Product = {
      ...currentProduct,
      id: getNextProductId(products),
      rating: 0,
      updated: getCurrentDate(),
      selected: false
    };
    return [...products, newProduct];
  }
}

/**
 * Delete selected products
 */
function deleteSelectedProducts(products: Product[]): Product[] {
  return products.filter(p => !p.selected);
}

/**
 * Search products by query
 */
function searchProductsByQuery(products: Product[], query: string): Product[] {
  if (!query || query.trim() === '') {
    return products;
  }
  
  const searchTerm = query.toLowerCase().trim();
  
  return products.filter(product => {
    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.code.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm)) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm))
    );
  });
}

/**
 * Filter products by criteria
 */
function filterProductsByCriteria(
  products: Product[],
  filters: FilterCriteria
): Product[] {
  let filtered = [...products];
  
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(p => p.category === filters.category);
  }
  
  if (filters.subcategory && filters.subcategory !== 'all') {
    filtered = filtered.filter(p => p.subcategory === filters.subcategory);
  }
  
  if (filters.stockStatus) {
    if (filters.stockStatus === 'in-stock') {
      filtered = filtered.filter(p => p.stock > 0);
    } else if (filters.stockStatus === 'out-of-stock') {
      filtered = filtered.filter(p => p.stock === 0);
    } else if (filters.stockStatus === 'low-stock') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock < 10);
    }
  }
  
  if (filters.minPrice !== undefined && filters.minPrice !== null) {
    filtered = filtered.filter(p => p.price >= filters.minPrice!);
  }
  
  if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
    filtered = filtered.filter(p => p.price <= filters.maxPrice!);
  }
  
  if (filters.rating !== undefined && filters.rating !== null) {
    filtered = filtered.filter(p => Math.round(p.rating || 0) === filters.rating);
  }
  
  if (filters.group && filters.group !== 'all') {
    filtered = filtered.filter(p => p.groups && p.groups.includes(filters.group!));
  }
  
  return filtered;
}

/**
 * Parse date string from DD-MM-YYYY to Date object for comparison
 */
function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date(0); // Return epoch for invalid dates
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(0);
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  return new Date(year, month, day);
}

/**
 * Sort products by field
 */
function sortProductsByField(
  products: Product[],
  field: keyof Product,
  order: 'asc' | 'desc' = 'asc'
): Product[] {
  const sorted = [...products].sort((a, b) => {
    let aVal: any = a[field];
    let bVal: any = b[field];
    
    // Special handling for 'updated' field (date string DD-MM-YYYY)
    if (field === 'updated' && typeof aVal === 'string' && typeof bVal === 'string') {
      const aDate = parseDateString(aVal);
      const bDate = parseDateString(bVal);
      
      if (aDate < bDate) return order === 'asc' ? -1 : 1;
      if (aDate > bDate) return order === 'asc' ? 1 : -1;
      return 0;
    }
    
    // Handle string comparison
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

/**
 * Get stock status class for styling
 */
function getStockClass(stock: number): string {
  if (stock === 0) return 'stock-out';
  if (stock < 10) return 'stock-low';
  return 'stock-high';
}

/**
 * Get stock status text
 */
function getStockStatus(stock: number): string {
  if (stock === 0) return 'Hết hàng';
  if (stock < 10) return 'Sắp hết';
  return 'Còn hàng';
}

/**
 * Star type for display
 */
export type StarType = 'full' | 'half' | 'empty';

/**
 * Get star rating array for display with half star support
 */
function getStarArray(rating: number | undefined): StarType[] {
  const safeRating = rating || 0;
  const fullStars = Math.floor(safeRating);
  const hasHalfStar = safeRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  const stars: StarType[] = [];
  
  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push('full');
  }
  
  // Add half star if applicable
  if (hasHalfStar) {
    stars.push('half');
  }
  
  // Add empty stars
  for (let i = 0; i < emptyStars; i++) {
    stars.push('empty');
  }
  
  return stars;
}

/**
 * Calculate discount percentage
 */
function calculateDiscountPercentage(
  originalPrice: number,
  salePrice: number
): number {
  if (originalPrice <= 0 || salePrice >= originalPrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Format currency (VND)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

/**
 * Process image file selection
 */
function processImageFile(file: File, index: number) {
  if (!file) return null;
  
  return {
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    index,
    preview: URL.createObjectURL(file)
  };
}

/**
 * Export products to CSV
 */
function exportProductsToCSV(products: Product[]): string {
  const headers = [
    'ID', 'Tên', 'Mã', 'SKU', 'Thương hiệu', 'Danh mục', 
    'Tồn kho', 'Đơn vị', 'Giá gốc', 'Giá bán', 'Giá KM', 
    'Đánh giá', 'Cập nhật'
  ];
  
  const rows = products.map(p => [
    p.id || '',
    p.name,
    p.code,
    p.sku || '',
    p.brand || '',
    p.category,
    p.stock,
    p.unit,
    p.originalPrice || 0,
    p.price,
    p.salePrice || 0,
    p.rating || 0,
    p.updated || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * ============================================================================
 * ANGULAR COMPONENT
 * ============================================================================
 */

@Component({
  selector: 'app-productsmanage',
  imports: [CommonModule, FormsModule],
  templateUrl: './productsmanage.html',
  styleUrl: './productsmanage.css',
  standalone: true
})
export class ProductsManage implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  
  showProductForm = false;
  editingProduct = false;
  currentProduct: Product = createEmptyProduct();
  originalProduct: Product | null = null; // Lưu bản sao ban đầu để revert khi hủy
  
  // Products data loaded from JSON
  products: Product[] = [];
  allProducts: Product[] = []; // Keep original data for search/filter
  filteredProducts: Product[] = []; // After filter/sort
  
  // Loading state
  isLoading = false;
  loadError = '';

  selectedCount = 0;
  selectAll = false;

  // Filter & Sort state
  showFilterModal = false;
  showFilterDropdown = false;
  showSortDropdown = false;
  currentSortField: keyof Product = 'updated';
  currentSortOrder: 'asc' | 'desc' = 'desc';
  currentFilters: FilterCriteria = {};
  
  // Available filter options
  availableCategories: string[] = [];
  availableSubcategories: string[] = [];

  // Group management
  showGroupModal = false;
  newGroupName = '';
  selectedGroupToAdd = ''; // For selecting existing group from dropdown
  allGroupNames: string[] = []; // All unique group names in the system

  /**
   * Angular lifecycle hook - runs when component initializes
   */
  ngOnInit(): void {
    this.loadProducts();
    this.extractAllGroupNames();
  }

  /**
   * Load products from JSON file
   */
  loadProducts(): void {
    this.isLoading = true;
    this.loadError = '';
    
    // Path to product.json in the data folder
    const dataPath = '/data/product.json';
    
    this.http.get<ProductJSON[]>(dataPath).subscribe({
      next: (data) => {
        console.log(`✅ Loaded ${data.length} products from JSON`);
        
        // Use ALL products instead of selecting only 100
        console.log(`📊 Displaying all ${data.length} products`);
        
        // Map JSON data to Product interface
        this.allProducts = data.map((item, index) => mapProductFromJSON(item, index));
        
        // Extract unique categories for filter
        this.extractCategories();
        
        // Apply default sort (by updated date, descending)
        this.updateProductsList();
        
        this.isLoading = false;
        console.log('Products loaded successfully:', this.products.length);
        
        // Extract group names
        this.extractAllGroupNames();
        
        // Log category distribution
        const categoryCount = new Map<string, number>();
        this.products.forEach(p => {
          const key = `${p.category} > ${p.subcategory}`;
          categoryCount.set(key, (categoryCount.get(key) || 0) + 1);
        });
        console.log('Category distribution:', Array.from(categoryCount.entries()));
        console.log('Available categories:', this.availableCategories);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loadError = 'Không thể tải dữ liệu sản phẩm. Vui lòng thử lại.';
        this.isLoading = false;
        
        // Fallback to sample data
        this.loadSampleData();
      }
    });
  }

  /**
   * Load sample data as fallback
   */
  private loadSampleData(): void {
    console.log('Loading sample data as fallback');
    this.allProducts = [
    {
      id: 1,
      name: 'Tên sản phẩm',
      code: 'Mã sản phẩm',
      unit: 'ABC',
      stock: 5,
      category: 'ABC',
        price: 100000,
      rating: 3,
      updated: '10-08-2025',
      selected: false
    },
    {
      id: 2,
      name: 'Tên sản phẩm',
      code: 'Mã sản phẩm',
      unit: 'ABC',
      stock: 100,
      category: 'ABC',
        price: 150000,
      rating: 4,
      updated: '09-12-2025',
      selected: false
    },
    {
      id: 3,
      name: 'Tên sản phẩm',
      code: 'Mã sản phẩm',
      unit: 'ABC',
      stock: 0,
      category: 'ABC',
        price: 200000,
      rating: 5,
      updated: 'xx-xx-xxxx',
      selected: false
    },
    {
      id: 4,
      name: 'Tên sản phẩm',
      code: 'Mã sản phẩm',
      unit: 'ABC',
      stock: 0,
      category: 'ABC',
        price: 80000,
      rating: 5,
      updated: 'xx-xx-xxxx',
      selected: false
    }
  ];
    // Apply default sort
    this.updateProductsList();
  }

  /**
   * Toggle select all products
   */
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.products.forEach(product => product.selected = this.selectAll);
    this.updateSelectedCount();
  }

  /**
   * Toggle individual product selection
   */
  toggleProduct(product: Product): void {
    product.selected = !product.selected;
    this.updateSelectedCount();
    this.selectAll = this.products.every(p => p.selected);
  }

  /**
   * Update selected count
   */
  updateSelectedCount(): void {
    this.selectedCount = countSelectedProducts(this.products);
  }

  /**
   * Add new product
   */
  addProduct(): void {
    this.editingProduct = false;
    this.currentProduct = createEmptyProduct();
    this.originalProduct = null; // Không có dữ liệu ban đầu khi thêm mới
    this.showProductForm = true;
  }

  /**
   * Close product form
   */
  closeProductForm(): void {
    // Revert về trạng thái ban đầu nếu có
    if (this.originalProduct) {
      this.currentProduct = JSON.parse(JSON.stringify(this.originalProduct)); // Deep copy
      this.originalProduct = null;
    }
    this.showProductForm = false;
    this.editingProduct = false;
  }

  /**
   * Save product
   */
  saveProduct(): void {
    const validation = validateProduct(this.currentProduct);
    
    if (!validation.isValid) {
      alert('Lỗi:\n' + validation.errors.join('\n'));
      return;
    }
    
    // Lưu dữ liệu vào danh sách sản phẩm
    this.products = saveProductData(this.products, this.currentProduct, this.editingProduct);
    
    // Cập nhật allProducts nếu đang chỉnh sửa
    if (this.editingProduct && this.originalProduct) {
      const index = this.allProducts.findIndex(p => p.id === this.originalProduct!.id);
      if (index !== -1) {
        this.allProducts[index] = { ...this.currentProduct };
      }
    }
    
    console.log(this.editingProduct ? 'Updated product' : 'Added new product');
    
    // Xóa bản sao ban đầu vì đã lưu thành công
    this.originalProduct = null;
    this.showProductForm = false;
    this.editingProduct = false;
  }

  /**
   * Handle image selection
   */
  onImageSelect(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const imageInfo = processImageFile(file, index);
      if (imageInfo) {
        console.log('Selected image:', imageInfo.name, 'at index:', index);
      // TODO: Implement image upload logic
      }
    }
  }

  /**
   * Get product images array (up to 4 images)
   */
  getProductImages(): (string | null)[] {
    if (!this.currentProduct || !this.currentProduct.images) {
      return [null, null, null, null];
    }
    
    const images = this.currentProduct.images.slice(0, 4); // Get first 4 images
    const result: (string | null)[] = [...images];
    
    // Fill remaining slots with null
    while (result.length < 4) {
      result.push(null);
    }
    
    return result;
  }

  /**
   * Handle image loading error
   */
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'asset/icons/shop.png'; // Fallback image
  }

  /**
   * Remove image at index
   */
  removeImage(index: number): void {
    if (!this.currentProduct || !this.currentProduct.images) {
      return;
    }
    
    if (index < this.currentProduct.images.length) {
      this.currentProduct.images.splice(index, 1);
      // Update main image if first image was removed
      if (index === 0 && this.currentProduct.images.length > 0) {
        this.currentProduct.image = this.currentProduct.images[0];
      } else if (this.currentProduct.images.length === 0) {
        this.currentProduct.image = '';
      }
    }
  }

  /**
   * Edit selected products
   */
  editProducts(): void {
    const selected = getSelectedProducts(this.products);
    if (selected.length === 1) {
      // Lưu bản sao ban đầu trước khi chỉnh sửa
      this.originalProduct = JSON.parse(JSON.stringify(selected[0])); // Deep copy
      this.currentProduct = JSON.parse(JSON.stringify(selected[0])); // Deep copy để chỉnh sửa
      this.editingProduct = true;
      this.showProductForm = true;
    } else if (selected.length > 1) {
      alert('Vui lòng chọn chỉ 1 sản phẩm để chỉnh sửa');
    } else {
      alert('Vui lòng chọn sản phẩm để chỉnh sửa');
    }
  }

  /**
   * View product detail (click on row)
   */
  viewProductDetail(product: Product): void {
    // Lưu bản sao ban đầu trước khi chỉnh sửa
    this.originalProduct = JSON.parse(JSON.stringify(product)); // Deep copy
    this.currentProduct = JSON.parse(JSON.stringify(product)); // Deep copy để chỉnh sửa
    this.editingProduct = true;
    this.showProductForm = true;
  }

  /**
   * Delete selected products
   */
  deleteProducts(): void {
    const selected = getSelectedProducts(this.products);
    if (selected.length === 0) {
      alert('Vui lòng chọn sản phẩm để xóa');
      return;
    }
    
    if (confirm(`Bạn có chắc chắn muốn xóa ${selected.length} sản phẩm?`)) {
      this.products = deleteSelectedProducts(this.products);
      this.selectedCount = 0;
      this.selectAll = false;
      console.log('Deleted products');
    }
  }

  /**
   * Open filter modal
   */
  openFilter(): void {
    this.showFilterModal = true;
  }

  /**
   * Close filter modal
   */
  closeFilter(): void {
    this.showFilterModal = false;
  }

  /**
   * Apply filters
   */
  applyFilters(filters: FilterCriteria): void {
    this.currentFilters = filters;
    this.updateProductsList();
    this.closeFilter();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.currentFilters = {};
    this.availableSubcategories = []; // Clear subcategories when clearing all filters
    this.updateProductsList();
  }

  /**
   * Toggle filter dropdown
   */
  toggleFilterDropdown(event?: Event): void {
    console.log('🔍 ========== TOGGLE FILTER DROPDOWN ==========');
    console.log('🔍 Before:', this.showFilterDropdown);
    console.log('🔍 Available Categories:', this.availableCategories);
    console.log('🔍 Current Filters:', this.currentFilters);
    
    if (event) {
      event.stopPropagation();
    }
    this.showFilterDropdown = !this.showFilterDropdown;
    
    console.log('🔍 After:', this.showFilterDropdown);
    console.log('🔍 ==========================================');
    
    if (this.showFilterDropdown) {
      this.showSortDropdown = false; // Close sort dropdown if open
    }
  }

  /**
   * Toggle sort dropdown
   */
  toggleSortDropdown(event?: Event): void {
    console.log('📊 Toggle Sort - Before:', this.showSortDropdown);
    if (event) {
      event.stopPropagation();
    }
    this.showSortDropdown = !this.showSortDropdown;
    console.log('📊 Toggle Sort - After:', this.showSortDropdown);
    if (this.showSortDropdown) {
      this.showFilterDropdown = false; // Close filter dropdown if open
    }
  }

  /**
   * Close all dropdowns when clicking outside
   */
  closeDropdowns(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Don't close if clicking on dropdown button or inside dropdown
    if (!target.closest('.dropdown-container')) {
      if (this.showFilterDropdown || this.showSortDropdown) {
        console.log('❌ Closing dropdowns from outside click');
        this.showFilterDropdown = false;
        this.showSortDropdown = false;
      }
    }
  }

  /**
   * Toggle stock filter
   */
  toggleStockFilter(status: 'in-stock' | 'out-of-stock' | 'low-stock'): void {
    if (this.currentFilters.stockStatus === status) {
      this.currentFilters.stockStatus = undefined;
    } else {
      this.currentFilters.stockStatus = status;
    }
    this.updateProductsList();
  }

  /**
   * Toggle rating filter
   */
  toggleRatingFilter(rating: number): void {
    if (this.currentFilters.rating === rating) {
      this.currentFilters.rating = undefined;
    } else {
      this.currentFilters.rating = rating;
    }
    this.updateProductsList();
  }

  /**
   * Toggle category filter
   */
  toggleCategoryFilter(category: string): void {
    if (this.currentFilters.category === category) {
      this.currentFilters.category = undefined;
      this.currentFilters.subcategory = undefined;
      this.availableSubcategories = [];
    } else {
      this.currentFilters.category = category;
      this.currentFilters.subcategory = undefined;
      this.extractSubcategories(category);
    }
    this.updateProductsList();
  }

  /**
   * Toggle subcategory filter
   */
  toggleSubcategoryFilter(subcategory: string): void {
    if (this.currentFilters.subcategory === subcategory) {
      this.currentFilters.subcategory = undefined;
    } else {
      this.currentFilters.subcategory = subcategory;
    }
    this.updateProductsList();
  }

  /**
   * Toggle group filter
   */
  toggleGroupFilter(group: string): void {
    if (this.currentFilters.group === group) {
      this.currentFilters.group = undefined;
    } else {
      this.currentFilters.group = group;
    }
    this.updateProductsList();
  }

  /**
   * Sort products by field
   */
  sortBy(field: keyof Product): void {
    // Toggle order if same field, otherwise default to desc
    if (this.currentSortField === field) {
      this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSortField = field;
      this.currentSortOrder = 'desc';
    }
    this.updateProductsList();
    
    // Close sort dropdown after selection
    setTimeout(() => {
      this.showSortDropdown = false;
    }, 150);
  }

  /**
   * Quick sort by stock status
   */
  sortByStock(status: 'in-stock' | 'out-of-stock' | 'low-stock' | 'all'): void {
    if (status === 'all') {
      this.currentFilters = { ...this.currentFilters, stockStatus: undefined };
    } else {
      this.currentFilters = { ...this.currentFilters, stockStatus: status };
    }
    this.updateProductsList();
  }

  /**
   * Extract unique categories from products
   */
  extractCategories(): void {
    const categories = new Set<string>();
    this.allProducts.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    this.availableCategories = Array.from(categories).sort();
  }

  /**
   * Extract subcategories for selected category
   */
  extractSubcategories(category: string): void {
    const subcategories = new Set<string>();
    this.allProducts
      .filter(product => product.category === category)
      .forEach(product => {
        if (product.subcategory) {
          subcategories.add(product.subcategory);
        }
      });
    this.availableSubcategories = Array.from(subcategories).sort();
  }

  /**
   * Select category and update subcategories
   */
  selectCategory(category: string): void {
    this.currentFilters.category = category;
    this.currentFilters.subcategory = undefined; // Reset subcategory
    this.extractSubcategories(category);
    this.updateProductsList();
  }

  /**
   * Select subcategory
   */
  selectSubcategory(subcategory: string): void {
    this.currentFilters.subcategory = subcategory;
    this.updateProductsList();
  }

  /**
   * Update products list with current filters and sort
   */
  updateProductsList(): void {
    let result = [...this.allProducts];

    // Apply filters
    if (Object.keys(this.currentFilters).length > 0) {
      result = filterProductsByCriteria(result, this.currentFilters);
    }

    // Apply sort
    if (this.currentSortField) {
      result = sortProductsByField(result, this.currentSortField, this.currentSortOrder);
    }

    this.products = result;
    
    // Reset selection
    this.selectedCount = 0;
    this.selectAll = false;

    console.log(`Filtered & sorted: ${result.length} products`);
  }

  /**
   * Search products
   */
  searchProducts(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    console.log('Search:', query);
    
    if (!query || query.trim() === '') {
      // Reset to all products if search is empty
      this.updateProductsList();
    } else {
      // Search products by query
      let results = searchProductsByQuery(this.allProducts, query);
      
      // Apply current filters
      if (Object.keys(this.currentFilters).length > 0) {
        results = filterProductsByCriteria(results, this.currentFilters);
      }
      
      // Apply current sort
      if (this.currentSortField) {
        results = sortProductsByField(results, this.currentSortField, this.currentSortOrder);
      }
      
      this.products = results;
      console.log(`Search results: ${results.length} products`);
    }
    
    // Reset selection
    this.selectedCount = 0;
    this.selectAll = false;
  }

  /**
   * Get stock class for styling
   */
  getStockClass(stock: number): string {
    return getStockClass(stock);
  }

  /**
   * Get star rating array
   */
  getStarArray(rating: number | undefined): StarType[] {
    return getStarArray(rating);
  }
  
  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }
  
  /**
   * Get discount percentage
   */
  getDiscountPercentage(originalPrice: number, salePrice: number): number {
    return calculateDiscountPercentage(originalPrice, salePrice);
  }

  /**
   * Export products to CSV
   */
  exportToCSV(): void {
    const csvContent = exportProductsToCSV(this.products);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${getCurrentDate()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * ============================================================================
   * GROUP MANAGEMENT METHODS
   * ============================================================================
   */

  /**
   * Open group modal to create new group for selected products
   */
  openGroupModal(): void {
    const selected = getSelectedProducts(this.products);
    if (selected.length < 2) {
      alert('Vui lòng chọn ít nhất 2 sản phẩm để nhóm');
      return;
    }
    this.newGroupName = '';
    this.showGroupModal = true;
  }

  /**
   * Close group modal
   */
  closeGroupModal(): void {
    this.showGroupModal = false;
    this.newGroupName = '';
  }

  /**
   * Create group and assign to selected products
   */
  createGroup(): void {
    if (!this.newGroupName || this.newGroupName.trim() === '') {
      alert('Vui lòng nhập tên nhóm');
      return;
    }

    const groupName = this.newGroupName.trim();
    const selected = getSelectedProducts(this.products);

    // Add group to selected products
    this.products = this.products.map(product => {
      if (product.selected) {
        const groups = product.groups || [];
        if (!groups.includes(groupName)) {
          return {
            ...product,
            groups: [...groups, groupName],
            updated: getCurrentDate()
          };
        }
      }
      return product;
    });

    // Update allProducts as well
    this.allProducts = this.allProducts.map(product => {
      if (product.selected) {
        const groups = product.groups || [];
        if (!groups.includes(groupName)) {
          return {
            ...product,
            groups: [...groups, groupName],
            updated: getCurrentDate()
          };
        }
      }
      return product;
    });

    // Update group names list
    this.extractAllGroupNames();

    alert(`Đã nhóm ${selected.length} sản phẩm vào nhóm "${groupName}"`);
    this.closeGroupModal();
  }

  /**
   * Extract all unique group names from products
   */
  extractAllGroupNames(): void {
    const groupsSet = new Set<string>();
    this.allProducts.forEach(product => {
      if (product.groups && product.groups.length > 0) {
        product.groups.forEach(group => groupsSet.add(group));
      }
    });
    this.allGroupNames = Array.from(groupsSet).sort();
  }

  /**
   * Add selected group from dropdown to current product
   */
  addSelectedGroup(): void {
    if (!this.selectedGroupToAdd || this.selectedGroupToAdd.trim() === '') {
      return;
    }

    const groupName = this.selectedGroupToAdd.trim();
    if (!this.currentProduct.groups) {
      this.currentProduct.groups = [];
    }

    if (!this.currentProduct.groups.includes(groupName)) {
      this.currentProduct.groups.push(groupName);
    }

    // Reset dropdown to placeholder
    this.selectedGroupToAdd = '';
  }

  /**
   * Remove group from current product
   */
  removeGroupFromProduct(groupName: string): void {
    if (this.currentProduct.groups) {
      this.currentProduct.groups = this.currentProduct.groups.filter(g => g !== groupName);
    }
  }

}
