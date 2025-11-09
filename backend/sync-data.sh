#!/bin/bash

# Script đồng bộ dữ liệu từ thư mục data vào MongoDB
# Loại bỏ dữ liệu dư thừa và chỉ giữ dữ liệu từ mẫu

echo "🚀 Đồng bộ dữ liệu từ mẫu vào MongoDB..."
echo ""

# Kiểm tra MongoDB có đang chạy không
if ! mongosh --eval "db.version()" > /dev/null 2>&1; then
    echo "❌ MongoDB không đang chạy!"
    echo "   Vui lòng khởi động MongoDB trước:"
    echo "   brew services start mongodb-community"
    exit 1
fi

# Chạy script Node.js
cd "$(dirname "$0")"
node sync-data-from-template.js

# Kiểm tra kết quả
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Đồng bộ dữ liệu hoàn tất!"
    echo ""
    echo "📊 Kiểm tra kết quả:"
    echo "   node test-connection.js"
else
    echo ""
    echo "❌ Có lỗi xảy ra trong quá trình đồng bộ!"
    exit 1
fi

