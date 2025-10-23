import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { RegisterPhone } from './auth/register-phone/register-phone';
import { OtpComponent } from './auth/otp/otp';
import { RegisterPassword } from './auth/register-password/register-password';
import { ForgotPasswordPhone } from './auth/forgot-password-phone/forgot-password-phone';
import { ForgotPasswordReset } from './auth/forgot-password-reset/forgot-password-reset';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: RegisterPhone },
  { path: 'register/otp', component: OtpComponent },
  { path: 'register/password', component: RegisterPassword },
  { path: 'forgot-password', component: ForgotPasswordPhone },
  { path: 'forgot-password/otp', component: OtpComponent },
  { path: 'forgot-password/reset', component: ForgotPasswordReset },
  { path: '**', redirectTo: '/login' },
];
