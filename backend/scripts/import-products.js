const fs = require("fs").promises;
const path = require("path");
const { connectDB, Product } = require("../db");

async function importProducts() {
  try {
 // console.log(" Bắt đầu import products vào MongoDB..."); 

 // Kết nối MongoDB 
    await connectDB();
 // console.log(" Đã kết nối MongoDB"); 

 // Đọc file product.json 
    const productPath = path.join(__dirname, "../../data/product.json");
    const productData = JSON.parse(await fs.readFile(productPath, "utf-8"));
 // console.log(` Đọc được ${productData.length} sản phẩm từ file`); 

 // Xóa tất cả products cũ (optional - comment out nếu muốn giữ) 
    const deleteResult = await Product.deleteMany({});
 // console.log(` Đã xóa ${deleteResult.deletedCount} sản phẩm cũ`); 

 // Import products mới 
    let successCount = 0;
    let errorCount = 0;

    for (const product of productData) {
      try {
 // Normalize data 
        const normalizedProduct = {
          _id: product._id,
          category: product.category,
          subcategory: product.subcategory,
          product_name: product.product_name,
          brand: product.brand,
          unit: product.unit,
          price: product.price,
          sku: product.sku,
          origin: product.origin,
          weight: product.weight,
          ingredients: product.ingredients,
          usage: product.usage,
          storage: product.storage,
          manufacture_date: product.manufacture_date,
          expiry_date: product.expiry_date,
          producer: product.producer,
          safety_warning: product.safety_warning,
          color: product.color,
          base_price: product.base_price,
          image: Array.isArray(product.image) ? product.image : [product.image],
          rating: product.rating,
          purchase_count: product.purchase_count || 0,
          status: product.status || "Active",
          post_date: product.post_date,
          liked: product.liked || 0,
        };

        await Product.create(normalizedProduct);
        successCount++;

        if (successCount % 100 === 0) {
 // console.log( 
            `   ⏳ Đã import ${successCount}/${productData.length} sản phẩm...`
          ;
        }
      } catch (error) {
        errorCount++;
 // console.error( 
 // ` Lỗi khi import ${product._id || product.sku}:`, 
 // error.message 
 // ); 
      }
    }

 // console.log("\n KẾT QUẢ IMPORT:"); 
 // console.log(` Thành công: ${successCount} sản phẩm`); 
 // console.log(` Lỗi: ${errorCount} sản phẩm`); 
 // console.log(` Tổng: ${productData.length} sản phẩm`); 

 // Verify 
    const totalInDb = await Product.countDocuments();
 // console.log(`\n Hiện có ${totalInDb} sản phẩm trong MongoDB`); 

    process.exit(0);
  } catch (error) {
 console.error(" Lỗi:", error); 
    process.exit(1);
  }
}

importProducts();
