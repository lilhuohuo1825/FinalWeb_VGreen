const express = require("express");
const router = express.Router();
const { Promotion } = require("../db");
const promotionService = require("../services/promotion.service");

// GET /api/promotions - Lấy tất cả promotions
router.get("/", async (req, res) => {
  try {
    const promotions = await Promotion.find({});
    res.json({
      success: true,
      data: promotions,
      count: promotions.length,
    });
  } catch (error) {
    console.error(" [Promotions] Error fetching promotions:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách khuyến mãi",
      error: error.message,
    });
  }
});

// GET /api/promotions/active/stats - Thống kê số lượng promotions có hiệu lực
// PHẢI ĐẶT TRƯỚC /active để tránh conflict
router.get("/active/stats", async (req, res) => {
  try {
    const currentDate = new Date();

    // Đếm tổng số promotions có hiệu lực
    const totalActive = await Promotion.countDocuments({
      status: "Active",
      type: { $ne: "Admin" },
      start_date: { $lte: currentDate },
      end_date: { $gte: currentDate },
      usage_limit: { $gt: 0 },
    });

    // Đếm promotions sắp hết hạn (trong 7 ngày)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(currentDate.getDate() + 7);
    const expiringSoon = await Promotion.countDocuments({
      status: "Active",
      type: { $ne: "Admin" },
      start_date: { $lte: currentDate },
      end_date: { $gte: currentDate, $lte: sevenDaysFromNow },
      usage_limit: { $gt: 0 },
    });

    // Đếm promotions trong 2 tuần (cho frontend)
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(currentDate.getDate() + 14);
    const withinTwoWeeks = await Promotion.countDocuments({
      status: "Active",
      type: { $ne: "Admin" },
      start_date: { $lte: currentDate },
      end_date: { $gte: currentDate, $lte: twoWeeksFromNow },
      usage_limit: { $gt: 0 },
    });

    // Lấy danh sách chi tiết
    const promotions = await Promotion.find({
      status: "Active",
      type: { $ne: "Admin" },
      start_date: { $lte: currentDate },
      end_date: { $gte: currentDate },
      usage_limit: { $gt: 0 },
    })
      .select(
        "code name end_date usage_limit scope discount_type discount_value"
      )
      .sort({ end_date: 1 });

    res.json({
      success: true,
      stats: {
        totalActive,
        expiringSoon,
        withinTwoWeeks,
      },
      promotions: promotions.map((p) => ({
        code: p.code,
        name: p.name,
        endDate: p.end_date,
        usageLimit: p.usage_limit,
        scope: p.scope,
        discountType: p.discount_type,
        discountValue: p.discount_value,
      })),
    });
  } catch (error) {
    console.error(
      " [Promotions] Error fetching active promotions stats:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Lỗi khi thống kê khuyến mãi",
      error: error.message,
    });
  }
});

// GET /api/promotions/active - Lấy các promotions đang active
router.get("/active", async (req, res) => {
  try {
    const currentDate = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(currentDate.getDate() + 14);

    // Lấy tất cả promotions có hiệu lực (không giới hạn 2 tuần)
    const promotions = await Promotion.find({
      status: "Active",
      type: { $ne: "Admin" }, // Loại bỏ promotions có type là Admin
      start_date: { $lte: currentDate },
      end_date: { $gte: currentDate }, // Lấy tất cả mã chưa hết hạn
      usage_limit: { $gt: 0 }, // Còn lượt sử dụng
    }).sort({ end_date: 1 }); // Sort theo ngày hết hạn (gần hết hạn lên đầu)

    res.json({
      success: true,
      data: promotions,
      count: promotions.length,
    });
  } catch (error) {
    console.error(" [Promotions] Error fetching active promotions:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách khuyến mãi đang hoạt động",
      error: error.message,
    });
  }
});

// GET /api/promotions/code/:code - Tìm promotion theo code
router.get("/code/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const currentDate = new Date();

    const promotion = await Promotion.findOne({
      code: { $regex: new RegExp(`^${code}$`, "i") }, // Case-insensitive
      status: "Active",
      type: { $ne: "Admin" },
      start_date: { $lte: currentDate },
      end_date: { $gte: currentDate },
      usage_limit: { $gt: 0 },
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã khuyến mãi hoặc mã đã hết hạn",
      });
    }

    res.json({
      success: true,
      data: promotion,
    });
  } catch (error) {
    console.error(" [Promotions] Error finding promotion by code:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm mã khuyến mãi",
      error: error.message,
    });
  }
});

// GET /api/promotions/:id - Lấy promotion theo ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findOne({ promotion_id: id });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khuyến mãi",
      });
    }

    res.json({
      success: true,
      data: promotion,
    });
  } catch (error) {
    console.error(" [Promotions] Error fetching promotion:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin khuyến mãi",
      error: error.message,
    });
  }
});

// POST /api/promotions - Tạo promotion mới (cho admin)
router.post("/", async (req, res) => {
  try {
    const promotionData = req.body;

    // Validate required fields
    if (!promotionData.code || !promotionData.name || !promotionData.discount_value) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: code, name, discount_value",
      });
    }

    // Check if code already exists
    const existingPromotion = await Promotion.findOne({ code: promotionData.code });
    if (existingPromotion) {
      return res.status(400).json({
        success: false,
        message: `Mã khuyến mãi "${promotionData.code}" đã tồn tại`,
      });
    }

    // Generate promotion_id if not provided
    if (!promotionData.promotion_id) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      promotionData.promotion_id = `PRO${timestamp}${random}`;
    }

    // Ensure dates are Date objects
    if (promotionData.start_date && typeof promotionData.start_date === 'string') {
      promotionData.start_date = new Date(promotionData.start_date);
    }
    if (promotionData.end_date && typeof promotionData.end_date === 'string') {
      promotionData.end_date = new Date(promotionData.end_date);
    }

    // Set default values
    promotionData.created_at = promotionData.created_at || new Date();
    promotionData.updated_at = promotionData.updated_at || new Date();
    promotionData.status = promotionData.status || 'Active';

    console.log('📝 Creating new promotion:', promotionData.code);

    const newPromotion = new Promotion(promotionData);
    await newPromotion.save();

    console.log('✅ Promotion created successfully:', newPromotion.promotion_id);

    res.status(201).json({
      success: true,
      message: "Tạo khuyến mãi thành công",
      data: newPromotion,
    });
  } catch (error) {
    console.error(" [Promotions] Error creating promotion:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Mã khuyến mãi hoặc promotion_id đã tồn tại",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo khuyến mãi",
      error: error.message,
    });
  }
});

// PUT /api/promotions/:id - Cập nhật promotion (có thể tìm bằng promotion_id hoặc code)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by promotion_id first, then by code
    let updatedPromotion = await Promotion.findOneAndUpdate(
      { promotion_id: id },
      { ...req.body, updated_at: new Date() },
      { new: true }
    );

    // If not found by promotion_id, try to find by code
    if (!updatedPromotion) {
      updatedPromotion = await Promotion.findOneAndUpdate(
        { code: id },
        { ...req.body, updated_at: new Date() },
        { new: true }
      );
    }

    if (!updatedPromotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khuyến mãi",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật khuyến mãi thành công",
      data: updatedPromotion,
    });
  } catch (error) {
    console.error(" [Promotions] Error updating promotion:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật khuyến mãi",
      error: error.message,
    });
  }
});

// DELETE /api/promotions/:id - Xóa promotion
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPromotion = await Promotion.findOneAndDelete({
      promotion_id: id,
    });

    if (!deletedPromotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khuyến mãi",
      });
    }

    res.json({
      success: true,
      message: "Xóa khuyến mãi thành công",
      data: deletedPromotion,
    });
  } catch (error) {
    console.error(" [Promotions] Error deleting promotion:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa khuyến mãi",
      error: error.message,
    });
  }
});

// ============================================
// PROMOTION TARGETING APIs
// ============================================

// POST /api/promotions/check-applicability
// Kiểm tra promotion có áp dụng cho giỏ hàng không
router.post("/check-applicability", async (req, res) => {
  try {
    const { promotionId, cartItems } = req.body;

    if (!promotionId || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: promotionId, cartItems",
      });
    }

    const result = await promotionService.checkPromotionApplicability(
      promotionId,
      cartItems
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(" [Promotions] Error checking applicability:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra khuyến mãi",
      error: error.message,
    });
  }
});

// POST /api/promotions/get-applicable
// Lấy tất cả promotion có thể áp dụng cho giỏ hàng
router.post("/get-applicable", async (req, res) => {
  try {
    const { cartItems, cartAmount } = req.body;

    if (!cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: cartItems",
      });
    }

    const promotions = await promotionService.getApplicablePromotions(
      cartItems,
      cartAmount || 0
    );

    res.json({
      success: true,
      data: promotions,
      count: promotions.length,
    });
  } catch (error) {
    console.error(
      " [Promotions] Error getting applicable promotions:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách khuyến mãi",
      error: error.message,
    });
  }
});

// POST /api/promotions/validate-code
// Validate promotion code với giỏ hàng
router.post("/validate-code", async (req, res) => {
  try {
    const { code, cartItems, cartAmount } = req.body;

    if (!code || !cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: code, cartItems",
      });
    }

    const result = await promotionService.validatePromotionCode(
      code,
      cartItems,
      cartAmount || 0
    );

    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.promotion,
      message: result.message,
    });
  } catch (error) {
    console.error(" [Promotions] Error validating code:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra mã khuyến mãi",
      error: error.message,
    });
  }
});

module.exports = router;
