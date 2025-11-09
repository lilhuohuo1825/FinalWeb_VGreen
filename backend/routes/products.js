const express = require("express");
const router = express.Router();
const { Product } = require("../db");
const { ObjectId } = require("mongodb");

// GET all products 
router.get("/", async (req, res) => {
  try {
 // console.log(" [Products API] Fetching all products..."); 
    const products = await Product.find({ status: "Active" });
 // console.log(` [Products API] Found ${products.length} products`); 

    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
 // console.error(" [Products API] Error fetching products:", error); 
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách sản phẩm",
      error: error.message,
    });
  }
});

// ============================================================================
// METADATA ROUTES - Must be placed BEFORE /:id route to avoid conflicts
// ============================================================================

// GET /api/products/metadata/categories - Lấy danh sách categories
router.get("/metadata/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category", { status: "Active" });
    res.json({
      success: true,
      data: categories.filter(c => c && c.trim() !== ''),
      count: categories.length,
    });
  } catch (error) {
    console.error(" [Products API] Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách categories",
      error: error.message,
    });
  }
});

// GET /api/products/metadata/subcategories - Lấy danh sách subcategories
router.get("/metadata/subcategories", async (req, res) => {
  try {
    const subcategories = await Product.distinct("subcategory", { status: "Active" });
    res.json({
      success: true,
      data: subcategories.filter(s => s && s.trim() !== ''),
      count: subcategories.length,
    });
  } catch (error) {
    console.error(" [Products API] Error fetching subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách subcategories",
      error: error.message,
    });
  }
});

// GET /api/products/metadata/brands - Lấy danh sách brands
router.get("/metadata/brands", async (req, res) => {
  try {
    const brands = await Product.distinct("brand", { status: "Active" });
    res.json({
      success: true,
      data: brands.filter(b => b && b.trim() !== ''),
      count: brands.length,
    });
  } catch (error) {
    console.error(" [Products API] Error fetching brands:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách brands",
      error: error.message,
    });
  }
});

// GET /api/products/metadata/products - Lấy danh sách products (SKU và tên)
router.get("/metadata/products", async (req, res) => {
  try {
    const products = await Product.find({ status: "Active" })
      .select("sku product_name productName")
      .limit(1000); // Limit để tránh quá nhiều data
    
    const productList = products.map(p => ({
      sku: p.sku,
      name: p.product_name || p.productName || p.sku,
    }));
    
    res.json({
      success: true,
      data: productList,
      count: productList.length,
    });
  } catch (error) {
    console.error(" [Products API] Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách products",
      error: error.message,
    });
  }
});

// ============================================================================
// PRODUCT ROUTES
// ============================================================================

// GET product by ID 
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
 // console.log(` [Products API] Fetching product with ID/SKU: ${id}`); 

 // Tìm product theo SKU hoặc _id 
    let product = await Product.findOne({ sku: id });

 // Nếu không tìm thấy bằng SKU, thử tìm bằng _id 
    if (!product) {
      product = await Product.findOne({ _id: id });
    }

    if (!product) {
 // console.log(` [Products API] Product not found: ${id}`); 
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

 // console.log(` [Products API] Found product: ${product.product_name}`); 
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
 // console.error(" [Products API] Error fetching product:", error); 
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin sản phẩm",
      error: error.message,
    });
  }
});

// GET products by category 
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
 // console.log(` [Products API] Fetching products in category: ${category}`); 

    const products = await Product.find({
      category: category,
      status: "Active",
    });

 // console.log( 
 // ` [Products API] Found ${products.length} products in ${category}` 
 // ); 
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
 // console.error( 
 // " [Products API] Error fetching products by category:", 
 // error 
 // ); 
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy sản phẩm theo danh mục",
      error: error.message,
    });
  }
});

// GET products by subcategory 
router.get("/category/:category/:subcategory", async (req, res) => {
  try {
    const { category, subcategory } = req.params;
 // console.log( 
 // ` [Products API] Fetching products in ${category}/${subcategory}` 
 // ); 

    const products = await Product.find({
      category: category,
      subcategory: subcategory,
      status: "Active",
    });

 // console.log(` [Products API] Found ${products.length} products`); 
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
 // console.error( 
 // " [Products API] Error fetching products by subcategory:", 
 // error 
 // ); 
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy sản phẩm theo danh mục phụ",
      error: error.message,
    });
  }
});

// PUT /api/products/:id - Cập nhật sản phẩm
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(` [Products API] Updating product with ID: ${id}`);
    
    // Tìm product theo _id trước (vì frontend gửi _id từ MongoDB)
    let product = await Product.findOne({ _id: id });
    
    // Nếu không tìm thấy bằng _id, thử tìm bằng SKU
    if (!product) {
      console.log(` [Products API] Not found by _id, trying SKU...`);
      product = await Product.findOne({ sku: id });
    }

    if (!product) {
      console.log(` [Products API] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    console.log(` [Products API] Found product: ${product.product_name} (${product._id})`);

    // Cập nhật post_date với thời gian hiện tại khi lưu
    const updateData = {
      ...req.body,
      post_date: new Date(), // Cập nhật ngày cập nhật mới nhất
    };

    // Đảm bảo _id không bị thay đổi
    if (updateData._id && updateData._id !== product._id) {
      // Nếu _id trong body khác với _id hiện tại, giữ nguyên _id cũ
      delete updateData._id;
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: product._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Không thể cập nhật sản phẩm",
      });
    }

    console.log(` [Products API] Product updated successfully: ${updatedProduct.product_name}`);
    res.json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      data: updatedProduct,
    });
  } catch (error) {
    console.error(" [Products API] Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật sản phẩm",
      error: error.message,
    });
  }
});

// POST /api/products - Tạo sản phẩm mới
router.post("/", async (req, res) => {
  try {
    const newProduct = new Product({
      ...req.body,
      post_date: new Date(), // Set ngày tạo mới
    });
    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: newProduct,
    });
  } catch (error) {
    // console.error(" [Products API] Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo sản phẩm",
      error: error.message,
    });
  }
});

// DELETE /api/products/:id - Xóa sản phẩm
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`\n🗑️ === DELETE PRODUCT ===`);
    console.log(`📦 Product ID/SKU: ${id}`);
    
    // Strategy 1: Try to find by SKU first (most common case from frontend)
    let product = await Product.findOne({ sku: id });
    
    // Strategy 2: If not found by SKU, try to find by _id as ObjectId
    if (!product) {
      try {
        // Check if the id is a valid MongoDB ObjectId
        if (ObjectId.isValid(id)) {
          product = await Product.findOne({ _id: new ObjectId(id) });
          if (product) {
            console.log(`📦 [Products API] Found product by _id (ObjectId): ${product.product_name || product.productName}`);
          }
        }
      } catch (e) {
        // Invalid ObjectId format, continue
        console.log(`📦 [Products API] Invalid ObjectId format: ${id}`);
      }
    } else {
      console.log(`📦 [Products API] Found product by SKU: ${product.product_name || product.productName}`);
    }
    
    // Strategy 3: If still not found, try to find by _id as string (fallback)
    if (!product) {
      try {
        product = await Product.findOne({ _id: id });
        if (product) {
          console.log(`📦 [Products API] Found product by _id (string): ${product.product_name || product.productName}`);
        }
      } catch (e) {
        // Ignore errors
        console.log(`📦 [Products API] Error finding by _id string: ${id}`);
      }
    }

    if (!product) {
      console.log(`❌ [Products API] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
        error: `Product with ID/SKU "${id}" not found`
      });
    }

    console.log(`✅ [Products API] Found product: ${product.product_name || product.productName} (${product._id})`);

    // Xóa sản phẩm (hoặc đánh dấu là inactive)
    // Option 1: Xóa hoàn toàn (uncomment if needed)
    // const deletedProduct = await Product.findOneAndDelete({ _id: product._id });
    
    // Option 2: Đánh dấu là inactive (recommended để giữ lịch sử)
    const deletedProduct = await Product.findOneAndUpdate(
      { _id: product._id },
      { status: 'Inactive', updatedAt: new Date() },
      { new: true }
    );

    if (!deletedProduct) {
      console.log(`❌ [Products API] Failed to delete product: ${id}`);
      return res.status(500).json({
        success: false,
        message: "Không thể xóa sản phẩm",
        error: "Failed to update product status"
      });
    }

    console.log(`✅ [Products API] Product deleted successfully: ${product.product_name || product.productName}`);
    
    res.json({
      success: true,
      message: "Đã xóa sản phẩm thành công",
      data: deletedProduct,
      deletedProduct: {
        _id: deletedProduct._id,
        product_name: deletedProduct.product_name || deletedProduct.productName,
        sku: deletedProduct.sku
      }
    });
  } catch (error) {
    console.error("❌ [Products API] Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa sản phẩm",
      error: error.message,
    });
  }
});

module.exports = router;
