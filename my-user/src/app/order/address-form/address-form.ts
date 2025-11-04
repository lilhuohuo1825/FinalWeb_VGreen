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

 // Mock data for dropdowns
  cities = [
    { id: 'hcm', name: 'Thành phố Hồ Chí Minh' },
    { id: 'hn', name: 'Hà Nội' },
    { id: 'dn', name: 'Đà Nẵng' },
  ];

  districts: any[] = [];
  wards: any[] = [];

 // Custom select states
  showCityDropdown = false;
  showDistrictDropdown = false;
  showWardDropdown = false;

  constructor(
    private scrollLock: ScrollLockService,
    private authService: AuthService,
    private addressService: AddressService
  ) {}

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

 // Điền thông tin lần đầu khi component khởi tạo
    this.fillUserInfo();

 // Khôi phục dữ liệu khi form được mở lại
 console.log('AddressForm ngOnInit - addressInfo:', this.addressInfo);
    this.restoreFormData();

 // Lock scroll khi modal mở
    this.scrollLock.lock();
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
      this.loadDistricts();

 // Nếu đã có district được chọn, khôi phục wards
      if (this.addressInfo.district) {
 console.log('Restoring wards for district:', this.addressInfo.district);
        this.loadWards();
      }
    }
  }

  private loadDistricts() {
 // Load districts mà không reset giá trị
    this.districts = [
      { id: 'q1', name: 'Quận 1' },
      { id: 'q2', name: 'Quận 2' },
      { id: 'q3', name: 'Quận 3' },
    ];
  }

  private loadWards() {
 // Load wards mà không reset giá trị
    this.wards = [
      { id: 'p1', name: 'Phường 1' },
      { id: 'p2', name: 'Phường 2' },
      { id: 'p3', name: 'Phường 3' },
    ];
  }

  onCityChange() {
 // Load districts và chỉ reset nếu district hiện tại không hợp lệ
    const previousDistrict = this.addressInfo.district;
    const previousWard = this.addressInfo.ward;
    this.loadDistricts();

 // Kiểm tra nếu district cũ không tồn tại trong danh sách mới thì mới reset
    const districtExists = this.districts.some((d) => d.id === previousDistrict);
    if (!districtExists) {
      this.addressInfo.district = '';
      this.addressInfo.ward = '';
      this.wards = [];
    } else {
 // Nếu district vẫn hợp lệ, kiểm tra ward
      this.loadWards();
      const wardExists = this.wards.some((w) => w.id === previousWard);
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
    const wardExists = this.wards.some((w) => w.id === previousWard);
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
    this.addressInfo.city = city.id;

 // Nếu city thay đổi, reset district và ward
    if (previousCity !== city.id) {
      this.addressInfo.district = '';
      this.addressInfo.ward = '';
      this.districts = [];
      this.wards = [];
      this.loadDistricts();
    }

    this.closeCityDropdown();
  }

  getSelectedCityName(): string {
    const selectedCity = this.cities.find((c) => c.id === this.addressInfo.city);
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
    this.addressInfo.district = district.id;
    this.loadWards();

 // Kiểm tra nếu ward cũ không tồn tại trong danh sách mới thì mới reset
    const wardExists = this.wards.some((w) => w.id === previousWard);
    if (!wardExists) {
      this.addressInfo.ward = '';
    }

    this.closeDistrictDropdown();
  }

  getSelectedDistrictName(): string {
    const selectedDistrict = this.districts.find((d) => d.id === this.addressInfo.district);
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
    this.addressInfo.ward = ward.id;
    this.closeWardDropdown();
  }

  getSelectedWardName(): string {
    const selectedWard = this.wards.find((w) => w.id === this.addressInfo.ward);
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
