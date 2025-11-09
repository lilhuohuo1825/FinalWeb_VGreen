const express = require("express");
const router = express.Router();
const {
  Order,
  generateOrderID,
  Promotion,
  PromotionUsage,
  Cart,
  User,
  Product,
} = require("../db");
const backupService = require("../services/backup.service");
const { updateUserTotalSpentAndTieringAsync } = require("../services/totalspent-tiering.service");

// ========== CREATE ORDER ==========
// POST /api/orders - Tạo đơn hàng mới
router.post("/", async (req, res) => {
  try {
    const {
      CustomerID,
      shippingInfo,
      items,
      paymentMethod,
      subtotal,
      shippingFee,
      shippingDiscount,
      discount,
      vatRate,
      vatAmount,
      totalAmount,
      code,
      promotionName,
      wantInvoice,
      invoiceInfo,
      consultantCode,
    } = req.body;

    // console.log(" [Orders] Received payment method:", paymentMethod);

    // Validate required fields
    if (!CustomerID || !shippingInfo || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: CustomerID, shippingInfo, or items",
      });
    }

    // Validate shipping info
    if (
      !shippingInfo.fullName ||
      !shippingInfo.phone ||
      !shippingInfo.address ||
      !shippingInfo.address.city ||
      !shippingInfo.address.district ||
      !shippingInfo.address.ward ||
      !shippingInfo.address.detail
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required shipping information",
      });
    }

    // Generate unique OrderID
    const OrderID = generateOrderID();

    // Initialize routes map for tracking status changes
    const routes = new Map();
    routes.set("pending", new Date());

    // Create new order
    const newOrder = new Order({
      OrderID,
      CustomerID,
      shippingInfo,
      items,
      paymentMethod: paymentMethod || "cod",
      subtotal,
      shippingFee: shippingFee || 0,
      shippingDiscount: shippingDiscount || 0,
      discount: discount || 0,
      vatRate: vatRate || 0,
      vatAmount: vatAmount || 0,
      totalAmount,
      code: code || "",
      promotionName: promotionName || "",
      wantInvoice: wantInvoice || false,
      invoiceInfo: invoiceInfo || {},
      consultantCode: consultantCode || "",
      status: "pending",
      routes: routes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save to database
    await newOrder.save();

    // console.log(` [Orders] Created new order: ${OrderID} for ${CustomerID}`);

    //  Tự động lưu promotion usage nếu có sử dụng mã khuyến mãi
    if (code && code.trim() !== "") {
      try {
        // Tìm promotion dựa vào code
        const promotion = await Promotion.findOne({ code: code.trim() });

        if (promotion) {
          // Tạo record trong promotion_usage
          const promotionUsage = new PromotionUsage({
            promotion_id: promotion._id.toString(),
            user_id: CustomerID,
            order_id: OrderID,
            used_at: new Date(),
          });

          await promotionUsage.save();
          // console.log(
          //   ` [PromotionUsage] Saved usage for promotion ${code} - Order ${OrderID}`
          // );
        } else {
          // console.warn(
          //   ` [PromotionUsage] Promotion not found for code: ${code}`
          // );
        }
      } catch (usageError) {
        // Log lỗi nhưng không fail toàn bộ request
        // console.error(
        //   " [PromotionUsage] Error saving promotion usage:",
        //   usageError
        // );
      }
    }

    // Note: Việc xóa items khỏi giỏ hàng sẽ được xử lý ở frontend
    // Frontend chỉ xóa những items đã được đặt hàng, không xóa toàn bộ cart

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: newOrder,
    });
  } catch (error) {
    // console.error(" [Orders] Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
});

// ========== GET ALL ORDERS (by CustomerID) ==========
// GET /api/orders?CustomerID=xxx
router.get("/", async (req, res) => {
  try {
    const { CustomerID } = req.query;

    if (!CustomerID) {
      return res.status(400).json({
        success: false,
        message: "CustomerID is required",
      });
    }

    // Log để debug
    // console.log(` [Orders] Fetching orders for CustomerID: ${CustomerID}`);

    // Kiểm tra và tự động chuyển các đơn hàng delivered sang completed sau 24h
    await autoCompleteDeliveredOrders(CustomerID);

    const orders = await Order.find({ CustomerID }).sort({ createdAt: -1 });

    // console.log(
    //   ` [Orders] Found ${orders.length} orders for CustomerID: ${CustomerID}`
    // );

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    // console.error(" [Orders] Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// Helper function: Tự động chuyển các đơn hàng delivered sang completed (thống nhất status)
async function autoCompleteDeliveredOrders(customerID) {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Tìm các đơn hàng delivered để chuyển thành completed
    const deliveredOrders = await Order.find({
      CustomerID: customerID,
      status: "delivered",
    });

    // Lọc các đơn hàng đã delivered trước 24h (check trong routes.delivered)
    const ordersToComplete = deliveredOrders.filter((order) => {
      const routes = order.routes || new Map();
      const deliveredDate = routes.get("delivered");
      if (!deliveredDate) {
        // Nếu không có delivered date trong routes, fallback to updatedAt
        return order.updatedAt && order.updatedAt <= twentyFourHoursAgo;
      }
      return deliveredDate <= twentyFourHoursAgo;
    });

    if (ordersToComplete.length === 0) {
      return; // Không có đơn hàng nào cần chuyển
    }

    // console.log(
    //   ` [Orders] Found ${ordersToComplete.length} delivered orders older than 24h, auto-completing...`
    // );

    for (const order of ordersToComplete) {
      // Initialize routes if it doesn't exist
      const routes = order.routes || new Map();
      routes.set("completed", new Date());
      // Keep delivered timestamp for history
      if (!routes.has("delivered")) {
        routes.set("delivered", new Date());
      }

      await Order.findOneAndUpdate(
        { OrderID: order.OrderID },
        { status: "completed", routes, updatedAt: new Date() },
        { new: true }
      );

      // console.log(
      //   ` [Orders] Auto-completed order ${order.OrderID} (delivered for more than 24h)`
      // );

      // Tăng purchase_count cho tất cả sản phẩm trong order
      try {
        for (const item of order.items) {
          await Product.findOneAndUpdate(
            { sku: item.sku },
            { $inc: { purchase_count: item.quantity } },
            { new: true }
          );
          // console.log(
          //   ` [Orders] Incremented purchase_count for SKU: ${item.sku} by ${item.quantity} (auto-complete)`
          // );
        }

        // Update customer TotalSpent and CustomerTiering
        // Sử dụng service để tính lại từ tất cả orders đã completed
        const { updateUserTotalSpentAndTieringAsync } = require("../services/totalspent-tiering.service");
        updateUserTotalSpentAndTieringAsync(User, Order, order.CustomerID);
      } catch (updateError) {
        // console.error(
        //   ` [Orders] Error updating product/customer stats for auto-completed order ${order.OrderID}:`,
        //   updateError
        // );
        // Continue with next order even if update fails
      }
    }
  } catch (error) {
    // console.error(" [Orders] Error auto-completing delivered orders:", error);
    // Don't throw error, just log it
  }
}

// ========== GET ORDER BY ID ==========
// GET /api/orders/:orderId
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ OrderID: orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    // console.error(" [Orders] Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

// ========== UPDATE ORDER ==========
// PUT /api/orders/:orderId - Update order (full or partial)
router.put("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderData = req.body;

    // Check if order exists
    const existingOrder = await Order.findOne({ OrderID: orderId });
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // If only CustomerID is being updated (partial update), allow it
    if (Object.keys(orderData).length === 1 && orderData.CustomerID) {
      const updatedOrder = await Order.findOneAndUpdate(
        { OrderID: orderId },
        { 
          CustomerID: orderData.CustomerID,
          updatedAt: new Date()
        },
        { new: true }
      );

      console.log(`✅ [Orders] Updated order ${orderId} CustomerID to ${orderData.CustomerID}`);

      return res.json({
        success: true,
        message: "Order CustomerID updated successfully",
        data: updatedOrder,
      });
    }

    // Full order update
    // Validate required fields
    if (!orderData.CustomerID || !orderData.shippingInfo || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: CustomerID, shippingInfo, or items",
      });
    }

    // Validate shipping info
    if (
      !orderData.shippingInfo.fullName ||
      !orderData.shippingInfo.phone ||
      !orderData.shippingInfo.address ||
      !orderData.shippingInfo.address.city ||
      !orderData.shippingInfo.address.district ||
      !orderData.shippingInfo.address.ward ||
      !orderData.shippingInfo.address.detail
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required shipping information",
      });
    }

    // Prepare update data
    const updateData = {
      CustomerID: orderData.CustomerID,
      shippingInfo: orderData.shippingInfo,
      items: orderData.items.map(item => ({
        sku: String(item.sku || ''),
        name: String(item.name || ''),
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        image: Array.isArray(item.image) ? String(item.image[0] || '') : String(item.image || ''),
        unit: String(item.unit || ''),
        category: String(item.category || ''),
        subcategory: String(item.subcategory || '')
      })),
      paymentMethod: orderData.paymentMethod || 'cod',
      subtotal: Number(orderData.subtotal || 0),
      shippingFee: Number(orderData.shippingFee || 0),
      shippingDiscount: Number(orderData.shippingDiscount || 0),
      discount: Number(orderData.discount || 0),
      vatRate: Number(orderData.vatRate || 0),
      vatAmount: Number(orderData.vatAmount || 0),
      totalAmount: Number(orderData.totalAmount || 0),
      code: orderData.code || '',
      promotionName: orderData.promotionName || '',
      wantInvoice: orderData.wantInvoice || false,
      invoiceInfo: orderData.invoiceInfo || {},
      consultantCode: orderData.consultantCode || '',
      updatedAt: new Date()
    };

    // Update status if provided
    if (orderData.status) {
      updateData.status = orderData.status;
      
      // Update routes if status changed
      const routes = existingOrder.routes || new Map();
      if (!routes.has(orderData.status)) {
        routes.set(orderData.status, new Date());
      }
      updateData.routes = routes;
    }

    // Update order
    const updatedOrder = await Order.findOneAndUpdate(
      { OrderID: orderId },
      { $set: updateData },
      { new: true }
    );

    console.log(`✅ [Orders] Updated order ${orderId}`);

    res.json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("❌ [Orders] Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
});

// ========== UPDATE ORDER STATUS ==========
// PUT /api/orders/:orderId/status
router.put("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = [
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
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Get the current order to update routes
    const currentOrder = await Order.findOne({ OrderID: orderId });
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Initialize routes map from existing order or create new one
    const routes = currentOrder.routes || new Map();
    
    // If order status is "delivered", automatically convert to "completed" (unified status)
    // Both "delivered" and "completed" are considered the same final status
    let finalStatus = status;
    if (status === "delivered") {
      finalStatus = "completed";
      routes.set("completed", new Date());
      // Keep delivered timestamp for history
      if (!routes.has("delivered")) {
        routes.set("delivered", new Date());
      }
    } else {
      routes.set(status, new Date());
    }

    const order = await Order.findOneAndUpdate(
      { OrderID: orderId },
      { status: finalStatus, routes, updatedAt: new Date() },
      { new: true }
    );

    // console.log(` [Orders] Updated order ${orderId} status to: ${finalStatus}`);

    // If order is completed or delivered, recalculate customer's TotalSpent and CustomerTiering
    // Both statuses are treated the same (final completed status)
    if (finalStatus === "completed" || status === "delivered") {
      try {
        // Update customer TotalSpent and CustomerTiering
        // Sử dụng service để tính lại từ tất cả orders đã completed
        const { updateUserTotalSpentAndTieringAsync } = require("../services/totalspent-tiering.service");
        updateUserTotalSpentAndTieringAsync(User, Order, order.CustomerID);
        
        // Tăng purchase_count cho tất cả sản phẩm trong order
        try {
          for (const item of order.items) {
            await Product.findOneAndUpdate(
              { sku: item.sku },
              { $inc: { purchase_count: item.quantity } },
              { new: true }
            );
          }
        } catch (productError) {
          // Don't fail the order update if product update fails
        }
      } catch (error) {
        // Don't fail the order update if customer stats update fails
      }
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    // console.error(" [Orders] Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

// ========== DELETE ORDER ==========
// DELETE /api/orders/:orderId
router.delete("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`🗑️ [Orders] Attempting to delete order with ID: ${orderId}`);

    // Try to find order by OrderID (supports both with and without ORD prefix)
    // First try exact match
    let order = await Order.findOneAndDelete({ OrderID: orderId });
    
    // If not found and orderId doesn't start with "ORD", try with "ORD" prefix
    if (!order && !orderId.startsWith('ORD')) {
      console.log(`🗑️ [Orders] Order not found with ${orderId}, trying with ORD prefix...`);
      order = await Order.findOneAndDelete({ OrderID: `ORD${orderId}` });
    }
    
    // If still not found and orderId starts with "ORD", try without prefix
    if (!order && orderId.startsWith('ORD')) {
      const orderIdWithoutPrefix = orderId.substring(3); // Remove "ORD" prefix
      console.log(`🗑️ [Orders] Order not found with ${orderId}, trying without ORD prefix: ${orderIdWithoutPrefix}...`);
      order = await Order.findOneAndDelete({ OrderID: orderIdWithoutPrefix });
    }

    if (!order) {
      console.log(`❌ [Orders] Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log(`✅ [Orders] Order deleted successfully: ${order.OrderID}`);

    // console.log(` [Orders] Deleted order: ${orderId}`);

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    // console.error(" [Orders] Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
});

module.exports = router;
