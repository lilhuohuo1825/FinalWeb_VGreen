/**
 * Script to import admin data from admin.json to MongoDB
 * 
 * Usage:
 *   node import-admin.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB configuration
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'vgreen';

// Path to admin.json - try multiple locations
const ADMIN_JSON_PATHS = [
  path.join(__dirname, '../data/admin.json'),
  path.join(__dirname, '../my-admin/public/data/admin.json')
];

// Find the first existing admin.json file
let ADMIN_JSON_PATH = null;
for (const jsonPath of ADMIN_JSON_PATHS) {
  if (fs.existsSync(jsonPath)) {
    ADMIN_JSON_PATH = jsonPath;
    break;
  }
}

/**
 * Main function to import admin data
 */
async function importAdminData() {
  let client;
  
  try {
    console.log('\n🚀 === IMPORT ADMIN DATA TO MONGODB ===');
    console.log(`📁 Reading admin data from: ${ADMIN_JSON_PATH}`);
    
    // Read admin.json file
    if (!ADMIN_JSON_PATH || !fs.existsSync(ADMIN_JSON_PATH)) {
      console.error(`❌ Error: admin.json file not found!`);
      console.error(`   Searched in:`);
      ADMIN_JSON_PATHS.forEach(p => console.error(`   - ${p}`));
      process.exit(1);
    }
    
    const adminJsonData = fs.readFileSync(ADMIN_JSON_PATH, 'utf8');
    const adminData = JSON.parse(adminJsonData);
    
    if (!adminData.admins || !Array.isArray(adminData.admins)) {
      console.error('❌ Error: Invalid admin.json format. Expected { "admins": [...] }');
      process.exit(1);
    }
    
    console.log(`✅ Admin data loaded: ${adminData.admins.length} admin(s) found`);
    
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB at ${MONGODB_URI}...`);
    client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const adminsCollection = db.collection('admins');
    
    // Create unique index on email
    console.log('📋 Creating unique index on email field...');
    await adminsCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ Unique index created');
    
    // Import each admin
    console.log('\n📥 Importing admins to MongoDB...');
    console.log('='.repeat(60));
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const admin of adminData.admins) {
      try {
        // Trim email to remove any whitespace
        const email = admin.email ? admin.email.trim().toLowerCase() : '';
        
        if (!email) {
          console.error(`❌ Error: Empty email for admin ${admin.id || admin.name}`);
          errors++;
          continue;
        }
        
        // Prepare admin document
        const adminDoc = {
          id: admin.id,
          name: admin.name,
          email: email,
          password: admin.password, // In production, this should be hashed
          role: admin.role || 'admin',
          status: admin.status || 'active',
          permissions: admin.permissions || ['all'],
          created_at: admin.created_at || new Date(),
          updated_at: new Date()
        };
        
        // Try to insert or update
        const result = await adminsCollection.updateOne(
          { email: email },
          { $set: adminDoc },
          { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
          console.log(`✅ Inserted: ${email} (${admin.name})`);
          imported++;
        } else if (result.modifiedCount > 0) {
          console.log(`🔄 Updated: ${email} (${admin.name})`);
          imported++;
        } else {
          console.log(`⏭️  Skipped: ${email} (already exists, no changes)`);
          skipped++;
        }
        
      } catch (error) {
        console.error(`❌ Error importing ${admin.email || admin.id}:`, error.message);
        errors++;
      }
    }
    
    // Summary
    console.log('='.repeat(60));
    console.log('\n📊 IMPORT SUMMARY:');
    console.log(`   ✅ Imported/Updated: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${adminData.admins.length}`);
    
    // Verify data
    console.log('\n🔍 Verifying data in MongoDB...');
    const totalAdmins = await adminsCollection.countDocuments();
    console.log(`✅ Total admins in database: ${totalAdmins}`);
    
    // Show all admins
    console.log('\n👥 All admins in database:');
    console.log('='.repeat(60));
    const allAdmins = await adminsCollection.find({}).toArray();
    allAdmins.forEach(admin => {
      console.log(`   ID: ${admin.id}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.status || 'active'}`);
      console.log('   ---');
    });
    
    console.log('\n✅ Import completed successfully!');
    console.log('🎉 You can now login with these credentials.\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed\n');
    }
  }
}

// Run the import
importAdminData();

