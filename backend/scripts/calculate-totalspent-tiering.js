/**
 * Script tính TotalSpent và CustomerTiering cho users
 * 
 * Logic:
 * - TotalSpent = tổng giá trị các đơn hàng có status = "completed" hoặc "delivered"
 * - CustomerTiering:
 *   + Đồng: TotalSpent tối thiểu 0 (0 <= totalSpent < 1,000,000)
 *   + Bạc: TotalSpent tối thiểu 1,000,000 (1,000,000 <= totalSpent < 5,000,000)
 *   + Vàng: TotalSpent tối thiểu 5,000,000 (totalSpent >= 5,000,000)
 * 
 * Usage: node scripts/calculate-totalspent-tiering.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB configuration
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'vgreen';

// File paths
const USERS_JSON_PATH = path.join(__dirname, '../../data/temp/users.json');
const ORDERS_JSON_PATH = path.join(__dirname, '../../data/temp/orders.json');

/**
 * Tính CustomerTiering dựa trên TotalSpent
 * - Đồng: TotalSpent tối thiểu 0 (0 <= totalSpent < 1,000,000)
 * - Bạc: TotalSpent tối thiểu 1,000,000 (1,000,000 <= totalSpent < 5,000,000)
 * - Vàng: TotalSpent tối thiểu 5,000,000 (totalSpent >= 5,000,000)
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
 */
function calculateTotalSpentFromOrders(orders, customerID) {
  let totalSpent = 0;
  
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
 * Chuẩn hóa dữ liệu từ MongoDB về format JSON (với $oid, $date)
 */
function normalizeToJsonFormat(doc) {
  if (Array.isArray(doc)) {
    return doc.map(item => normalizeToJsonFormat(item));
  }
  
  if (doc === null || typeof doc !== 'object') {
    return doc;
  }
  
  const normalized = {};
  
  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id' && value instanceof ObjectId) {
      normalized[key] = { $oid: value.toString() };
    } else if (value instanceof Date) {
      normalized[key] = { $date: value.toISOString() };
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(item => normalizeToJsonFormat(item));
    } else if (value && typeof value === 'object' && value.constructor === Object) {
      normalized[key] = normalizeToJsonFormat(value);
    } else {
      normalized[key] = value;
    }
  }
  
  return normalized;
}

/**
 * Cập nhật TotalSpent và CustomerTiering trong MongoDB
 */
async function updateMongoDB(usersWithTotals, usersCollection) {
  try {
    console.log('\n🗄️  Đang cập nhật MongoDB...');
    
    let updated = 0;
    
    for (const userData of usersWithTotals) {
      const result = await usersCollection.updateOne(
        { CustomerID: userData.CustomerID },
        {
          $set: {
            TotalSpent: userData.TotalSpent,
            CustomerTiering: userData.CustomerTiering
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`   ✅ ${userData.CustomerID}: TotalSpent=${userData.TotalSpent.toLocaleString('vi-VN')}đ, Tiering=${userData.CustomerTiering}`);
        updated++;
      }
    }
    
    console.log(`\n✅ Đã cập nhật ${updated} users trong MongoDB\n`);
    
    return { success: true, updated };
    
  } catch (error) {
    console.error('\n❌ Lỗi khi cập nhật MongoDB:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cập nhật TotalSpent và CustomerTiering trong file JSON
 */
function updateJsonFile(usersWithTotals) {
  try {
    console.log('\n📄 Đang cập nhật file JSON...');
    
    // Đọc file JSON hiện tại
    const content = fs.readFileSync(USERS_JSON_PATH, 'utf8');
    const users = JSON.parse(content);
    
    // Tạo map để tra cứu nhanh
    const totalsMap = new Map();
    usersWithTotals.forEach(u => {
      totalsMap.set(u.CustomerID, {
        TotalSpent: u.TotalSpent,
        CustomerTiering: u.CustomerTiering
      });
    });
    
    // Cập nhật từng user
    let updated = 0;
    users.forEach(user => {
      const totals = totalsMap.get(user.CustomerID);
      if (totals) {
        const oldTotalSpent = user.TotalSpent || 0;
        const oldTiering = user.CustomerTiering || 'Đồng';
        
        user.TotalSpent = totals.TotalSpent;
        user.CustomerTiering = totals.CustomerTiering;
        
        if (oldTotalSpent !== totals.TotalSpent || oldTiering !== totals.CustomerTiering) {
          console.log(`   ✅ ${user.CustomerID}: TotalSpent=${totals.TotalSpent.toLocaleString('vi-VN')}đ, Tiering=${totals.CustomerTiering}`);
          updated++;
        }
      }
    });
    
    // Ghi lại file JSON
    fs.writeFileSync(
      USERS_JSON_PATH,
      JSON.stringify(users, null, '\t'),
      'utf8'
    );
    
    console.log(`\n✅ Đã cập nhật ${updated} users trong file JSON\n`);
    
    return { success: true, updated };
    
  } catch (error) {
    console.error('\n❌ Lỗi khi cập nhật file JSON:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('💰 TÍNH TỔNGSPENT VÀ CUSTOMERTIERING CHO USERS');
  console.log('='.repeat(80));
  console.log('\n📋 Quy tắc:');
  console.log('   - TotalSpent < 1,000,000đ → "Đồng"');
  console.log('   - 1,000,000đ ≤ TotalSpent < 5,000,000đ → "Bạc"');
  console.log('   - TotalSpent ≥ 5,000,000đ → "Vàng"');
  console.log('   - Chỉ tính các đơn hàng có status = "completed" hoặc "delivered" (đã hoàn thành)\n');
  
  try {
    // Đọc orders từ file JSON
    console.log('📥 Đang đọc orders từ file JSON...');
    const ordersContent = fs.readFileSync(ORDERS_JSON_PATH, 'utf8');
    const orders = JSON.parse(ordersContent);
    console.log(`✅ Đã đọc ${orders.length} orders\n`);
    
    // Đọc users từ file JSON
    console.log('📥 Đang đọc users từ file JSON...');
    const usersContent = fs.readFileSync(USERS_JSON_PATH, 'utf8');
    const users = JSON.parse(usersContent);
    console.log(`✅ Đã đọc ${users.length} users\n`);
    
    // Tính TotalSpent và CustomerTiering cho từng user
    console.log('🔄 Đang tính TotalSpent và CustomerTiering...\n');
    const usersWithTotals = [];
    
    users.forEach(user => {
      const customerID = user.CustomerID;
      const totalSpent = calculateTotalSpentFromOrders(orders, customerID);
      const tiering = calculateCustomerTiering(totalSpent);
      
      usersWithTotals.push({
        CustomerID: customerID,
        TotalSpent: totalSpent,
        CustomerTiering: tiering
      });
      
      console.log(`   ${customerID}: ${totalSpent.toLocaleString('vi-VN')}đ → ${tiering}`);
    });
    
    console.log('\n' + '-'.repeat(80));
    
    // Kết nối MongoDB
    console.log('🔌 Đang kết nối MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Đã kết nối MongoDB\n');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // Cập nhật file JSON
    const jsonResult = updateJsonFile(usersWithTotals);
    
    // Cập nhật MongoDB
    const mongoResult = await updateMongoDB(usersWithTotals, usersCollection);
    
    // Sau khi cập nhật MongoDB, đồng bộ lại JSON từ MongoDB
    if (mongoResult.success) {
      console.log('\n🔄 Đang đồng bộ lại JSON từ MongoDB...');
      try {
        const { syncUsersToJson } = require('../services/sync-users.service');
        const syncResult = await syncUsersToJson(usersCollection);
        if (syncResult.success) {
          console.log(`✅ Đã đồng bộ ${syncResult.count} users từ MongoDB về JSON\n`);
        } else {
          console.log(`⚠️  Không thể đồng bộ JSON: ${syncResult.error}\n`);
        }
      } catch (syncError) {
        console.log(`⚠️  Lỗi khi đồng bộ JSON: ${syncError.message}\n`);
      }
    }
    
    // Đóng kết nối MongoDB
    await client.close();
    console.log('🔌 Đã đóng kết nối MongoDB\n');
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 TỔNG KẾT');
    console.log('='.repeat(80));
    
    if (jsonResult.success) {
      console.log(`✅ JSON file: ${jsonResult.updated} users đã cập nhật`);
    } else {
      console.log(`❌ JSON file: Lỗi - ${jsonResult.error}`);
    }
    
    if (mongoResult.success) {
      console.log(`✅ MongoDB: ${mongoResult.updated} users đã cập nhật`);
    } else {
      console.log(`❌ MongoDB: Lỗi - ${mongoResult.error}`);
    }
    
    console.log('\n✅ Hoàn tất!\n');
    
  } catch (error) {
    console.error('\n❌ Lỗi không xử lý được:', error);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Lỗi không xử lý được:', error);
    process.exit(1);
  });
}

module.exports = {
  calculateTotalSpentFromOrders,
  calculateCustomerTiering
};

