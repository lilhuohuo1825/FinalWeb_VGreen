const mongoose = require("mongoose");
const { MONGODB_URI, DATABASE_NAME } = require("./config/database");

// Kết nối đến MongoDB
const connectDB = async () => {
  try {
    // console.log(" Đang kết nối đến MongoDB...");
    // console.log(" MongoDB URI:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    // console.log(" Đã kết nối thành công đến MongoDB");
    // console.log(`Database: ${DATABASE_NAME}`);
  } catch (error) {
    // console.error(" Lỗi kết nối MongoDB:", error.message);
    // console.error(" Hướng dẫn khắc phục:");
    // console.error("1. Đảm bảo MongoDB đang chạy");
    // console.error("2. Kiểm tra kết nối: mongodb://localhost:27017");
    // console.error("3. Khởi động MongoDB service");
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
    default: null,
  },
  Email: {
    type: String,
    default: null,
  },
  Address: {
    type: String,
    default: null,
  },
  BirthDay: {
    type: Date,
    default: null,
  },
  Gender: {
    type: String,
    enum: ["male", "female", "other", null],
    default: null,
  },
  CustomerType: {
    type: String,
    default: "",
  },
  // Phân cấp khách hàng dựa trên số tiền đã chi tiêu
  CustomerTiering: {
    type: String,
    default: "Đồng",
    enum: ["Đồng", "Bạc", "Vàng", "Bạch Kim"], // Các cấp độ khách hàng theo tiếng Việt
  },
  // Tổng số tiền đã chi tiêu (để tính điểm và nâng cấp)
  TotalSpent: {
    type: Number,
    default: 0,
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

// Schema cho UserWishlist
const userWishlistSchema = new mongoose.Schema({
  CustomerID: {
    type: String,
    unique: true,
    required: true,
  },
  wishlist: [
    {
      product_name: {
        type: String,
        required: true,
      },
      sku: {
        type: String,
        required: true,
      },
      time: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Schema cho UserAddress
const userAddressSchema = new mongoose.Schema({
  CustomerID: {
    type: String,
    unique: true,
    required: true,
  },
  addresses: [
    {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        required: true,
      },
      district: {
        type: String,
        required: true,
      },
      ward: {
        type: String,
        required: true,
      },
      detail: {
        type: String,
        required: true,
      },
      notes: {
        type: String,
        default: "",
      },
      deliveryMethod: {
        type: String,
        enum: ["standard", "express"],
        default: "standard",
      },
      isDefault: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Schema cho Cart
const cartItemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  image: { type: String, default: "" },
  unit: { type: String, default: "" },
  category: { type: String, default: "" },
  subcategory: { type: String, default: "" },
  originalPrice: { type: Number, default: undefined },
  hasPromotion: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const cartSchema = new mongoose.Schema({
  CustomerID: {
    type: String,
    unique: true,
    required: true,
  },
  items: [cartItemSchema],
  itemCount: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Schema cho Product
const productSchema = new mongoose.Schema(
  {
    _id: String,
    category: String,
    subcategory: String,
    product_name: { type: String, required: true },
    brand: String,
    unit: String,
    price: { type: Number, required: true },
    sku: { type: String, required: true, unique: true },
    origin: String,
    weight: String,
    ingredients: String,
    usage: String,
    storage: String,
    manufacture_date: String,
    expiry_date: String,
    producer: String,
    safety_warning: String,
    color: mongoose.Schema.Types.Mixed,
    base_price: Number,
    image: [String],
    rating: Number,
    purchase_count: { type: Number, default: 0 },
    status: { type: String, default: "Active" },
    post_date: mongoose.Schema.Types.Mixed,
    liked: { type: Number, default: 0 },
  },
  {
    _id: false,
    collection: "products", // Force sử dụng collection "products" (có chữ s)
  }
);

// Schema cho Promotion
const promotionSchema = new mongoose.Schema(
  {
    promotion_id: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["User", "Admin"], default: "User" },
    scope: {
      type: String,
      enum: ["Order", "Shipping", "Category", "Product", "Brand"],
      default: "Order",
    },
    discount_type: {
      type: String,
      enum: ["percent", "fixed", "buy1get1"],
      default: "fixed",
    },
    discount_value: { type: Number, required: true },
    max_discount_value: { type: Number, default: 0 },
    min_order_value: { type: Number, default: 0 },
    usage_limit: { type: Number, default: 0 },
    user_limit: { type: Number, default: 1 },
    is_first_order_only: { type: Boolean, default: false },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Expired"],
      default: "Active",
    },
    created_by: { type: String, default: "system" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: "promotions", // Force collection name
  }
);

// Schema cho Order
const orderItemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  image: { type: String, default: "" },
  unit: { type: String, default: "" },
  category: { type: String, default: "" },
  subcategory: { type: String, default: "" },
});

const orderSchema = new mongoose.Schema(
  {
    OrderID: { type: String, unique: true, required: true },
    CustomerID: { type: String, required: true },

    // Shipping Information
    shippingInfo: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: "" },
      address: {
        city: { type: String, required: true },
        district: { type: String, required: true },
        ward: { type: String, required: true },
        detail: { type: String, required: true },
      },
      deliveryMethod: {
        type: String,
        enum: ["standard", "express"],
        default: "standard",
      },
      warehouseAddress: { type: String, default: "" }, // Địa chỉ giao từ
      notes: { type: String, default: "" },
    },

    // Items
    items: [orderItemSchema],

    // Payment Information
    paymentMethod: {
      type: String,
      enum: ["cod", "vnpay", "momo", "card", "banking"],
      default: "cod",
    },

    // Pricing
    subtotal: { type: Number, required: true }, // Tổng tiền hàng
    shippingFee: { type: Number, default: 0 }, // Phí ship
    shippingDiscount: { type: Number, default: 0 }, // Giảm phí ship
    discount: { type: Number, default: 0 }, // Giảm giá sản phẩm
    vatRate: { type: Number, default: 0 }, // % VAT
    vatAmount: { type: Number, default: 0 }, // Số tiền VAT
    totalAmount: { type: Number, required: true }, // Tổng cộng

    // Promotion
    code: { type: String, default: "" },
    promotionName: { type: String, default: "" },

    // Invoice
    wantInvoice: { type: Boolean, default: false },
    invoiceInfo: {
      companyName: { type: String, default: "" },
      taxId: { type: String, default: "" },
      invoiceEmail: { type: String, default: "" },
      invoiceAddress: { type: String, default: "" },
    },

    // Notes & Consultant
    consultantCode: { type: String, default: "" }, // Mã nhân viên tư vấn

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipping",
        "delivered",
        "completed",
        "cancelled",
        "processing_return",
        "returning",
        "returned",
      ],
      default: "pending",
    },

    // Routes: Track timeline of order status changes
    routes: {
      type: Map,
      of: Date,
      default: () => new Map(),
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "orders",
  }
);

// ============================================
// PROMOTION USAGE SCHEMA
// ============================================
const promotionUsageSchema = new mongoose.Schema(
  {
    promotion_id: {
      type: String,
      required: true,
      index: true,
    },
    user_id: {
      type: String, // CustomerID
      required: true,
      index: true,
    },
    order_id: {
      type: String, // OrderID
      required: true,
      unique: true, // Mỗi order chỉ sử dụng 1 promotion
      index: true,
    },
    used_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "promotion_usage",
  }
);

// ============================================
// PROMOTION TARGET SCHEMA
// ============================================
const promotionTargetSchema = new mongoose.Schema(
  {
    promotion_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    target_type: {
      type: String,
      required: true,
      enum: ["Category", "Subcategory", "Brand", "Product"],
    },
    target_ref: {
      type: [String], // Mảng các giá trị reference
      required: true,
      default: [],
    },
  },
  {
    collection: "promotion_target",
  }
);

// Tạo models
const Product = mongoose.model("Product", productSchema);
const UserWishlist = mongoose.model("UserWishlist", userWishlistSchema);
const UserAddress = mongoose.model("UserAddress", userAddressSchema);
const Cart = mongoose.model("Cart", cartSchema);
const Promotion = mongoose.model("Promotion", promotionSchema);
const Order = mongoose.model("Order", orderSchema);
const PromotionUsage = mongoose.model("PromotionUsage", promotionUsageSchema);
const PromotionTarget = mongoose.model(
  "PromotionTarget",
  promotionTargetSchema
);

// ============================================
// SCHEMA: Review
// ===========================================
const reviewItemSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  customer_id: { type: String, required: true },
  content: { type: String, required: false, default: "" }, // Không bắt buộc, có thể là empty string
  rating: { type: Number, required: true, min: 1, max: 5 },
  images: { type: [String], default: [] }, // Array of image URLs or base64 strings
  time: { type: Date, default: Date.now },
  order_id: { type: String, required: true, index: true }, // ID đơn hàng để liên kết
});

const reviewSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reviews: [reviewItemSchema],
  },
  {
    collection: "reviews",
  }
);

// Hook để tự động cập nhật rating trong products khi reviews thay đổi
reviewSchema.post("save", async function () {
  try {
    // Import rating service (lazy import để tránh circular dependency)
    const { updateProductRating } = require("./services/rating.service");
    await updateProductRating(this.sku);
  } catch (error) {
    // Log lỗi nhưng không throw để không ảnh hưởng đến việc lưu review
    // console.error(
    //   ` [Review Hook] Không thể tự động cập nhật rating cho SKU ${this.sku}:`,
    //   error.message
    // );
  }
});

// Hook khi xóa review document (nếu cần)
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.sku) {
    try {
      const { updateProductRating } = require("./services/rating.service");
      await updateProductRating(doc.sku);
    } catch (error) {
      // console.error(
      //   ` [Review Hook] Không thể cập nhật rating sau khi xóa review cho SKU ${doc.sku}:`,
      //   error.message
      // );
    }
  }
});

const Review = mongoose.model("Review", reviewSchema);

// ============================================
// SCHEMA: Blog
// ============================================
const blogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    img: { type: String, required: true },
    title: { type: String, required: true },
    excerpt: { type: String, required: true },
    pubDate: { type: Date, required: true },
    author: { type: String, required: true },
    categoryTag: { type: String, required: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Draft", "Archived"],
      default: "Active",
    },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "blogs",
  }
);

const Blog = mongoose.model("Blog", blogSchema);

// ============================================
// SCHEMA: Dish (Món ăn)
// ============================================
const dishSchema = new mongoose.Schema(
  {
    ID: { type: String, required: true, unique: true },
    Video: { type: String, default: null },
    Description: { type: String, default: "" },
    Ingredients: { type: String, default: "" },
    UnitNote: { type: String, default: "" },
    Preparation: { type: String, default: "" },
    Cooking: { type: String, default: "" },
    Serving: { type: String, default: "" },
    Usage: { type: String, default: "" },
    Tips: { type: String, default: "" },
    DecorationTip: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "dishes",
  }
);

const Dish = mongoose.model("Dish", dishSchema);

// ============================================
// SCHEMA: Instruction (Hướng dẫn nấu ăn)
// ============================================
const instructionSchema = new mongoose.Schema(
  {
    ID: { type: String, required: true, unique: true },
    DishName: { type: String, required: true },
    Ingredient: { type: String, required: true }, // Tên nguyên liệu chính
    Description: { type: String, default: "" },
    Image: { type: String, required: true },
    CookingTime: { type: String, default: "" },
    Servings: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Active", "Draft", "Archived"],
      default: "Active",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "instructions",
  }
);

const Instruction = mongoose.model("Instruction", instructionSchema);

// Helper function để tạo CustomerID tự động
const generateCustomerID = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `CUS${timestamp.slice(-6)}${random}`;
};

// Helper function để tạo OrderID tự động
const generateOrderID = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD${timestamp.slice(-8)}${random}`;
};

module.exports = {
  connectDB,
  User,
  Product,
  UserWishlist,
  UserAddress,
  Cart,
  Promotion,
  Order,
  PromotionUsage,
  PromotionTarget,
  Review,
  Blog,
  Dish,
  Instruction,
  generateCustomerID,
  generateOrderID,
};
