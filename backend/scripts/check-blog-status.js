const mongoose = require("mongoose");
const { MONGODB_URI } = require("../config/database");
const { Blog } = require("../db");

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB\n");

    // Tìm blog NS014
    const blog = await Blog.findOne({ id: "NS014" });
    
    if (!blog) {
      console.log("❌ Blog NS014 not found in database");
      process.exit(1);
    }

    console.log("📝 Blog NS014 found:");
    console.log(`   ID: ${blog.id}`);
    console.log(`   Title: ${blog.title}`);
    console.log(`   Status: ${blog.status || 'undefined'}`);
    console.log(`   Author: ${blog.author}`);
    console.log(`   PubDate: ${blog.pubDate}`);
    
    // Nếu status không phải "Active", cập nhật
    if (blog.status !== "Active") {
      console.log(`\n⚠️  Blog status is "${blog.status}", updating to "Active"...`);
      blog.status = "Active";
      await blog.save();
      console.log("✅ Blog status updated to 'Active'");
    } else {
      console.log("\n✅ Blog status is already 'Active'");
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });


