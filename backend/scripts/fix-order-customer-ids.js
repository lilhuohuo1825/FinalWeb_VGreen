/**
 * Script để cập nhật CustomerID trong orders dựa trên tên khách hàng và số điện thoại
 * 
 * Logic:
 * - Tìm customer trong users collection dựa trên shippingInfo.fullName và shippingInfo.phone
 * - Cập nhật CustomerID trong order nếu tìm thấy customer đúng
 * 
 * Usage: node backend/scripts/fix-order-customer-ids.js
 */

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vgreen';

async function fixOrderCustomerIDs() {
  let client;
  
  try {
    console.log('\n🔧 Bắt đầu cập nhật CustomerID cho orders...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB\n');
    
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    const usersCollection = db.collection('users');
    
    // Lấy tất cả users để map
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 Tìm thấy ${users.length} users trong MongoDB\n`);
    
    // Tạo map: fullName + phone -> CustomerID
    const customerMap = new Map();
    users.forEach(user => {
      const fullName = (user.FullName || '').trim();
      const phone = (user.Phone || '').trim();
      const email = (user.Email || '').trim();
      const customerID = user.CustomerID;
      
      if (fullName && phone && customerID) {
        // Map by name + phone (most accurate)
        const key1 = `${fullName}|${phone}`.toLowerCase();
        customerMap.set(key1, customerID);
      }
      
      if (fullName && email && customerID) {
        // Map by name + email
        const key2 = `${fullName}|${email}`.toLowerCase();
        customerMap.set(key2, customerID);
      }
      
      if (phone && customerID) {
        // Map by phone only
        const key3 = `|${phone}`.toLowerCase();
        if (!customerMap.has(key3)) {
          customerMap.set(key3, customerID);
        }
      }
      
      if (fullName && customerID) {
        // Map by name only (less accurate, but as fallback)
        const key4 = `${fullName}|`.toLowerCase();
        if (!customerMap.has(key4)) {
          customerMap.set(key4, customerID);
        }
      }
    });
    
    console.log(`📋 Đã tạo ${customerMap.size} customer mappings\n`);
    
    // Lấy tất cả orders
    const orders = await ordersCollection.find({}).toArray();
    console.log(`📦 Tìm thấy ${orders.length} orders trong MongoDB\n`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    const notFoundOrders = [];
    
    for (const order of orders) {
      const shippingInfo = order.shippingInfo || {};
      const fullName = (shippingInfo.fullName || '').trim();
      const phone = (shippingInfo.phone || '').trim();
      const email = (shippingInfo.email || '').trim();
      const currentCustomerID = order.CustomerID;
      
      if (!fullName && !phone) {
        console.log(`⚠️  Order ${order.OrderID}: Không có thông tin khách hàng, bỏ qua`);
        continue;
      }
      
      // Tìm CustomerID đúng
      let correctCustomerID = null;
      
      // Priority 1: Name + Phone
      if (fullName && phone) {
        const key = `${fullName}|${phone}`.toLowerCase();
        correctCustomerID = customerMap.get(key);
      }
      
      // Priority 2: Name + Email
      if (!correctCustomerID && fullName && email) {
        const key = `${fullName}|${email}`.toLowerCase();
        correctCustomerID = customerMap.get(key);
      }
      
      // Priority 3: Phone only
      if (!correctCustomerID && phone) {
        const key = `|${phone}`.toLowerCase();
        correctCustomerID = customerMap.get(key);
      }
      
      // Priority 4: Name only
      if (!correctCustomerID && fullName) {
        const key = `${fullName}|`.toLowerCase();
        correctCustomerID = customerMap.get(key);
      }
      
      if (correctCustomerID) {
        // Chỉ cập nhật nếu CustomerID khác với hiện tại
        if (currentCustomerID !== correctCustomerID) {
          console.log(`🔄 Order ${order.OrderID}:`);
          console.log(`   Khách hàng: ${fullName} (${phone})`);
          console.log(`   CustomerID: ${currentCustomerID} -> ${correctCustomerID}`);
          
          await ordersCollection.updateOne(
            { _id: order._id },
            { $set: { CustomerID: correctCustomerID, updatedAt: new Date() } }
          );
          
          updatedCount++;
        } else {
          console.log(`✅ Order ${order.OrderID}: CustomerID đã đúng (${currentCustomerID})`);
        }
      } else {
        console.log(`❌ Order ${order.OrderID}: Không tìm thấy CustomerID cho "${fullName}" (${phone})`);
        notFoundCount++;
        notFoundOrders.push({
          OrderID: order.OrderID,
          fullName: fullName,
          phone: phone,
          email: email,
          currentCustomerID: currentCustomerID
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Hoàn thành!`);
    console.log(`   - Đã cập nhật: ${updatedCount} orders`);
    console.log(`   - Không tìm thấy: ${notFoundCount} orders`);
    console.log('='.repeat(80) + '\n');
    
    if (notFoundOrders.length > 0) {
      console.log('📋 Danh sách orders không tìm thấy CustomerID:');
      notFoundOrders.forEach(order => {
        console.log(`   - ${order.OrderID}: ${order.fullName} (${order.phone}) - Current: ${order.currentCustomerID}`);
      });
      console.log('');
    }
    
    return { success: true, updated: updatedCount, notFound: notFoundCount };
    
  } catch (error) {
    console.error('\n❌ Lỗi khi cập nhật CustomerID:', error);
    return { success: false, error: error.message };
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối MongoDB\n');
  }
}

// Run script
if (require.main === module) {
  fixOrderCustomerIDs()
    .then(result => {
      if (result.success) {
        console.log('✅ Script hoàn thành thành công!');
        process.exit(0);
      } else {
        console.error('❌ Script thất bại!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Lỗi:', error);
      process.exit(1);
    });
}

module.exports = { fixOrderCustomerIDs };

