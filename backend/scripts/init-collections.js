/** 
 * Script để khởi tạo collections userwishlists và useraddresses 
 * cho tất cả users hiện có trong database 
 * 
 * Cách chạy: node backend/scripts/init-collections.js 
 */ 

const mongoose = require("mongoose");
const { User, UserWishlist, UserAddress, connectDB } = require("../db");

async function initializeCollections() {
  try {
 // console.log(" Bắt đầu khởi tạo collections...\n"); 

 // Kết nối MongoDB 
    await connectDB();

 // Lấy tất cả users 
    const users = await User.find({}, { CustomerID: 1, Phone: 1, FullName: 1 });
 // console.log(` Tìm thấy ${users.length} users trong database\n`); 

    let wishlistCreated = 0;
    let wishlistExisted = 0;
    let addressCreated = 0;
    let addressExisted = 0;

 // Tạo document cho từng user 
    for (const user of users) {
      const customerID = user.CustomerID;

      if (!customerID) {
 // console.warn(` User không có CustomerID, bỏ qua`); 
        continue;
      }

 // Kiểm tra và tạo UserWishlist nếu chưa có 
      const existingWishlist = await UserWishlist.findOne({
        CustomerID: customerID,
      });
      if (!existingWishlist) {
        await UserWishlist.create({
          CustomerID: customerID,
          wishlist: [],
        });
        wishlistCreated++;
 // console.log(` Tạo wishlist cho CustomerID: ${customerID}`); 
      } else {
        wishlistExisted++;
 // console.log(`ℹ Wishlist đã tồn tại cho CustomerID: ${customerID}`); 
      }

 // Kiểm tra và tạo UserAddress nếu chưa có 
      const existingAddress = await UserAddress.findOne({
        CustomerID: customerID,
      });
      if (!existingAddress) {
        await UserAddress.create({
          CustomerID: customerID,
          addresses: [],
        });
        addressCreated++;
 // console.log(` Tạo address cho CustomerID: ${customerID}`); 
      } else {
        addressExisted++;
 // console.log(`ℹ Address đã tồn tại cho CustomerID: ${customerID}`); 
      }

 // console.log(""); // Dòng trống để dễ đọc 
    }

 // console.log("\n" + "=".repeat(60)); 
 // console.log(" KẾT QUẢ KHỞI TẠO:"); 
 // console.log("=".repeat(60)); 
 // console.log(` Tổng số users: ${users.length}`); 
 // console.log(`\n Wishlist:`); 
 // console.log(` - Đã tạo mới: ${wishlistCreated}`); 
 // console.log(` - Đã tồn tại: ${wishlistExisted}`); 
 // console.log(`\n� Address:`); 
 // console.log(` - Đã tạo mới: ${addressCreated}`); 
 // console.log(` - Đã tồn tại: ${addressExisted}`); 
 // console.log("=".repeat(60)); 
 // console.log("\n Hoàn thành khởi tạo collections!"); 
 // Đóng kết nối 
    await mongoose.connection.close();
 // console.log("� Đã đóng kết nối MongoDB"); 
    process.exit(0);
  } catch (error) {
 // console.error("\n LỖI:", error.message); 
 // console.error(error); 
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Chạy script 
initializeCollections();
