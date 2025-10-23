import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password-phone',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './forgot-password-phone.html',
  styleUrls: ['./forgot-password-phone.css'],
})
export class ForgotPasswordPhone implements OnInit {
  phoneNumber: string = '';
  phoneError: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // Clear registration flow data khi bắt đầu forgot password flow
    sessionStorage.removeItem('registerPhone');
    sessionStorage.removeItem('registerOtpVerified');
    sessionStorage.removeItem('registerOtp');
    sessionStorage.removeItem('registrationCompleted');

    // Auto-focus vào input số điện thoại khi vào trang
    setTimeout(() => {
      const phoneInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 100);
  }

  onPhoneInput(event: any): void {
    const value = event.target.value;
    this.phoneNumber = value;
    this.phoneError = '';
    this.validatePhone();
  }

  validatePhone(): void {
    const phoneRegex = /^[0-9]{10,11}$/;
    if (this.phoneNumber && !phoneRegex.test(this.phoneNumber)) {
      this.phoneError = 'Số điện thoại không hợp lệ.';
    } else {
      this.phoneError = '';
    }
  }

  isPhoneValid(): boolean {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(this.phoneNumber);
  }

  clearPhone(): void {
    this.phoneNumber = '';
    this.phoneError = '';

    // Focus vào ô input sau khi clear
    setTimeout(() => {
      const phoneInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 10);
  }

  onSubmit(): void {
    if (!this.isPhoneValid()) {
      this.phoneError = 'Số điện thoại không hợp lệ.';
      return;
    }

    this.phoneError = ''; // Clear previous error

    // Kiểm tra số điện thoại có tồn tại trong database không
    this.http.post('/api/auth/check-phone-exists', { phoneNumber: this.phoneNumber }).subscribe({
      next: (response: any) => {
        console.log('(x) Số điện thoại tồn tại:', response);

        // Xóa sessionStorage của registration flow nếu có
        sessionStorage.removeItem('registerPhone');
        sessionStorage.removeItem('registerOtpVerified');
        sessionStorage.removeItem('registerOtp');

        // Store phone number in session storage for forgot password flow
        sessionStorage.setItem('forgotPasswordPhone', this.phoneNumber);
        // Navigate to OTP verification
        this.router.navigate(['/forgot-password/otp']);
      },
      error: (error) => {
        console.error('❌ Lỗi kiểm tra số điện thoại:', error);
        if (error.status === 400) {
          this.phoneError = 'Số điện thoại chưa được đăng ký';
        } else {
          this.phoneError = 'Lỗi kết nối, vui lòng thử lại';
        }
      },
    });
  }
}
