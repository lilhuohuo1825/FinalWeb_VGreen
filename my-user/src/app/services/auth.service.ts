import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MockBackendService } from './mock-backend.service';

export interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
  email?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
}

export interface RegisterRequest {
  phoneNumber: string;
  password: string;
  fullName: string;
  email?: string;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface ForgotPasswordRequest {
  phoneNumber: string;
}

export interface ResetPasswordRequest {
  phoneNumber: string;
  newPassword: string;
  otp: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private mockBackend: MockBackendService) {
    // Load user from localStorage on service initialization
    this.loadUserFromStorage();
  }

  // Register new user
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.mockBackend.register(userData).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.setCurrentUser(response.data.user, response.data.token);
        }
      })
    );
  }

  // Login user
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.mockBackend.login(credentials).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.setCurrentUser(response.data.user, response.data.token);
        }
      })
    );
  }

  // Forgot password
  forgotPassword(phoneNumber: string): Observable<any> {
    return this.mockBackend.forgotPassword(phoneNumber);
  }

  // Reset password
  resetPassword(resetData: ResetPasswordRequest): Observable<any> {
    return this.mockBackend.resetPassword(resetData);
  }

  // Send OTP for registration
  sendOtp(phoneNumber: string): Observable<any> {
    return this.mockBackend.sendOtp(phoneNumber);
  }

  // Send OTP for forgot password
  sendForgotPasswordOtp(phoneNumber: string): Observable<any> {
    return this.mockBackend.sendForgotPasswordOtp(phoneNumber);
  }

  // Verify OTP for registration
  verifyOtp(phoneNumber: string, otp: string): Observable<any> {
    return this.mockBackend.verifyOtp(phoneNumber, otp);
  }

  // Verify OTP for forgot password
  verifyForgotPasswordOtp(phoneNumber: string, otp: string): Observable<any> {
    return this.mockBackend.verifyForgotPasswordOtp(phoneNumber, otp);
  }

  // Logout user
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Set current user and save to storage
  private setCurrentUser(user: User, token: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Load user from localStorage
  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }
}
