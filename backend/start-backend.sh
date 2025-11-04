#!/bin/bash

echo "🚀 Starting Backend Server..."
echo ""

# Check if MongoDB is running
echo "1️⃣ Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running!"
    echo ""
    echo "📝 Starting MongoDB..."
    
    # Try to start MongoDB (macOS)
    if command -v brew &> /dev/null; then
        echo "   Attempting to start MongoDB via brew services..."
        brew services start mongodb-community 2>/dev/null || brew services start mongodb 2>/dev/null || {
            echo "   ⚠️  Could not start MongoDB automatically"
            echo "   Please start MongoDB manually:"
            echo "   - macOS: brew services start mongodb-community"
            echo "   - Or: mongod --dbpath /path/to/data"
            echo ""
            echo "   Then run this script again."
            exit 1
        }
        echo "   ✅ MongoDB started"
        sleep 2
    else
        echo "   ❌ Please start MongoDB manually first"
        exit 1
    fi
else
    echo "✅ MongoDB is running"
fi
echo ""

# Check MongoDB connection
echo "2️⃣ Testing MongoDB connection..."
node test-connection.js > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  MongoDB connection test failed"
    echo "   This might be okay if MongoDB just started"
    sleep 2
else
    echo "✅ MongoDB connection successful"
fi
echo ""

# Check if admins collection has data
echo "3️⃣ Checking admins collection..."
ADMIN_COUNT=$(node -e "
const { MongoClient } = require('mongodb');
(async () => {
  try {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('vgreen');
    const count = await db.collection('admins').countDocuments();
    console.log(count);
    client.close();
  } catch (error) {
    console.log('0');
  }
})();
" 2>/dev/null)

if [ "$ADMIN_COUNT" = "0" ] || [ -z "$ADMIN_COUNT" ]; then
    echo "⚠️  No admins found in database"
    echo "   Importing admin data..."
    node import-admin.js
    if [ $? -ne 0 ]; then
        echo "❌ Failed to import admin data"
        echo "   You can import manually later: node import-admin.js"
    fi
else
    echo "✅ Admins collection has $ADMIN_COUNT admin(s)"
fi
echo ""

# Check if port 3000 is available
echo "4️⃣ Checking port 3000..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use"
    echo "   Killing existing process..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    sleep 1
fi
echo "✅ Port 3000 is available"
echo ""

# Start backend server
echo "5️⃣ Starting backend server..."
echo "   Server will run on: http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""
echo "=========================================="
echo ""

# Start the server
cd "$(dirname "$0")"
npm start

