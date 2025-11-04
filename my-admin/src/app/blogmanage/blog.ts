import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

interface BlogJSON {
  id: string;
  img: string;
  title: string;
  excerpt: string;
  pubDate: string;
  author: string;
  categoryTag: string;
  content: string;
}

interface BlogPost {
  _id: string;
  blog_id: string;
  title: string;
  author: string;
  category: string;
  content: string;
  created_date: string;
  views: number;
  selected?: boolean;
}

@Component({
  selector: 'app-blog',
  imports: [CommonModule, FormsModule],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
  standalone: true
})
export class Blog implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  blogs: BlogPost[] = [];
  allBlogs: BlogPost[] = [];
  isLoading = false;
  loadError = '';

  selectedCount = 0;
  selectAll = false;
  searchQuery = '';
  selectedSort: string = '';
  
  // View mode: 'list' or 'detail'
  viewMode: 'list' | 'detail' = 'list';
  currentBlog: BlogPost | null = null;
  
  // Edit popup state
  showEditPopup = false;
  
  // Sort dropdown state
  showSortDropdown: boolean = false;
  currentSortBy: 'date' | 'views' = 'date';
  currentSortOrder: 'asc' | 'desc' = 'desc';
  
  // Product categories and subcategories for hashtag generation
  // Map: category -> Set of subcategories and product keywords
  categoryToSubcategories: Map<string, Set<string>> = new Map();

  ngOnInit(): void {
    this.loadProductCategories();
    this.loadBlogs();
    
    // Global click listener to close dropdowns
    document.addEventListener('click', () => {
      this.showSortDropdown = false;
      this.cdr.detectChanges();
    });
  }

  /**
   * Load blogs from JSON file
   */
  loadBlogs(): void {
    this.isLoading = true;
    this.loadError = '';
    
    console.log('🔄 Loading blogs from JSON...');
    
    // Load from public/data/blog.json
    this.http.get<BlogJSON[]>('data/blog.json').subscribe({
      next: (data) => {
        console.log('✅ SUCCESS: Loaded blogs!');
        console.log(`📊 Total blogs: ${data.length}`);
        
        // Map JSON data to BlogPost interface
        this.allBlogs = data.map((blog, index) => this.mapBlogJSONtoBlogPost(blog, index));
        this.blogs = [...this.allBlogs];
        this.isLoading = false;
        
        console.log('📝 Processed blogs:', this.allBlogs);
      },
      error: (error) => {
        console.error('❌ ERROR loading blogs:', error);
        this.loadError = 'Không thể tải danh sách bài viết';
        this.isLoading = false;
        this.loadSampleBlogs();
      }
    });
  }

  /**
   * Map BlogJSON to BlogPost interface
   */
  private mapBlogJSONtoBlogPost(blogJSON: BlogJSON, index: number): BlogPost {
    // Use blog id from data or generate one
    const blogId = `B${String(index + 1).padStart(4, '0')}`;
    
    // Use category from data or default to 'Sức khỏe'
    const category = blogJSON.categoryTag || 'Sức khỏe';
    
    // Generate random views
    const views = Math.floor(Math.random() * 5000) + 500;
    
    // Convert pubDate (YYYY-MM-DD) to DD/MM/YYYY format
    let created_date = '';
    if (blogJSON.pubDate) {
      const [year, month, day] = blogJSON.pubDate.split('-');
      created_date = `${day}/${month}/${year}`;
    }
    
    return {
      _id: blogJSON.id,
      blog_id: blogId,
      title: blogJSON.title,
      author: blogJSON.author,
      category: category,
      content: blogJSON.content,
      created_date: created_date,
      views: views,
      selected: false
    };
  }

  /**
   * Load sample blogs as fallback
   */
  private loadSampleBlogs(): void {
    this.allBlogs = [
      {
        _id: '1',
        blog_id: 'B0001',
        title: 'Công thức nấu canh chua chuẩn vị Bắc',
        author: 'Thanh Thinh Tran',
        category: 'Công thức nấu ăn',
        content: 'Nội dung bài viết...',
        created_date: '20/10/2025',
        views: 1234,
        selected: false
      },
      {
        _id: '2',
        blog_id: 'B0002',
        title: 'Rau má có tác dụng gì với sức khỏe?',
        author: 'Thanh Thinh Tran',
        category: 'Sức khỏe',
        content: 'Nội dung bài viết...',
        created_date: '20/01/2025',
        views: 5689,
        selected: false
      }
    ];
    this.blogs = [...this.allBlogs];
  }

  /**
   * Format date to Vietnamese format
   */
  formatDate(dateStr: string): string {
    if (dateStr.includes('/')) {
      return dateStr; // Already formatted
    }
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Toggle select all blogs
   */
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.blogs.forEach(blog => blog.selected = this.selectAll);
    this.updateSelectedCount();
  }

  /**
   * Toggle individual blog selection
   */
  toggleBlog(blog: BlogPost): void {
    blog.selected = !blog.selected;
    this.updateSelectedCount();
    this.selectAll = this.blogs.every(b => b.selected);
  }

  /**
   * Update selected count
   */
  updateSelectedCount(): void {
    this.selectedCount = this.blogs.filter(b => b.selected).length;
  }

  /**
   * Search blogs
   */
  searchBlogs(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    
    if (!query || query.trim() === '') {
      this.blogs = [...this.allBlogs];
    } else {
      const searchTerm = query.toLowerCase().trim();
      this.blogs = this.allBlogs.filter(blog => {
        return (
          blog.title.toLowerCase().includes(searchTerm) ||
          blog.blog_id.toLowerCase().includes(searchTerm) ||
          blog.author.toLowerCase().includes(searchTerm) ||
          blog.category.toLowerCase().includes(searchTerm)
        );
      });
    }
    
    // Reset selection
    this.selectedCount = 0;
    this.selectAll = false;
  }

  /**
   * Edit selected blogs
   */
  editBlogs(): void {
    const selected = this.blogs.filter(b => b.selected);
    
    if (selected.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bài viết để chỉnh sửa');
      return;
    }

    if (selected.length === 1) {
      // Edit single blog - you can navigate to detail page
      console.log('Edit blog:', selected[0].blog_id);
      alert(`Chỉnh sửa bài viết: ${selected[0].title}`);
    } else {
      // Batch edit multiple blogs
      alert(`Chỉnh sửa hàng loạt ${selected.length} bài viết`);
    }
  }

  /**
   * Delete selected blogs
   */
  deleteBlogs(): void {
    const selected = this.blogs.filter(b => b.selected);
    
    if (selected.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bài viết để xóa');
      return;
    }

    if (confirm(`Xóa ${selected.length} bài viết? Hành động này không thể hoàn tác!`)) {
      const selectedIds = selected.map(b => b._id);
      this.blogs = this.blogs.filter(b => !selectedIds.includes(b._id));
      this.allBlogs = this.allBlogs.filter(b => !selectedIds.includes(b._id));
      
      this.selectedCount = 0;
      this.selectAll = false;
      
      console.log('Deleted blogs:', selectedIds);
    }
  }

  /**
   * Add new blog
   */
  addNewBlog(): void {
    // Navigate to blog creation page or open modal
    alert('Thêm bài viết mới');
  }

  /**
   * View blog detail
   */
  viewBlogDetail(blog: BlogPost): void {
    console.log('View blog:', blog.blog_id);
    this.currentBlog = blog;
    this.viewMode = 'detail';
  }

  /**
   * Back to blog list
   */
  backToList(): void {
    this.viewMode = 'list';
    this.currentBlog = null;
  }

  /**
   * Delete current blog
   */
  deleteCurrentBlog(): void {
    if (!this.currentBlog) return;
    
    if (confirm(`Xóa bài viết "${this.currentBlog.title}"? Hành động này không thể hoàn tác!`)) {
      const blogId = this.currentBlog._id;
      this.blogs = this.blogs.filter(b => b._id !== blogId);
      this.allBlogs = this.allBlogs.filter(b => b._id !== blogId);
      
      console.log('Deleted blog:', blogId);
      this.backToList();
    }
  }

  /**
   * Save current blog changes
   */
  saveCurrentBlog(): void {
    if (!this.currentBlog) return;
    
    console.log('Saving blog:', this.currentBlog);
    alert('Đã lưu thay đổi bài viết!');
    this.backToList();
  }

  /**
   * Open edit popup
   */
  openEditPopup(): void {
    this.showEditPopup = true;
  }

  /**
   * Close edit popup
   */
  closeEditPopup(): void {
    this.showEditPopup = false;
  }

  /**
   * Save from popup and close
   */
  saveFromPopup(): void {
    if (!this.currentBlog) return;
    
    console.log('Saving blog from popup:', this.currentBlog);
    alert('Đã lưu thay đổi!');
    this.showEditPopup = false;
  }

  /**
   * Filter blogs by category
   */
  filterByCategory(category: string): void {
    if (category === 'all') {
      this.blogs = [...this.allBlogs];
    } else {
      this.blogs = this.allBlogs.filter(b => b.category === category);
    }
  }

  /**
   * Sort blogs based on selected option
   */
  /**
   * Sort by date
   */
  sortByDate(order: 'asc' | 'desc' = 'desc'): void {
    this.currentSortBy = 'date';
    this.currentSortOrder = order;
    
    this.blogs.sort((a, b) => {
      const dateA = a.created_date ? this.parseDate(a.created_date) : 0;
      const dateB = b.created_date ? this.parseDate(b.created_date) : 0;
      
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    console.log(`📊 Sorted blogs by date: ${order}`);
    this.closeSortDropdown();
  }

  /**
   * Sort by views
   */
  sortByViews(order: 'asc' | 'desc' = 'desc'): void {
    this.currentSortBy = 'views';
    this.currentSortOrder = order;
    
    this.blogs.sort((a, b) => {
      const viewsA = a.views || 0;
      const viewsB = b.views || 0;
      
      return order === 'asc' ? viewsA - viewsB : viewsB - viewsA;
    });
    
    console.log(`📊 Sorted blogs by views: ${order}`);
    this.closeSortDropdown();
  }

  /**
   * Toggle sort order (asc/desc)
   */
  toggleSortOrder(): void {
    const newOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
    
    if (this.currentSortBy === 'date') {
      this.sortByDate(newOrder);
    } else if (this.currentSortBy === 'views') {
      this.sortByViews(newOrder);
    }
  }

  /**
   * Toggle sort dropdown
   */
  toggleSortDropdown(event: Event): void {
    event.stopPropagation();
    this.showSortDropdown = !this.showSortDropdown;
    console.log('🔄 Toggle dropdown:', this.showSortDropdown);
    this.cdr.detectChanges();
  }

  /**
   * Close sort dropdown
   */
  closeSortDropdown(): void {
    this.showSortDropdown = false;
    this.cdr.detectChanges();
  }

  /**
   * Parse date string DD/MM/YYYY to timestamp
   */
  private parseDate(dateString: string): number {
    if (!dateString) return 0;
    
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    
    return 0;
  }

  /**
   * Close dropdowns when clicking outside
   */
  closeDropdowns(event: Event): void {
    // Can be used for dropdown functionality if needed
  }

  /**
   * Load product categories and subcategories for hashtag generation
   */
  loadProductCategories(): void {
    console.log('🔄 Loading product categories...');
    
    this.http.get<any[]>('data/product.json').subscribe({
      next: (products) => {
        // Build map of category -> subcategories and product keywords
        products.forEach(product => {
          if (product.category) {
            // Split by comma in case of multiple categories
            const categories = product.category.split(',').map((c: string) => c.trim().toLowerCase());
            
            categories.forEach((cat: string) => {
              if (!this.categoryToSubcategories.has(cat)) {
                this.categoryToSubcategories.set(cat, new Set<string>());
              }
              
              const keywordsSet = this.categoryToSubcategories.get(cat)!;
              
              // Add subcategories
              if (product.subcategory) {
                const subcategories = product.subcategory.split(',').map((s: string) => s.trim().toLowerCase());
                subcategories.forEach((subcat: string) => keywordsSet.add(subcat));
              }
              
              // Extract keywords from product_name
              if (product.product_name) {
                const productName = product.product_name.toLowerCase();
                
                // Common fruit/vegetable/food names to extract
                const keywords = [
                  // Trái cây (Fruits)
                  'cam', 'quýt', 'bưởi', 'dâu', 'dâu tây', 'kiwi', 'ổi', 'xoài', 'thanh long', 
                  'dưa', 'táo', 'lê', 'chuối', 'nho', 'măng cụt', 'chôm chôm', 'nhãn', 'vải',
                  'đu đủ', 'dưa hấu', 'dưa lưới', 'dưa gang', 'mận', 'mơ', 'anh đào', 'cherry',
                  'việt quất', 'quả mọng', 'dâu đen', 'mâm xôi', 'hồng', 'bơ',
                  
                  // Rau củ (Vegetables)
                  'cà chua', 'cà rót', 'cà pháo', 'rau', 'súp lơ', 'bông cải', 'cải', 'bắp',
                  'khoai', 'khoai lang', 'khoai tây', 'củ', 'hành', 'tỏi', 'gừng', 'sả', 'ớt',
                  'rau bina', 'cải xoăn', 'cải bó xôi', 'cải thảo', 'rau muống', 'rau đay',
                  'cần tây', 'dưa chuột', 'dưa leo', 'bí đỏ', 'bí đao', 'mướp đắng', 'mướp',
                  'củ dền', 'su hào', 'cà rốt', 'củ cải', 'rau má', 'rau húng', 'ngò',
                  'cải xanh', 'bắp cải', 'súp lơ xanh', 'súp lơ trắng', 'cà tím',
                  
                  // Các loại hạt (Nuts & Seeds)
                  'hạnh nhân', 'óc chó', 'hạt lanh', 'hạt chia', 'đậu', 'đậu đen', 'đậu lăng',
                  'đậu hũ', 'đậu nành', 'đậu xanh', 'đậu đỏ', 'hạt điều', 'hạt hướng dương',
                  
                  // Ngũ cốc (Grains)
                  'yến mạch', 'ngô', 'bắp', 'gạo', 'lúa mạch',
                  
                  // Đồ uống (Beverages)
                  'cacao', 'ca cao', 'cà phê', 'trà', 'chanh',
                  
                  // Nấm (Mushrooms)
                  'nấm', 'nấm hương', 'nấm rơm', 'nấm mỡ',
                  
                  // Chất dinh dưỡng và hợp chất (Nutrients)
                  'vitamin', 'protein', 'chất xơ', 'omega', 'omega-3', 'omega-6',
                  'papain', 'lycopene', 'lutein', 'zeaxanthin', 'glucosinolates',
                  'flavonoids', 'betalains', 'pectin', 'curcumin', 'nitrat',
                  
                  // Các từ khóa khác (Other keywords)
                  'salad', 'nghệ', 'húng quế', 'rau thơm'
                ];
                
                // Check for 2-word combinations first (to match "dâu tây" before "dâu")
                const twoWordKeywords = keywords.filter(k => k.includes(' '));
                twoWordKeywords.forEach(keyword => {
                  if (productName.includes(keyword)) {
                    keywordsSet.add(keyword);
                  }
                });
                
                // Then check single words
                const singleWordKeywords = keywords.filter(k => !k.includes(' '));
                singleWordKeywords.forEach(keyword => {
                  if (productName.includes(keyword)) {
                    keywordsSet.add(keyword);
                  }
                });
                
                // Also extract first 1-2 words from product name as potential keywords
                // Remove common brand/measurement words
                const cleanProductName = productName
                  .replace(/co\.op select|kg|gói|hộp|chai|lon|túi|thùng|organic|hữu cơ|\d+g|\d+kg|–|-|\(.*?\)/gi, ' ')
                  .trim();
                
                const firstWords = cleanProductName.split(/\s+/).slice(0, 2).join(' ').trim();
                if (firstWords && firstWords.length > 2) {
                  keywordsSet.add(firstWords);
                }
              }
            });
          }
        });
        
        console.log('✅ Loaded category mappings:');
        this.categoryToSubcategories.forEach((subcats, cat) => {
          console.log(`  ${cat}: ${Array.from(subcats).slice(0, 10).join(', ')}...`);
        });
      },
      error: (error) => {
        console.error('❌ Error loading product categories:', error);
      }
    });
  }

  /**
   * Generate automatic hashtags based on blog content matching product categories/subcategories
   */
  generateAutoHashtags(blog: BlogPost): string[] {
    if (!blog) return [];
    
    // Check if product categories are loaded
    if (this.categoryToSubcategories.size === 0) {
      console.warn('⚠️ Product categories not loaded yet, cannot generate hashtags');
      return [];
    }
    
    const hashtags: Set<string> = new Set();
    
    // Combine title and content for keyword matching
    const blogText = `${blog.title} ${blog.content || ''}`.toLowerCase();
    
    // Remove HTML tags from content for better matching
    const cleanText = blogText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    
    console.log(`🏷️ Generating hashtags for: "${blog.title}"`);
    console.log(`📝 Blog category: ${blog.category}`);
    console.log(`📄 Content length: ${cleanText.length} chars`);
    
    // Get blog's category (lowercase for matching)
    const blogCategory = blog.category ? blog.category.toLowerCase() : '';
    
    // Find matching category in our map (handle partial matches)
    let relevantKeywords: Set<string> | undefined;
    
    // Try exact match first
    if (this.categoryToSubcategories.has(blogCategory)) {
      relevantKeywords = this.categoryToSubcategories.get(blogCategory);
    } else {
      // Try partial match (e.g., "Trái cây" in blog matches "trái cây" in products)
      for (const [category, keywords] of this.categoryToSubcategories.entries()) {
        if (blogCategory.includes(category) || category.includes(blogCategory)) {
          relevantKeywords = keywords;
          break;
        }
      }
    }
    
    // If no specific category match, search ALL keywords from ALL categories
    // This is useful for generic categories like "Nông sản", "Chế biến", "Dinh dưỡng"
    if (!relevantKeywords || relevantKeywords.size === 0) {
      relevantKeywords = new Set<string>();
      this.categoryToSubcategories.forEach((keywords) => {
        keywords.forEach(keyword => relevantKeywords!.add(keyword));
      });
    }
    
    // If we found relevant keywords
    if (relevantKeywords) {
      console.log(`🔍 Checking ${relevantKeywords.size} keywords...`);
      
      relevantKeywords.forEach(keyword => {
        // Check if keyword appears in blog content
        if (cleanText.includes(keyword)) {
          // Format hashtag: capitalize first letter of each word
          const words = keyword.split(' ');
          const formattedHashtag = words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          hashtags.add(formattedHashtag);
        }
      });
    }
    
    console.log(`✅ Generated ${hashtags.size} hashtags:`, Array.from(hashtags).join(', '));
    
    // Limit to top 8 hashtags to avoid clutter
    const hashtagArray = Array.from(hashtags);
    return hashtagArray.slice(0, 8);
  }

  /**
   * Get auto-generated hashtags for current blog as string (for input field)
   */
  getAutoGeneratedHashtags(): string {
    if (!this.currentBlog) return '';
    
    const hashtags = this.generateAutoHashtags(this.currentBlog);
    return hashtags.map(tag => `#${tag}`).join(', ');
  }

  /**
   * Get auto-generated hashtags for current blog as array (for badges)
   */
  getAutoGeneratedHashtagsArray(): string[] {
    if (!this.currentBlog) return [];
    
    return this.generateAutoHashtags(this.currentBlog);
  }

  /**
   * Update blog content from contenteditable div
   */
  updateBlogContent(event: Event): void {
    if (!this.currentBlog) return;
    
    const target = event.target as HTMLElement;
    this.currentBlog.content = target.innerHTML;
    
    console.log('📝 Content updated:', this.currentBlog.content.substring(0, 100) + '...');
  }

  /**
   * Execute formatting command
   */
  execCommand(command: string, value: string = ''): void {
    document.execCommand(command, false, value);
  }

  /**
   * Format block (heading, paragraph)
   */
  formatBlock(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    document.execCommand('formatBlock', false, value);
  }

  /**
   * Insert link
   */
  insertLink(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      alert('Vui lòng chọn văn bản để thêm liên kết');
      return;
    }

    const url = prompt('Nhập URL (ví dụ: https://example.com):');
    if (url && url.trim()) {
      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const confirm = window.confirm('URL không có http:// hoặc https://. Thêm https:// tự động?');
        if (confirm) {
          document.execCommand('createLink', false, 'https://' + url);
        } else {
          document.execCommand('createLink', false, url);
        }
      } else {
        document.execCommand('createLink', false, url);
      }
    }
  }

  /**
   * Insert image
   */
  insertImage(): void {
    const url = prompt('Nhập URL của ảnh (ví dụ: https://example.com/image.jpg):');
    if (url && url.trim()) {
      // Validate image URL
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasValidExt = validExtensions.some(ext => url.toLowerCase().includes(ext));
      
      if (!hasValidExt && !url.startsWith('http')) {
        alert('URL không hợp lệ. Vui lòng nhập URL hình ảnh có định dạng jpg, png, gif, webp hoặc svg');
        return;
      }

      // Insert image with basic styling
      const img = `<img src="${url}" alt="Ảnh" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;">`;
      document.execCommand('insertHTML', false, img);
    }
  }

  /**
   * Change font family
   */
  changeFontFamily(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const fontFamily = target.value;
    if (fontFamily) {
      document.execCommand('fontName', false, fontFamily);
    }
  }

  /**
   * Change font size
   */
  changeFontSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const fontSize = target.value;
    document.execCommand('fontSize', false, fontSize);
  }

  /**
   * Change text color
   */
  changeTextColor(event: Event): void {
    const target = event.target as HTMLInputElement;
    const color = target.value;
    document.execCommand('foreColor', false, color);
  }

  /**
   * Change highlight/background color
   */
  changeHighlightColor(event: Event): void {
    const target = event.target as HTMLInputElement;
    const color = target.value;
    document.execCommand('backColor', false, color);
  }

  /**
   * Clear formatting
   */
  clearFormatting(): void {
    document.execCommand('removeFormat', false);
    document.execCommand('unlink', false); // Also remove links
  }
}

