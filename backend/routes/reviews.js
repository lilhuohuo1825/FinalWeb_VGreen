const express = require("express");
const router = express.Router();
const { Review, Product, Order } = require("../db");
const {
  updateProductRating,
  updateAllProductRatings,
} = require("../services/rating.service");

// GET all reviews (phải đặt trước route /:sku)
router.get("/", async (req, res) => {
  try {
 // console.log(" [Reviews API] Fetching all reviews...");
    const allReviews = await Review.find();
 // console.log(` [Reviews API] Found ${allReviews.length} review documents`);

    res.json({
      success: true,
      data: allReviews,
      count: allReviews.length,
    });
  } catch (error) {
 // console.error(" [Reviews API] Error fetching all reviews:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đánh giá",
      error: error.message,
    });
  }
});

// PUT - Cập nhật tất cả ratings cho tất cả sản phẩm (phải đặt trước route /:sku)
router.put("/update-all-ratings", async (req, res) => {
  try {
 // console.log(
 // " [Reviews API] Bắt đầu cập nhật rating cho tất cả sản phẩm..."
 // );

    const result = await updateAllProductRatings();

    res.json({
      success: true,
      message: "Đã cập nhật rating cho tất cả sản phẩm",
      data: result,
    });
  } catch (error) {
 // console.error(" [Reviews API] Error updating all ratings:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật ratings",
      error: error.message,
    });
  }
});

// GET reviews by SKU
router.get("/:sku", async (req, res) => {
  try {
    const { sku } = req.params;
 // console.log(` [Reviews API] Fetching reviews for SKU: ${sku}`);

    const reviewData = await Review.findOne({ sku });

    if (!reviewData) {
 // console.log(`ℹ [Reviews API] No reviews found for SKU: ${sku}`);
      return res.json({
        success: true,
        data: { sku, reviews: [] },
        count: 0,
      });
    }

 // console
 // .log
 // ` [Reviews API] Found ${reviewData.reviews.length} reviews for SKU: ${sku}`
 // ();

    res.json({
      success: true,
      data: reviewData,
      count: reviewData.reviews.length,
    });
  } catch (error) {
 // console.error(" [Reviews API] Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy đánh giá",
      error: error.message,
    });
  }
});

// POST - Thêm review mới và tự động cập nhật rating
router.post("/:sku", async (req, res) => {
  try {
    const { sku } = req.params;
    const { fullname, customer_id, content, rating, images, time, order_id } =
      req.body;

 // console.log(` [Reviews API] Adding review for SKU: ${sku}`);
 // console.log(
 // ` [Reviews API] Full request body (raw):`,
 // JSON.stringify(req.body)
 // );
 // console.log(` [Reviews API] Extracted fields:`, {
 // fullname: fullname
 // ? `"${fullname}" (type: ${typeof fullname})`
 // : "MISSING",
 // customer_id: customer_id
 // ? `"${customer_id}" (type: ${typeof customer_id})`
 // : "MISSING",
 // content:
 // content !== undefined
 // ? content
 // ? `"${content.substring(0, 50)}..." (type: ${typeof content})`
 // : '"" (empty string)'
 // : "UNDEFINED",
 // rating:
 // rating !== undefined ? `${rating} (type: ${typeof rating})` : "MISSING",
 // images_count: images ? images.length : 0,
 // time,
 // order_id: order_id
 // ? `"${order_id}" (type: ${typeof order_id})`
 // : "MISSING",
 // });

 // Validate input - content không bắt buộc
 // Đảm bảo các giá trị được trim và kiểm tra đúng kiểu
    const trimmedFullname = fullname ? String(fullname).trim() : "";
    const trimmedCustomerId = customer_id ? String(customer_id).trim() : "";
    const trimmedOrderId = order_id ? String(order_id).trim() : "";
    const numRating =
      rating !== undefined && rating !== null ? Number(rating) : null;
    const isValidRating =
      numRating !== null &&
      !isNaN(numRating) &&
      numRating >= 1 &&
      numRating <= 5;

    if (
      !trimmedFullname ||
      !trimmedCustomerId ||
      !isValidRating ||
      !trimmedOrderId
    ) {
 // console.error(` [Reviews API] Missing required fields:`, {
 // has_fullname: !!trimmedFullname,
 // has_customer_id: !!trimmedCustomerId,
 // has_rating: isValidRating,
 // has_order_id: !!trimmedOrderId,
 // fullname_value: fullname,
 // customer_id_value: customer_id,
 // rating_value: rating,
 // order_id_value: order_id,
 // raw_body: JSON.stringify(req.body),
 // });
      return res.status(400).json({
        success: false,
        message:
          "Thiếu thông tin bắt buộc (fullname, customer_id, rating, order_id)",
        missing_fields: {
          fullname: !trimmedFullname,
          customer_id: !trimmedCustomerId,
          rating: !isValidRating,
          order_id: !trimmedOrderId,
        },
      });
    }

 // Content có thể là empty string, không bắt buộc
    const reviewContent = content ? String(content).trim() : "";

 // Đảm bảo order_id không phải empty string
    if (!trimmedOrderId || trimmedOrderId.trim() === "") {
 // console.error(` [Reviews API] order_id is empty after trim!`);
      return res.status(400).json({
        success: false,
        message: "order_id không được để trống",
      });
    }

 // Thêm review mới
    const newReview = {
      fullname: trimmedFullname,
      customer_id: trimmedCustomerId,
      content: reviewContent,
      rating: numRating,
      images: Array.isArray(images)
        ? images.filter((img) => img !== null && img !== undefined)
        : [], // Array of image URLs or base64 strings
      time: time ? new Date(time) : new Date(),
      order_id: trimmedOrderId,
    };

 // console.log(` [Reviews API] New review object:`, {
 // fullname: newReview.fullname,
 // customer_id: newReview.customer_id,
 // rating: newReview.rating,
 // order_id: newReview.order_id || "MISSING!",
 // order_id_type: typeof newReview.order_id,
 // order_id_length: newReview.order_id ? newReview.order_id.length : 0,
 // });

 // Thêm review mới bằng $push
 // Sử dụng findOneAndUpdate với runValidators: false để tránh validate các reviews cũ
 // (Review mới đã được validate ở trên: trimmedOrderId, trimmedFullname, trimmedCustomerId, isValidRating)
 // Lưu ý: Các reviews cũ không có order_id vẫn còn trong database nhưng không ảnh hưởng đến việc thêm review mới
    const reviewData = await Review.findOneAndUpdate(
      { sku },
      {
        $push: { reviews: newReview },
      },
      {
        upsert: true,
        new: true,
        runValidators: false, // Tắt validation để tránh lỗi với reviews cũ (review mới đã được validate ở trên)
      }
    );

 // console.log(` [Reviews API] Saved review to database for SKU: ${sku}`);

 // Tự động cập nhật rating trong products
    try {
      await updateProductRating(sku);
 // console.log(` [Reviews API] Updated product rating for SKU: ${sku}`);
    } catch (ratingError) {
 // console.error(
 // ` [Reviews API] Không thể cập nhật rating cho ${sku}:`,
 // ratingError.message
 // );
 // Không fail request nếu chỉ lỗi cập nhật rating
    }

 // console.log(` [Reviews API] Added review for SKU: ${sku}`);

 // Sau khi review thành công, kiểm tra xem tất cả sản phẩm trong order đã được review chưa
 // Nếu có, chuyển order status sang completed
    try {
      await checkAndCompleteOrder(trimmedOrderId);
    } catch (orderError) {
 // console.error(
 // ` [Reviews API] Không thể kiểm tra order completion:`,
 // orderError.message
 // );
 // Không fail request nếu chỉ lỗi check order
    }

    res.json({
      success: true,
      message: "Đã thêm đánh giá thành công",
      data: reviewData,
      count: reviewData.reviews.length,
    });
  } catch (error) {
 // console.error(" [Reviews API] Error adding review:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm đánh giá",
      error: error.message,
    });
  }
});

// Helper function: Kiểm tra và chuyển order sang completed nếu tất cả sản phẩm đã được review
async function checkAndCompleteOrder(orderId) {
  try {
 // Tìm order
    const order = await Order.findOne({ OrderID: orderId });
    if (!order) {
 // console.log(` [Reviews API] Order ${orderId} not found`);
      return;
    }

 // Chỉ xử lý các order có status delivered hoặc completed
    if (order.status === "completed" || order.status === "cancelled") {
      return; // Đã completed hoặc cancelled rồi
    }

    if (order.status !== "delivered") {
 // console.log(
 // ` [Reviews API] Order ${orderId} is not delivered yet (status: ${order.status})`
 // );
      return; // Chỉ xử lý delivered orders
    }

 // Lấy danh sách SKU trong order
    const orderSKUs = order.items.map((item) => item.sku);

 // Đếm số lượng review cho order này
    let reviewedCount = 0;
    for (const sku of orderSKUs) {
      const productReviews = await Review.findOne({ sku });
      if (productReviews && productReviews.reviews) {
        const hasReviewForOrder = productReviews.reviews.some(
          (review) => review.order_id === orderId
        );
        if (hasReviewForOrder) {
          reviewedCount++;
        }
      }
    }

 // console.log(
 // ` [Reviews API] Order ${orderId}: ${reviewedCount}/${orderSKUs.length} products reviewed`
 // );

 // Nếu tất cả sản phẩm đã được review, chuyển order sang completed
    if (reviewedCount === orderSKUs.length && orderSKUs.length > 0) {
 // console.log(
 // ` [Reviews API] All products reviewed for order ${orderId}, updating to completed`
 // );

 // Initialize routes if it doesn't exist
      const routes = order.routes || new Map();
      routes.set("completed", new Date());

      const updatedOrder = await Order.findOneAndUpdate(
        { OrderID: orderId },
        { status: "completed", routes, updatedAt: new Date() },
        { new: true }
      );

      if (updatedOrder) {
 // Tăng purchase_count cho tất cả sản phẩm trong order
        await incrementProductPurchaseCount(order.items);
 // console.log(
 // ` [Reviews API] Order ${orderId} updated to completed and purchase_count incremented`
 // );
      }
    }
  } catch (error) {
 // console.error(
 // ` [Reviews API] Error checking order completion:`,
 // error.message
 // );
    throw error;
  }
}

// Helper function: Tăng purchase_count cho các sản phẩm trong order
async function incrementProductPurchaseCount(items) {
  try {
    for (const item of items) {
      await Product.findOneAndUpdate(
        { sku: item.sku },
        { $inc: { purchase_count: item.quantity } },
        { new: true }
      );
 // console.log(
 // ` [Reviews API] Incremented purchase_count for SKU: ${item.sku} by ${item.quantity}`
 // );
    }
  } catch (error) {
 // console.error(
 // ` [Reviews API] Error incrementing purchase_count:`,
 // error.message
 // );
    throw error;
  }
}

module.exports = router;
