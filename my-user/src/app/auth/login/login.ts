import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  phoneNumber: string = '';
  password: string = '';
  showPassword: boolean = false;
  phoneError: string = '';
  passwordError: string = '';

  // Handle phone input
  onPhoneInput(event: any): void {
    this.phoneNumber = event.target.value;
    this.validatePhone();
  }

  // Handle password input
  onPasswordInput(event: any): void {
    this.password = event.target.value;
    this.validatePassword();
  }

  // Phone number validation
  validatePhone(): void {
    const phoneRegex = /^[0-9]{10,11}$/;
    if (this.phoneNumber && !phoneRegex.test(this.phoneNumber)) {
      this.phoneError = 'Số điện thoại không hợp lệ.';
    } else {
      this.phoneError = '';
    }
  }

  // Password validation
  validatePassword(): void {
    if (this.password && this.password.length < 8) {
      this.passwordError = 'Mật khẩu phải có ít nhất 8 ký tự.';
    } else if (this.password && !/(?=.*[A-Z])/.test(this.password)) {
      this.passwordError = 'Mật khẩu phải có ít nhất 1 chữ cái in hoa.';
    } else {
      this.passwordError = '';
    }
  }

  // Clear phone number input
  clearPhone(): void {
    this.phoneNumber = '';
    this.phoneError = '';
  }

  // Toggle password visibility
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // Check if form is valid
  isFormValid(): boolean {
    return (
      this.phoneNumber.length >= 10 &&
      this.password.length >= 8 &&
      !this.phoneError &&
      !this.passwordError
    );
  }

  // Handle form submission
  onSubmit(): void {
    if (this.isFormValid()) {
      console.log('Login attempt:', {
        phone: this.phoneNumber,
        password: this.password,
      });
      // Add your login logic here
    }
  }
}
