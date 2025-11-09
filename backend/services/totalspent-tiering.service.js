/**
 * Service để tự động tính và cập nhật TotalSpent và CustomerTiering cho user
 * Sẽ được gọi tự động sau khi có đơn hàng được thanh toán (status = "completed")
 * Hỗ trợ cả Mongoose models và MongoDB native driver
 */

/**
 * Tính CustomerTiering dựa trên TotalSpent
 * - Đồng: TotalSpent tối thiểu 0 (0 <= totalSpent < 1,000,000)
 * - Bạc: TotalSpent tối thiểu 1,000,000 (1,000,000 <= totalSpent < 5,000,000)
 * - Vàng: TotalSpent tối thiểu 5,000,000 (totalSpent >= 5,000,000)
 * @param {number} totalSpent - Tổng số tiền đã chi tiêu
 * @returns {string} - "Đồng", "Bạc", hoặc "Vàng"
 */
function calculateCustomerTiering(totalSpent) {
  if (totalSpent >= 5000000) {
    return 'Vàng';
  } else if (totalSpent >= 1000000) {
    return 'Bạc';
  } else {
    return 'Đồng';
  }
}

/**
 * Tính TotalSpent từ orders (chỉ tính orders đã thanh toán - status = "completed")
 * @param {Array} orders - Danh sách orders
 * @param {string} customerID - CustomerID của user
 * @returns {number} - Tổng số tiền đã chi tiêu
 */
function calculateTotalSpentFromOrders(orders, customerID) {
  let totalSpent = 0;
  
  if (!Array.isArray(orders) || !customerID) {
    return 0;
  }
  
    orders.forEach(order => {
      // Chỉ tính các đơn đã thanh toán (status = "completed" hoặc "delivered" - cả hai đều được coi là đã hoàn thành)
      if ((order.status === 'completed' || order.status === 'delivered') && order.CustomerID === customerID) {
        const totalAmount = order.totalAmount || 0;
        totalSpent += totalAmount;
      }
    });
  
  return totalSpent;
}

/**
 * Cập nhật TotalSpent và CustomerTiering cho một user (hỗ trợ Mongoose và MongoDB native)
 * @param {Object} usersCollection - Mongoose model hoặc MongoDB collection
 * @param {Object} ordersCollection - Mongoose model hoặc MongoDB collection
 * @param {string} customerID - CustomerID của user cần cập nhật
 * @returns {Promise<{success: boolean, totalSpent: number, tiering: string}>}
 */
async function updateUserTotalSpentAndTiering(usersCollection, ordersCollection, customerID) {
  try {
    // Lấy tất cả orders của user
    let orders;
    if (ordersCollection.find && typeof ordersCollection.find === 'function') {
      // Mongoose model
      orders = await ordersCollection.find({ CustomerID: customerID }).lean();
    } else if (ordersCollection.find && typeof ordersCollection.find === 'function' && ordersCollection.find().toArray) {
      // MongoDB native collection
      orders = await ordersCollection.find({ CustomerID: customerID }).toArray();
    } else {
      // Fallback: Mongoose model trực tiếp
      orders = await ordersCollection.find({ CustomerID: customerID });
      if (orders && orders.length > 0 && orders[0].toObject) {
        orders = orders.map(o => o.toObject ? o.toObject() : o);
      }
    }
    
    // Tính TotalSpent từ các orders đã thanh toán
    const totalSpent = calculateTotalSpentFromOrders(orders, customerID);
    
    // Tính CustomerTiering
    const tiering = calculateCustomerTiering(totalSpent);
    
    // Cập nhật trong MongoDB
    let result;
    if (usersCollection.findOneAndUpdate) {
      // Mongoose model
      result = await usersCollection.findOneAndUpdate(
        { CustomerID: customerID },
        {
          TotalSpent: totalSpent,
          CustomerTiering: tiering
        },
        { new: true }
      );
    } else if (usersCollection.updateOne) {
      // MongoDB native collection
      result = await usersCollection.updateOne(
        { CustomerID: customerID },
        {
          $set: {
            TotalSpent: totalSpent,
            CustomerTiering: tiering
          }
        }
      );
    } else {
      // Fallback: Mongoose model trực tiếp
      result = await usersCollection.updateOne(
        { CustomerID: customerID },
        {
          TotalSpent: totalSpent,
          CustomerTiering: tiering
        }
      );
    }
    
    const matchedCount = result.matchedCount || (result ? 1 : 0);
    
    if (matchedCount > 0) {
      console.log(`✅ [Update TotalSpent] ${customerID}: ${totalSpent.toLocaleString('vi-VN')}đ → ${tiering}`);
      return { success: true, totalSpent, tiering };
    } else {
      console.log(`⚠️  [Update TotalSpent] User ${customerID} not found`);
      return { success: false, totalSpent, tiering };
    }
    
  } catch (error) {
    console.error(`❌ [Update TotalSpent] Error updating ${customerID}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Cập nhật TotalSpent và CustomerTiering một cách bất đồng bộ (không block request)
 * @param {Object} usersCollection - Mongoose model hoặc MongoDB collection
 * @param {Object} ordersCollection - Mongoose model hoặc MongoDB collection
 * @param {string} customerID - CustomerID của user cần cập nhật
 */
function updateUserTotalSpentAndTieringAsync(usersCollection, ordersCollection, customerID) {
  // Chạy cập nhật trong background, không đợi kết quả
  setImmediate(async () => {
    try {
      await updateUserTotalSpentAndTiering(usersCollection, ordersCollection, customerID);
    } catch (error) {
      console.error(`❌ [Update TotalSpent] Error in async update for ${customerID}:`, error.message);
    }
  });
}

/**
 * Cập nhật TotalSpent và CustomerTiering cho tất cả users
 * @param {Object} usersCollection - Mongoose model hoặc MongoDB collection
 * @param {Object} ordersCollection - Mongoose model hoặc MongoDB collection
 * @returns {Promise<{success: boolean, updated: number}>}
 */
async function updateAllUsersTotalSpentAndTiering(usersCollection, ordersCollection) {
  try {
    // Lấy tất cả users
    let users;
    if (usersCollection.find && typeof usersCollection.find === 'function') {
      if (usersCollection.find().lean) {
        // Mongoose model với lean()
        users = await usersCollection.find({}).lean();
      } else if (usersCollection.find().toArray) {
        // MongoDB native collection
        users = await usersCollection.find({}).toArray();
      } else {
        // Mongoose model
        users = await usersCollection.find({});
        if (users && users.length > 0 && users[0].toObject) {
          users = users.map(u => u.toObject ? u.toObject() : u);
        }
      }
    }
    
    // Lấy tất cả orders
    let orders;
    if (ordersCollection.find && typeof ordersCollection.find === 'function') {
      if (ordersCollection.find().lean) {
        // Mongoose model với lean()
        orders = await ordersCollection.find({}).lean();
      } else if (ordersCollection.find().toArray) {
        // MongoDB native collection
        orders = await ordersCollection.find({}).toArray();
      } else {
        // Mongoose model
        orders = await ordersCollection.find({});
        if (orders && orders.length > 0 && orders[0].toObject) {
          orders = orders.map(o => o.toObject ? o.toObject() : o);
        }
      }
    }
    
    let updated = 0;
    
    for (const user of users) {
      const customerID = user.CustomerID;
      const totalSpent = calculateTotalSpentFromOrders(orders, customerID);
      const tiering = calculateCustomerTiering(totalSpent);
      
      // Chỉ cập nhật nếu có thay đổi
      if (user.TotalSpent !== totalSpent || user.CustomerTiering !== tiering) {
        let result;
        if (usersCollection.findOneAndUpdate) {
          // Mongoose model
          result = await usersCollection.findOneAndUpdate(
            { CustomerID: customerID },
            {
              TotalSpent: totalSpent,
              CustomerTiering: tiering
            },
            { new: true }
          );
        } else if (usersCollection.updateOne) {
          // MongoDB native collection
          result = await usersCollection.updateOne(
            { CustomerID: customerID },
            {
              $set: {
                TotalSpent: totalSpent,
                CustomerTiering: tiering
              }
            }
          );
        }
        
        const modifiedCount = result?.modifiedCount || (result ? 1 : 0);
        
        if (modifiedCount > 0) {
          console.log(`✅ [Update All] ${customerID}: ${totalSpent.toLocaleString('vi-VN')}đ → ${tiering}`);
          updated++;
        }
      }
    }
    
    return { success: true, updated };
    
  } catch (error) {
    console.error('❌ [Update All TotalSpent] Error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  calculateTotalSpentFromOrders,
  calculateCustomerTiering,
  updateUserTotalSpentAndTiering,
  updateUserTotalSpentAndTieringAsync,
  updateAllUsersTotalSpentAndTiering
};

