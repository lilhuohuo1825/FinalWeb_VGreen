#!/bin/bash

echo "🚀 Importing address data (provinces, wards, tree) to MongoDB..."
echo ""

# Database name
DB="vgreen"

# Data directory (relative to backend folder)
ADDRESS_DATA_DIR="../my-admin/public/data/address"

# Check if address data directory exists
if [ ! -d "$ADDRESS_DATA_DIR" ]; then
    echo "❌ Error: Address data directory not found: $ADDRESS_DATA_DIR"
    exit 1
fi

echo "📂 Address data directory: $ADDRESS_DATA_DIR"
echo "🗄️  Database: $DB"
echo ""

# Import provinces
if [ -f "$ADDRESS_DATA_DIR/provinces.json" ]; then
    echo "📍 Importing provinces..."
    mongoimport --db $DB --collection provinces --file "$ADDRESS_DATA_DIR/provinces.json" --jsonArray --drop
    if [ $? -eq 0 ]; then
        echo "✅ Provinces imported successfully"
    else
        echo "⚠️  Error importing provinces"
    fi
else
    echo "⚠️  provinces.json not found at $ADDRESS_DATA_DIR/provinces.json"
fi

# Import wards
if [ -f "$ADDRESS_DATA_DIR/wards.json" ]; then
    echo "🏘️  Importing wards..."
    mongoimport --db $DB --collection wards --file "$ADDRESS_DATA_DIR/wards.json" --jsonArray --drop
    if [ $? -eq 0 ]; then
        echo "✅ Wards imported successfully"
    else
        echo "⚠️  Error importing wards"
    fi
else
    echo "⚠️  wards.json not found at $ADDRESS_DATA_DIR/wards.json"
fi

# Import tree
if [ -f "$ADDRESS_DATA_DIR/tree.json" ]; then
    echo "🌳 Importing tree..."
    mongoimport --db $DB --collection tree --file "$ADDRESS_DATA_DIR/tree.json" --jsonArray --drop
    if [ $? -eq 0 ]; then
        echo "✅ Tree imported successfully"
    else
        echo "⚠️  Error importing tree"
    fi
else
    echo "⚠️  tree.json not found at $ADDRESS_DATA_DIR/tree.json"
fi

echo ""
echo "🎉 Address data import completed!"
echo ""
echo "📊 Verifying import..."
mongosh $DB --eval "
    const provincesCount = db.provinces.countDocuments();
    const wardsCount = db.wards.countDocuments();
    const treeCount = db.tree.countDocuments();
    print('📊 Address data counts:');
    print('   - Provinces: ' + provincesCount);
    print('   - Wards: ' + wardsCount);
    print('   - Tree: ' + treeCount);
"

