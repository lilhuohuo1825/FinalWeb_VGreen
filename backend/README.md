# 🌱 vgreen Backend API

Backend Node.js + Express cho ứng dụng vgreen với chức năng xác thực người dùng, quản lý wishlist và địa chỉ, kết nối MongoDB.

## ⭐ Tính Năng Mới

- **Wishlist API** - Quản lý sản phẩm yêu thích
- **Address API** - Quản lý địa chỉ giao hàng
- **Auto-initialization** - Tự động tạo collections cho users

## 🚀 Cài đặt và Chạy

### Yêu cầu hệ thống

- Node.js (phiên bản 14 trở lên)
- MongoDB (chạy trên localhost:27017)
- npm hoặc yarn

### 1. Cài đặt Dependencies

```bash
cd backend
npm install
```

### 2. Khởi động MongoDB

Đảm bảo MongoDB đang chạy trên localhost:27017:

```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
# hoặc
mongod
```

### 3. Khởi tạo Collections (Bước mới)

```bash
# Tạo collections wishlist & address cho tất cả users
npm run init-db
```

### 4. Chạy Backend Server

```bash
# Chạy production
npm start

# Chạy development (với nodemon)
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### 5. Test API (Tùy chọn)

```bash
# Test tất cả API endpoints
npm run test-api
```

### 6. Chạy Frontend Angular

```bash
cd ../my-user
ng serve --o
```

Frontend sẽ chạy tại: `http://localhost:4200`

## 📚 API Endpoints

### Base URL: `http://localhost:3000/api`

---

## 🔐 Authentication APIs

### 1. Đăng ký (Register)

- **POST** `/api/auth/register`
- **Body:**

```json
{
  "phoneNumber": "0123456789",
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "email": "user@example.com",
  "income": 10000000,
  "fee": 500000
}
```

- **Response:**

```json
{
  "message": "Đăng ký thành công",
  "user": {
    "CustomerID": "CUS123456789",
    "Phone": "0123456789",
    "RegisterDate": "2024-01-01T00:00:00.000Z",
    "FullName": "Nguyễn Văn A",
    "Email": "user@example.com",
    "Address": "",
    "CustomerTiering": "Đồng",
    "TotalSpent": 0
  }
}
```

### 2. Đăng nhập (Login)

- **POST** `/api/auth/login`
- **Body:**

```json
{
  "phoneNumber": "0123456789",
  "password": "password123"
}
```

- **Response:**

```json
{
  "message": "Đăng nhập thành công",
  "user": {
    "CustomerID": "CUS123456789",
    "Phone": "0123456789",
    "RegisterDate": "2024-01-01T00:00:00.000Z",
    "FullName": "Nguyễn Văn A",
    "Email": "user@example.com",
    "Address": "",
    "CustomerTiering": "Đồng",
    "TotalSpent": 0
  }
}
```

### 3. Cập nhật thông tin (Update)

- **PUT** `/api/auth/user/update`
- **Body:**

```json
{
  "customerID": "CUS123456789",
  "phoneNumber": "0123456789",
  "fullName": "Nguyễn Văn A",
  "email": "user@example.com",
  "address": "123 Đường ABC",
  "birthDay": "1990-01-01",
  "gender": "male"
}
```

- **Response:**

```json
{
  "success": true,
  "message": "Cập nhật thành công",
  "data": {
    "CustomerID": "CUS123456789",
    "Phone": "0123456789",
    "FullName": "Nguyễn Văn A",
    "Email": "user@example.com",
    "Address": "123 Đường ABC",
    "BirthDay": "1990-01-01T00:00:00.000Z",
    "Gender": "male"
  }
}
```

### 4. Lấy thông tin user theo CustomerID

- **GET** `/api/auth/user/:customerID`
- **Response:**

```json
{
  "success": true,
  "user": {
    "CustomerID": "CUS123456789",
    "Phone": "0123456789",
    "RegisterDate": "2024-01-01T00:00:00.000Z",
    "FullName": "Nguyễn Văn A",
    "Email": "user@example.com",
    "Address": "123 Đường ABC",
    "CustomerTiering": "Đồng",
    "TotalSpent": 0
  }
}
```

### 5. Quên mật khẩu (Reset Password)

- **POST** `/api/auth/reset-password`
- **Body:**

```json
{
  "phoneNumber": "0123456789",
  "newPassword": "newpassword123"
}
```

- **Response:**

```json
{
  "message": "Đặt lại mật khẩu thành công"
}
```

---

## ⭐ Wishlist APIs (MỚI)

### 1. Lấy Wishlist

- **GET** `/api/wishlist/:user_id`
- **Response:**

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "wishlist": [
      {
        "product_id": "SP001",
        "product_name": "Rau Cải Xanh",
        "time": "2025-10-30T10:00:00.000Z"
      }
    ]
  }
}
```

### 2. Thêm Vào Wishlist

- **POST** `/api/wishlist/:user_id/add`
- **Body:**

```json
{
  "product_id": "SP001",
  "product_name": "Rau Cải Xanh"
}
```

### 3. Xóa Khỏi Wishlist

- **DELETE** `/api/wishlist/:user_id/remove/:product_id`

### 4. Kiểm Tra Sản Phẩm

- **GET** `/api/wishlist/:user_id/check/:product_id`

### 5. Xóa Tất Cả

- **DELETE** `/api/wishlist/:user_id/clear`

---

## 📍 Address APIs (MỚI)

### 1. Lấy Tất Cả Địa Chỉ

- **GET** `/api/address/:user_id`

### 2. Thêm Địa Chỉ

- **POST** `/api/address/:user_id/add`
- **Body:**

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678",
  "email": "test@example.com",
  "city": "Thành phố Hồ Chí Minh",
  "district": "Quận 1",
  "ward": "Phường Bến Nghé",
  "detail": "123 Nguyễn Huệ",
  "notes": "Gọi trước khi giao",
  "deliveryMethod": "express",
  "isDefault": true
}
```

### 3. Cập Nhật Địa Chỉ

- **PUT** `/api/address/:user_id/update/:address_id`

### 4. Xóa Địa Chỉ

- **DELETE** `/api/address/:user_id/delete/:address_id`

### 5. Đặt Địa Chỉ Mặc Định

- **PUT** `/api/address/:user_id/set-default/:address_id`

### 6. Lấy Địa Chỉ Mặc Định

- **GET** `/api/address/:user_id/default`

---

## 📦 Products APIs

### 1. Lấy Tất Cả Sản Phẩm

- **GET** `/api/products`

### 2. Lấy Sản Phẩm Theo ID

- **GET** `/api/products/:id`

### 3. Lấy Sản Phẩm Theo Category

- **GET** `/api/products/category/:category`

### 4. Lấy Sản Phẩm Theo Category và Subcategory

- **GET** `/api/products/category/:category/:subcategory`

---

## 🛒 Cart APIs

### 1. Lấy Giỏ Hàng

- **GET** `/api/cart/:customerID`

### 2. Thêm Sản Phẩm Vào Giỏ

- **POST** `/api/cart/:customerID/add`

### 3. Cập Nhật Số Lượng

- **PUT** `/api/cart/:customerID/update/:sku`

### 4. Xóa Sản Phẩm

- **DELETE** `/api/cart/:customerID/remove/:sku`

### 5. Xóa Tất Cả

- **DELETE** `/api/cart/:customerID/clear`

### 6. Đồng Bộ Giỏ Hàng

- **POST** `/api/cart/:customerID/sync`

---

## 🎁 Promotions APIs

### 1. Lấy Tất Cả Mã Giảm Giá

- **GET** `/api/promotions`

### 2. Lấy Mã Giảm Giá Đang Hoạt Động

- **GET** `/api/promotions/active`

### 3. Lấy Mã Giảm Giá Theo Mã

- **GET** `/api/promotions/code/:code`

### 4. Lấy Mã Giảm Giá Theo ID

- **GET** `/api/promotions/:id`

### 5. Tạo Mã Giảm Giá Mới

- **POST** `/api/promotions`

### 6. Cập Nhật Mã Giảm Giá

- **PUT** `/api/promotions/:id`

### 7. Xóa Mã Giảm Giá

- **DELETE** `/api/promotions/:id`

---

## 📦 Orders APIs

### 1. Tạo Đơn Hàng

- **POST** `/api/orders`

### 2. Lấy Đơn Hàng Theo CustomerID

- **GET** `/api/orders?CustomerID=xxx`

### 3. Lấy Đơn Hàng Theo OrderID

- **GET** `/api/orders/:orderId`

### 4. Cập Nhật Trạng Thái Đơn Hàng

- **PUT** `/api/orders/:orderId/status`

### 5. Xóa Đơn Hàng

- **DELETE** `/api/orders/:orderId`

---

## ⭐ Reviews APIs

### 1. Lấy Đánh Giá Theo SKU

- **GET** `/api/reviews/:sku`

### 2. Tạo Đánh Giá Mới

- **POST** `/api/reviews`

### 3. Cập Nhật Đánh Giá

- **PUT** `/api/reviews/:reviewId`

### 4. Xóa Đánh Giá

- **DELETE** `/api/reviews/:reviewId`

---

## 📝 Blogs APIs

### 1. Lấy Tất Cả Blog

- **GET** `/api/blogs`

### 2. Lấy Blog Theo ID

- **GET** `/api/blogs/:id`

### 3. Lấy Blog Featured

- **GET** `/api/blogs/featured/latest`

### 4. Lấy Blog Theo Category

- **GET** `/api/blogs/category/:category`

### 5. Tìm Kiếm Blog

- **GET** `/api/blogs/search?q=keyword`

### 6. Tạo Blog Mới

- **POST** `/api/blogs`

### 7. Cập Nhật Blog

- **PUT** `/api/blogs/:id`

### 8. Xóa Blog

- **DELETE** `/api/blogs/:id`

---

## 🍳 Cookbook APIs (Dishes & Instructions)

### Dishes APIs

#### 1. Lấy Tất Cả Món Ăn

- **GET** `/api/dishes`

#### 2. Lấy Món Ăn Theo ID

- **GET** `/api/dishes/:id`

#### 3. Tạo Nhiều Món Ăn

- **POST** `/api/dishes/batch`

### Instructions APIs

#### 1. Lấy Tất Cả Hướng Dẫn

- **GET** `/api/instructions`

#### 2. Lấy Hướng Dẫn Theo ID

- **GET** `/api/instructions/:id`

#### 3. Tìm Kiếm Hướng Dẫn

- **GET** `/api/instructions/search?q=keyword`

#### 4. Lấy Hướng Dẫn Theo Nguyên Liệu

- **GET** `/api/instructions/by-ingredient/:ingredient`

#### 5. Lấy Hướng Dẫn Khớp Với Sản Phẩm

- **GET** `/api/instructions/match-product?productName=xxx`

---

## 🗄️ Cấu trúc Database

### Database: `vgreen`

### Collection: `users`

#### Schema User:

```javascript
{
  CustomerID: String,        // Primary Key, tự động tạo
  Phone: String,            // Số điện thoại (unique)
  Password: String,         // Mật khẩu đã hash
  RegisterDate: Date,       // Ngày đăng ký
  FullName: String,          // Tên đầy đủ (tùy chọn)
  Email: String,            // Email (tùy chọn)
  Address: String,          // Địa chỉ (tùy chọn)
  BirthDay: Date,           // Ngày sinh (tùy chọn)
  Gender: String,           // Giới tính: "male", "female", "other" (tùy chọn)
  CustomerType: String,     // Loại khách hàng (default: "")
  CustomerTiering: String,  // Phân cấp: "Đồng", "Bạc", "Vàng", "Bạch Kim" (default: "Đồng")
  TotalSpent: Number,       // Tổng số tiền đã chi tiêu (default: 0)
  PasswordVersion: Number,  // Version của password (default: 1)
  LastPasswordReset: Date   // Ngày đặt lại mật khẩu lần cuối (tùy chọn)
}
```

### Collection: `user_wishlists` (MỚI)

#### Schema Wishlist:

```javascript
{
  user_id: Number,          // User ID (unique)
  wishlist: [
    {
      product_id: String,   // Mã sản phẩm
      product_name: String, // Tên sản phẩm
      time: Date           // Thời gian thêm (tự động)
    }
  ]
}
```

### Collection: `user_addresses` (MỚI)

#### Schema Address:

```javascript
{
  user_id: Number,          // User ID (unique)
  addresses: [
    {
      fullName: String,     // Tên người nhận
      phone: String,        // SĐT người nhận
      email: String,        // Email
      city: String,         // Thành phố
      district: String,     // Quận/Huyện
      ward: String,         // Phường/Xã
      detail: String,       // Địa chỉ chi tiết
      notes: String,        // Ghi chú
      deliveryMethod: String, // 'standard' hoặc 'express'
      isDefault: Boolean,   // Địa chỉ mặc định
      createdAt: Date      // Thời gian tạo (tự động)
    }
  ]
}
```

## 🔧 Cấu hình

### MongoDB Connection

- URL: `mongodb://localhost:27017/vgreen`
- Database: `vgreen`
- Collection: `users`

### CORS

- Đã cấu hình CORS để cho phép Angular frontend gọi API
- Origin: `http://localhost:4200`

### Proxy Configuration

- File: `my-user/proxy.conf.json`
- Chuyển tiếp tất cả request `/api/*` từ Angular đến Backend

## 🧪 Testing với Postman

### 1. Kiểm tra Server

- **GET** `http://localhost:3000/`
- **GET** `http://localhost:3000/health`

### 2. Test Flow hoàn chỉnh

1. **Đăng ký** → POST `/api/auth/register`
2. **Đăng nhập** → POST `/api/auth/login`
3. **Lấy thông tin user** → GET `/api/auth/user/:customerID`
4. **Cập nhật** → PUT `/api/auth/user/update`
5. **Reset Password** → POST `/api/auth/reset-password`

## 🚨 Error Handling

Tất cả lỗi được trả về theo format:

```json
{
  "error": "Mô tả lỗi"
}
```

### Các mã lỗi phổ biến:

- `400`: Dữ liệu đầu vào không hợp lệ
- `401`: Xác thực thất bại
- `404`: Không tìm thấy user
- `500`: Lỗi server

## 📁 Cấu trúc Project

```
backend/
├── index.js                          # Server chính
├── db.js                             # Kết nối MongoDB & Schemas
├── package.json                      # Dependencies
├── routes/
│   ├── auth.js                      # API xác thực
│   ├── products.js                  # API sản phẩm
│   ├── cart.js                      # API giỏ hàng
│   ├── promotions.js                # API mã giảm giá
│   ├── promotion-targets.js         # API đối tượng áp dụng mã giảm giá
│   ├── orders.js                    # API đơn hàng
│   ├── reviews.js                   # API đánh giá
│   ├── blogs.js                     # API blog
│   ├── dishes.js                    # API món ăn (Cookbook)
│   ├── instructions.js              # API hướng dẫn nấu ăn (Cookbook)
│   ├── wishlist.js                  # API wishlist
│   └── address.js                   # API địa chỉ
├── scripts/
│   ├── init-collections.js          # Script khởi tạo DB (MỚI)
│   └── test-api.js                  # Script test API (MỚI)
├── README.md                         # Hướng dẫn này
├── QUICK_START.md                    # Hướng dẫn nhanh (MỚI)
├── WISHLIST_ADDRESS_GUIDE.md         # Hướng dẫn chi tiết (MỚI)
└── IMPLEMENTATION_SUMMARY.md         # Tổng kết (MỚI)

my-user/
├── src/app/services/
│   ├── wishlist.service.ts          # Service wishlist (MỚI)
│   └── address.service.ts           # Service address (CẬP NHẬT)
├── proxy.conf.json                   # Cấu hình proxy
├── angular.json                      # Cấu hình Angular
└── ...
```

## 🛠️ NPM Scripts

```bash
npm start           # Chạy server (production)
npm run dev         # Chạy server (development với nodemon)
npm run init-db     # Khởi tạo collections cho tất cả users (MỚI)
npm run test-api    # Test tất cả API endpoints (MỚI)
```

## 🔐 Bảo mật

- Password được hash bằng `bcrypt` với salt rounds = 10
- Không trả về password trong response
- Validate dữ liệu đầu vào
- CORS được cấu hình đúng cách

## 🐛 Troubleshooting

### Lỗi kết nối MongoDB

```bash
# Kiểm tra MongoDB có chạy không
mongosh
# hoặc
mongo
```

### Lỗi CORS

- Đảm bảo Angular chạy trên port 4200
- Kiểm tra proxy.conf.json

### Lỗi Port đã được sử dụng

```bash
# Tìm process đang dùng port 3000
netstat -ano | findstr :3000
# Kill process
taskkill /PID <PID> /F
```

## 📚 Tài Liệu Bổ Sung

- **[QUICK_START.md](./QUICK_START.md)** - Hướng dẫn bắt đầu nhanh với Wishlist & Address
- **[WISHLIST_ADDRESS_GUIDE.md](./WISHLIST_ADDRESS_GUIDE.md)** - Hướng dẫn chi tiết API & Usage
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Tổng kết triển khai

## 📞 Support

Nếu gặp vấn đề, hãy kiểm tra:

1. MongoDB có chạy không
2. Port 3000 có bị chiếm không
3. Dependencies đã cài đặt chưa (`npm install`)
4. Đã chạy `npm run init-db` chưa (cho collections mới)
5. Logs trong console để debug

---

**Version:** 1.0.0 (Updated with Wishlist & Address)  
**Last Updated:** October 30, 2025  
**Team:** vgreen Development Team
