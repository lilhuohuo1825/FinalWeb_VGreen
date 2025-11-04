const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'vgreen'; // Changed to lowercase to match MongoDB case-sensitivity

async function testConnection() {
  console.log('🔗 Testing MongoDB connection...\n');
  
  try {
    // Connect to MongoDB
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    
    const db = client.db(DB_NAME);
    console.log(`📊 Database: ${DB_NAME}\n`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections found:');
    
    for (const collection of collections) {
      console.log(`  - ${collection.name}`);
      
      // Count documents in each collection
      const count = await db.collection(collection.name).countDocuments();
      console.log(`    └─ ${count} documents`);
    }
    
    console.log('\n🎉 MongoDB connection test completed!\n');
    
    // Close connection
    await client.close();
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('\n📝 Troubleshooting:');
    console.log('  1. Make sure MongoDB is running');
    console.log('  2. Check connection string in server.js');
    console.log('  3. Verify database name is "VGreen"');
    console.log('  4. Check if collections exist in MongoDB Compass\n');
    process.exit(1);
  }
}

testConnection();

