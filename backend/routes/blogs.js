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

    // Log để debug
    // console.log(` [Blogs] Found ${blogs.length} active blogs`);

    res.json({
      success: true,
      data: blogs,
      count: blogs.length,
    });
  } catch (error) {
    // console.error(" [Blogs] Error fetching blogs:", error);
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
    const { id } = req.params;
    const blog = await Blog.findOne({ id: id, status: "Active" });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
      });
    }

    // Tăng views
    blog.views = (blog.views || 0) + 1;
    await blog.save();

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    // console.error(" [Blogs] Error fetching blog:", error);
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
