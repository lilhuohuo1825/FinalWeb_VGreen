/**
 * Script kiểm tra và đảm bảo CustomerID được cập nhật đúng trong MongoDB
 * Và thêm CUS000003 nếu chưa có
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'vgreen';

async function checkAndFixCustomerIDs() {
  let client;
  
  try {
    console.log('\n🔍 Kiểm tra CustomerID trong MongoDB...\n');
    
    client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // Lấy tất cả users
    const users = await usersCollection.find({}).toArray();
    
    console.log(`📊 Tìm thấy ${users.length} users trong MongoDB:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. CustomerID: ${user.CustomerID}`);
      console.log(`   FullName: ${user.FullName || 'N/A'}`);
      console.log(`   Phone: ${user.Phone || 'N/A'}`);
      console.log('');
    });
    
    // Kiểm tra và cập nhật CustomerID
    console.log('🔄 Kiểm tra CustomerID cần cập nhật...\n');
    
    let updated = 0;
    
    for (const user of users) {
      let shouldUpdate = false;
      let newCustomerID = user.CustomerID;
      
      // Mapping theo FullName hoặc Phone
      if (user.FullName === 'Nguyễn Như Huyền' || user.Phone === '0815275677') {
        if (user.CustomerID !== 'CUS000001') {
          newCustomerID = 'CUS000001';
          shouldUpdate = true;
        }
      } else if (user.FullName === 'Nguyen Hera' || user.Phone === '02183773673') {
        if (user.CustomerID !== 'CUS000002') {
          newCustomerID = 'CUS000002';
          shouldUpdate = true;
        }
      } else if (user.FullName === 'Trần Thanh Thịnh' || user.Phone === '0987655755') {
        if (user.CustomerID !== 'CUS000003') {
          newCustomerID = 'CUS000003';
          shouldUpdate = true;
        }
      }
      
      if (shouldUpdate) {
        console.log(`   🔄 Cập nhật ${user.CustomerID} -> ${newCustomerID}`);
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { CustomerID: newCustomerID } }
        );
        updated++;
      }
    }
    
    // Kiểm tra xem có CUS000003 chưa
    const cus000003 = await usersCollection.findOne({ CustomerID: 'CUS000003' });
    
    if (!cus000003) {
      console.log('\n⚠️  CUS000003 chưa tồn tại trong MongoDB');
      console.log('   Kiểm tra xem có user nào cần được đổi thành CUS000003 không...\n');
    } else {
      console.log('\n✅ CUS000003 đã tồn tại trong MongoDB');
      console.log(`   FullName: ${cus000003.FullName || 'N/A'}`);
      console.log(`   Phone: ${cus000003.Phone || 'N/A'}\n`);
    }
    
    if (updated > 0) {
      console.log(`✅ Đã cập nhật ${updated} CustomerID\n`);
    } else {
      console.log('✅ Tất cả CustomerID đã đúng\n');
    }
    
    // Đồng bộ lại về JSON
    console.log('🔄 Đồng bộ lại từ MongoDB về JSON...\n');
    const { syncUsersToJson } = require('./services/sync-users.service');
    const result = await syncUsersToJson(usersCollection);
    
    if (result.success) {
      console.log(`✅ Đã đồng bộ ${result.count} users về JSON\n`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

if (require.main === module) {
  checkAndFixCustomerIDs().catch(console.error);
}

module.exports = { checkAndFixCustomerIDs };

