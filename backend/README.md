# VGreen Backend API

Backend Node.js + Express cho ứng dụng VGreen với chức năng xác thực người dùng kết nối MongoDB.

## 🚀 Cài đặt và Chạy: npm run ng

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

### 3. Chạy Backend Server

```bash
# Chạy production
npm start

# Chạy development (với nodemon)
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### 4. Chạy Frontend Angular

```bash
cd ../my-user
ng serve --o
```

Frontend sẽ chạy tại: `http://localhost:4200`

## 📚 API Endpoints

### Base URL: `http://localhost:3000/api`

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
    "FullName": "Nguyễn Văn A",
    "Phone": "0123456789",
    "Email": "user@example.com",
    "RegisterDate": "2024-01-01T00:00:00.000Z",
    "CustomerType": "regular",
    "Income": 10000000,
    "Fee": 500000
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
    "FullName": "Nguyễn Văn A",
    "Phone": "0123456789",
    "Email": "user@example.com",
    "Address": "",
    "RegisterDate": "2024-01-01T00:00:00.000Z",
    "CustomerType": "regular",
    "Income": 10000000,
    "Fee": 500000
  }
}
```

### 3. Cập nhật thông tin (Update)

- **PUT** `/api/auth/user/update`
- **Body:**

```json
{
  "phoneNumber": "0123456789",
  "income": 15000000,
  "fee": 750000
}
```

- **Response:**

```json
{
  "message": "Cập nhật thành công"
}
```

### 4. Quên mật khẩu (Reset Password)

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

## 🗄️ Cấu trúc Database

### Database: `VGreen`

### Collection: `users`

#### Schema User:

```javascript
{
  CustomerID: String,        // Primary Key, tự động tạo
  FullName: String,          // Tên đầy đủ
  Phone: String,            // Số điện thoại (unique)
  Email: String,            // Email (tùy chọn)
  Address: String,          // Địa chỉ (tùy chọn)
  RegisterDate: Date,       // Ngày đăng ký
  CustomerType: String,     // Loại khách hàng (default: "regular")
  Password: String,         // Mật khẩu đã hash
  Income: Number,           // Thu nhập
  Fee: Number              // Phí
}
```

## 🔧 Cấu hình

### MongoDB Connection

- URL: `mongodb://localhost:27017/VGreen`
- Database: `VGreen`
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
3. **Cập nhật** → PUT `/api/auth/user/update`
4. **Reset Password** → POST `/api/auth/reset-password`

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
├── index.js              # Server chính
├── db.js                 # Kết nối MongoDB
├── routes/
│   └── auth.js           # API xác thực
├── package.json          # Dependencies
└── README.md            # Hướng dẫn

my-user/
├── proxy.conf.json       # Cấu hình proxy
├── angular.json          # Cấu hình Angular
└── ...
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

## 📞 Support

Nếu gặp vấn đề, hãy kiểm tra:

1. MongoDB có chạy không
2. Port 3000 có bị chiếm không
3. Dependencies đã cài đặt chưa
4. Logs trong console để debug
