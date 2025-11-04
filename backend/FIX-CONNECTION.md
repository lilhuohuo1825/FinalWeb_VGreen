# 🔧 Hướng Dẫn Sửa Lỗi Kết Nối Backend

## ❌ Vấn Đề

Lỗi: "Không kết nối được với server. Vui lòng kiểm tra backend đang chạy."

## ✅ Giải Pháp

### Bước 1: Kiểm tra MongoDB đang chạy

```bash
# Kiểm tra MongoDB process
pgrep -x mongod

# Hoặc kiểm tra service (macOS)
brew services list | grep mongodb

# Nếu không chạy, start MongoDB:
# macOS:
brew services start mongodb-community

# Hoặc chạy trực tiếp:
mongod --dbpath /path/to/data
```

### Bước 2: Kiểm tra và Import dữ liệu

```bash
cd backend

# Chạy script tự động kiểm tra và import
./check-and-import.sh
```

Script này sẽ:
1. ✅ Kiểm tra MongoDB đang chạy
2. ✅ Test kết nối MongoDB
3. ✅ Kiểm tra collection `admins` có dữ liệu
4. ✅ Tự động import admin data nếu chưa có

### Bước 3: Import Admin Data (nếu cần)

```bash
cd backend
node import-admin.js
```

### Bước 4: Import các dữ liệu khác (nếu cần)

```bash
cd backend
./import-data.sh
```

### Bước 5: Start Backend Server

```bash
cd backend
npm start

# Hoặc với nodemon (auto-reload):
npm run dev
```

Bạn sẽ thấy:
```
Backend API server running on http://localhost:3000
Database: vgreen
✅ Connected to MongoDB successfully!
✅ Collections initialized:
   - users
   - admins
   - orders
   ...
```

### Bước 6: Test API Endpoint

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"huongpth23411@st.uel.edu.vn","password":"1234567890"}'

# Test users endpoint
curl http://localhost:3000/api/users
```

## 📋 Checklist

- [ ] MongoDB đang chạy
- [ ] Database `vgreen` tồn tại
- [ ] Collection `admins` có dữ liệu (ít nhất 1 admin)
- [ ] Backend server đang chạy trên port 3000
- [ ] API endpoint `/api/auth/login` phản hồi

## 🔍 Troubleshooting

### Lỗi: "MongoDB connection failed"

**Giải pháp:**
1. Kiểm tra MongoDB đang chạy: `pgrep -x mongod`
2. Kiểm tra port 27017: `lsof -i :27017`
3. Restart MongoDB: `brew services restart mongodb-community`

### Lỗi: "Collection admins is empty"

**Giải pháp:**
```bash
cd backend
node import-admin.js
```

### Lỗi: "Cannot find module 'mongodb'"

**Giải pháp:**
```bash
cd backend
npm install
```

### Lỗi: "Port 3000 is already in use"

**Giải pháp:**
```bash
# Tìm process đang dùng port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Hoặc đổi port trong server.js
```

### Lỗi: "CORS error"

**Giải pháp:**
Backend đã có CORS enabled. Kiểm tra:
- Frontend đang chạy trên port nào?
- Backend URL trong frontend: `http://localhost:3000/api`

## 👤 Admin Credentials

Sau khi import, bạn có thể đăng nhập với:

- **Email:** `huongpth23411@st.uel.edu.vn`
- **Password:** `1234567890`

Hoặc bất kỳ admin nào khác trong `admin.json`

## 📞 Test Connection Scripts

```bash
# Test MongoDB connection
node test-connection.js

# Import admin data
node import-admin.js

# Check và import tự động
./check-and-import.sh
```

## ✅ Success Indicators

Khi mọi thứ hoạt động đúng, bạn sẽ thấy:

1. **Backend console:**
   ```
   ✅ Connected to MongoDB successfully!
   ✅ Database "vgreen" accessed
   ✅ Collections initialized
   📊 Collection document counts:
      - users: X documents
      - admins: 6 documents
      - orders: X documents
   ```

2. **Frontend login:**
   - Không còn lỗi "Không kết nối được với server"
   - Có thể đăng nhập thành công

3. **API response:**
   ```json
   {
     "token": "admin_token_...",
     "user": {
       "id": "ADM001",
       "email": "huongpth23411@st.uel.edu.vn",
       "name": "Huỳnh Hương",
       "role": "admin"
     }
   }
   ```

---

🎉 **Nếu vẫn gặp vấn đề, kiểm tra logs trong backend console để xem lỗi cụ thể!**

