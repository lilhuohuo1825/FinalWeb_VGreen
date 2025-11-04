import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  
  // Base URL của backend API
  private baseUrl = 'http://localhost:3000/api'; // Thay đổi URL này theo backend của bạn
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  /**
   * Get all users/customers
   */
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users`);
  }

  /**
   * Get user by ID
   */
  getUserById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/users/${id}`);
  }

  /**
   * Create new user
   */
  createUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users`, userData, this.httpOptions);
  }

  /**
   * Update user
   */
  updateUser(id: number, userData: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/users/${id}`, userData, this.httpOptions);
  }

  /**
   * Delete user
   */
  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/users/${id}`);
  }

  /**
   * Get all orders
   */
  getOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/orders`);
  }

  /**
   * Get order by ID
   */
  getOrderById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/orders/${id}`);
  }

  /**
   * Get orders by user ID
   */
  getOrdersByUserId(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/orders/user/${userId}`);
  }

  /**
   * Get all products
   */
  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/products`);
  }

  /**
   * Get product by ID
   */
  getProductById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/products/${id}`);
  }

  /**
   * Get all promotions
   */
  getPromotions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/promotions`);
  }

  /**
   * Get order details
   */
  getOrderDetails(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/orderdetails`);
  }

  /**
   * Get order detail by order ID
   */
  getOrderDetailByOrderId(orderId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/orderdetails/${orderId}`);
  }

  /**
   * Get all provinces
   */
  getProvinces(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/provinces`);
  }

  /**
   * Get all wards
   */
  getWards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/wards`);
  }

  /**
   * Get tree (hierarchical address structure)
   */
  getTree(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tree`);
  }
}

