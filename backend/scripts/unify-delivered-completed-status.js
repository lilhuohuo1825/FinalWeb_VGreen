/**
 * Script để thống nhất status "delivered" và "completed" thành "completed"
 * Chuyển tất cả orders có status = "delivered" thành "completed"
 * 
 * Usage: node scripts/unify-delivered-completed-status.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB configuration
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'vgreen';

// File paths
const ORDERS_JSON_PATH = path.join(__dirname, '../../data/temp/orders.json');

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
    if (key === '_id' && value && value.toString) {
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
 * Cập nhật status trong MongoDB
 */
async function updateMongoDB(ordersCollection) {
  try {
    console.log('\n🗄️  Đang cập nhật MongoDB...');
    
    // Tìm tất cả orders có status = "delivered"
    const deliveredOrders = await ordersCollection.find({ status: 'delivered' }).toArray();
    
    if (deliveredOrders.length === 0) {
      console.log('   ℹ️  Không có orders nào có status = "delivered"');
      return { success: true, updated: 0 };
    }
    
    console.log(`   📋 Tìm thấy ${deliveredOrders.length} orders có status = "delivered"`);
    
    let updated = 0;
    
    for (const order of deliveredOrders) {
      // Cập nhật routes để giữ lại timestamp của delivered và thêm completed
      const routes = order.routes || new Map();
      
      // Giữ lại delivered timestamp nếu chưa có
      if (!routes.has('delivered')) {
        routes.set('delivered', order.updatedAt || new Date());
      }
      
      // Thêm completed timestamp
      routes.set('completed', new Date());
      
      // Cập nhật status thành completed
      const result = await ordersCollection.updateOne(
        { OrderID: order.OrderID },
        {
          $set: {
            status: 'completed',
            routes: routes,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`   ✅ ${order.OrderID}: delivered → completed`);
        updated++;
      }
    }
    
    console.log(`\n✅ Đã cập nhật ${updated} orders trong MongoDB\n`);
    
    return { success: true, updated };
    
  } catch (error) {
    console.error('\n❌ Lỗi khi cập nhật MongoDB:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cập nhật status trong file JSON
 */
function updateJsonFile() {
  try {
    console.log('\n📄 Đang cập nhật file JSON...');
    
    // Đọc file JSON hiện tại
    const content = fs.readFileSync(ORDERS_JSON_PATH, 'utf8');
    const orders = JSON.parse(content);
    
    let updated = 0;
    
    orders.forEach(order => {
      if (order.status === 'delivered') {
        // Cập nhật status thành completed
        order.status = 'completed';
        
        // Cập nhật routes
        if (!order.routes) {
          order.routes = {};
        }
        
        // Giữ lại delivered timestamp nếu chưa có
        if (!order.routes.delivered) {
          order.routes.delivered = order.updatedAt || order.routes.completed || { $date: new Date().toISOString() };
        }
        
        // Thêm completed timestamp
        order.routes.completed = { $date: new Date().toISOString() };
        
        // Cập nhật updatedAt
        order.updatedAt = { $date: new Date().toISOString() };
        
        console.log(`   ✅ ${order.OrderID}: delivered → completed`);
        updated++;
      }
    });
    
    // Ghi lại file JSON
    fs.writeFileSync(
      ORDERS_JSON_PATH,
      JSON.stringify(orders, null, '\t'),
      'utf8'
    );
    
    console.log(`\n✅ Đã cập nhật ${updated} orders trong file JSON\n`);
    
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
  console.log('🔄 THỐNG NHẤT STATUS: DELIVERED → COMPLETED');
  console.log('='.repeat(80));
  console.log('\n📋 Mục đích:');
  console.log('   - Chuyển tất cả orders có status = "delivered" thành "completed"');
  console.log('   - Giữ lại timestamp của "delivered" trong routes để lưu lịch sử');
  console.log('   - Cập nhật cả MongoDB và JSON file\n');
  
  try {
    // Cập nhật file JSON trước
    const jsonResult = updateJsonFile();
    
    // Kết nối MongoDB
    console.log('🔌 Đang kết nối MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Đã kết nối MongoDB\n');
    
    const db = client.db(DB_NAME);
    const ordersCollection = db.collection('orders');
    
    // Cập nhật MongoDB
    const mongoResult = await updateMongoDB(ordersCollection);
    
    // Đóng kết nối MongoDB
    await client.close();
    console.log('🔌 Đã đóng kết nối MongoDB\n');
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 TỔNG KẾT');
    console.log('='.repeat(80));
    
    if (jsonResult.success) {
      console.log(`✅ JSON file: ${jsonResult.updated} orders đã cập nhật`);
    } else {
      console.log(`❌ JSON file: Lỗi - ${jsonResult.error}`);
    }
    
    if (mongoResult.success) {
      console.log(`✅ MongoDB: ${mongoResult.updated} orders đã cập nhật`);
    } else {
      console.log(`❌ MongoDB: Lỗi - ${mongoResult.error}`);
    }
    
    console.log('\n✅ Hoàn tất!\n');
    console.log('💡 Từ giờ, cả "delivered" và "completed" đều được hiển thị là "Hoàn thành"');
    console.log('   và được tính như nhau trong TotalSpent và CustomerTiering.\n');
    
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
  updateMongoDB,
  updateJsonFile
};

