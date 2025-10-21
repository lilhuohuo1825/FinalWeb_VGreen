import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password-reset',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
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

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Get phone number from session storage
    this.phoneNumber = sessionStorage.getItem('forgotPasswordPhone') || '';
    const otpVerified = sessionStorage.getItem('forgotPasswordOtpVerified');

    if (!this.phoneNumber || !otpVerified) {
      this.router.navigate(['/forgot-password']);
      return;
    }
  }

  onPasswordInput(event: any): void {
    const value = event.target.value;
    this.password = value;
    this.passwordError = '';
    this.validatePassword();
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
    if (this.password.length < 8) {
      this.passwordError = 'Mật khẩu phải có ít nhất 8 ký tự.';
      return;
    }

    if (!/[A-Z]/.test(this.password)) {
      this.passwordError = 'Mật khẩu phải có ít nhất 1 chữ cái in hoa.';
      return;
    }

    this.passwordError = '';
  }

  validateConfirm(): void {
    if (this.confirmPassword && this.password !== this.confirmPassword) {
      this.confirmError = 'Mật khẩu nhập lại không khớp.';
    } else {
      this.confirmError = '';
    }
  }

  isFormValid(): boolean {
    return (
      this.password.length >= 8 &&
      /[A-Z]/.test(this.password) &&
      this.password === this.confirmPassword &&
      !this.passwordError &&
      !this.confirmError
    );
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;

    // Show success message
    this.showSuccessMessage = true;

    // Here you would typically call your password reset API
    console.log('Password reset completed:', {
      phone: this.phoneNumber,
      newPassword: this.password,
    });

    // Clear session storage
    sessionStorage.removeItem('forgotPasswordPhone');
    sessionStorage.removeItem('forgotPasswordOtpVerified');

    // Navigate to login page after showing success message
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 2000); // Show success message for 2 seconds
  }
}
