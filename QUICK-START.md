# 🚀 Quick Start Guide

## ✅ Backend đã được khởi động!

Backend server đang chạy tại: **http://localhost:3000**

## 📋 Để Start Backend trong tương lai:

### Cách 1: Dùng script tự động (Khuyên dùng)
```bash
cd backend
./start-backend.sh
```

Script này sẽ tự động:
- ✅ Kiểm tra MongoDB
- ✅ Start MongoDB nếu chưa chạy
- ✅ Import admin data nếu chưa có
- ✅ Start backend server

### Cách 2: Manual start
```bash
# 1. Kiểm tra MongoDB đang chạy
pgrep -x mongod

# 2. Nếu MongoDB chưa chạy, start nó:
brew services start mongodb-community

# 3. Import admin data (nếu chưa có)
cd backend
node import-admin.js

# 4. Start backend
npm start
```

## 🔍 Kiểm tra Backend đang chạy:

```bash
# Test API endpoint
curl http://localhost:3000/api/users

# Hoặc test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"huongpth23411@st.uel.edu.vn","password":"1234567890"}'
```

## 👤 Admin Credentials để test:

- **Email:** `huongpth23411@st.uel.edu.vn`
- **Password:** `1234567890`

Hoặc bất kỳ admin nào khác trong `data/admin.json`

## 🛑 Stop Backend:

```bash
# Tìm process
lsof -i :3000

# Kill process
kill -9 <PID>

# Hoặc dùng pkill
pkill -f "node.*server.js"
```

## ❌ Troubleshooting:

### Lỗi: "ERR_CONNECTION_REFUSED"

**Giải pháp:**
1. Kiểm tra backend đang chạy: `lsof -i :3000`
2. Nếu không, start backend: `cd backend && npm start`
3. Kiểm tra MongoDB: `pgrep -x mongod`
4. Nếu không, start MongoDB: `brew services start mongodb-community`

### Lỗi: "MongoDB not connected"

**Giải pháp:**
1. Start MongoDB: `brew services start mongodb-community`
2. Test connection: `cd backend && node test-connection.js`
3. Import admin data: `cd backend && node import-admin.js`
4. Restart backend: `cd backend && npm start`

### Lỗi: "Port 3000 already in use"

**Giải pháp:**
```bash
# Kill process đang dùng port 3000
lsof -ti :3000 | xargs kill -9
```

---

✅ **Backend hiện tại đang chạy và sẵn sàng!**

Bạn có thể test login ngay bây giờ với:
- Email: `huongpth23411@st.uel.edu.vn`
- Password: `1234567890`

