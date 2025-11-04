# VGreen Backend API

Backend API server kết nối với MongoDB để phục vụ VGreen Admin.

## Yêu cầu

- Node.js (v14 trở lên)
- MongoDB (đang chạy tại localhost:27017 hoặc MongoDB Atlas)

## Cài đặt

1. **Cài đặt dependencies:**
```bash
cd backend
npm install
```

2. **Cấu hình MongoDB:**

Mở file `server.js` và thay đổi MongoDB URI nếu cần:

```javascript
const MONGODB_URI = 'mongodb://localhost:27017'; // Local MongoDB
// Hoặc dùng MongoDB Atlas:
// const MONGODB_URI = 'mongodb+srv://username:password@cluster.mongodb.net/';
```

3. **Đảm bảo MongoDB đang chạy:**

Nếu dùng MongoDB local:
```bash
# Kiểm tra MongoDB có đang chạy không
mongosh
```

Nếu dùng MongoDB Compass như trong hình, đảm bảo đã connect thành công.

## Chạy Backend

**Development mode (auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## API Endpoints

### Users/Customers
- `GET /api/users` - Lấy tất cả users
- `GET /api/users/:id` - Lấy user theo ID
- `POST /api/users` - Tạo user mới
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

### Orders
- `GET /api/orders` - Lấy tất cả orders
- `GET /api/orders/:id` - Lấy order theo ID
- `GET /api/orders/user/:userId` - Lấy orders của user

### Products
- `GET /api/products` - Lấy tất cả products
- `GET /api/products/:id` - Lấy product theo ID

### Promotions
- `GET /api/promotions` - Lấy tất cả promotions

### Order Details
- `GET /api/orderdetails` - Lấy tất cả order details
- `GET /api/orderdetails/:orderId` - Lấy order detail theo order ID

## Cấu trúc Database

Database: **VGreen**

Collections:
- `users` - Thông tin khách hàng
- `orders` - Đơn hàng
- `products` - Sản phẩm
- `promotions` - Khuyến mãi
- `orderdetails` - Chi tiết đơn hàng

## Test API

Có thể dùng:
- Browser: `http://localhost:3000/api/users`
- Postman
- curl:
```bash
curl http://localhost:3000/api/users
```

## Troubleshooting

### Lỗi kết nối MongoDB
```
MongoDB connection error: ...
```

**Giải pháp:**
1. Kiểm tra MongoDB đang chạy
2. Kiểm tra URI trong `server.js`
3. Kiểm tra firewall/network

### CORS Error
Server đã cấu hình CORS để cho phép requests từ Angular frontend.

### Port 3000 đang được sử dụng
Thay đổi PORT trong `server.js`:
```javascript
const PORT = 3001; // Hoặc port khác
```

## Notes

- Backend sẽ fallback về JSON files nếu không kết nối được MongoDB
- Tất cả endpoints đều trả về JSON format
- Lỗi sẽ có status code tương ứng (404, 500, etc.)

