import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password-reset',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './forgot-password-reset.html',
  styleUrls: ['./forgot-password-reset.css'],
})
export class ForgotPasswordReset implements OnInit {
  phoneNumber: string = '';
  password: string = '';
  confirmPassword: string = '';

  passwordError: string = '';
  confirmError: string = '';

  showPassword: boolean = false;
  showConfirm: boolean = false;

  showSuccessMessage: boolean = false;
  isSubmitting: boolean = false; // THÊM FLAG NÀY
  resetSuccessful: boolean = false; // THÊM FLAG NÀY

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // console.log('🔍 ForgotPasswordReset ngOnInit called');
    // console.log('🔍 resetSuccessful flag:', this.resetSuccessful);
    // console.log('🔍 Current URL:', window.location.href);

    // Kiểm tra flag từ sessionStorage
    const resetCompleted = sessionStorage.getItem('passwordResetCompleted');
    // console.log('🔍 passwordResetCompleted from sessionStorage:', resetCompleted);

    // Nếu đã hoàn thành reset, redirect về login
    if (resetCompleted === 'true') {
      // console.log('⏭️ Password reset completed, redirecting to login');
      sessionStorage.removeItem('passwordResetCompleted');
      this.router.navigate(['/login']); // dùng Angular Router
      return;
    }

    // Nếu đang trong quá trình reset thành công, không làm gì cả
    if (this.resetSuccessful) {
      console.log('>>> Reset thành côngcông');
      return;
    }

    // Get phone number from session storage
    this.phoneNumber = sessionStorage.getItem('forgotPasswordPhone') || '';
    const otpVerified = sessionStorage.getItem('forgotPasswordOtpVerified');

    // console.log('🔍 ForgotPasswordReset ngOnInit:');
    console.log('Phone:', this.phoneNumber);
    console.log('OTP Verified:', otpVerified);

    // Kiểm tra điều kiện truy cập trang
    if (!this.phoneNumber || !otpVerified) {
      console.log('(x) Missing phone or OTP verification, redirecting to forgot-password');
      console.log('(x) Phone missing:', !this.phoneNumber);
      console.log('(x) OTP not verified:', !otpVerified);

      // Chỉ redirect nếu chưa reset thành công
      if (!this.resetSuccessful) {
        // console.log('🔄 Redirecting to /forgot-password');
        this.router.navigate(['/forgot-password']);
      }
      // else {
      //   console.log('⏭️ Reset successful, not redirecting');
      // }
      return;
    }

    // console.log('✅ Ready for password reset form');
  }

  onPasswordInput(event: any): void {
    const value = event.target.value;
    this.password = value;
    this.passwordError = '';
    this.validatePassword();
    this.validateConfirm(); // Re-validate confirm password when password changes
  }

  onConfirmInput(event: any): void {
    const value = event.target.value;
    this.confirmPassword = value;
    this.confirmError = '';
    this.validateConfirm();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirm(): void {
    this.showConfirm = !this.showConfirm;
  }

  validatePassword(): void {
    this.passwordError = '';

    if (this.password.length < 8) {
      this.passwordError = 'Mật khẩu phải có ít nhất 8 ký tự.';
      return;
    }

    if (!/[A-Z]/.test(this.password)) {
      this.passwordError = 'Mật khẩu phải có ít nhất 1 chữ cái in hoa.';
      return;
    }

    if (!/[a-z]/.test(this.password)) {
      this.passwordError = 'Mật khẩu phải có ít nhất 1 chữ cái thường.';
      return;
    }
  }

  validateConfirm(): void {
    if (this.confirmPassword && this.password !== this.confirmPassword) {
      this.confirmError = 'Mật khẩu nhập lại không khớp.';
    } else {
      this.confirmError = '';
    }
  }

  isFormValid(): boolean {
    const hasMinLength = this.password.length >= 8;
    const hasUppercase = /[A-Z]/.test(this.password);
    const hasLowercase = /[a-z]/.test(this.password);
    const passwordsMatch = this.password === this.confirmPassword;
    const noPasswordError = !this.passwordError;
    const noConfirmError = !this.confirmError;

    const isValid =
      hasMinLength &&
      hasUppercase &&
      hasLowercase &&
      passwordsMatch &&
      noPasswordError &&
      noConfirmError;

    // console.log('🔍 Form validation check:');
    // console.log('📝 Password length >= 8:', hasMinLength);
    // console.log('📝 Has uppercase:', hasUppercase);
    // console.log('📝 Has lowercase:', hasLowercase);
    // console.log('📝 Passwords match:', passwordsMatch);
    // console.log('📝 No password error:', noPasswordError);
    // console.log('📝 No confirm error:', noConfirmError);
    // console.log('📝 Form valid:', isValid);

    return isValid;
  }

  onSubmit(event?: Event): void {
    // Ngăn chặn default form submission để tránh page reload
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // console.log('🔄 onSubmit() called - Using reset password logic');

    // Sử dụng logic reset password đơn giản
    this.resetPassword();
  }

  // Reset password method
  resetPassword(): void {
    // console.log('🔄 RESET PASSWORD CALLED');

    if (!this.isFormValid()) {
      console.warn('❌ Form không hợp lệ, không gửi yêu cầu đặt lại mật khẩu.');
      return;
    }

    const payload = {
      phoneNumber: this.phoneNumber,
      newPassword: this.password,
    };

    this.isSubmitting = true;

    this.http.post('/api/auth/reset-password', payload).subscribe({
      next: (response: any) => {
        console.log('>>>Mật khẩu đã được cập nhật thành công:', response);
        this.showSuccessMessage = true;
        this.resetSuccessful = true;

        // Xóa sessionStorage để tránh lỗi redirect lại
        sessionStorage.removeItem('forgotPasswordPhone');
        sessionStorage.removeItem('forgotPasswordOtpVerified');
        sessionStorage.setItem('passwordResetCompleted', 'true');

        setTimeout(() => {
          this.isSubmitting = false;
          window.location.href = '/login';
        }, 800);
      },
      error: (error) => {
        console.error('(x) Lỗi khi cập nhật mật khẩu:', error);
        this.isSubmitting = false;
      },
    });
  }

  // Navigate to login page
  navigateToLogin(): void {
    // console.log('🔄 Navigate to login clicked');
    this.router.navigate(['/login']);
  }
}
