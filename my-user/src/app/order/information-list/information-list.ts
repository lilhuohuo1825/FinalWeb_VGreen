import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollLockService } from '../../services/scroll-lock.service';
import { ToastService } from '../../services/toast.service';

export interface AddressInfo {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  ward: string;
  detail: string;
  deliveryMethod: string;
  isDefault?: boolean;
}

@Component({
  selector: 'app-information-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './information-list.html',
  styleUrl: './information-list.css',
})
export class InformationList implements OnInit, OnDestroy {
  @Input() addressList: AddressInfo[] = [];
  @Input() selectedIndex: number = 0;
  @Input() defaultAddressIndices: boolean[] = []; // Mảng boolean đánh dấu địa chỉ mặc định

  @Output() closeModal = new EventEmitter<void>();
  @Output() selectAddress = new EventEmitter<number>();
  @Output() editAddress = new EventEmitter<number>();
  @Output() deleteAddress = new EventEmitter<number>();
  @Output() addNewAddress = new EventEmitter<void>();

  showDeleteConfirm: boolean = false;
  addressToDeleteIndex: number = -1;

  constructor(private scrollLock: ScrollLockService, private toastService: ToastService) {}

  ngOnInit() {
    this.scrollLock.lock();
  }

  ngOnDestroy() {
    this.scrollLock.unlock();
  }

  onClose() {
    this.closeModal.emit();
  }

  onSelectAddress(index: number) {
    this.selectedIndex = index;
  }

  onConfirm() {
    if (this.selectedIndex >= 0) {
      this.selectAddress.emit(this.selectedIndex);
      this.onClose();
    }
  }

  onEditAddress(index: number) {
    this.editAddress.emit(index);
  }

  onDeleteAddress(index: number) {
    this.addressToDeleteIndex = index;
    this.showDeleteConfirm = true;
  }

  onConfirmDelete(): void {
    if (this.addressToDeleteIndex >= 0) {
      this.deleteAddress.emit(this.addressToDeleteIndex);
      this.showDeleteConfirm = false;
      this.addressToDeleteIndex = -1;
 // Hiển thị toast màu xanh thông báo đã xóa thành công với z-index cao 
      this.toastService.show('Đã xóa địa chỉ thành công!', 'success', 22000);
    }
  }

  onCancelDelete(): void {
    this.showDeleteConfirm = false;
    this.addressToDeleteIndex = -1;
  }

  onAddNewAddress() {
    this.addNewAddress.emit();
  }

  getAddressNameWithPhone(address: AddressInfo): string {
    return `${address.fullName} - ${address.phone}`;
  }

  isDefaultAddress(index: number): boolean {
    if (this.defaultAddressIndices && this.defaultAddressIndices.length > index) {
      return this.defaultAddressIndices[index];
    }
    return this.addressList[index]?.isDefault || false;
  }

  getAddressString(address: AddressInfo): string {
    const cityName = this.getCityName(address.city);
    const districtName = this.getDistrictName(address.district);
    const wardName = this.getWardName(address.ward);

    const addressParts = [address.detail, wardName, districtName, cityName].filter(
      (part) => part && part.trim() !== ''
    );

    return addressParts.join(', ');
  }

  private getCityName(cityId: string): string {
    const cities = [
      { id: 'hcm', name: 'Thành phố Hồ Chí Minh' },
      { id: 'hn', name: 'Hà Nội' },
      { id: 'dn', name: 'Đà Nẵng' },
    ];
    const city = cities.find((c) => c.id === cityId);
    return city ? city.name : '';
  }

  private getDistrictName(districtId: string): string {
    const districts = [
      { id: 'q1', name: 'Quận 1' },
      { id: 'q2', name: 'Quận 2' },
      { id: 'q3', name: 'Quận 3' },
    ];
    const district = districts.find((d) => d.id === districtId);
    return district ? district.name : '';
  }

  private getWardName(wardId: string): string {
    const wards = [
      { id: 'p1', name: 'Phường 1' },
      { id: 'p2', name: 'Phường 2' },
      { id: 'p3', name: 'Phường 3' },
    ];
    const ward = wards.find((w) => w.id === wardId);
    return ward ? ward.name : '';
  }
}
