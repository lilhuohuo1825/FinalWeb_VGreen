#!/bin/bash

# Script để push code admin an toàn lên GitHub
# Tác giả: Helper script
# Ngày tạo: $(date)

set -e  # Dừng nếu có lỗi

echo "🚀 Bắt đầu quá trình push code admin an toàn..."
echo ""

# Bước 1: Tạo backup
echo "📦 Bước 1: Tạo backup..."
BACKUP_DIR="../FinalWeb_VGreen_backup_$(date +%Y%m%d_%H%M%S)"
echo "Tạo backup tại: $BACKUP_DIR"
cp -r . "$BACKUP_DIR" 2>/dev/null || {
    echo "⚠️  Không thể tạo backup tại $BACKUP_DIR, thử thư mục khác..."
    BACKUP_DIR="/tmp/FinalWeb_VGreen_backup_$(date +%Y%m%d_%H%M%S)"
    cp -r . "$BACKUP_DIR"
    echo "✅ Backup đã được tạo tại: $BACKUP_DIR"
}
echo "✅ Backup hoàn tất"
echo ""

# Bước 2: Kiểm tra trạng thái Git
echo "🔍 Bước 2: Kiểm tra trạng thái Git..."
git status --short
echo ""

# Bước 3: Stash các thay đổi hiện tại
echo "📥 Bước 3: Lưu các thay đổi hiện tại vào stash..."
git stash push -m "Admin changes before merge - $(date +%Y%m%d_%H%M%S)"
echo "✅ Đã lưu các thay đổi vào stash"
echo ""

# Bước 4: Fetch code mới nhất từ remote
echo "⬇️  Bước 4: Lấy code mới nhất từ GitHub..."
git fetch origin
echo "✅ Đã fetch code mới nhất"
echo ""

# Bước 5: Tạo branch mới cho admin
echo "🌿 Bước 5: Tạo branch mới cho admin..."
BRANCH_NAME="admin-update-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH_NAME"
echo "✅ Đã tạo branch: $BRANCH_NAME"
echo ""

# Bước 6: Merge code từ origin/main
echo "🔀 Bước 6: Merge code từ origin/main..."
git merge origin/main --no-edit || {
    echo "⚠️  Có conflict khi merge. Hãy giải quyết conflict thủ công."
    echo "Sau khi giải quyết conflict, chạy:"
    echo "  git add ."
    echo "  git commit -m 'Merge origin/main with admin changes'"
    exit 1
}
echo "✅ Đã merge thành công"
echo ""

# Bước 7: Apply lại các thay đổi admin
echo "📤 Bước 7: Áp dụng lại các thay đổi admin..."
git stash pop || {
    echo "⚠️  Có conflict khi apply stash. Hãy giải quyết conflict thủ công."
    echo "Sau khi giải quyết conflict, chạy:"
    echo "  git add ."
    echo "  git commit -m 'Apply admin changes'"
    exit 1
}
echo "✅ Đã áp dụng lại các thay đổi"
echo ""

# Bước 8: Add và commit các thay đổi
echo "💾 Bước 8: Commit các thay đổi..."
git add my-admin/
git add backend/
git add data/
echo "Các file đã được add"
echo ""

read -p "Bạn có muốn commit ngay không? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "Update admin dashboard and backend - $(date +%Y%m%d)"
    echo "✅ Đã commit"
else
    echo "⚠️  Bạn cần commit thủ công trước khi push:"
    echo "  git commit -m 'Your commit message'"
fi
echo ""

# Bước 9: Push lên GitHub
echo "🚀 Bước 9: Push lên GitHub..."
read -p "Bạn có muốn push lên GitHub ngay không? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin "$BRANCH_NAME"
    echo ""
    echo "✅ Đã push thành công!"
    echo ""
    echo "📝 Các bước tiếp theo:"
    echo "1. Vào GitHub: https://github.com/lilhuohuo1825/FinalWeb_VGreen"
    echo "2. Tạo Pull Request từ branch '$BRANCH_NAME' vào 'main'"
    echo "3. Review code và merge PR"
else
    echo "⚠️  Bạn có thể push sau bằng lệnh:"
    echo "  git push origin $BRANCH_NAME"
fi

echo ""
echo "✨ Hoàn tất! Backup đã được lưu tại: $BACKUP_DIR"

