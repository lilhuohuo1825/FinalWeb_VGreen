const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectDB } = require("./db");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Kết nối MongoDB
connectDB();

// Middleware
app.use(cors()); // Cho phép CORS để Angular frontend có thể gọi API
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);

// Route kiểm tra server
app.get("/", (req, res) => {
  res.json({
    message: "VGreen Backend API đang hoạt động",
    version: "1.0.0",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      update: "PUT /api/auth/user/update",
      resetPassword: "POST /api/auth/reset-password",
    },
  });
});

// Route kiểm tra health
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Middleware xử lý lỗi 404
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint không tồn tại",
    path: req.originalUrl,
    method: req.method,
  });
});

// Middleware xử lý lỗi global
app.use((error, req, res, next) => {
  console.error("Lỗi server:", error);
  res.status(500).json({
    error: "Lỗi server nội bộ",
    message: error.message,
  });
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
});

module.exports = app;
