const express = require("express");
const router = express.Router();
const { Product } = require("../db");

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

module.exports = router;
