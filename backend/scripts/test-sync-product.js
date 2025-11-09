/**
 * Script để test sync một sản phẩm cụ thể
 * Usage: node scripts/test-sync-product.js "68e355c815c5eefd78586e9b"
 */

const { MongoClient } = require('mongodb');
const { syncProductsToJson } = require('../services/sync-products.service');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'vgreen';

async function testSync() {
  let client;
  try {
    console.log('🔌 Đang kết nối MongoDB...');
    client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const db = client.db(DB_NAME);
    const productsCollection = db.collection('products');
    
    // Tìm sản phẩm cụ thể
    const productId = process.argv[2] || '68e355c815c5eefd78586e9b';
    console.log(`\n🔍 Đang tìm sản phẩm với _id: ${productId}`);
    
    const product = await productsCollection.findOne({ _id: productId });
    
    if (!product) {
      console.log('❌ Không tìm thấy sản phẩm trong MongoDB');
      return;
    }
    
    console.log('✅ Tìm thấy sản phẩm:');
    console.log(`   Tên: ${product.product_name || product.productName}`);
    console.log(`   Stock trong MongoDB: ${product.stock}`);
    console.log(`   Price: ${product.price}`);
    console.log(`   _id: ${product._id}`);
    
    // Đồng bộ tất cả products
    console.log('\n🔄 Bắt đầu đồng bộ tất cả products...');
    const syncResult = await syncProductsToJson(productsCollection);
    
    if (syncResult.success) {
      console.log(`\n✅ Đã đồng bộ ${syncResult.count} products thành công!`);
    } else {
      console.log(`\n❌ Lỗi khi đồng bộ: ${syncResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Đã đóng kết nối MongoDB');
    }
  }
}

testSync();


