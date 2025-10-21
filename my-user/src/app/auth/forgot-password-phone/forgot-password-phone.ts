import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password-phone',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './forgot-password-phone.html',
  styleUrls: ['./forgot-password-phone.css'],
})
export class ForgotPasswordPhone {
  phoneNumber: string = '';
  phoneError: string = '';

  constructor(private router: Router) {}

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
  }

  onSubmit(): void {
    if (!this.isPhoneValid()) {
      this.phoneError = 'Số điện thoại không hợp lệ.';
      return;
    }

    // Store phone number in session storage for forgot password flow
    sessionStorage.setItem('forgotPasswordPhone', this.phoneNumber);

    // Navigate to OTP verification
    this.router.navigate(['/forgot-password/otp']);
  }
}
