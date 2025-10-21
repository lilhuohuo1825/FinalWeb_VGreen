import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-register-phone',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './register-phone.html',
  styleUrls: ['./register-phone.css'],
})
export class RegisterPhone {
  phoneNumber: string = '';
  phoneError: string = '';

  constructor(private router: Router) {}

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
  }

  onSubmit(): void {
    if (!this.isPhoneValid()) return;

    // Store phone number in session storage for next steps
    sessionStorage.setItem('registerPhone', this.phoneNumber);

    // Navigate to OTP step
    this.router.navigate(['/register/otp']);
  }
}
