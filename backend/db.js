const mongoose = require("mongoose");

// Cấu hình kết nối MongoDB
const MONGODB_URI = "mongodb://localhost:27017/VGreen";

// Kết nối đến MongoDB
const connectDB = async () => {
  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    console.log("📍 MongoDB URI:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Đã kết nối thành công đến MongoDB");
    console.log("🗄️ Database: VGreen");
    console.log("📋 Collection: users");
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error.message);
    console.error("💡 Hướng dẫn khắc phục:");
    console.error("1. Đảm bảo MongoDB đang chạy");
    console.error("2. Kiểm tra kết nối: mongodb://localhost:27017");
    console.error("3. Khởi động MongoDB service");
    process.exit(1);
  }
};

// Schema cho User (cấu trúc đơn giản)
const userSchema = new mongoose.Schema({
  CustomerID: {
    type: String,
    unique: true,
    required: true,
  },
  Phone: {
    type: String,
    unique: true,
    required: true,
  },
  Password: {
    type: String,
    required: true,
  },
  RegisterDate: {
    type: Date,
    default: Date.now,
  },
  // Các trường khác để trống (có thể cập nhật sau)
  FullName: {
    type: String,
    default: "",
  },
  Email: {
    type: String,
    default: "",
  },
  Address: {
    type: String,
    default: "",
  },
  CustomerType: {
    type: String,
    default: "",
  },
  // Field để track version của password (tăng mỗi khi đặt lại mật khẩu)
  PasswordVersion: {
    type: Number,
    default: 1,
  },
  // Field để track lần cuối đặt lại mật khẩu
  LastPasswordReset: {
    type: Date,
    default: null,
  },
});

// Tạo model User
const User = mongoose.model("User", userSchema);

// Helper function để tạo CustomerID tự động
const generateCustomerID = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `CUS${timestamp.slice(-6)}${random}`;
};

module.exports = {
  connectDB,
  User,
  generateCustomerID,
};
