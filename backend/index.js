// Load environment variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectDB } = require("./db");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const wishlistRoutes = require("./routes/wishlist");
const addressRoutes = require("./routes/address");
const cartRoutes = require("./routes/cart");
const promotionsRoutes = require("./routes/promotions");
const promotionTargetsRoutes = require("./routes/promotion-targets");
const ordersRoutes = require("./routes/orders");
const reviewsRoutes = require("./routes/reviews");
const blogsRoutes = require("./routes/blogs");
const dishesRoutes = require("./routes/dishes");
const instructionsRoutes = require("./routes/instructions");
const chatRoutes = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 3000;

// Kết nối MongoDB
connectDB();

// Middleware
app.use(cors()); // Cho phép CORS để Angular frontend có thể gọi API
// Tăng limit để nhận base64 images (tối đa 10MB)
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/promotions", promotionsRoutes);
app.use("/api/promotion-targets", promotionTargetsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/blogs", blogsRoutes);
app.use("/api/dishes", dishesRoutes);
app.use("/api/instructions", instructionsRoutes);
app.use("/api/chat", chatRoutes);

// Route kiểm tra server
app.get("/", (req, res) => {
  res.json({
    message: "vgreen Backend API đang hoạt động",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        update: "PUT /api/auth/user/update",
        resetPassword: "POST /api/auth/reset-password",
      },
      products: {
        getAll: "GET /api/products",
        getById: "GET /api/products/:id",
        getByCategory: "GET /api/products/category/:category",
        getBySubcategory: "GET /api/products/category/:category/:subcategory",
      },
      wishlist: {
        get: "GET /api/wishlist/:user_id",
        add: "POST /api/wishlist/:user_id/add",
        remove: "DELETE /api/wishlist/:user_id/remove/:product_id",
        check: "GET /api/wishlist/:user_id/check/:product_id",
        clear: "DELETE /api/wishlist/:user_id/clear",
      },
      address: {
        get: "GET /api/address/:user_id",
        add: "POST /api/address/:user_id/add",
        update: "PUT /api/address/:user_id/update/:address_id",
        delete: "DELETE /api/address/:user_id/delete/:address_id",
        setDefault: "PUT /api/address/:user_id/set-default/:address_id",
        getDefault: "GET /api/address/:user_id/default",
      },
      cart: {
        get: "GET /api/cart/:customerID",
        add: "POST /api/cart/:customerID/add",
        update: "PUT /api/cart/:customerID/update/:sku",
        remove: "DELETE /api/cart/:customerID/remove/:sku",
        clear: "DELETE /api/cart/:customerID/clear",
        sync: "POST /api/cart/:customerID/sync",
      },
      promotions: {
        getAll: "GET /api/promotions",
        getActive: "GET /api/promotions/active",
        getByCode: "GET /api/promotions/code/:code",
        getById: "GET /api/promotions/:id",
        create: "POST /api/promotions",
        update: "PUT /api/promotions/:id",
        delete: "DELETE /api/promotions/:id",
      },
      orders: {
        create: "POST /api/orders",
        getByCustomer: "GET /api/orders?CustomerID=xxx",
        getById: "GET /api/orders/:orderId",
        updateStatus: "PUT /api/orders/:orderId/status",
        delete: "DELETE /api/orders/:orderId",
      },
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
  // console.error("Lỗi server:", error);
  res.status(500).json({
    error: "Lỗi server nội bộ",
    message: error.message,
  });
});

// Khởi chạy server
const server = app.listen(PORT, () => {
  // console.log(` Server đang chạy tại http://localhost:${PORT}`);
  // console.log(` Health check: http://localhost:${PORT}/health`);
  // console.log(` API Documentation: http://localhost:${PORT}/`);
});

// Bắt lỗi khi port đã được sử dụng để in thông báo rõ ràng
server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    // console.error("");
    // console.error(
    //   "═══════════════════════════════════════════════════════════"
    // );
    // console.error(` LỖI: Port ${PORT} đã được sử dụng!`);
    // console.error(
    //   "═══════════════════════════════════════════════════════════"
    // );
    // console.error("");
    // console.error(" Giải thích:");
    // console.error("   Port 3000 đang được sử dụng bởi một tiến trình khác.");
    // console.error("   Đây là phần màu đỏ bạn thấy - đây là lỗi EADDRINUSE.");
    // console.error("");
    // console.error(" Cách khắc phục:");
    // console.error("   1. Tìm và dừng tiến trình đang chiếm port 3000:");
    // console.error("      Trên Windows PowerShell:");
    // console.error(
    //   "        Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess"
    // );
    // console.error("        Stop-Process -Id <PID>");
    // console.error("");
    // console.error(
    //   "      Hoặc dùng Task Manager để tìm process Node.js và dừng nó."
    // );
    // console.error("");
    // console.error("   2. Nếu muốn dùng port khác (KHÔNG KHUYẾN NGHỊ):");
    // console.error("      Trên Windows PowerShell:");
    // console.error("        $env:BACKEND_PORT=3001; npm run ng");
    // console.error("");
    // console.error(
    //   "═══════════════════════════════════════════════════════════"
    // );
    // console.error("");
    process.exit(1);
  }
  // console.error("Lỗi server:", err);
  process.exit(1);
});

module.exports = app;
