const express = require("express");
const router = express.Router();
const { Blog } = require("../db");

// GET /api/blogs - Lấy tất cả blogs (đã publish)
router.get("/", async (req, res) => {
  try {
    // Query: lấy blogs có status "Active" hoặc không có status (fallback cho dữ liệu cũ)
    const blogs = await Blog.find({
      $or: [
        { status: "Active" },
        { status: { $exists: false } },
        { status: null },
        { status: "" },
      ],
    })
      .sort({ pubDate: -1 }) // Mới nhất lên đầu
      .select(
        "id img title excerpt pubDate author categoryTag content status views createdAt updatedAt"
      );

    // Normalize blog IDs: trim và loại bỏ dấu phẩy thừa
    const normalizedBlogs = blogs.map(blog => {
      const blogObj = blog.toObject();
      // Normalize ID: trim và loại bỏ dấu phẩy ở cuối
      if (blogObj.id && typeof blogObj.id === 'string') {
        blogObj.id = blogObj.id.trim().replace(/,$/, '').trim();
      }
      return blogObj;
    });

    // Log để debug
    // console.log(` [Blogs] Found ${normalizedBlogs.length} active blogs`);

    res.json({
      success: true,
      data: normalizedBlogs, // Trả về blogs với ID đã normalize
      count: normalizedBlogs.length,
    });
  } catch (error) {
    console.error(" [Blogs] Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách blog",
      error: error.message,
    });
  }
});

// GET /api/blogs/:id - Lấy blog theo ID
router.get("/:id", async (req, res) => {
  try {
    let { id } = req.params;
    // Trim ID để loại bỏ khoảng trắng và dấu phẩy thừa
    id = id.trim().replace(/,$/, '').trim();
    console.log(` [Blogs] Fetching blog with ID: "${id}"`);
    
    // Tạo regex để tìm ID với hoặc không có dấu phẩy ở cuối
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const idRegex = new RegExp(`^${escapedId},?$`);
    
    // Tìm blog với ID đã trim, và cả với các biến thể có dấu phẩy/khoảng trắng
    // Thử tìm với điều kiện status "Active" hoặc không có status trước
    let blog = await Blog.findOne({
      $and: [
        {
          $or: [
            { id: id }, // Exact match với ID đã trim
            { id: id + ',' }, // ID với dấu phẩy ở cuối
            { id: { $regex: idRegex } }, // Regex match (id hoặc id,)
          ]
        },
        {
          $or: [
            { status: "Active" },
            { status: { $exists: false } },
            { status: null },
            { status: "" },
          ]
        }
      ]
    });

    // Nếu không tìm thấy với điều kiện status, thử tìm không có điều kiện status
    if (!blog) {
      blog = await Blog.findOne({
        $or: [
          { id: id },
          { id: id + ',' },
          { id: { $regex: idRegex } },
        ],
      });
    }

    if (!blog) {
      console.log(` [Blogs] Blog with ID "${id}" not found`);
      // Debug: Liệt kê tất cả IDs có trong database
      const allBlogs = await Blog.find({}).select('id title status').limit(10);
      console.log(` [Blogs] Sample blog IDs in database:`, allBlogs.map(b => ({ id: `"${b.id}"`, title: b.title, status: b.status })));
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
      });
    }

    console.log(` [Blogs] Found blog: ${blog.title} (id: "${blog.id}", status: ${blog.status || 'undefined'})`);

    // Normalize blog ID: trim và loại bỏ dấu phẩy thừa (nếu có)
    // Nhưng không lưu vào database ngay, chỉ trả về ID đã normalize
    const normalizedBlog = blog.toObject();
    normalizedBlog.id = normalizedBlog.id.trim().replace(/,$/, '').trim();

    // Tăng views
    blog.views = (blog.views || 0) + 1;
    await blog.save();

    res.json({
      success: true,
      data: normalizedBlog, // Trả về blog với ID đã normalize
    });
  } catch (error) {
    console.error(" [Blogs] Error fetching blog:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy bài viết",
      error: error.message,
    });
  }
});

// GET /api/blogs/featured - Lấy bài viết nổi bật (mới nhất)
router.get("/featured/latest", async (req, res) => {
  try {
    const blog = await Blog.findOne({ status: "Active" })
      .sort({ pubDate: -1 })
      .select("id img title excerpt pubDate author categoryTag content");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết nổi bật",
      });
    }

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    // console.error(" [Blogs] Error fetching featured blog:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy bài viết nổi bật",
      error: error.message,
    });
  }
});

// GET /api/blogs/category/:category - Lấy blogs theo category
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const blogs = await Blog.find({
      categoryTag: category,
      status: "Active",
    })
      .sort({ pubDate: -1 })
      .select("id img title excerpt pubDate author categoryTag content");

    res.json({
      success: true,
      data: blogs,
      count: blogs.length,
    });
  } catch (error) {
    console.error("  Error fetching blogs by category:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách blog theo category",
      error: error.message,
    });
  }
});

// GET /api/blogs/search?q=keyword - Tìm kiếm blogs
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Từ khóa tìm kiếm không được để trống",
      });
    }

    const searchRegex = new RegExp(q.trim(), "i");
    const blogs = await Blog.find({
      status: "Active",
      $or: [
        { title: searchRegex },
        { excerpt: searchRegex },
        { author: searchRegex },
        { content: searchRegex },
      ],
    })
      .sort({ pubDate: -1 })
      .select("id img title excerpt pubDate author categoryTag content");

    res.json({
      success: true,
      data: blogs,
      count: blogs.length,
    });
  } catch (error) {
    // console.error(" [Blogs] Error searching blogs:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm blog",
      error: error.message,
    });
  }
});

// POST /api/blogs - Tạo blog mới (cho admin)
router.post("/", async (req, res) => {
  try {
    const newBlog = new Blog(req.body);
    await newBlog.save();

    res.status(201).json({
      success: true,
      message: "Tạo bài viết thành công",
      data: newBlog,
    });
  } catch (error) {
    // console.error(" [Blogs] Error creating blog:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo bài viết",
      error: error.message,
    });
  }
});

// PUT /api/blogs/:id - Cập nhật blog
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBlog = await Blog.findOneAndUpdate(
      { id: id },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật bài viết thành công",
      data: updatedBlog,
    });
  } catch (error) {
    // console.error(" [Blogs] Error updating blog:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật bài viết",
      error: error.message,
    });
  }
});

// DELETE /api/blogs/:id - Xóa blog
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBlog = await Blog.findOneAndDelete({ id: id });

    if (!deletedBlog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
      });
    }

    res.json({
      success: true,
      message: "Xóa bài viết thành công",
      data: deletedBlog,
    });
  } catch (error) {
    // console.error(" [Blogs] Error deleting blog:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa bài viết",
      error: error.message,
    });
  }
});

module.exports = router;
