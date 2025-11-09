import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// Interface cho Blog Post - Khớp với MongoDB schema
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

@Component({
  selector: 'app-blog',
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './blog.html',
  styleUrls: ['./blog.css'],
})
export class Blog implements OnInit {
  // Dữ liệu blog
  allBlogs: BlogPost[] = [];
  displayedBlogs: BlogPost[] = [];
  featuredPost: BlogPost | null = null;

  // Pagination
  currentPage = 1;
  postsPerPage = 9;
  totalPages = 0;

  // Load more functionality
  hasMorePosts = false;
  isLoadingMore = false;
  displayedPostsCount = 9; // Số bài viết hiện đang hiển thị

  // Search và Filter
  searchTerm = '';
  selectedCategory = '';
  categories: string[] = [];

  // Loading states
  isLoading = true;
  error = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadBlogData();
  }

  // Load dữ liệu từ backend API
  async loadBlogData() {
    try {
      this.isLoading = true;
      this.error = '';

      // Load data từ backend API
      const response = await this.http
        .get<{ success: boolean; data: BlogPost[]; count: number }>(
          'http://localhost:3000/api/blogs'
        )
        .toPromise();

      if (response && response.success && response.data) {
        // console.log(' [Blog] Loaded from MongoDB:', response.count);
        // console.log(' [Blog] Sample blog:', response.data[0]);

        // Map và convert pubDate nếu cần, và normalize blog IDs
        this.allBlogs = response.data.map((blog) => {
          // Normalize ID: trim và loại bỏ dấu phẩy thừa
          let normalizedId = blog.id;
          if (normalizedId && typeof normalizedId === 'string') {
            normalizedId = normalizedId.trim().replace(/,$/, '').trim();
          }

          // Đảm bảo pubDate là string ISO
          let pubDateStr = blog.pubDate;
          if (pubDateStr instanceof Date) {
            pubDateStr = pubDateStr.toISOString();
          } else if (typeof pubDateStr === 'string') {
            // Nếu đã là string, giữ nguyên
            pubDateStr = pubDateStr;
          } else {
            // Fallback
            pubDateStr = new Date().toISOString();
          }

          return {
            ...blog,
            id: normalizedId, // Sử dụng ID đã normalize
            pubDate: pubDateStr,
          };
        });

        // console.log(' [Blog] Processed blogs:', this.allBlogs.length);
        this.setupBlogData();
      } else {
        // console.error(' [Blog] Invalid response:', response);
        this.error = 'Không thể tải dữ liệu blog. Vui lòng thử lại sau.';
      }
    } catch (err) {
      console.error(' [Blog] Error loading from backend:', err);
      this.error = 'Không thể tải dữ liệu blog. Vui lòng thử lại sau.';

      // Fallback: thử load từ JSON nếu backend lỗi
      try {
        const fallbackResponse = await this.http
          .get<BlogPost[]>('../../data/blog.json')
          .toPromise();
        if (fallbackResponse) {
          // console.log(' [Blog] Using fallback JSON data');
          this.allBlogs = fallbackResponse;
          this.setupBlogData();
          this.error = '';
        }
      } catch (fallbackErr) {
        console.error(' [Blog] Fallback also failed:', fallbackErr);
      }
    } finally {
      this.isLoading = false;
    }
  }

  // Setup dữ liệu sau khi load
  setupBlogData() {
    // Sắp xếp theo ngày đăng mới nhất
    this.allBlogs.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Lấy bài viết đầu tiên làm featured post
    this.featuredPost = this.allBlogs[0];

    // Lấy danh sách categories
    this.categories = [...new Set(this.allBlogs.map((blog) => blog.categoryTag))];

    // Setup pagination
    this.updatePagination();
  }

  // Cập nhật pagination
  updatePagination() {
    const filteredBlogs = this.getFilteredBlogs();
    this.totalPages = Math.ceil(filteredBlogs.length / this.postsPerPage);
    this.currentPage = 1;
    this.displayedPostsCount = 9; // Reset về 9 bài viết ban đầu
    this.updateDisplayedBlogs();
    this.updateHasMorePosts();
  }

  // Lấy danh sách blog đã filter
  getFilteredBlogs(): BlogPost[] {
    let filtered = this.allBlogs;

    // Filter theo category
    if (this.selectedCategory) {
      filtered = filtered.filter((blog) => blog.categoryTag === this.selectedCategory);
    }

    // Filter theo search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (blog) =>
          blog.title.toLowerCase().includes(term) ||
          blog.excerpt.toLowerCase().includes(term) ||
          blog.author.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  // Cập nhật danh sách blog hiển thị
  updateDisplayedBlogs() {
    const filteredBlogs = this.getFilteredBlogs();
    this.displayedBlogs = filteredBlogs.slice(0, this.displayedPostsCount);
    this.updateHasMorePosts();
  }

  // Cập nhật trạng thái có thêm bài viết không
  updateHasMorePosts() {
    const filteredBlogs = this.getFilteredBlogs();
    this.hasMorePosts = this.displayedPostsCount < filteredBlogs.length;
  }

  // Search
  onSearch() {
    this.displayedPostsCount = 9; // Reset về 9 bài viết
    this.updatePagination();
  }

  // Search focus events
  onSearchFocus() {
    this.isSearchFocused = true;
  }

  onSearchBlur() {
    this.isSearchFocused = false;
  }

  // Search state
  isSearchFocused: boolean = false;
  isSearchDropdownOpen: boolean = false;
  searchQuery: string = '';
  searchHistory: string[] = [];
  searchSuggestions: string[] = [];
  // Filter theo category
  onCategoryFilter(category: string) {
    this.selectedCategory = category === this.selectedCategory ? '' : category;
    this.displayedPostsCount = 9; // Reset về 9 bài viết
    this.updatePagination();
  }

  // Format ngày tháng - Xử lý cả Date object và string
  formatDate(dateInput: string | Date): string {
    let date: Date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      date = new Date();
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Scroll to top
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Load thêm bài viết
  loadMorePosts() {
    if (this.isLoadingMore || !this.hasMorePosts) return;

    this.isLoadingMore = true;

    // Tăng số lượng bài viết hiển thị thêm 9 bài
    this.displayedPostsCount += 9;
    this.updateDisplayedBlogs();
    this.isLoadingMore = false;

    // Scroll xuống dưới để xem bài viết mới
    setTimeout(() => {
      const postsGrid = document.querySelector('.posts-grid');
      if (postsGrid) {
        postsGrid.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }, 50);
  }

  // Lazy loading cho ảnh
  onImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '1';
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/400x300?text=No+Image';
  }
}
