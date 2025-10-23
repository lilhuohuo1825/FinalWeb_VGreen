import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register-phone',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './register-phone.html',
  styleUrls: ['./register-phone.css'],
})
export class RegisterPhone implements OnInit {
  phoneNumber: string = '';
  phoneError: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // Clear forgot password flow data khi bắt đầu registration flow
    sessionStorage.removeItem('forgotPasswordPhone');
    sessionStorage.removeItem('forgotPasswordOtpVerified');
    sessionStorage.removeItem('forgotPasswordOtp');
    sessionStorage.removeItem('passwordResetCompleted');

    // Auto-focus vào input số điện thoại khi vào trang
    setTimeout(() => {
      const phoneInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 100);
  }

  onPhoneInput(event: any): void {
    this.phoneNumber = event.target.value;
    this.validatePhone();
  }

  validatePhone(): void {
    this.phoneError = this.isPhoneValid()
      ? ''
      : this.phoneNumber
      ? 'Số điện thoại không hợp lệ.'
      : '';
  }

  isPhoneValid(): boolean {
    return /^[0-9]{10,11}$/.test(this.phoneNumber);
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
    if (!this.isPhoneValid()) return;

    this.phoneError = '';

    // Kiểm tra số điện thoại đã tồn tại chưa
    this.http.post('/api/auth/check-phone', { phoneNumber: this.phoneNumber }).subscribe({
      next: (response: any) => {
        console.log('Số điện thoại có thể sử dụng:', response);

        // Xóa sessionStorage của forgot password flow nếu có
        sessionStorage.removeItem('forgotPasswordPhone');
        sessionStorage.removeItem('forgotPasswordOtpVerified');
        sessionStorage.removeItem('forgotPasswordOtp');

        // Store phone number in session storage for next steps
        sessionStorage.setItem('registerPhone', this.phoneNumber);
        // Navigate to OTP step
        this.router.navigate(['/register/otp']);
      },
      error: (error) => {
        console.error('❌ Lỗi kiểm tra số điện thoại:', error);
        if (error.status === 400) {
          this.phoneError = 'Số điện thoại đã được đăng ký';
        } else {
          this.phoneError = 'Lỗi kết nối, vui lòng thử lại';
        }
      },
    });
  }
}
