import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register-password.html',
  styleUrls: ['./register-password.css'],
})
export class RegisterPassword implements OnInit {
  phoneNumber: string = '';
  password: string = '';
  confirmPassword: string = '';

  passwordError: string = '';
  confirmError: string = '';

  showPassword: boolean = false;
  showConfirm: boolean = false;

  showSuccessMessage: boolean = false;
  isNavigating: boolean = false; // Flag để tránh redirect khi đang navigation

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // Get phone number from session storage
    this.phoneNumber = sessionStorage.getItem('registerPhone') || '';
    const otpVerified = sessionStorage.getItem('registerOtpVerified');
    const isRegistrationCompleted = sessionStorage.getItem('registrationCompleted');

    // console.log('🔍 RegisterPassword ngOnInit:');
    console.log('Phone:', this.phoneNumber);
    console.log('OTP Verified:', otpVerified);
    console.log('>>> Registration Completed:', isRegistrationCompleted);

    // Nếu đã hoàn thành đăng ký, redirect về login
    if (isRegistrationCompleted === 'true') {
      // console.log('✅ Đăng ký đã hoàn thành, redirecting to login');
      // Clear flag để tránh redirect loop
      sessionStorage.removeItem('registrationCompleted');
      this.router.navigate(['/login']);
      return;
    }

    // Kiểm tra điều kiện truy cập trang
    if (!this.phoneNumber || !otpVerified) {
      console.log('❌ Missing phone or OTP verification, redirecting to register');
      // this.router.navigate(['/register']);
      return;
    }
  }

  onPasswordInput(event: any): void {
    this.password = event.target.value;
    this.validatePassword();
    this.validateConfirm();
  }

  onConfirmInput(event: any): void {
    this.confirmPassword = event.target.value;
    this.validateConfirm();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirm(): void {
    this.showConfirm = !this.showConfirm;
  }

  validatePassword(): void {
    if (!this.password) {
      this.passwordError = '';
      return;
    }
    if (this.password.length < 8) {
      this.passwordError = 'Mật khẩu phải có ít nhất 8 ký tự.';
      return;
    }
    if (!/(?=.*[A-Z])/.test(this.password)) {
      this.passwordError = 'Mật khẩu phải có ít nhất 1 chữ cái in hoa.';
      return;
    }
    this.passwordError = '';
  }

  validateConfirm(): void {
    if (!this.confirmPassword) {
      this.confirmError = '';
      return;
    }
    this.confirmError =
      this.confirmPassword === this.password ? '' : 'Mật khẩu nhập lại không khớp.';
  }

  isFormValid(): boolean {
    return (
      this.password.length >= 8 &&
      this.confirmPassword === this.password &&
      !this.passwordError &&
      !this.confirmError
    );
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;

    const registerData = {
      phoneNumber: this.phoneNumber,
      password: this.password,
    };

    this.http.post('/api/auth/register', registerData).subscribe({
      next: (response: any) => {
        console.log('>>> Đăng ký thành công!', response);
        this.showSuccessMessage = true;

        // Set flag đăng ký hoàn thành TRƯỚC KHI clear sessionStorage
        sessionStorage.setItem('registrationCompleted', 'true');

        // Clear session storage NGAY LẬP TỨC
        sessionStorage.removeItem('registerPhone');
        sessionStorage.removeItem('registerOtpVerified');
        sessionStorage.removeItem('registerOtp');

        // Navigate sau khi đã clear
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 800);
      },
      error: (error) => {
        console.error('(x) Lỗi đăng ký:', error);
      },
    });
  }
}
