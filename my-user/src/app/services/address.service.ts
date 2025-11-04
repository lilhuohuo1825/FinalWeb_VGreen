import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of } from 'rxjs';

export interface AddressInfo {
  _id?: string;
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
  createdAt?: Date;
}

export interface UserAddress {
  _id?: string;
  CustomerID: string;
  addresses: AddressInfo[];
}

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private apiUrl = 'http://localhost:3000/api/address';
  private addressesSubject = new BehaviorSubject<AddressInfo[]>([]);
  public addresses$ = this.addressesSubject.asObservable();
  private currentCustomerID: string | null = null;

  constructor(private http: HttpClient) {
 // Load CustomerID from localStorage if exists 
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
 console.log(' [AddressService] User object:', user); 

 // Lấy CustomerID trực tiếp 
        this.currentCustomerID = user.CustomerID || null;
 console.log(' [AddressService] CustomerID:', this.currentCustomerID); 

        if (this.currentCustomerID) {
          this.loadAddressesFromServer(this.currentCustomerID);
        } else {
 console.warn(' [AddressService] No CustomerID found:', user); 
        }
      } catch (error) {
 console.error(' [AddressService] Error loading user info:', error); 
      }
    } else {
 console.warn(' [AddressService] Không tìm thấy localStorage["user"]'); 
    }
  }

 // Set current user and load their addresses 
  setCurrentUser(customerID: string): void {
    this.currentCustomerID = customerID;
    this.loadAddressesFromServer(customerID);
  }

 // Reload CustomerID from localStorage (gọi khi cần) 
  reloadCustomerID(): void {
 console.log(' [AddressService.reloadCustomerID] START'); 
    const userInfo = localStorage.getItem('user');
 console.log(' - localStorage["user"]:', userInfo); 

    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
 console.log(' - Parsed user:', user); 
 console.log(' - user.CustomerID:', user.CustomerID); 

        this.currentCustomerID = user.CustomerID || null;
 console.log( 
          ' [AddressService.reloadCustomerID] Set currentCustomerID to:',
          this.currentCustomerID
        );

        if (this.currentCustomerID) {
 console.log(' - Loading addresses from server...'); 
          this.loadAddressesFromServer(this.currentCustomerID);
        } else {
 console.warn(' [AddressService.reloadCustomerID] No CustomerID found'); 
        }
      } catch (error) {
 console.error(' [AddressService.reloadCustomerID] Error parsing user:', error); 
      }
    } else {
 console.warn(' [AddressService.reloadCustomerID] No user in localStorage'); 
    }
  }

 // Load addresses from server 
  private loadAddressesFromServer(customerID: string): void {
    this.http
      .get<any>(`${this.apiUrl}/${customerID}`)
      .pipe(
        map((response) => {
          if (response.success) {
            this.addressesSubject.next(response.data.addresses || []);
          }
        }),
        catchError((error) => {
 console.error('Error loading addresses from server:', error); 
          return of(null);
        })
      )
      .subscribe();
  }

 // Get current addresses 
  getAddresses(): AddressInfo[] {
    return this.addressesSubject.value;
  }

 // Reload addresses from server 
  reloadAddresses(customerID?: string): Observable<UserAddress> {
    const cid = customerID || this.currentCustomerID;
    if (!cid) {
      return of({ CustomerID: '', addresses: [] });
    }

    return this.http.get<any>(`${this.apiUrl}/${cid}`).pipe(
      map((response) => {
        if (response.success) {
          this.addressesSubject.next(response.data.addresses || []);
          return response.data;
        }
        return { CustomerID: cid, addresses: [] };
      }),
      catchError((error) => {
 console.error('Error reloading addresses:', error); 
        return of({ CustomerID: cid, addresses: [] });
      })
    );
  }

 // Add new address 
  addAddress(address: AddressInfo, customerID?: string): Observable<boolean> {
 console.log(' [AddressService.addAddress] START'); 
 console.log(' - Received customerID param:', customerID); 
 console.log(' - Current this.currentCustomerID:', this.currentCustomerID); 
 console.log(' - Address data:', address); 

    const cid = customerID || this.currentCustomerID;
 console.log(' - Final cid to use:', cid); 

    if (!cid) {
 console.error(' [AddressService.addAddress] No CustomerID available'); 
 console.error(' - customerID param:', customerID); 
 console.error(' - this.currentCustomerID:', this.currentCustomerID); 

 // Debug localStorage 
 console.error(' - localStorage["user"]:', localStorage.getItem('user')); 
 console.error(' - localStorage keys:', Object.keys(localStorage)); 

      return of(false);
    }

 console.log(' [AddressService.addAddress] Sending request to:', `${this.apiUrl}/${cid}/add`); 

    return this.http.post<any>(`${this.apiUrl}/${cid}/add`, address).pipe(
      map((response) => {
 console.log('� [AddressService.addAddress] Response:', response); 
        if (response.success) {
          this.addressesSubject.next(response.data.addresses || []);
 console.log(' [AddressService.addAddress] Success!'); 
          return true;
        }
 console.warn(' [AddressService.addAddress] Response not successful:', response); 
        return false;
      }),
      catchError((error) => {
 console.error(' [AddressService.addAddress] Error:', error); 
        return of(false);
      })
    );
  }

 // Update existing address 
  updateAddress(addressId: string, address: AddressInfo, customerID?: string): Observable<boolean> {
    const cid = customerID || this.currentCustomerID;
    if (!cid) {
 console.error('No CustomerID available'); 
      return of(false);
    }

    return this.http.put<any>(`${this.apiUrl}/${cid}/update/${addressId}`, address).pipe(
      map((response) => {
        if (response.success) {
          this.addressesSubject.next(response.data.addresses || []);
          return true;
        }
        return false;
      }),
      catchError((error) => {
 console.error('Error updating address:', error); 
        return of(false);
      })
    );
  }

 // Delete address 
  deleteAddress(addressId: string, customerID?: string): Observable<boolean> {
    const cid = customerID || this.currentCustomerID;
    if (!cid) {
 console.error('No CustomerID available'); 
      return of(false);
    }

    return this.http.delete<any>(`${this.apiUrl}/${cid}/delete/${addressId}`).pipe(
      map((response) => {
        if (response.success) {
          this.addressesSubject.next(response.data.addresses || []);
          return true;
        }
        return false;
      }),
      catchError((error) => {
 console.error('Error deleting address:', error); 
        return of(false);
      })
    );
  }

 // Set default address 
  setDefaultAddress(addressId: string, customerID?: string): Observable<boolean> {
    const cid = customerID || this.currentCustomerID;
    if (!cid) {
 console.error('No CustomerID available'); 
      return of(false);
    }

    return this.http.put<any>(`${this.apiUrl}/${cid}/set-default/${addressId}`, {}).pipe(
      map((response) => {
        if (response.success) {
          this.addressesSubject.next(response.data.addresses || []);
          return true;
        }
        return false;
      }),
      catchError((error) => {
 console.error('Error setting default address:', error); 
        return of(false);
      })
    );
  }

 // Get default address 
  getDefaultAddress(customerID?: string): Observable<AddressInfo | null> {
    const cid = customerID || this.currentCustomerID;
    if (!cid) {
      return of(null);
    }

    return this.http.get<any>(`${this.apiUrl}/${cid}/default`).pipe(
      map((response) => {
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError((error) => {
 console.error('Error getting default address:', error); 
        return of(null);
      })
    );
  }

 // Get default address from current list (synchronous) 
  getCurrentDefaultAddress(): AddressInfo | null {
    const addresses = this.getAddresses();
    return addresses.find((addr) => addr.isDefault) || (addresses.length > 0 ? addresses[0] : null);
  }

 // Helper methods for city/district/ward mapping 
  getCityNameFromId(cityId: string): string {
    const cities: any = {
      hcm: 'Thành phố Hồ Chí Minh',
      hn: 'Hà Nội',
      dn: 'Đà Nẵng',
    };
    return cities[cityId] || cityId;
  }

  getDistrictNameFromId(districtId: string): string {
    const districts: any = {
      q1: 'Quận 1',
      q2: 'Quận 2',
      q3: 'Quận 3',
      hk: 'Quận Hoàn Kiếm',
      bd: 'Quận Ba Đình',
      tx: 'Quận Thanh Xuân',
      hd: 'Quận Hải Châu',
      tl: 'Quận Thanh Khê',
      sn: 'Quận Sơn Trà',
    };
    return districts[districtId] || districtId;
  }

  getWardNameFromId(wardId: string): string {
    const wards: any = {
      p1: 'Phường Bến Nghé',
      p2: 'Phường Bến Thành',
      p3: 'Phường Cầu Ông Lãnh',
      p4: 'Phường An Phú',
      p5: 'Phường Thảo Điền',
      p6: 'Phường Bình An',
      p7: 'Phường 1',
      p8: 'Phường 2',
      p9: 'Phường 3',
      p10: 'Phường Hàng Bạc',
      p11: 'Phường Tràng Tiền',
      p12: 'Phường Phan Chu Trinh',
    };
    return wards[wardId] || wardId;
  }

  getCityIdFromName(cityName: string): string {
    const cityMap: any = {
      'Thành phố Hồ Chí Minh': 'hcm',
      'Hà Nội': 'hn',
      'Đà Nẵng': 'dn',
    };
    return cityMap[cityName] || '';
  }

  getDistrictIdFromName(districtName: string): string {
    const districtMap: any = {
      'Quận 1': 'q1',
      'Quận 2': 'q2',
      'Quận 3': 'q3',
      'Quận Hoàn Kiếm': 'hk',
      'Quận Ba Đình': 'bd',
      'Quận Thanh Xuân': 'tx',
      'Quận Hải Châu': 'hd',
      'Quận Thanh Khê': 'tl',
      'Quận Sơn Trà': 'sn',
    };
    return districtMap[districtName] || '';
  }

  getWardIdFromName(wardName: string): string {
    const wardMap: any = {
      'Phường Bến Nghé': 'p1',
      'Phường Bến Thành': 'p2',
      'Phường Cầu Ông Lãnh': 'p3',
      'Phường An Phú': 'p4',
      'Phường Thảo Điền': 'p5',
      'Phường Bình An': 'p6',
      'Phường 1': 'p7',
      'Phường 2': 'p8',
      'Phường 3': 'p9',
      'Phường Hàng Bạc': 'p10',
      'Phường Tràng Tiền': 'p11',
      'Phường Phan Chu Trinh': 'p12',
    };
    return wardMap[wardName] || '';
  }
}
