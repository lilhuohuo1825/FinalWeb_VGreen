/**
 * Script cập nhật CustomerID trong tất cả các file JSON và MongoDB
 * 
 * Mapping:
 * - CUS326736493 (Nguyễn Như Huyền) -> CUS000001
 * - CUS305416310 (Nguyen Hera) -> CUS000002
 * - CUS740201512 -> CUS000002 (nếu là Nguyen Hera)
 * 
 * Usage: node scripts/update-customer-ids.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB configuration
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'vgreen';

// Mapping CustomerID cũ -> mới
const CUSTOMER_ID_MAPPING = {
  'CUS326736493': 'CUS000001', // Nguyễn Như Huyền
  'CUS305416310': 'CUS000002', // Nguyen Hera
  'CUS740201512': 'CUS000002'  // Có thể là Nguyen Hera (cần xác nhận)
};

// Đường dẫn các file JSON cần cập nhật
const JSON_FILES = {
  users: path.join(__dirname, '../../data/temp/users.json'),
  orders: path.join(__dirname, '../../data/temp/orders.json'),
  reviews: path.join(__dirname, '../../data/temp/reviews.json'),
  useraddresses: path.join(__dirname, '../../data/temp/useraddresses.json'),
  userwishlists: path.join(__dirname, '../../data/temp/userwishlists.json'),
  carts: path.join(__dirname, '../../data/temp/carts.json')
};

/**
 * Cập nhật CustomerID trong một object
 */
function updateCustomerIdInObject(obj, mapping) {
  if (Array.isArray(obj)) {
    return obj.map(item => updateCustomerIdInObject(item, mapping));
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const updated = {};
  let hasChanges = false;
  
  for (const [key, value] of Object.entries(obj)) {
    // Kiểm tra các field có thể chứa CustomerID
    if ((key === 'CustomerID' || key === 'customer_id') && typeof value === 'string') {
      if (mapping[value]) {
        updated[key] = mapping[value];
        hasChanges = true;
        console.log(`   🔄 ${key}: ${value} -> ${mapping[value]}`);
      } else {
        updated[key] = value;
      }
    } else if (Array.isArray(value)) {
      updated[key] = updateCustomerIdInObject(value, mapping);
    } else if (value && typeof value === 'object') {
      updated[key] = updateCustomerIdInObject(value, mapping);
    } else {
      updated[key] = value;
    }
  }
  
  return updated;
}

/**
 * Cập nhật CustomerID trong file JSON
 */
function updateJsonFile(filePath, fileName) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File không tồn tại: ${fileName}`);
      return { updated: 0, skipped: true };
    }
    
    console.log(`\n📄 Đang xử lý: ${fileName}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const updatedData = updateCustomerIdInObject(data, CUSTOMER_ID_MAPPING);
    
    // Kiểm tra xem có thay đổi không
    const originalStr = JSON.stringify(data);
    const updatedStr = JSON.stringify(updatedData);
    
    if (originalStr === updatedStr) {
      console.log(`   ✅ Không có thay đổi`);
      return { updated: 0, skipped: false };
    }
    
    // Ghi lại file
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, '\t'), 'utf8');
    
    // Đếm số lượng thay đổi
    const originalContent = originalStr;
    const updatedContent = updatedStr;
    let changeCount = 0;
    for (const [oldId, newId] of Object.entries(CUSTOMER_ID_MAPPING)) {
      const matches = (originalContent.match(new RegExp(oldId, 'g')) || []).length;
      changeCount += matches;
    }
    
    console.log(`   ✅ Đã cập nhật ${changeCount} CustomerID`);
    return { updated: changeCount, skipped: false };
    
  } catch (error) {
    console.error(`   ❌ Lỗi khi xử lý ${fileName}:`, error.message);
    return { updated: 0, skipped: false, error: error.message };
  }
}

/**
 * Cập nhật CustomerID trong MongoDB
 */
async function updateMongoDB() {
  let client;
  
  try {
    console.log('\n🗄️  Đang cập nhật MongoDB...');
    console.log('🔌 Đang kết nối MongoDB...');
    client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Đã kết nối MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    // Collections cần cập nhật
    const collections = [
      { name: 'users', field: 'CustomerID' },
      { name: 'orders', field: 'CustomerID' },
      { name: 'reviews', field: 'customer_id' },
      { name: 'useraddresses', field: 'CustomerID' },
      { name: 'userwishlists', field: 'CustomerID' },
      { name: 'carts', field: 'CustomerID' }
    ];
    
    let totalUpdated = 0;
    
    for (const { name, field } of collections) {
      try {
        const collection = db.collection(name);
        const count = await collection.countDocuments();
        
        if (count === 0) {
          console.log(`   ⚠️  Collection "${name}" trống, bỏ qua`);
          continue;
        }
        
        console.log(`\n📦 Đang cập nhật collection: ${name}`);
        let collectionUpdated = 0;
        
        for (const [oldId, newId] of Object.entries(CUSTOMER_ID_MAPPING)) {
          const result = await collection.updateMany(
            { [field]: oldId },
            { $set: { [field]: newId } }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`   🔄 ${field}: ${oldId} -> ${newId} (${result.modifiedCount} documents)`);
            collectionUpdated += result.modifiedCount;
          }
        }
        
        if (collectionUpdated > 0) {
          totalUpdated += collectionUpdated;
          console.log(`   ✅ Đã cập nhật ${collectionUpdated} documents trong ${name}`);
        } else {
          console.log(`   ✅ Không có thay đổi trong ${name}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Lỗi khi cập nhật collection ${name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Tổng cộng đã cập nhật ${totalUpdated} documents trong MongoDB`);
    
    return { success: true, updated: totalUpdated };
    
  } catch (error) {
    console.error('\n❌ Lỗi khi cập nhật MongoDB:', error);
    return { success: false, error: error.message };
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Đã đóng kết nối MongoDB\n');
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 CẬP NHẬT CUSTOMERID TRONG TẤT CẢ DỮ LIỆU');
  console.log('='.repeat(80));
  console.log('\n📋 Mapping:');
  for (const [oldId, newId] of Object.entries(CUSTOMER_ID_MAPPING)) {
    console.log(`   ${oldId} -> ${newId}`);
  }
  
  // Cập nhật các file JSON
  console.log('\n📁 Đang cập nhật các file JSON...');
  let jsonTotalUpdated = 0;
  
  for (const [key, filePath] of Object.entries(JSON_FILES)) {
    const result = updateJsonFile(filePath, key);
    if (!result.skipped && result.updated) {
      jsonTotalUpdated += result.updated;
    }
  }
  
  console.log(`\n✅ Tổng cộng đã cập nhật ${jsonTotalUpdated} CustomerID trong các file JSON`);
  
  // Cập nhật MongoDB
  const mongoResult = await updateMongoDB();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TỔNG KẾT');
  console.log('='.repeat(80));
  console.log(`\n✅ JSON files: ${jsonTotalUpdated} CustomerID đã cập nhật`);
  if (mongoResult.success) {
    console.log(`✅ MongoDB: ${mongoResult.updated} documents đã cập nhật`);
  } else {
    console.log(`❌ MongoDB: Lỗi - ${mongoResult.error}`);
  }
  console.log('\n✅ Hoàn tất!\n');
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Lỗi không xử lý được:', error);
    process.exit(1);
  });
}

module.exports = { updateCustomerIdInObject, CUSTOMER_ID_MAPPING };

