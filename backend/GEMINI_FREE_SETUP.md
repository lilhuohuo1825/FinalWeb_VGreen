# Hướng dẫn sử dụng Google Gemini API miễn phí (Không cần billing)

## ✅ Google Gemini API - Hoàn toàn miễn phí!

Google Gemini API có **free tier hoàn toàn miễn phí** - **KHÔNG CẦN BILLING ACCOUNT**!

### 🎯 Tính năng Free Tier:

- ✅ **Hoàn toàn miễn phí** - không cần thẻ tín dụng
- ✅ **Không cần billing account**
- ✅ **60 requests/phút** (RPM)
- ✅ **1,500 requests/ngày** (RPD)
- ✅ Models: `gemini-1.5-flash` (nhanh, miễn phí) hoặc `gemini-pro`

### 📋 Cách lấy API Key miễn phí (Bước 1-5):

#### **Bước 1: Truy cập Google AI Studio**
- Link: https://aistudio.google.com/app/apikey
- Hoặc: https://makersuite.google.com/app/apikey

#### **Bước 2: Đăng nhập**
- Đăng nhập bằng tài khoản Google (bất kỳ tài khoản Google nào)
- Không cần tài khoản đặc biệt

#### **Bước 3: Tạo API Key**
- Click vào **"Create API Key"** hoặc **"Get API Key"**
- Chọn **"Create API key in new project"** (tạo project mới)
- Hoặc chọn project có sẵn nếu bạn đã có

#### **Bước 4: Copy API Key**
- API key sẽ được hiển thị ngay lập tức
- Copy API key (dạng: `AIzaSy...`)
- ⚠️ **Lưu ý:** API key chỉ hiển thị một lần, hãy copy ngay!

#### **Bước 5: Cấu hình trong project**
1. Tạo file `.env` trong thư mục `backend/` (nếu chưa có)
2. Thêm các dòng sau:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

3. Thay `your_gemini_api_key_here` bằng API key bạn vừa copy
4. Lưu file

### 🔧 Cấu hình Models:

#### **Option 1: Gemini 1.5 Flash (Khuyến nghị)**
```env
GEMINI_MODEL=gemini-1.5-flash
```
- ✅ Nhanh nhất
- ✅ Miễn phí
- ✅ Phù hợp cho chatbot
- ✅ Response time: ~1-2 giây

#### **Option 2: Gemini Pro**
```env
GEMINI_MODEL=gemini-pro
```
- ✅ Mạnh hơn
- ✅ Miễn phí
- ✅ Response time: ~2-3 giây

### 🚀 Khởi động Backend:

```bash
cd backend
npm start
# hoặc
npm run dev  # với nodemon để auto-reload
```

### ✅ Kiểm tra:

1. Mở browser và truy cập chatbot
2. Gửi một tin nhắn test
3. Kiểm tra console log backend:
   - Nếu thấy: `[Chat] Using Google Gemini API (FREE tier)` → ✅ Thành công!
   - Nếu thấy: `[Chat] Using improved fallback response` → ⚠️ Kiểm tra lại API key

### 🐛 Troubleshooting:

#### **Lỗi: "API key not valid"**
- Kiểm tra lại API key trong file `.env`
- Đảm bảo không có khoảng trắng thừa
- Thử tạo API key mới

#### **Lỗi: "Quota exceeded"**
- Free tier có giới hạn: 60 requests/phút, 1,500 requests/ngày
- Đợi một chút rồi thử lại
- Hoặc sử dụng fallback response (đã được cải thiện)

#### **Lỗi: "Model not found"**
- Kiểm tra `GEMINI_MODEL` trong file `.env`
- Sử dụng: `gemini-1.5-flash` hoặc `gemini-pro`
- Đảm bảo model name đúng chính xác

#### **Không có response từ Gemini**
- Kiểm tra kết nối internet
- Kiểm tra API key có đúng không
- Xem console log để biết lỗi chi tiết
- Hệ thống sẽ tự động fallback về improved response nếu lỗi

### 💡 Tips:

1. **API Key Security:**
   - Không commit file `.env` lên Git
   - File `.env` đã được thêm vào `.gitignore`
   - Chia sẻ API key cẩn thận

2. **Rate Limiting:**
   - Free tier: 60 requests/phút
   - Nếu vượt quá, đợi 1 phút rồi thử lại
   - Hoặc sử dụng improved fallback response

3. **Model Selection:**
   - `gemini-1.5-flash`: Nhanh, phù hợp cho chatbot
   - `gemini-pro`: Mạnh hơn, phù hợp cho các tác vụ phức tạp

### 📚 Tài liệu tham khảo:

- Google AI Studio: https://aistudio.google.com
- Gemini API Docs: https://ai.google.dev/docs
- Free Tier Limits: https://ai.google.dev/pricing

### 🎉 Kết luận:

Google Gemini API là lựa chọn **tốt nhất cho model free** vì:
- ✅ Hoàn toàn miễn phí
- ✅ Không cần billing
- ✅ Dễ sử dụng
- ✅ Performance tốt
- ✅ Free tier đủ dùng cho hầu hết ứng dụng

Chúc bạn sử dụng thành công! 🚀

