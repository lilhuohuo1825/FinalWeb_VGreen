import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './otp.html',
  styleUrls: ['./otp.css'],
})
export class OtpComponent implements OnInit, OnDestroy {
  phoneNumber: string = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
  otpError: string = '';
  countdown: number = 30;
  isRegistrationFlow: boolean = true;
  private countdownInterval: any;

  constructor(private router: Router) {}

  goBack(): void {
    if (this.isRegistrationFlow) {
      this.router.navigate(['/register']);
    } else {
      this.router.navigate(['/forgot-password']);
    }
  }

  ngOnInit(): void {
    console.log('OTP Component initialized');
    console.log('Current path:', window.location.pathname);

    // Check if this is registration or forgot password flow
    const registerPhone = sessionStorage.getItem('registerPhone');
    const forgotPasswordPhone = sessionStorage.getItem('forgotPasswordPhone');

    console.log('registerPhone:', registerPhone);
    console.log('forgotPasswordPhone:', forgotPasswordPhone);

    if (registerPhone) {
      // Registration flow
      this.phoneNumber = registerPhone;
      this.isRegistrationFlow = true;
      console.log('Using registration flow');
    } else if (forgotPasswordPhone) {
      // Forgot password flow
      this.phoneNumber = forgotPasswordPhone;
      this.isRegistrationFlow = false;
      console.log('Using forgot password flow');
    } else {
      // No phone number found
      console.log('No phone number found, redirecting...');
      if (window.location.pathname.includes('forgot-password')) {
        this.router.navigate(['/forgot-password']);
      } else {
        this.router.navigate(['/register']);
      }
      return;
    }

    console.log('Final isRegistrationFlow:', this.isRegistrationFlow);
    console.log('Final phoneNumber:', this.phoneNumber);

    // Start countdown
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  onDigitInput(event: any, index: number): void {
    const value = event.target.value;

    // Check if OTP has expired FIRST
    if (this.countdown <= 0) {
      this.otpError = 'Mã OTP đã hết hiệu lực';
      this.showErrorState();

      // Clear input after showing error
      setTimeout(() => {
        event.target.value = '';
        this.otpDigits[index] = '';
        this.hideErrorState();
      }, 1000);
      return;
    }

    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      event.target.value = this.otpDigits[index];
      return;
    }

    // Set value AFTER checking expiration
    this.otpDigits[index] = value;
    this.otpError = '';

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = event.target.parentElement.children[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }

    // Auto-verify when all 6 digits are entered
    if (this.isOtpComplete()) {
      this.autoVerify();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    // Handle backspace
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = (event.target as HTMLElement).parentElement?.children[
        index - 1
      ] as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    // Check if OTP has expired
    if (this.countdown <= 0) {
      this.otpError = 'Mã OTP đã hết hiệu lực';
      this.showErrorState();

      // Clear all inputs after showing error
      setTimeout(() => {
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpError = '';
        this.hideErrorState();
        const firstInput = document.querySelector('.otp-digit') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 1000);
      return;
    }

    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = digits[i] || '';
    }

    this.otpError = '';

    // Auto-verify when all 6 digits are pasted
    if (this.isOtpComplete()) {
      this.autoVerify();
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every((digit) => digit !== '');
  }

  getOtpCode(): string {
    return this.otpDigits.join('');
  }

  autoVerify(): void {
    console.log('autoVerify called, countdown:', this.countdown);
    console.log('otpDigits:', this.otpDigits);

    // Check if OTP has expired first
    if (this.countdown <= 0) {
      console.log('OTP expired');
      this.otpError = 'Mã OTP đã hết hiệu lực';
      this.showErrorState();

      // Clear all digits after showing error
      setTimeout(() => {
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpError = '';
        this.hideErrorState();
        const firstInput = document.querySelector('.otp-digit') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 1000);
      return;
    }

    const otpCode = this.getOtpCode();
    const otpNumber = parseInt(otpCode);
    console.log('OTP code:', otpCode, 'OTP number:', otpNumber);

    // Check if OTP is in valid range (400000 < OTP < 600000)
    if (otpNumber > 400000 && otpNumber < 600000) {
      console.log('Valid OTP');
      // Show success state
      this.showSuccessState();

      // Valid OTP - wait 1-2 seconds then navigate
      setTimeout(() => {
        if (this.isRegistrationFlow) {
          sessionStorage.setItem('otpVerified', 'true');
          this.router.navigate(['/register/password']);
        } else {
          sessionStorage.setItem('forgotPasswordOtpVerified', 'true');
          this.router.navigate(['/forgot-password/reset']);
        }
      }, 1200);
    } else {
      console.log('Invalid OTP');
      // Invalid OTP - show error state
      this.otpError = 'Mã OTP không chính xác';
      this.showErrorState();

      // Clear all digits after showing error
      setTimeout(() => {
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpError = ''; // Hide error message
        this.hideErrorState();
        // Focus first input
        const firstInput = document.querySelector('.otp-digit') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 1000); // Show error for 2 seconds
    }
  }

  showErrorState(): void {
    console.log('showErrorState called');

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const otpInputs = document.querySelectorAll('.otp-digit');
      console.log('Found', otpInputs.length, 'OTP inputs');

      otpInputs.forEach((input, index) => {
        input.classList.add('error-state');
        console.log(`Added error-state to input ${index}:`, input);

        // Force style update
        (input as HTMLElement).style.borderColor = '#e53935';
        (input as HTMLElement).style.backgroundColor = '#ffebee';
        (input as HTMLElement).style.boxShadow = '0 0 0 3px rgba(229, 57, 53, 0.2)';
      });
    }, 10);
  }

  showSuccessState(): void {
    console.log('showSuccessState called');

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const otpInputs = document.querySelectorAll('.otp-digit');
      console.log('Found', otpInputs.length, 'OTP inputs');

      otpInputs.forEach((input, index) => {
        input.classList.add('success-state');
        console.log(`Added success-state to input ${index}:`, input);

        // Force style update
        (input as HTMLElement).style.borderColor = '#28a745';
        (input as HTMLElement).style.backgroundColor = '#d4edda';
        (input as HTMLElement).style.boxShadow = '0 0 0 3px rgba(40, 167, 69, 0.2)';
      });
    }, 10);
  }

  hideErrorState(): void {
    const otpInputs = document.querySelectorAll('.otp-digit');
    otpInputs.forEach((input) => {
      input.classList.remove('error-state');

      // Reset inline styles
      (input as HTMLElement).style.borderColor = '';
      (input as HTMLElement).style.backgroundColor = '';
      (input as HTMLElement).style.boxShadow = '';
    });
  }

  startCountdown(): void {
    this.countdown = 30;
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.countdown = 0;
      }
    }, 1000);
  }

  resendOtp(): void {
    // Reset countdown
    this.startCountdown();
    this.otpDigits = ['', '', '', '', '', ''];
    this.otpError = '';

    // Here you would typically call an API to resend OTP
    console.log('Resending OTP to:', this.phoneNumber);
  }

  onSubmit(): void {
    // This method is now handled by autoVerify()
    // Keep for manual submit if needed
    if (!this.isOtpComplete()) return;
    this.autoVerify();
  }
}
