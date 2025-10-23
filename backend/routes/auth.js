const express = require("express");
const bcrypt = require("bcrypt");
const { User, generateCustomerID } = require("../db");
const backupService = require("../services/backup.service");

const router = express.Router();

// Middleware validate dữ liệu đầu vào
const validateRegisterData = (req, res, next) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({
      error: "Thiếu thông tin bắt buộc: phoneNumber, password",
    });
  }

  if (phoneNumber.length < 10) {
    return res.status(400).json({
      error: "Số điện thoại phải có ít nhất 10 chữ số",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Mật khẩu phải có ít nhất 8 ký tự",
    });
  }

  next();
};

const validateLoginData = (req, res, next) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({
      error: "Thiếu thông tin: phoneNumber và password",
    });
  }

  next();
};

const validateUpdateData = (req, res, next) => {
  const { phoneNumber, income, fee } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      error: "Thiếu thông tin: phoneNumber",
    });
  }

  if (income !== undefined && (typeof income !== "number" || income < 0)) {
    return res.status(400).json({
      error: "Income phải là số dương",
    });
  }

  if (fee !== undefined && (typeof fee !== "number" || fee < 0)) {
    return res.status(400).json({
      error: "Fee phải là số dương",
    });
  }

  next();
};

const validateResetPasswordData = (req, res, next) => {
  const { phoneNumber, newPassword } = req.body;

  if (!phoneNumber || !newPassword) {
    return res.status(400).json({
      error: "Thiếu thông tin: phoneNumber và newPassword",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      error: "Mật khẩu mới phải có ít nhất 8 ký tự",
    });
  }

  next();
};

// API kiểm tra số điện thoại đã tồn tại (cho đăng ký)
router.post("/check-phone", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: "Số điện thoại không được để trống",
      });
    }

    const existingUser = await User.findOne({ Phone: phoneNumber });

    if (existingUser) {
      return res.status(400).json({
        error: "Số điện thoại đã được đăng ký",
      });
    }

    res.json({
      message: "Số điện thoại có thể sử dụng",
      available: true,
    });
  } catch (error) {
    console.error("❌ Lỗi kiểm tra số điện thoại:", error);
    res.status(500).json({
      error: "Lỗi server khi kiểm tra số điện thoại",
    });
  }
});

// API kiểm tra số điện thoại tồn tại (cho quên mật khẩu)
router.post("/check-phone-exists", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: "Số điện thoại không được để trống",
      });
    }

    console.log("🔍 Kiểm tra số điện thoại cho quên mật khẩu:", phoneNumber);

    const existingUser = await User.findOne({ Phone: phoneNumber });

    if (!existingUser) {
      return res.status(400).json({
        error: "Số điện thoại chưa được đăng ký",
      });
    }

    console.log("✅ Số điện thoại tồn tại:", {
      CustomerID: existingUser.CustomerID,
      Phone: existingUser.Phone,
      RegisterDate: existingUser.RegisterDate,
    });

    res.json({
      message: "Số điện thoại tồn tại",
      exists: true,
      user: {
        CustomerID: existingUser.CustomerID,
        Phone: existingUser.Phone,
        RegisterDate: existingUser.RegisterDate,
      },
    });
  } catch (error) {
    console.error("❌ Lỗi kiểm tra số điện thoại cho quên mật khẩu:", error);
    res.status(500).json({
      error: "Lỗi server khi kiểm tra số điện thoại",
    });
  }
});

// API đăng ký
router.post("/register", validateRegisterData, async (req, res) => {
  console.log("🚀 ===== API ĐĂNG KÝ ĐƯỢC GỌI =====");
  console.log("📅 Thời gian:", new Date().toISOString());
  console.log("📝 Request body:", req.body);

  try {
    const { phoneNumber, password } = req.body;
    console.log("📊 Dữ liệu nhận được:", {
      phoneNumber,
      password: "***", // Ẩn password trong log
    });

    // Kiểm tra xem số điện thoại đã tồn tại chưa
    const existingUser = await User.findOne({ Phone: phoneNumber });
    if (existingUser) {
      return res.status(400).json({
        error: "Số điện thoại đã được đăng ký",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Tạo CustomerID tự động (đảm bảo unique)
    let customerID;
    let isUnique = false;
    while (!isUnique) {
      customerID = generateCustomerID();
      const existingID = await User.findOne({ CustomerID: customerID });
      if (!existingID) {
        isUnique = true;
      }
    }

    // Tạo user mới (chỉ lưu các trường cần thiết)
    // Thời gian đăng ký theo GMT +7
    const registerDate = new Date();
    registerDate.setHours(registerDate.getHours() + 7); // GMT +7

    const newUser = new User({
      CustomerID: customerID,
      Phone: phoneNumber,
      Password: hashedPassword,
      RegisterDate: registerDate,
    });

    await newUser.save();

    // Backup vào file JSON
    const backupData = {
      CustomerID: newUser.CustomerID,
      FullName: "", // Để trống, sẽ cập nhật sau
      Phone: newUser.Phone,
      Email: "", // Để trống, sẽ cập nhật sau
      Address: "", // Để trống, sẽ cập nhật sau
      RegisterDate: newUser.RegisterDate,
      CustomerType: "Regular",
      Password: hashedPassword,
    };

    backupService.addUser(backupData);

    res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        CustomerID: newUser.CustomerID,
        Phone: newUser.Phone,
        RegisterDate: newUser.RegisterDate,
      },
    });
  } catch (error) {
    console.error("❌ Lỗi đăng ký:", error);
    console.error("📊 Chi tiết lỗi:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({
      error: "Lỗi server khi đăng ký",
    });
  }
});

// API đăng nhập
router.post("/login", validateLoginData, async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Tìm user theo số điện thoại
    const user = await User.findOne({ Phone: phoneNumber });
    if (!user) {
      return res.status(401).json({
        error: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Kiểm tra password
    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Trả về thông tin user (ẩn password)
    console.log("✅ Đăng nhập thành công!");
    console.log("📊 Thông tin user đăng nhập:", {
      CustomerID: user.CustomerID,
      Phone: user.Phone,
      RegisterDate: user.RegisterDate,
    });

    res.json({
      message: "Đăng nhập thành công",
      user: {
        CustomerID: user.CustomerID,
        Phone: user.Phone,
        RegisterDate: user.RegisterDate,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({
      error: "Lỗi server khi đăng nhập",
    });
  }
});

// API cập nhật thông tin
router.put("/user/update", validateUpdateData, async (req, res) => {
  try {
    const { phoneNumber, income, fee } = req.body;

    // Tìm user theo số điện thoại
    const user = await User.findOne({ Phone: phoneNumber });
    if (!user) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }

    // Cập nhật thông tin
    const updateData = {};
    if (income !== undefined) updateData.Income = income;
    if (fee !== undefined) updateData.Fee = fee;

    console.log("💾 Đang cập nhật thông tin trong MongoDB...");
    const updatedUser = await User.findOneAndUpdate(
      { Phone: phoneNumber },
      updateData,
      {
        new: true,
      }
    );
    console.log("✅ Thông tin đã được cập nhật thành công trong MongoDB!");
    console.log("📊 Thông tin user đã cập nhật:", {
      CustomerID: updatedUser.CustomerID,
      Phone: updatedUser.Phone,
      Income: updatedUser.Income,
      Fee: updatedUser.Fee,
      RegisterDate: updatedUser.RegisterDate,
    });

    res.json({
      message: "Cập nhật thành công",
    });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({
      error: "Lỗi server khi cập nhật",
    });
  }
});

// API quên mật khẩu
router.post("/reset-password", validateResetPasswordData, async (req, res) => {
  console.log("🔑 ===== API RESET PASSWORD ĐƯỢC GỌI =====");
  console.log("📅 Thời gian:", new Date().toISOString());
  console.log("📝 Request body:", req.body);

  try {
    const { phoneNumber, newPassword } = req.body;
    console.log("📊 Dữ liệu nhận được:", { phoneNumber });

    // Tìm user theo số điện thoại
    const user = await User.findOne({ Phone: phoneNumber });
    if (!user) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }

    // Hash mật khẩu mới
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Cập nhật mật khẩu với version tracking
    console.log("💾 Đang cập nhật mật khẩu trong MongoDB...");
    console.log("📊 Password version hiện tại:", user.PasswordVersion);

    // Thời gian reset theo GMT +7 (Việt Nam)
    const resetDate = new Date();
    resetDate.setHours(resetDate.getHours() + 7); // GMT +7

    const updatedUser = await User.findOneAndUpdate(
      { Phone: phoneNumber },
      {
        Password: hashedPassword,
        PasswordVersion: user.PasswordVersion + 1, // Tăng version
        LastPasswordReset: resetDate, // Cập nhật thời gian reset theo GMT +7
      },
      { new: true }
    );

    console.log("✅ Mật khẩu đã được cập nhật thành công trong MongoDB!");
    console.log("📊 Thông tin user đã cập nhật:", {
      CustomerID: updatedUser.CustomerID,
      Phone: updatedUser.Phone,
      RegisterDate: updatedUser.RegisterDate,
      PasswordVersion: updatedUser.PasswordVersion,
      LastPasswordReset: updatedUser.LastPasswordReset,
    });

    // Backup vào file JSON
    console.log("💾 Đang backup cập nhật mật khẩu vào file JSON...");
    const backupResult = backupService.updateUser(phoneNumber, {
      Password: hashedPassword,
      PasswordVersion: updatedUser.PasswordVersion,
      LastPasswordReset: resetDate, // Sử dụng thời gian GMT +7 đã tính toán
    });
    if (backupResult) {
      console.log("✅ Backup cập nhật mật khẩu vào file JSON thành công!");
    } else {
      console.log("⚠️ Backup cập nhật mật khẩu vào file JSON thất bại!");
    }

    res.json({
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.error("Lỗi reset password:", error);
    res.status(500).json({
      error: "Lỗi server khi đặt lại mật khẩu",
    });
  }
});

// API xem thông tin password version của user
router.get("/password-info/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    console.log("🔍 Kiểm tra thông tin password version:", phoneNumber);

    const user = await User.findOne({ Phone: phoneNumber });
    if (!user) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }

    res.json({
      CustomerID: user.CustomerID,
      Phone: user.Phone,
      PasswordVersion: user.PasswordVersion,
      LastPasswordReset: user.LastPasswordReset,
      RegisterDate: user.RegisterDate,
    });
  } catch (error) {
    console.error("❌ Lỗi lấy thông tin password:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thông tin password",
    });
  }
});

module.exports = router;
