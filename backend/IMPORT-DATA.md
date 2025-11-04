# 📥 Import Data vào MongoDB

## ⚠️ VẤN ĐỀ

MongoDB connection thành công **NHƯNG** không có dữ liệu!

```
✅ Connected to MongoDB successfully!
📊 Database: VGreen
📁 Collections found:
🎉 MongoDB connection test completed!
```

→ **0 collections = 0 data!**

## ✅ GIẢI PHÁP

Import dữ liệu từ JSON files vào MongoDB.

---

## 🎯 Cách 1: Dùng Script (Nhanh nhất)

```bash
cd /Users/lilhuohuo/Downloads/FinalWeb_VGreen/backend
./import-data.sh
```

Script sẽ tự động:
1. Import `users.json` → Collection `users`
2. Import `orders.json` → Collection `orders`
3. Import `product.json` → Collection `products`
4. Import `promotions.json` → Collection `promotions`
5. Import `orderdetail.json` → Collection `orderdetails`
6. Verify import thành công

---

## 🖱️ Cách 2: Dùng MongoDB Compass (UI)

### Bước 1: Mở MongoDB Compass

Kết nối với: `mongodb://localhost:27017`

### Bước 2: Tạo Database

- Click `+` để tạo database mới
- Database Name: `VGreen`
- Collection Name: `users` (tạm thời)

### Bước 3: Tạo các Collections

Click `CREATE COLLECTION` và tạo:
- `users`
- `orders`
- `products`
- `promotions`
- `orderdetails`

### Bước 4: Import Data

Cho mỗi collection:

1. Click vào collection name
2. Click `ADD DATA` → `Import JSON or CSV file`
3. Chọn file tương ứng:
   - `users` ← `data/users.json`
   - `orders` ← `data/orders.json`
   - `products` ← `data/product.json`
   - `promotions` ← `data/promotions.json`
   - `orderdetails` ← `data/orderdetail.json`
4. Click `Import`

### Bước 5: Verify

Mỗi collection sẽ hiện số documents:
- `users` - 10 documents
- `orders` - X documents
- `products` - ~14,665 documents
- `promotions` - X documents
- `orderdetails` - X documents

---

## 💻 Cách 3: Dùng mongoimport command

### Import từng file:

```bash
# Navigate to backend folder
cd /Users/lilhuohuo/Downloads/FinalWeb_VGreen/backend

# Import users
mongoimport --db VGreen --collection users --file ../data/users.json --jsonArray

# Import orders
mongoimport --db VGreen --collection orders --file ../data/orders.json --jsonArray

# Import products (file lớn, mất ~1-2 phút)
mongoimport --db VGreen --collection products --file ../data/product.json --jsonArray

# Import promotions
mongoimport --db VGreen --collection promotions --file ../data/promotions.json --jsonArray

# Import order details
mongoimport --db VGreen --collection orderdetails --file ../data/orderdetail.json --jsonArray
```

### Verify import:

```bash
node test-connection.js
```

Bạn sẽ thấy:
```
📁 Collections found:
  - users
    └─ 10 documents
  - orders
    └─ X documents
  - products
    └─ 14665 documents
  - promotions
    └─ X documents
  - orderdetails
    └─ X documents
```

---

## 🔍 Test Connection

Sau khi import xong, test lại:

```bash
node test-connection.js
```

Hoặc test API endpoints:

```bash
# Test users endpoint
curl http://localhost:3000/api/users

# Test orders endpoint
curl http://localhost:3000/api/orders

# Test products endpoint (cẩn thận: output sẽ rất lớn!)
curl http://localhost:3000/api/products | head -n 50
```

---

## ❌ Troubleshooting

### Problem: "command not found: mongoimport"

**Giải pháp:**

MongoDB tools chưa được cài đặt.

**Mac:**
```bash
brew install mongodb-database-tools
```

**Windows:**
Download từ: https://www.mongodb.com/try/download/database-tools

### Problem: "File not found"

**Giải pháp:**

Kiểm tra file tồn tại:
```bash
ls -la ../data/*.json
```

Đảm bảo có:
- `users.json`
- `orders.json`
- `product.json`
- `promotions.json`
- `orderdetail.json`

### Problem: "Failed to connect to localhost:27017"

**Giải pháp:**

MongoDB chưa chạy:
```bash
# Check MongoDB status
brew services list | grep mongodb

# Start MongoDB
brew services start mongodb-community

# Hoặc dùng mongod command
mongod --dbpath /path/to/data
```

### Problem: Import thành công nhưng frontend vẫn không load data

**Giải pháp:**

1. Verify data trong MongoDB Compass
2. Restart backend server:
```bash
cd backend
npm start
```
3. Check console logs trong browser (F12)
4. Verify API endpoint:
```bash
curl http://localhost:3000/api/users
```

---

## ✅ Success Checklist

Import thành công khi:

- [x] `node test-connection.js` hiển thị tất cả collections
- [x] Mỗi collection có documents
- [x] Backend API running: `http://localhost:3000`
- [x] `curl http://localhost:3000/api/users` trả về data
- [x] Frontend console log: "✅ Loaded X customers from MongoDB"
- [x] Danh sách khách hàng hiển thị trong app

---

🎉 **Sau khi import xong, restart cả backend và frontend để app load dữ liệu từ MongoDB!**

