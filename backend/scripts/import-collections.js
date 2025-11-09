/**
 * Script tổng hợp để import tất cả collections từ JSON files vào MongoDB
 * Gộp code từ import-products.js, import-blogs.js
 */

const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { connectDB, Product, Blog } = require("../db");

// ============================================================================
// IMPORT PRODUCTS
// ============================================================================

/**
 * Import products từ JSON file vào MongoDB
 */
async function importProducts() {
  try {
    console.log("\n📦 [Import Products] Bắt đầu import products vào MongoDB...");

    // Kết nối MongoDB
    await connectDB();
    console.log("✅ [Import Products] Đã kết nối MongoDB");

    // Đọc file product.json
    const productPath = path.join(__dirname, "../../data/products.json");
    
    // Kiểm tra file có tồn tại không
    if (!fsSync.existsSync(productPath)) {
      console.log(`⚠️  [Import Products] File không tồn tại: ${productPath}`);
      return {
        success: false,
        message: `File không tồn tại: ${productPath}`
      };
    }

    const productData = JSON.parse(await fs.readFile(productPath, "utf-8"));
    console.log(`📊 [Import Products] Đọc được ${productData.length} sản phẩm từ file`);

    // Xóa tất cả products cũ (optional - comment out nếu muốn giữ)
    const deleteResult = await Product.deleteMany({});
    console.log(`🗑️  [Import Products] Đã xóa ${deleteResult.deletedCount} sản phẩm cũ`);

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
          console.log(`   ⏳ [Import Products] Đã import ${successCount}/${productData.length} sản phẩm...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ [Import Products] Lỗi khi import ${product._id || product.sku}:`, error.message);
      }
    }

    console.log("\n✅ [Import Products] KẾT QUẢ IMPORT:");
    console.log(`   Thành công: ${successCount} sản phẩm`);
    console.log(`   Lỗi: ${errorCount} sản phẩm`);
    console.log(`   Tổng: ${productData.length} sản phẩm`);

    // Verify
    const totalInDb = await Product.countDocuments();
    console.log(`\n📊 [Import Products] Hiện có ${totalInDb} sản phẩm trong MongoDB`);

    return {
      success: true,
      successCount,
      errorCount,
      total: productData.length,
      totalInDb
    };
  } catch (error) {
    console.error("❌ [Import Products] Lỗi:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// IMPORT BLOGS
// ============================================================================

/**
 * Import blogs từ JSON file vào MongoDB
 */
async function importBlogs() {
  try {
    console.log("\n📝 [Import Blogs] Bắt đầu import blogs vào MongoDB...");

    // Kết nối MongoDB
    await connectDB();
    console.log("✅ [Import Blogs] Đã kết nối MongoDB");

    // Try to find blog.json file
    const possiblePaths = [
      path.join(__dirname, "../../data/blogs.json"),
      path.join(__dirname, "../../my-user/public/data/blogs.json"),
      path.join(__dirname, "../../my-user/src/assets/data/blogs.json"),
      path.join(__dirname, "../data/blogs.json"),
      path.join(__dirname, "../../data/blogs/blogs.json"),
    ];

    let blogData = null;
    let blogFilePath = null;

    for (const filePath of possiblePaths) {
      if (fsSync.existsSync(filePath)) {
        blogFilePath = filePath;
        console.log(`📄 [Import Blogs] Tìm thấy blog.json tại: ${filePath}`);
        try {
          const fileContent = await fs.readFile(filePath, "utf8");
          blogData = JSON.parse(fileContent);
          console.log(`📊 [Import Blogs] Đã load ${blogData.length} blogs từ JSON`);
        } catch (error) {
          console.error(`❌ [Import Blogs] Lỗi đọc file: ${error.message}`);
          return {
            success: false,
            error: `Lỗi đọc file: ${error.message}`
          };
        }
        break;
      }
    }

    if (!blogData) {
      console.error("❌ [Import Blogs] Không tìm thấy blog.json file!");
      console.log("🔍 [Import Blogs] Đã tìm trong:");
      possiblePaths.forEach((p) => console.log(`   - ${p}`));
      return {
        success: false,
        error: "Không tìm thấy blog.json file"
      };
    }

    // Check if blogs already exist
    const existingCount = await Blog.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  [Import Blogs] Tìm thấy ${existingCount} blogs đã tồn tại trong database.`);
      console.log("💡 [Import Blogs] Để re-import, xóa blogs cũ trước hoặc dùng --force flag");
      
      // Kiểm tra xem blog NS014 có tồn tại không
      const blogNS014 = await Blog.findOne({ id: "NS014" });
      if (!blogNS014) {
        console.log("📝 [Import Blogs] Blog NS014 không tìm thấy. Tiến hành import...");
        // Xóa tất cả blogs cũ để import lại
        await Blog.deleteMany({});
      } else {
        console.log("✅ [Import Blogs] Blog NS014 đã tồn tại. Thoát...");
        return {
          success: true,
          message: "Blogs already exist",
          skipped: true
        };
      }
    }

    // Import blogs
    console.log("\n📝 [Import Blogs] Đang import blogs...");
    let successCount = 0;
    let errorCount = 0;

    for (const blog of blogData) {
      try {
        // Loại bỏ _id từ MongoDB nếu có (từ file JSON export)
        const { _id, ...blogWithoutId } = blog;
        
        // Ensure pubDate is a Date object
        const blogToInsert = {
          ...blogWithoutId,
          pubDate: blog.pubDate ? new Date(blog.pubDate) : new Date(),
          status: blog.status || "Active",
          views: blog.views || 0,
        };

        // Sử dụng upsert để update nếu đã tồn tại
        const newBlog = await Blog.findOneAndUpdate(
          { id: blog.id },
          blogToInsert,
          { upsert: true, new: true }
        );
        successCount++;
        console.log(`   ✅ [Import Blogs] Imported: ${blog.id} - ${blog.title}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ [Import Blogs] Error importing "${blog.id} - ${blog.title}": ${error.message}`);
      }
    }

    console.log(`\n✅ [Import Blogs] Import Summary:`);
    console.log(`   Thành công: ${successCount}`);
    console.log(`   Lỗi: ${errorCount}`);
    console.log(`   Tổng: ${blogData.length}`);

    // Verify
    const totalInDb = await Blog.countDocuments();
    console.log(`\n📊 [Import Blogs] Hiện có ${totalInDb} blogs trong MongoDB`);

    return {
      success: true,
      successCount,
      errorCount,
      total: blogData.length,
      totalInDb
    };
  } catch (error) {
    console.error("❌ [Import Blogs] Lỗi:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// IMPORT ALL COLLECTIONS
// ============================================================================

/**
 * Import tất cả collections từ JSON files vào MongoDB
 */
async function importAllCollections() {
  try {
    console.log("\n🚀 [Import All Collections] ============================================");
    console.log("[Import All Collections] Bắt đầu import tất cả collections...\n");

    const results = {};

    // Import products
    console.log("📦 [Import All Collections] Đang import products...");
    results.products = await importProducts();
    console.log("");

    // Import blogs
    console.log("📝 [Import All Collections] Đang import blogs...");
    results.blogs = await importBlogs();
    console.log("");

    console.log("✅ [Import All Collections] Hoàn tất import tất cả collections");
    console.log("[Import All Collections] ============================================\n");

    return {
      success: true,
      results: results
    };
  } catch (error) {
    console.error("❌ [Import All Collections] Lỗi:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const collection = args[0] || 'all'; // 'products', 'blogs', or 'all'

  try {
    if (collection === 'products') {
      await importProducts();
    } else if (collection === 'blogs') {
      await importBlogs();
    } else if (collection === 'all') {
      await importAllCollections();
    } else {
      console.error(`❌ Collection không hợp lệ: ${collection}`);
      console.log("💡 Sử dụng: node import-collections.js [products|blogs|all]");
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  main();
}

// Export các functions để có thể dùng trong các file khác
module.exports = {
  importProducts,
  importBlogs,
  importAllCollections
};

