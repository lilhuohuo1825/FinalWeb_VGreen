const express = require("express");
const router = express.Router();
const { PromotionTarget } = require("../db");

// GET /api/promotion-targets - Lấy tất cả promotion targets 
router.get("/", async (req, res) => {
  try {
    const targets = await PromotionTarget.find({});
    res.json({
      success: true,
      data: targets,
      count: targets.length,
    });
  } catch (error) {
 console.error(" [PromotionTargets] Error fetching targets:", error); 
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách promotion targets",
      error: error.message,
    });
  }
});

module.exports = router;
