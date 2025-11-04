#!/bin/bash

echo "🔍 Checking MongoDB connection and data..."
echo ""

# Check if MongoDB is running
echo "1️⃣ Checking if MongoDB is running..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running!"
    echo "   Please start MongoDB first:"
    echo "   - macOS: brew services start mongodb-community"
    echo "   - Or: mongod --dbpath /path/to/data"
    exit 1
fi
echo "✅ MongoDB is running"
echo ""

# Test MongoDB connection
echo "2️⃣ Testing MongoDB connection..."
node test-connection.js
if [ $? -ne 0 ]; then
    echo "❌ MongoDB connection test failed!"
    exit 1
fi
echo ""

# Check if admins collection has data
echo "3️⃣ Checking admins collection..."
node -e "
const { MongoClient } = require('mongodb');
(async () => {
  try {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('vgreen');
    const count = await db.collection('admins').countDocuments();
    console.log(\`   Admins in database: \${count}\`);
    if (count === 0) {
      console.log('   ⚠️  No admins found! Importing...');
      client.close();
      process.exit(1);
    } else {
      console.log('   ✅ Admins collection has data');
      client.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    process.exit(1);
  }
})();
"
ADMIN_CHECK=$?

if [ $ADMIN_CHECK -ne 0 ]; then
    echo ""
    echo "4️⃣ Importing admin data..."
    node import-admin.js
    if [ $? -ne 0 ]; then
        echo "❌ Failed to import admin data!"
        exit 1
    fi
else
    echo ""
    echo "4️⃣ Admins collection already has data, skipping import..."
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "📋 Next steps:"
echo "   1. Make sure backend is running: cd backend && npm start"
echo "   2. Test login with: huongpth23411@st.uel.edu.vn / 1234567890"
echo ""

