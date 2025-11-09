const { Product, Review } = require("../db");

/**
 * Tính toán rating trung bình từ reviews của một sản phẩm
 * @param {string} sku - SKU của sản phẩm
 * @returns {Promise<{averageRating: number, reviewCount: number}>}
 */
async function calculateProductRating(sku) {
  try {
    const reviewData = await Review.findOne({ sku });

    if (!reviewData || !reviewData.reviews || reviewData.reviews.length === 0) {
      return {
        averageRating: 0,
        reviewCount: 0,
      };
    }

    const reviews = reviewData.reviews;
    const totalRating = reviews.reduce(
      (sum, review) => sum + (review.rating || 0),
      0
    );
    const averageRating = totalRating / reviews.length;

    // Làm tròn đến 1 chữ số thập phân
    const roundedRating = Math.round(averageRating * 10) / 10;

    return {
      averageRating: roundedRating,
      reviewCount: reviews.length,
    };
  } catch (error) {
    console.error(` [Rating Service] Lỗi tính rating cho SKU ${sku}:`, error);
    throw error;
  }
}

/**
 * Cập nhật rating cho một sản phẩm
 * @param {string} sku - SKU của sản phẩm
 * @returns {Promise<boolean>}
 */
async function updateProductRating(sku) {
  try {
    const { averageRating, reviewCount } = await calculateProductRating(sku);

    const product = await Product.findOne({ sku });
    if (!product) {
      console.log(` [Rating Service] Không tìm thấy product với SKU: ${sku}`);
      return false;
    }

    // Cập nhật rating
    product.rating = averageRating;

    await product.save();

    console.log(
      `[Rating Service] Đã cập nhật rating cho SKU ${sku}: ${averageRating} (${reviewCount} reviews)`
    );

    return true;
  } catch (error) {
    console.error(
      `[Rating Service] Lỗi cập nhật rating cho SKU ${sku}:`,
      error
    );
    throw error;
  }
}

/**
 * Cập nhật rating cho tất cả sản phẩm
 * @returns {Promise<{success: number, failed: number}>}
 */
async function updateAllProductRatings() {
  try {
    console.log(
      "[Rating Service] Bắt đầu cập nhật rating cho tất cả sản phẩm..."
    );

    const products = await Product.find({ status: "Active" });
    let success = 0;
    let failed = 0;

    for (const product of products) {
      try {
        const updated = await updateProductRating(product.sku);
        if (updated) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(
          `[Rating Service] Lỗi khi cập nhật rating cho ${product.sku}:`,
          error.message
        );
        failed++;
      }
    }

    console.log(
      `[Rating Service] Hoàn tất! Đã cập nhật ${success} sản phẩm, ${failed} thất bại`
    );

    return {
      success,
      failed,
      total: products.length,
    };
  } catch (error) {
    console.error("[Rating Service] Lỗi khi cập nhật tất cả ratings:", error);
    throw error;
  }
}

module.exports = {
  calculateProductRating,
  updateProductRating,
  updateAllProductRatings,
};
