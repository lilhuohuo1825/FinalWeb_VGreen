#!/bin/bash

echo "🚀 Importing data to MongoDB..."
echo ""

# Database name
DB="vgreen"

# Data directory
DATA_DIR="../data"

# Check if data directory exists
if [ ! -d "$DATA_DIR" ]; then
    echo "❌ Error: Data directory not found: $DATA_DIR"
    exit 1
fi

echo "📂 Data directory: $DATA_DIR"
echo "🗄️  Database: $DB"
echo ""

# Import users
if [ -f "$DATA_DIR/users.json" ]; then
    echo "👥 Importing users..."
    mongoimport --db $DB --collection users --file "$DATA_DIR/users.json" --jsonArray
    echo "✅ Users imported"
else
    echo "⚠️  users.json not found"
fi

# Import orders
if [ -f "$DATA_DIR/orders.json" ]; then
    echo "📦 Importing orders..."
    mongoimport --db $DB --collection orders --file "$DATA_DIR/orders.json" --jsonArray
    echo "✅ Orders imported"
else
    echo "⚠️  orders.json not found"
fi

# Import products
if [ -f "$DATA_DIR/product.json" ]; then
    echo "🛍️  Importing products..."
    mongoimport --db $DB --collection products --file "$DATA_DIR/product.json" --jsonArray
    echo "✅ Products imported"
else
    echo "⚠️  product.json not found"
fi

# Import promotions
if [ -f "$DATA_DIR/promotions.json" ]; then
    echo "🎁 Importing promotions..."
    mongoimport --db $DB --collection promotions --file "$DATA_DIR/promotions.json" --jsonArray
    echo "✅ Promotions imported"
else
    echo "⚠️  promotions.json not found"
fi

# Import order details
if [ -f "$DATA_DIR/orderdetail.json" ]; then
    echo "📋 Importing order details..."
    mongoimport --db $DB --collection orderdetails --file "$DATA_DIR/orderdetail.json" --jsonArray
    echo "✅ Order details imported"
else
    echo "⚠️  orderdetail.json not found"
fi

echo ""
echo "🎉 Import completed!"
echo ""
echo "📊 Verifying import..."
node test-connection.js

