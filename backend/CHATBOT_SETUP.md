# Hướng dẫn cấu hình Chatbot VGreen với Generative AI

## Tổng quan

Chatbot VGreen đã được tích hợp với Generative AI để tự động trả lời các câu hỏi của khách hàng. Hệ thống hỗ trợ 2 loại AI API:
1. **OpenAI API** (GPT-3.5-turbo hoặc GPT-4)
2. **Google Gemini API** (gemini-pro)

Nếu không có API key, hệ thống sẽ sử dụng fallback response thông minh dựa trên keyword matching.

## Cấu hình

### Bước 1: Cài đặt dependencies

```bash
cd backend
npm install
```

### Bước 2: Cấu hình API Key (Tùy chọn)

#### Option 1: Sử dụng Google Gemini API (FREE - Khuyến nghị) ⭐

Google Gemini có **free tier hoàn toàn miễn phí** - **KHÔNG CẦN BILLING**! Đây là lựa chọn tốt nhất cho model free:

**✨ Tính năng Free Tier:**
- ✅ Hoàn toàn miễn phí - không cần thẻ tín dụng
- ✅ Không cần billing account
- ✅ 60 requests/phút (RPM)
- ✅ 1,500 requests/ngày (RPD)
- ✅ Models: gemini-1.5-flash (nhanh, miễn phí) hoặc gemini-pro

**📋 Cách lấy API Key miễn phí:**

1. Truy cập: **https://aistudio.google.com/app/apikey** hoặc **https://makersuite.google.com/app/apikey**
2. Đăng nhập bằng tài khoản Google (bất kỳ tài khoản Google nào)
3. Click "Create API Key" hoặc "Get API Key"
4. Chọn "Create API key in new project" (hoặc chọn project có sẵn)
5. Copy API key được tạo
6. Tạo file `.env` trong thư mục `backend/`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

**💡 Lưu ý:**
- `gemini-1.5-flash`: Model nhanh, miễn phí, phù hợp cho chatbot
- `gemini-pro`: Model mạnh hơn, cũng có free tier
- API key hoạt động ngay lập tức, không cần verify billing
- Free tier đủ dùng cho hầu hết các ứng dụng chatbot

#### Option 2: Sử dụng OpenAI API (Paid)

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
```

#### Option 3: Không sử dụng AI API (FREE - Improved Fallback) ⭐

**Không cần cấu hình gì!** Nếu không có API key, hệ thống sẽ tự động sử dụng improved fallback response với:
- ✅ Keyword matching thông minh
- ✅ Context awareness từ conversation history
- ✅ Trả lời tự nhiên hơn với format đẹp
- ✅ Nhận diện tốt các câu hỏi về phí, giá, giao hàng, v.v.
- ✅ Gợi ý và thông tin chi tiết

**Fallback response đã được cải thiện đáng kể** để trả lời tự nhiên và hữu ích hơn!

### Bước 3: Lấy API Key

#### OpenAI API Key:
1. Truy cập https://platform.openai.com/api-keys
2. Đăng ký/Đăng nhập tài khoản
3. Tạo API key mới
4. Copy API key vào file `.env`

#### Google Gemini API Key:
1. Truy cập https://makersuite.google.com/app/apikey
2. Đăng ký/Đăng nhập tài khoản Google
3. Tạo API key mới
4. Copy API key vào file `.env`

### Bước 4: Khởi động Backend

```bash
cd backend
npm start
# hoặc
npm run dev  # với nodemon để auto-reload
```

## Tính năng

### 1. Conversation Context
- Hệ thống lưu trữ lịch sử hội thoại trong MongoDB
- Mỗi session có một `sessionId` duy nhất
- Context được giới hạn 10 tin nhắn gần nhất để tối ưu performance

### 2. System Prompt
- Chatbot được cấu hình với system prompt chi tiết về VGreen
- Bao gồm thông tin về sản phẩm, dịch vụ, chính sách, hotline, email

### 3. Fallback Response
- Nếu AI API lỗi hoặc không có API key, hệ thống sử dụng keyword-based response
- Fallback response có context awareness dựa trên conversation history

### 4. Session Management
- Mỗi người dùng có một session ID duy nhất (lưu trong localStorage)
- Session được liên kết với userId nếu người dùng đã đăng nhập
- Lịch sử hội thoại được lưu trữ và có thể được load lại

## API Endpoints

### POST /api/chat/message
Gửi tin nhắn và nhận phản hồi từ AI

**Request:**
```json
{
  "message": "Xin chào",
  "sessionId": "session_1234567890_abc123",
  "userId": "CUS000001" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Xin chào! Tôi là Veebot...",
    "sessionId": "session_1234567890_abc123"
  }
}
```

### GET /api/chat/history/:sessionId
Lấy lịch sử hội thoại

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abc123",
    "messages": [
      {
        "role": "user",
        "content": "Xin chào",
        "timestamp": "2024-01-01T10:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Xin chào! Tôi là Veebot...",
        "timestamp": "2024-01-01T10:00:01.000Z"
      }
    ]
  }
}
```

### DELETE /api/chat/history/:sessionId
Xóa lịch sử hội thoại

## Database Schema

### ChatConversation
```javascript
{
  sessionId: String (unique, required),
  userId: String (optional),
  messages: [
    {
      role: "user" | "assistant" | "system",
      content: String,
      timestamp: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## Troubleshooting

### Lỗi: "Cannot find module 'axios'"
```bash
cd backend
npm install axios
```

### Lỗi: "API key không hợp lệ"
- Kiểm tra API key trong file `.env`
- Đảm bảo API key không có khoảng trắng thừa
- Kiểm tra API key có đủ quota/credit

### Lỗi: "Network error"
- Kiểm tra kết nối internet
- Kiểm tra firewall/proxy settings
- Kiểm tra API endpoint có đúng không

### Chatbot không phản hồi
- Kiểm tra backend server có đang chạy không
- Kiểm tra console log để xem lỗi chi tiết
- Kiểm tra MongoDB connection

## Ghi chú

- Hệ thống sẽ tự động fallback về keyword-based response nếu AI API lỗi
- Conversation history được giới hạn 10 tin nhắn gần nhất để tối ưu context
- System prompt có thể được tùy chỉnh trong file `backend/routes/chat.js`
- Session ID được lưu trong localStorage của browser, sẽ tự động tạo mới nếu không có

