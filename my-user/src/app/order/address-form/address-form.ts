import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ScrollLockService } from '../../services/scroll-lock.service';
import { AuthService } from '../../services/auth.service';
import { AddressService } from '../../services/address.service';

export interface AddressInfo {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  ward: string;
  detail: string;
  notes?: string;
  deliveryMethod: 'standard' | 'express';
  isDefault?: boolean;
}

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './address-form.html',
  styleUrl: './address-form.css',
})
export class AddressFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() addressInfo: AddressInfo = {
    fullName: '',
    phone: '',
    email: '',
    city: '',
    district: '',
    ward: '',
    detail: '',
    deliveryMethod: 'standard',
  };

  @Output() addressComplete = new EventEmitter<AddressInfo>();
  @Output() closeModal = new EventEmitter<void>();

 // Validation states
  errors: any = {};
  isSubmitting = false;

 // Checkbox state cho "Đặt làm địa chỉ mặc định"
  setAsDefault = false; // Mặc định không tick

 // Address data for dropdowns
  cities: any[] = [];
  districts: any[] = [];
  wards: any[] = [];
  
  // Tree data loaded from JSON file
  private addressTree: any = null;

 // Custom select states
  showCityDropdown = false;
  showDistrictDropdown = false;
  showWardDropdown = false;
  
  isLoadingCities = false;
  isLoadingDistricts = false;
  isLoadingWards = false;

  constructor(
    private scrollLock: ScrollLockService,
    private authService: AuthService,
    private addressService: AddressService,
    private http: HttpClient
  ) {}
  
  // Mapping between provinces.json codes and tree_complete.json codes
  // Some provinces have different codes in the two files
  private provinceCodeMapping: { [key: string]: string } = {
    '30': '79', // HCM: provinces.json uses "30", tree_complete.json uses "79"
    '01': '01', // Hà Nội
    '48': '48', // Đà Nẵng
    // Add more mappings as needed
  };

  ngOnChanges(changes: SimpleChanges) {
 // Được gọi khi @Input() thay đổi, VÀ trước ngOnInit
    if (changes['addressInfo']) {
 console.log(' AddressInfo changed:', this.addressInfo);
 // Điền thông tin tự động khi nhận được addressInfo từ parent
      this.fillUserInfo();
    }
  }

  ngOnInit() {
 // Reset checkbox về mặc định khi mở form
    this.setAsDefault = false;

 // Load cities/provinces from API
    this.loadCities();

 // Load address tree for districts and wards
    this.loadAddressTree();

 // Điền thông tin lần đầu khi component khởi tạo
    this.fillUserInfo();

 // Khôi phục dữ liệu khi form được mở lại
 console.log('AddressForm ngOnInit - addressInfo:', this.addressInfo);
    this.restoreFormData();

 // Lock scroll khi modal mở
    this.scrollLock.lock();
  }
  
  /**
   * Load cities/provinces from API
   */
  private loadCities(): void {
    this.isLoadingCities = true;
    this.http.get<any[]>('http://localhost:3000/api/provinces').subscribe({
      next: (provinces: any[]) => {
        console.log('✅ Loaded provinces from API:', provinces.length);
        // Map provinces to cities format
        this.cities = provinces.map((province: any) => ({
          id: province.slug || province.code || province.name.toLowerCase().replace(/\s+/g, '-'),
          code: province.code,
          name: province.fullName || province.name,
          slug: province.slug,
          type: province.type,
        }));
        console.log('✅ Mapped cities:', this.cities.length);
        this.isLoadingCities = false;
        
        // After loading cities, restore form data if city is already selected
        if (this.addressInfo.city) {
          this.restoreFormData();
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading provinces:', error);
        // Fallback to mock data
        this.cities = [
          { id: 'hcm', name: 'Thành phố Hồ Chí Minh', code: '79', slug: 'ho-chi-minh', type: 'city' },
          { id: 'hn', name: 'Hà Nội', code: '01', slug: 'ha-noi', type: 'city' },
          { id: 'dn', name: 'Đà Nẵng', code: '48', slug: 'da-nang', type: 'city' },
        ];
        this.isLoadingCities = false;
      },
    });
  }
  
  /**
   * Load address tree from JSON file for districts and wards
   */
  private loadAddressTree(): void {
    this.http.get<any>('data/address/tree_complete.json').subscribe({
      next: (tree: any) => {
        console.log('✅ Loaded address tree from JSON');
        this.addressTree = tree;
      },
      error: (error: any) => {
        console.error('❌ Error loading address tree:', error);
        this.addressTree = null;
      },
    });
  }

  ngOnDestroy() {
 // Unlock scroll khi modal đóng
    this.scrollLock.unlock();
  }

 // Tự động điền thông tin từ tài khoản đăng nhập
  private fillUserInfo() {
 // Force reload user từ localStorage trước (giống personal-information.ts)
    this.authService.reloadUserFromStorage();

 // Lấy user từ AuthService
    let currentUser: any = this.authService.getCurrentUser();

 // Nếu không có, thử lấy trực tiếp từ localStorage
    if (!currentUser) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          currentUser = JSON.parse(userStr);
 console.log(' [AddressForm] Lấy user từ localStorage:', currentUser);
        } catch (error) {
 console.error(' [AddressForm] Lỗi parse user:', error);
        }
      }
    }

    if (!currentUser) {
 console.log(' [AddressForm] Không có user đăng nhập');
      return;
    }

 console.log(' [AddressForm] Current user:', currentUser);
 console.log(' [AddressForm] Current addressInfo:', this.addressInfo);

 // Chỉ điền nếu các trường còn trống
    if (!this.addressInfo.phone || this.addressInfo.phone.trim() === '') {
 // Thử nhiều key khác nhau (giống personal-information.ts)
      this.addressInfo.phone =
        currentUser.phoneNumber || currentUser.Phone || currentUser.phone || '';
 console.log(' [AddressForm] Đã điền số điện thoại:', this.addressInfo.phone);
    }

    if (!this.addressInfo.fullName || this.addressInfo.fullName.trim() === '') {
      this.addressInfo.fullName =
        currentUser.fullName || currentUser.FullName || currentUser.name || '';
 console.log(' [AddressForm] Đã điền họ tên:', this.addressInfo.fullName);
    }

    if (!this.addressInfo.email || this.addressInfo.email.trim() === '') {
      this.addressInfo.email = currentUser.email || currentUser.Email || '';
 console.log(' [AddressForm] Đã điền email:', this.addressInfo.email);
    }

 console.log(' [AddressForm] Final addressInfo:', this.addressInfo);
  }

  private restoreFormData() {
 // Nếu đã có city được chọn, khôi phục districts
    if (this.addressInfo.city) {
 console.log('Restoring districts for city:', this.addressInfo.city);
      // Wait for cities to load if not loaded yet
      if (this.cities.length === 0) {
        setTimeout(() => this.restoreFormData(), 100);
        return;
      }
      this.loadDistricts();

 // Nếu đã có district được chọn, khôi phục wards
      if (this.addressInfo.district) {
 console.log('Restoring wards for district:', this.addressInfo.district);
        this.loadWards();
      }
    }
  }

  private loadDistricts() {
    if (!this.addressInfo.city) {
      this.districts = [];
      return;
    }
    
    // Find city by id (slug) or code
    const selectedCity = this.cities.find(
      (c) => c.id === this.addressInfo.city || c.slug === this.addressInfo.city || c.code === this.addressInfo.city
    );
    
    if (!selectedCity) {
      console.warn('⚠️ City not found:', this.addressInfo.city);
      this.districts = [];
      return;
    }
    
    // Get the code from provinces.json and map it to tree_complete.json code
    const provinceCode = selectedCity.code;
    const treeCode = this.provinceCodeMapping[provinceCode] || provinceCode;
    
    console.log(`🔍 Loading districts for city: ${selectedCity.name}, province code: ${provinceCode}, tree code: ${treeCode}`);
    
    // Load districts from address tree
    if (this.addressTree && this.addressTree[treeCode]) {
      const provinceData = this.addressTree[treeCode];
      if (provinceData['quan-huyen']) {
        const districtsData = provinceData['quan-huyen'];
        this.districts = Object.keys(districtsData).map((code) => ({
          id: districtsData[code].slug || code,
          code: code,
          name: districtsData[code].name_with_type || districtsData[code].name,
          slug: districtsData[code].slug,
          type: districtsData[code].type,
          parent_code: districtsData[code].parent_code,
        }));
        console.log(`✅ Loaded ${this.districts.length} districts for city: ${selectedCity.name}`);
      } else {
        console.warn('⚠️ No districts found in tree for code:', treeCode);
        this.districts = [];
      }
    } else {
      // Fallback to mock data if tree not loaded
      console.warn('⚠️ Address tree not loaded or city code not found, using fallback data');
      this.districts = [
        { id: 'q1', name: 'Quận 1', code: '001', slug: 'quan-1', type: 'quan' },
        { id: 'q2', name: 'Quận 2', code: '002', slug: 'quan-2', type: 'quan' },
        { id: 'q3', name: 'Quận 3', code: '003', slug: 'quan-3', type: 'quan' },
      ];
    }
  }

  private loadWards() {
    if (!this.addressInfo.district || !this.addressInfo.city) {
      this.wards = [];
      return;
    }
    
    // Find city by id (slug) or code
    const selectedCity = this.cities.find(
      (c) => c.id === this.addressInfo.city || c.slug === this.addressInfo.city || c.code === this.addressInfo.city
    );
    
    if (!selectedCity) {
      console.warn('⚠️ City not found:', this.addressInfo.city);
      this.wards = [];
      return;
    }
    
    // Get the code from provinces.json and map it to tree_complete.json code
    const provinceCode = selectedCity.code;
    const treeCode = this.provinceCodeMapping[provinceCode] || provinceCode;
    
    // Find district by id (slug) or code
    const selectedDistrict = this.districts.find(
      (d) => d.id === this.addressInfo.district || d.slug === this.addressInfo.district || d.code === this.addressInfo.district
    );
    
    if (!selectedDistrict) {
      console.warn('⚠️ District not found:', this.addressInfo.district);
      this.wards = [];
      return;
    }
    
    const districtCode = selectedDistrict.code;
    
    console.log(`🔍 Loading wards for district: ${selectedDistrict.name}, district code: ${districtCode}, tree code: ${treeCode}`);
    
    // Load wards from address tree
    if (this.addressTree && this.addressTree[treeCode]) {
      const provinceData = this.addressTree[treeCode];
      if (provinceData['quan-huyen'] && provinceData['quan-huyen'][districtCode]) {
        const districtData = provinceData['quan-huyen'][districtCode];
        if (districtData['xa-phuong']) {
          const wardsData = districtData['xa-phuong'];
          this.wards = Object.keys(wardsData).map((code) => ({
            id: wardsData[code].slug || code,
            code: code,
            name: wardsData[code].name_with_type || wardsData[code].name,
            slug: wardsData[code].slug,
            type: wardsData[code].type,
            parent_code: wardsData[code].parent_code,
          }));
          console.log(`✅ Loaded ${this.wards.length} wards for district: ${selectedDistrict.name}`);
        } else {
          console.warn('⚠️ No wards found in district:', districtCode);
          this.wards = [];
        }
      } else {
        console.warn('⚠️ District not found in tree:', districtCode);
        this.wards = [];
      }
    } else {
      // Fallback to mock data if tree not loaded
      console.warn('⚠️ Address tree not loaded or city code not found, using fallback data');
      this.wards = [
        { id: 'p1', name: 'Phường 1', code: '00001', slug: 'phuong-1', type: 'phuong' },
        { id: 'p2', name: 'Phường 2', code: '00002', slug: 'phuong-2', type: 'phuong' },
        { id: 'p3', name: 'Phường 3', code: '00003', slug: 'phuong-3', type: 'phuong' },
      ];
    }
  }

  onCityChange() {
 // Load districts và chỉ reset nếu district hiện tại không hợp lệ
    const previousDistrict = this.addressInfo.district;
    const previousWard = this.addressInfo.ward;
    this.loadDistricts();

 // Kiểm tra nếu district cũ không tồn tại trong danh sách mới thì mới reset
    const districtExists = this.districts.some(
      (d) => d.id === previousDistrict || d.slug === previousDistrict || d.code === previousDistrict
    );
    if (!districtExists) {
      this.addressInfo.district = '';
      this.addressInfo.ward = '';
      this.wards = [];
    } else {
 // Nếu district vẫn hợp lệ, kiểm tra ward
      this.loadWards();
      const wardExists = this.wards.some(
        (w) => w.id === previousWard || w.slug === previousWard || w.code === previousWard
      );
      if (!wardExists) {
        this.addressInfo.ward = '';
      }
    }
  }

  onDistrictChange() {
 // Load wards và chỉ reset nếu ward hiện tại không hợp lệ
    const previousWard = this.addressInfo.ward;
    this.loadWards();

 // Kiểm tra nếu ward cũ không tồn tại trong danh sách mới thì mới reset
    const wardExists = this.wards.some(
      (w) => w.id === previousWard || w.slug === previousWard || w.code === previousWard
    );
    if (!wardExists) {
      this.addressInfo.ward = '';
    }
  }

 // City dropdown methods
  toggleCityDropdown() {
    this.showCityDropdown = !this.showCityDropdown;
  }

  closeCityDropdown() {
    this.showCityDropdown = false;
  }

  selectCity(city: any) {
    const previousCity = this.addressInfo.city;
    // Use slug as id for consistency with MongoDB (hcm, ha-noi, etc.)
    this.addressInfo.city = city.slug || city.id;

 // Nếu city thay đổi, reset district và ward
    if (previousCity !== this.addressInfo.city) {
      this.addressInfo.district = '';
      this.addressInfo.ward = '';
      this.districts = [];
      this.wards = [];
      this.loadDistricts();
    }

    this.closeCityDropdown();
  }

  getSelectedCityName(): string {
    const selectedCity = this.cities.find(
      (c) => c.id === this.addressInfo.city || c.slug === this.addressInfo.city || c.code === this.addressInfo.city
    );
    return selectedCity ? selectedCity.name : '';
  }

 // Custom select methods
  toggleDistrictDropdown() {
    if (!this.addressInfo.city) return;
    this.showDistrictDropdown = !this.showDistrictDropdown;
  }

  closeDistrictDropdown() {
    this.showDistrictDropdown = false;
  }

  selectDistrict(district: any) {
    if (!this.addressInfo.city) return;
    const previousWard = this.addressInfo.ward;
    // Use slug as id for consistency with MongoDB
    this.addressInfo.district = district.slug || district.id;
    this.loadWards();

 // Kiểm tra nếu ward cũ không tồn tại trong danh sách mới thì mới reset
    const wardExists = this.wards.some(
      (w) => w.id === previousWard || w.slug === previousWard || w.code === previousWard
    );
    if (!wardExists) {
      this.addressInfo.ward = '';
    }

    this.closeDistrictDropdown();
  }

  getSelectedDistrictName(): string {
    const selectedDistrict = this.districts.find(
      (d) => d.id === this.addressInfo.district || d.slug === this.addressInfo.district || d.code === this.addressInfo.district
    );
    return selectedDistrict ? selectedDistrict.name : '';
  }

 // Ward dropdown methods
  toggleWardDropdown() {
    if (!this.addressInfo.district) return;
    this.showWardDropdown = !this.showWardDropdown;
  }

  closeWardDropdown() {
    this.showWardDropdown = false;
  }

  selectWard(ward: any) {
    if (!this.addressInfo.district) return;
    // Use slug as id for consistency with MongoDB
    this.addressInfo.ward = ward.slug || ward.id;
    this.closeWardDropdown();
  }

  getSelectedWardName(): string {
    const selectedWard = this.wards.find(
      (w) => w.id === this.addressInfo.ward || w.slug === this.addressInfo.ward || w.code === this.addressInfo.ward
    );
    return selectedWard ? selectedWard.name : '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select')) {
      this.closeCityDropdown();
      this.closeDistrictDropdown();
      this.closeWardDropdown();
    }
  }

 // Các phương thức xác thực thời gian thực
  onFullNameInput() {
 // Xóa lỗi khi người dùng bắt đầu nhập
    if (this.errors.fullName) {
      delete this.errors.fullName;
    }
  }

  validateFullName() {
    if (!this.addressInfo.fullName.trim()) {
      this.errors.fullName = 'Họ và tên là bắt buộc';
    } else if (!/^[a-zA-ZÀ-ỹ\s\-']+$/.test(this.addressInfo.fullName)) {
      this.errors.fullName = 'Tên không gồm ký tự đặc biệt';
    } else {
      delete this.errors.fullName;
    }
  }

  onPhoneInput() {
 // Xóa lỗi khi người dùng bắt đầu nhập
    if (this.errors.phone) {
      delete this.errors.phone;
    }
  }

  validatePhone() {
    if (!this.addressInfo.phone.trim()) {
      this.errors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^(\+84|0)[0-9]{9,10}$/.test(this.addressInfo.phone)) {
      this.errors.phone = 'Số điện thoại không hợp lệ';
    } else {
      delete this.errors.phone;
    }
  }

  onEmailInput() {
 // Xóa lỗi khi người dùng bắt đầu nhập
    if (this.errors.email) {
      delete this.errors.email;
    }
  }

  validateEmail() {
 // Email is optional, but validate format if provided
    if (this.addressInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.addressInfo.email)) {
      this.errors.email = 'Email không hợp lệ';
    } else {
      delete this.errors.email;
    }
  }

 // Getter methods for template validation
  get isFullNameValid(): boolean {
    return (
      !this.errors.fullName &&
      !!this.addressInfo.fullName.trim() &&
      /^[a-zA-ZÀ-ỹ\s\-']+$/.test(this.addressInfo.fullName)
    );
  }

  get isPhoneValid(): boolean {
    return (
      !this.errors.phone &&
      !!this.addressInfo.phone.trim() &&
      /^(\+84|0)[0-9]{9,10}$/.test(this.addressInfo.phone)
    );
  }

  get isEmailValid(): boolean {
    return (
      !this.errors.email &&
      !!this.addressInfo.email.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.addressInfo.email)
    );
  }

  validateForm(): boolean {
    this.errors = {};

 // Name validation
    if (!this.addressInfo.fullName.trim()) {
      this.errors.fullName = 'Họ và tên là bắt buộc';
    } else if (!/^[a-zA-ZÀ-ỹ\s\-']+$/.test(this.addressInfo.fullName)) {
      this.errors.fullName = 'Tên không gồm ký tự đặc biệt';
    }

 // Phone validation
    if (!this.addressInfo.phone.trim()) {
      this.errors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^(\+84|0)[0-9]{9,10}$/.test(this.addressInfo.phone)) {
      this.errors.phone = 'Số điện thoại không hợp lệ';
    }

 // Email validation (optional but validate format if provided)
    if (this.addressInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.addressInfo.email)) {
      this.errors.email = 'Email không hợp lệ';
    }

 // Address validation
    if (!this.addressInfo.city) {
      this.errors.city = 'Vui lòng chọn tỉnh/thành phố';
    }
    if (!this.addressInfo.district) {
      this.errors.district = 'Vui lòng chọn quận/huyện';
    }
    if (!this.addressInfo.ward) {
      this.errors.ward = 'Vui lòng chọn phường/xã';
    }
    if (!this.addressInfo.detail.trim()) {
      this.errors.detail = 'Địa chỉ cụ thể là bắt buộc';
    } else if (this.addressInfo.detail.trim().length < 5) {
      this.errors.detail = 'Địa chỉ phải có ít nhất 5 ký tự';
    }

    return Object.keys(this.errors).length === 0;
  }

  onSubmit() {
    if (this.validateForm()) {
      this.isSubmitting = true;

 // Logic xử lý isDefault:
 // 1. Nếu là địa chỉ đầu tiên (chưa có địa chỉ nào) tự động set isDefault = true
 // 2. Nếu checkbox được tick set isDefault = true
 // 3. Nếu không phải địa chỉ đầu tiên và không tick set isDefault = false

      const currentAddresses = this.addressService.getAddresses();
      const isFirstAddress = currentAddresses.length === 0;

      if (isFirstAddress) {
 // Địa chỉ đầu tiên luôn là mặc định, dù có tick hay không
        this.addressInfo.isDefault = true;
      } else if (this.setAsDefault) {
 // Checkbox được tick set isDefault = true
        this.addressInfo.isDefault = true;
      } else {
 // Không phải địa chỉ đầu tiên và không tick set isDefault = false
        this.addressInfo.isDefault = false;
      }

 // Simulate API call
      setTimeout(() => {
        this.addressComplete.emit(this.addressInfo);
        this.isSubmitting = false;
      }, 1000);
    }
  }

 // Clear methods for input fields
  clearFullName(inputElement: HTMLInputElement) {
    this.addressInfo.fullName = '';
    this.errors.fullName = '';
    inputElement.focus();
  }

  clearPhone(inputElement: HTMLInputElement) {
    this.addressInfo.phone = '';
    this.errors.phone = '';
    inputElement.focus();
  }

  clearEmail(inputElement: HTMLInputElement) {
    this.addressInfo.email = '';
    this.errors.email = '';
    inputElement.focus();
  }

  clearDetail(inputElement: HTMLInputElement) {
    this.addressInfo.detail = '';
    this.errors.detail = '';
    inputElement.focus();
  }

  onClose() {
 // Reset checkbox khi đóng modal
    this.setAsDefault = false;
    this.closeModal.emit();
  }
}
