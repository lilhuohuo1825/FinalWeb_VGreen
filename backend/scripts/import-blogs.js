const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { MONGODB_URI } = require("../config/database");
const { Blog } = require("../db");

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    // console.log(" Connected to MongoDB");

    // Try to find blog.json file
    const possiblePaths = [
      path.join(__dirname, "../../data/blogs.json"), // Thêm đường dẫn chính xác
      path.join(__dirname, "../../my-user/public/data/blogs.json"),
      path.join(__dirname, "../../my-user/src/assets/data/blogs.json"),
      path.join(__dirname, "../data/blogs.json"),
      path.join(__dirname, "../../data/blogs/blogs.json"),
    ];

    let blogData = null;
    let blogFilePath = null;

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        blogFilePath = filePath;
        // console.log(` Found blog.json at: ${filePath}`);
        try {
          const fileContent = fs.readFileSync(filePath, "utf8");
          blogData = JSON.parse(fileContent);
          //   console.log(` Loaded ${blogData.length} blogs from JSON`);
        } catch (error) {
          //   console.error(` Error reading file: ${error.message}`);
          process.exit(1);
        }
        break;
      }
    }

    if (!blogData) {
      //   console.error(" Could not find blog.json file!");
      // console.log(" Searched in:");
      // possiblePaths.forEach((p) => console.log(`   - ${p}`));
      process.exit(1);
    }

    // Check if blogs already exist
    const existingCount = await Blog.countDocuments();
    if (existingCount > 0) {
      console.log(`\n Found ${existingCount} existing blogs in database.`);
      console.log(" To re-import, delete existing blogs first or use --force flag");
      
      // Kiểm tra xem blog NS014 có tồn tại không
      const blogNS014 = await Blog.findOne({ id: "NS014" });
      if (!blogNS014) {
        console.log(" Blog NS014 not found in database. Proceeding with import...");
        // Xóa tất cả blogs cũ để import lại
        await Blog.deleteMany({});
      } else {
        console.log(" Blog NS014 already exists. Exiting...");
        process.exit(0);
      }
    }

    // Import blogs
    console.log("\n Importing blogs...");
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
        console.log(`   Imported: ${blog.id} - ${blog.title}`);
      } catch (error) {
        errorCount++;
        console.error(`   Error importing "${blog.id} - ${blog.title}": ${error.message}`);
      }
    }

    console.log(`\n Import Summary:`);
    console.log(`    Success: ${successCount}`);
    console.log(`    Errors: ${errorCount}`);
    console.log(`    Total: ${blogData.length}`);

    process.exit(0);
  })
  .catch((err) => {
    // console.error(" Error:", err);
    process.exit(1);
  });
