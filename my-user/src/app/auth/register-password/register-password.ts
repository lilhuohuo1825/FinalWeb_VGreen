import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-register-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
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

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Get phone number from session storage
    this.phoneNumber = sessionStorage.getItem('registerPhone') || '';
    const otpVerified = sessionStorage.getItem('otpVerified');

    if (!this.phoneNumber || !otpVerified) {
      this.router.navigate(['/register']);
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

    // Show success message
    this.showSuccessMessage = true;

    // Here you would typically call your registration API
    console.log('Registration completed:', {
      phone: this.phoneNumber,
      password: this.password,
    });

    // Clear session storage
    sessionStorage.removeItem('registerPhone');
    sessionStorage.removeItem('otpVerified');

    // Navigate to login page after showing success message
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 2000); // Show success message for 2 seconds
  }
}
