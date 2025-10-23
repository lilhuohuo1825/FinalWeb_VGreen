import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit {
  phoneNumber: string = '';
  password: string = '';
  showPassword: boolean = false;
  phoneError: string = '';
  passwordError: string = '';
  loginError: string = '';
  isLoading: boolean = false;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // Clear tất cả sessionStorage khi vào login page
    sessionStorage.clear();
    // console.log('Cleared all sessionStorage on login page');

    // Auto-focus vào input số điện thoại khi vào trang
    setTimeout(() => {
      const phoneInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 100);
  }

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

    // Focus vào ô input sau khi clear
    setTimeout(() => {
      const phoneInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 10);
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
    if (!this.isFormValid()) return;

    // Clear previous errors
    this.phoneError = '';
    this.passwordError = '';
    this.loginError = '';
    this.isLoading = true;

    console.log('Đang kiểm tra đăng nhập...', {
      phone: this.phoneNumber,
      password: this.password,
    });

    // Bước 1: Kiểm tra số điện thoại có tồn tại không
    this.http.post('/api/auth/check-phone-exists', { phoneNumber: this.phoneNumber }).subscribe({
      next: (response: any) => {
        console.log('Số điện thoại tồn tại:', response);

        // Bước 2: Nếu số điện thoại tồn tại, kiểm tra mật khẩu
        this.verifyPassword();
      },
      error: (error) => {
        console.error('Lỗi kiểm tra số điện thoại:', error);
        this.isLoading = false;

        if (error.status === 400) {
          this.phoneError = 'Số điện thoại chưa được đăng ký';
        } else {
          this.phoneError = 'Lỗi kết nối, vui lòng thử lại';
        }
      },
    });
  }

  // Bước 2: Xác minh mật khẩu
  private verifyPassword(): void {
    const loginData = {
      phoneNumber: this.phoneNumber,
      password: this.password,
    };

    console.log('Đang xác minh mật khẩu...', loginData);

    this.http.post('/api/auth/login', loginData).subscribe({
      next: (response: any) => {
        console.log('Đăng nhập thành công!', response);
        this.isLoading = false;

        // Lưu thông tin user và token vào localStorage
        if (response.data) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        // Navigate to main page (chưa implement)
        console.log('>>> Chuyển đến trang chính...');
        // this.router.navigate(['/dashboard']); // TODO: Implement dashboard
      },
      error: (error) => {
        console.error('Lỗi đăng nhập:', error);
        this.isLoading = false;

        // Kiểm tra error message từ backend
        if (error.error && error.error.message) {
          const errorMessage = error.error.message.toLowerCase();

          if (errorMessage.includes('mật khẩu') || errorMessage.includes('password')) {
            this.passwordError = 'Mật khẩu không chính xác';
          } else if (errorMessage.includes('số điện thoại') || errorMessage.includes('phone')) {
            this.phoneError = 'Số điện thoại không tồn tại';
          } else {
            this.loginError = error.error.message;
          }
        } else if (error.status === 401) {
          // 401 Unauthorized = Mật khẩu sai (vì số điện thoại đã được xác nhận ở bước 1)
          console.log('401 Unauthorized - Mật khẩu sai');
          this.passwordError = 'Mật khẩu không chính xác';
        } else if (error.status === 400) {
          this.passwordError = 'Mật khẩu không chính xác';
        } else if (error.status === 404) {
          this.phoneError = 'Số điện thoại không tồn tại';
        } else {
          this.loginError = 'Lỗi kết nối, vui lòng thử lại';
        }
      },
    });
  }
}
