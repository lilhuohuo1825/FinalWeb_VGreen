// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const { sendOTPEmail, generateOTP } = require('./email-service');
// Import từ file sync tổng hợp (gộp tất cả collections)
const {
  syncUsersToJsonAsync,
  syncUsersToJson,
  syncProductsToJsonAsync,
  syncProductsToJson,
  syncBlogsToJsonAsync,
  syncBlogsToJson,
  syncAllCollectionsToJsonAsync,
  syncAllCollectionsToJson
} = require('./services/sync-collections.service');
const { connectDB, Order, generateOrderID, Promotion, PromotionUsage } = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection string - Thay đổi theo cấu hình của bạn
const MONGODB_URI = 'mongodb://localhost:27017'; // Hoặc MongoDB Atlas URI
const DB_NAME = 'vgreen'; // Changed to lowercase to match MongoDB case-sensitivity

let db;
let mongoClient;
let usersCollection;
let adminsCollection;
let ordersCollection;
let productsCollection;
let promotionsCollection;
let orderDetailsCollection;
let provincesCollection;
let wardsCollection;
let treeCollection;
let blogsCollection;
let promotionTargetsCollection;
let notificationsCollection;
let isMongoConnected = false;

// Middleware để kiểm tra MongoDB connection
const checkMongoConnection = (req, res, next) => {
  if (!isMongoConnected || !db) {
    console.error('❌ MongoDB not connected');
    console.error('   isMongoConnected:', isMongoConnected);
    console.error('   db:', db ? 'exists' : 'null');
    return res.status(503).json({ 
      error: 'Lỗi kết nối MongoDB!',
      details: 'MongoDB connection not established',
      checklist: [
        'Backend đang chạy tại http://localhost:3000',
        'MongoDB đang chạy',
        'Database "vgreen" tồn tại',
        'Collection "users" có dữ liệu'
      ]
    });
  }
  
  // Check if required collections exist
  if (!usersCollection || !adminsCollection) {
    console.error('❌ Collections not initialized');
    console.error('   usersCollection:', usersCollection ? 'exists' : 'null');
    console.error('   adminsCollection:', adminsCollection ? 'exists' : 'null');
    return res.status(503).json({ 
      error: 'Database chưa sẵn sàng. Vui lòng thử lại sau.',
      details: 'Collections not initialized'
    });
  }
  
  next();
};

// Connect to MongoDB
// First connect Mongoose (for Order, Promotion models)
console.log('\n🔗 Attempting to connect to MongoDB...');
console.log('🔗 Step 1: Connecting Mongoose...');
connectDB().then(() => {
  console.log('✅ Mongoose connected successfully!');
  
  // Then connect native MongoDB client
  console.log('🔗 Step 2: Connecting MongoDB Native Client...');
  console.log(`   URI: ${MONGODB_URI}`);
  console.log(`   Database: ${DB_NAME}\n`);
  
  return MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });
})
.then(client => {
  console.log('✅ Connected to MongoDB successfully!');
  mongoClient = client;
  db = client.db(DB_NAME);
  
  console.log(`✅ Database "${DB_NAME}" accessed`);
  
  // Get collections
  usersCollection = db.collection('users');
  adminsCollection = db.collection('admins');
  ordersCollection = db.collection('orders');
  productsCollection = db.collection('products');
  promotionsCollection = db.collection('promotions');
  orderDetailsCollection = db.collection('orderdetails');
  provincesCollection = db.collection('provinces');
  wardsCollection = db.collection('wards');
  treeCollection = db.collection('tree');
  blogsCollection = db.collection('blogs');
  promotionTargetsCollection = db.collection('promotion_target');
  notificationsCollection = db.collection('notifications');
  
  isMongoConnected = true;
  
  console.log('✅ Collections initialized:');
  console.log('   - users');
  console.log('   - admins');
  console.log('   - orders');
  console.log('   - products');
  console.log('   - promotions');
  console.log('   - orderdetails');
  console.log('   - provinces');
  console.log('   - wards');
  console.log('   - tree');
  console.log('   - blogs');
  console.log('   - promotion_targets');
  console.log('   - notifications');
  
  // Verify collections have data
  Promise.all([
    usersCollection.countDocuments(),
    adminsCollection.countDocuments(),
    ordersCollection.countDocuments()
  ]).then(counts => {
    console.log('\n📊 Collection document counts:');
    console.log(`   - users: ${counts[0]} documents`);
    console.log(`   - admins: ${counts[1]} documents`);
    console.log(`   - orders: ${counts[2]} documents`);
    
    if (counts[0] === 0) {
      console.log('⚠️  WARNING: users collection is empty!');
      console.log('   Run: cd backend && ./import-data.sh');
    } else {
      // Tự động đồng bộ tất cả collections khi server khởi động
      console.log('\n🔄 Đang đồng bộ tất cả collections từ MongoDB về JSON...');
      syncAllCollectionsToJsonAsync(db, {
        usersCollection: usersCollection,
        productsCollection: productsCollection,
        blogsCollection: blogsCollection
      });
    }
  }).catch(err => {
    console.log('⚠️  Could not count documents:', err.message);
  });
  
  console.log('\n✅ MongoDB ready for API requests!\n');
})
.catch(error => {
  console.error('\n❌ MongoDB connection failed!');
  console.error('   Error:', error.message);
  console.error('\n📝 Troubleshooting checklist:');
  console.error('   1. Is MongoDB running?');
  console.error('      → Check: brew services list | grep mongodb');
  console.error('      → Start: brew services start mongodb-community');
  console.error('   2. Is MongoDB accessible at mongodb://localhost:27017?');
  console.error('      → Test: mongosh --eval "db.version()"');
  console.error('   3. Does database "vgreen" exist?');
  console.error('      → Check in MongoDB Compass');
  console.error('   4. Do collections have data?');
  console.error('      → Import data: cd backend && ./import-data.sh\n');
  
  isMongoConnected = false;
  // Không exit process, để server vẫn chạy và có thể retry
  console.error('⚠️  Server will continue but API endpoints will return 503 errors\n');
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

/**
 * POST check phone number exists (for login/forgot password)
 * Kiểm tra số điện thoại có tồn tại trong hệ thống không
 */
app.post('/api/auth/check-phone-exists', checkMongoConnection, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      return res.status(400).json({ 
        error: 'Vui lòng nhập số điện thoại',
        message: 'Phone number is required'
      });
    }
    
    const phone = phoneNumber.trim();
    
    // Validate phone format (10-11 digits)
    if (!/^[0-9]{10,11}$/.test(phone)) {
      return res.status(400).json({ 
        error: 'Số điện thoại không hợp lệ',
        message: 'Invalid phone number format'
      });
    }
    
    console.log(`[Auth] Checking if phone number exists: ${phone}`);
    
    // Check if phone number exists in users collection
    const existingUser = await usersCollection.findOne({ 
      Phone: phone 
    });
    
    if (!existingUser) {
      console.log(`[Auth] Phone number not found: ${phone}`);
      return res.status(404).json({ 
        error: 'Số điện thoại chưa được đăng ký',
        message: 'Phone number not registered',
        exists: false
      });
    }
    
    console.log(`[Auth] Phone number exists: ${phone}`);
    res.json({ 
      success: true,
      message: 'Số điện thoại đã được đăng ký',
      exists: true,
      user: {
        CustomerID: existingUser.CustomerID,
        FullName: existingUser.FullName || '',
        Phone: existingUser.Phone
      }
    });
    
  } catch (error) {
    console.error('[Auth] Error checking phone exists:', error);
    res.status(500).json({ 
      error: 'Lỗi kiểm tra số điện thoại',
      message: error.message 
    });
  }
});

/**
 * POST check phone number availability for registration
 * Kiểm tra số điện thoại có thể dùng để đăng ký không (chưa tồn tại)
 */
app.post('/api/auth/check-phone', checkMongoConnection, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      return res.status(400).json({ 
        error: 'Vui lòng nhập số điện thoại',
        message: 'Phone number is required'
      });
    }
    
    const phone = phoneNumber.trim();
    
    // Validate phone format (10-11 digits)
    if (!/^[0-9]{10,11}$/.test(phone)) {
      return res.status(400).json({ 
        error: 'Số điện thoại không hợp lệ',
        message: 'Invalid phone number format'
      });
    }
    
    console.log(`[Auth] Checking phone number availability: ${phone}`);
    
    // Check if phone number already exists in users collection
    const existingUser = await usersCollection.findOne({ 
      Phone: phone 
    });
    
    if (existingUser) {
      console.log(`[Auth] Phone number already exists: ${phone}`);
      return res.status(400).json({ 
        error: 'Số điện thoại đã được đăng ký',
        message: 'Phone number already registered'
      });
    }
    
    console.log(`[Auth] Phone number is available: ${phone}`);
    res.json({ 
      success: true,
      message: 'Số điện thoại có thể sử dụng',
      available: true
    });
    
  } catch (error) {
    console.error('[Auth] Error checking phone:', error);
    res.status(500).json({ 
      error: 'Lỗi kiểm tra số điện thoại',
      message: error.message 
    });
  }
});

/**
 * POST user login (phone number or email)
 * Hỗ trợ đăng nhập bằng số điện thoại hoặc email cho user (không phải admin)
 */
app.post('/api/auth/login', checkMongoConnection, async (req, res) => {
  try {
    const { phoneNumber, password, email } = req.body;
    
    // Nếu có email, đây là admin login
    if (email) {
      console.log('\n🔐 === ADMIN LOGIN REQUEST ===');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password ? '***' : 'empty'}`);
      
      // Bước 1: Tìm trong collection admins
      console.log('🔍 Step 1: Searching in admins collection...');
      let admin = await adminsCollection.findOne({ email: email });
      
      if (admin) {
        console.log('✅ Admin found in admins collection!');
        console.log(`   - ID: ${admin.id}`);
        console.log(`   - Name: ${admin.name}`);
        console.log(`   - Email: ${admin.email}`);
        
        // Kiểm tra password
        if (admin.password !== password) {
          console.log('❌ Invalid password for admin');
          return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }
        
        console.log('✅ Password verified!');
        
        // Tạo token
        const token = 'admin_token_' + Date.now() + '_' + admin.id;
        
        // Trả về thông tin admin
        const adminResponse = {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role || 'admin'
        };
        
        console.log('✅ Login successful!');
        console.log('======================\n');
        
        return res.json({
          token: token,
          user: adminResponse
        });
      }
      
      // Bước 2: Nếu không tìm thấy trong admins, tìm trong users với role admin
      console.log('⚠️  Admin not found in admins collection');
      console.log('🔍 Step 2: Searching in users collection with role=admin...');
      
      const user = await usersCollection.findOne({ 
        email: email,
        role: 'admin'
      });
      
      if (!user) {
        console.log('❌ Admin not found in any collection');
        console.log('======================\n');
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
      }
      
      console.log('✅ Admin found in users collection!');
      console.log(`   - ID: ${user.user_id}`);
      console.log(`   - Name: ${user.name}`);
      
      // Kiểm tra password
      if (user.password !== password) {
        console.log('❌ Invalid password');
        console.log('======================\n');
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
      }
      
      console.log('✅ Password verified!');
      
      // Tạo token
      const token = 'admin_token_' + Date.now() + '_' + user.user_id;
      
      // Trả về thông tin user
      const userResponse = {
        id: user.user_id,
        email: user.email,
        name: user.name,
        role: user.role
      };
      
      console.log('✅ Login successful!');
      console.log('======================\n');
      
      return res.json({
        token: token,
        user: userResponse
      });
    }
    
    // Nếu có phoneNumber, đây là user login (không phải admin)
    if (phoneNumber) {
      console.log('\n🔐 === USER LOGIN REQUEST ===');
      console.log(`📱 Phone: ${phoneNumber}`);
      console.log(`🔑 Password: ${password ? '***' : 'empty'}`);
      
      if (!password) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu' });
      }
      
      // Tìm user theo số điện thoại
      const user = await usersCollection.findOne({ 
        Phone: phoneNumber.trim()
      });
      
      if (!user) {
        console.log('❌ User not found');
        console.log('======================\n');
        return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký' });
      }
      
      console.log('✅ User found!');
      console.log(`   - CustomerID: ${user.CustomerID}`);
      console.log(`   - FullName: ${user.FullName || 'N/A'}`);
      
      // Kiểm tra password
      // Note: Password có thể được hash bằng bcrypt hoặc lưu plain text
      // Tạm thời so sánh trực tiếp, nếu cần có thể upgrade sau
      let passwordMatch = false;
      
      // Check if password is hashed (bcrypt starts with $2b$)
      if (user.Password && user.Password.startsWith('$2b$')) {
        // Password is hashed - cần dùng bcrypt.compare (sẽ implement sau)
        // Tạm thời return error để user biết cần hash password
        console.log('⚠️  Password is hashed, need bcrypt.compare');
        return res.status(401).json({ error: 'Mật khẩu không chính xác' });
      } else {
        // Password is plain text - so sánh trực tiếp
        passwordMatch = user.Password === password;
      }
      
      if (!passwordMatch) {
        console.log('❌ Invalid password');
        console.log('======================\n');
        return res.status(401).json({ error: 'Mật khẩu không chính xác' });
      }
      
      console.log('✅ Password verified!');
      
      // Tạo token
      const token = 'user_token_' + Date.now() + '_' + user.CustomerID;
      
      // Trả về thông tin user
      const userResponse = {
        CustomerID: user.CustomerID,
        Phone: user.Phone,
        FullName: user.FullName || '',
        Email: user.Email || '',
        Address: user.Address || '',
        RegisterDate: user.RegisterDate || new Date(),
        CustomerType: user.CustomerType || '',
        CustomerTiering: user.CustomerTiering || 'Đồng'
      };
      
      console.log('✅ Login successful!');
      console.log('======================\n');
      
      return res.json({
        token: token,
        user: userResponse,
        message: 'Đăng nhập thành công'
      });
    }
    
    // Không có email hoặc phoneNumber
    return res.status(400).json({ 
      error: 'Vui lòng nhập email hoặc số điện thoại',
      message: 'Email or phone number is required'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    console.log('======================\n');
    res.status(500).json({ error: 'Lỗi đăng nhập', message: error.message });
  }
});

/**
 * PUT update user information by CustomerID
 * Cập nhật thông tin user theo CustomerID (cho frontend my-user)
 */
app.put('/api/auth/user/update', checkMongoConnection, async (req, res) => {
  try {
    const { customerID, fullName, email, birthDay, gender, address } = req.body;
    
    console.log('\n📝 === UPDATE USER INFO REQUEST ===');
    console.log(`📱 CustomerID: ${customerID}`);
    console.log(`👤 FullName: ${fullName || 'N/A'}`);
    console.log(`📧 Email: ${email || 'N/A'}`);
    console.log(`🎂 BirthDay: ${birthDay || 'N/A'}`);
    console.log(`⚧️ Gender: ${gender || 'N/A'}`);
    console.log(`📍 Address: ${address || 'N/A'}`);
    
    // Validate CustomerID
    if (!customerID) {
      return res.status(400).json({ 
        error: 'CustomerID là bắt buộc',
        message: 'CustomerID is required'
      });
    }
    
    // Build update object
    const updateData = {};
    
    if (fullName !== undefined) {
      updateData.FullName = fullName; // Có thể là null để xóa
    }
    if (email !== undefined && email) {
      updateData.Email = email.trim();
    }
    if (birthDay !== undefined) {
      updateData.BirthDay = birthDay;
    }
    if (gender !== undefined) {
      updateData.Gender = gender;
    }
    if (address !== undefined) {
      updateData.Address = address;
    }
    
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();
    
    console.log('📋 Update data:', updateData);
    
    // Update user in MongoDB
    const result = await usersCollection.updateOne(
      { CustomerID: customerID },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      console.log(`❌ User not found with CustomerID: ${customerID}`);
      return res.status(404).json({ 
        error: 'Không tìm thấy người dùng',
        message: 'User not found'
      });
    }
    
    // Get updated user data
    const updatedUser = await usersCollection.findOne({ CustomerID: customerID });
    
    if (!updatedUser) {
      return res.status(500).json({ 
        error: 'Lỗi khi lấy thông tin người dùng sau khi cập nhật',
        message: 'Error fetching updated user'
      });
    }
    
    console.log('✅ User updated successfully!');
    console.log('======================\n');
    
    // Return updated user data
    const userResponse = {
      CustomerID: updatedUser.CustomerID,
      Phone: updatedUser.Phone,
      FullName: updatedUser.FullName || null,
      Email: updatedUser.Email || null,
      Address: updatedUser.Address || null,
      BirthDay: updatedUser.BirthDay || null,
      Gender: updatedUser.Gender || null,
      RegisterDate: updatedUser.RegisterDate,
      CustomerType: updatedUser.CustomerType || '',
      CustomerTiering: updatedUser.CustomerTiering || 'Đồng'
    };
    
    // Tự động đồng bộ users về JSON sau khi cập nhật
    syncUsersToJsonAsync(usersCollection);
    
    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: userResponse
    });
    
  } catch (error) {
    console.error('❌ Error updating user info:', error);
    console.log('======================\n');
    res.status(500).json({ 
      error: 'Lỗi cập nhật thông tin',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST user registration
 * Đăng ký tài khoản mới cho user
 */
app.post('/api/auth/register', checkMongoConnection, async (req, res) => {
  try {
    const { phoneNumber, password, fullName, email, address } = req.body;
    
    console.log('\n📝 === REGISTRATION REQUEST ===');
    console.log(`📱 Phone: ${phoneNumber}`);
    console.log(`👤 FullName: ${fullName || 'N/A'}`);
    
    // Validate required fields
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      return res.status(400).json({ 
        error: 'Vui lòng nhập số điện thoại',
        message: 'Phone number is required'
      });
    }
    
    if (!password || typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ 
        error: 'Vui lòng nhập mật khẩu',
        message: 'Password is required'
      });
    }
    
    const phone = phoneNumber.trim();
    
    // Validate phone format
    if (!/^[0-9]{10,11}$/.test(phone)) {
      return res.status(400).json({ 
        error: 'Số điện thoại không hợp lệ',
        message: 'Invalid phone number format'
      });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Mật khẩu phải có ít nhất 6 ký tự',
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Check if phone number already exists
    const existingUser = await usersCollection.findOne({ Phone: phone });
    
    if (existingUser) {
      console.log(`❌ Phone number already exists: ${phone}`);
      return res.status(400).json({ 
        error: 'Số điện thoại đã được đăng ký',
        message: 'Phone number already registered'
      });
    }
    
    // Generate CustomerID (format: auto-increment based on existing users)
    const userCount = await usersCollection.countDocuments();
    const customerID = `CUS${String(userCount + 1).padStart(6, '0')}`;
    
    console.log(`📋 Generated CustomerID: ${customerID}`);
    
    // Create new user document
    const newUser = {
      CustomerID: customerID,
      Phone: phone,
      Password: password, // Note: In production, should hash password with bcrypt
      FullName: fullName || '',
      Email: email || '',
      Address: address || '',
      RegisterDate: new Date(),
      CustomerType: '',
      CustomerTiering: 'Đồng',
      TotalSpent: 0,
      PasswordVersion: 1,
      LastPasswordReset: null
    };
    
    // Insert user into database
    const result = await usersCollection.insertOne(newUser);
    
    console.log(`✅ User registered successfully!`);
    console.log(`   - CustomerID: ${customerID}`);
    console.log(`   - Phone: ${phone}`);
    console.log(`   - FullName: ${fullName || 'N/A'}`);
    console.log('====================================\n');
    
    // Create token for auto-login
    const token = 'user_token_' + Date.now() + '_' + customerID;
    
    // Return user data
    const userResponse = {
      CustomerID: customerID,
      Phone: phone,
      FullName: fullName || '',
      Email: email || '',
      Address: address || '',
      RegisterDate: newUser.RegisterDate,
      CustomerType: '',
      CustomerTiering: 'Đồng'
    };
    
    // Tự động đồng bộ users về JSON sau khi đăng ký
    syncUsersToJsonAsync(usersCollection);
    
    res.json({
      success: true,
      message: 'Đăng ký thành công',
      token: token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.log('====================================\n');
    res.status(500).json({ 
      error: 'Lỗi đăng ký',
      message: error.message 
    });
  }
});

/**
 * POST request password reset
 * Gửi OTP qua email thật sử dụng Gmail: vgreenhotro@gmail.com
 */
app.post('/api/auth/forgot-password', checkMongoConnection, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate input
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ 
        error: 'Vui lòng nhập địa chỉ email hợp lệ' 
      });
    }
    
    const emailLower = email.toLowerCase().trim();
    
    console.log('\n🔐 === FORGOT PASSWORD REQUEST ===');
    console.log(`📧 Email: ${emailLower}`);
    
    // Bước 1: Tìm admin trong collection admins
    console.log('🔍 Searching for admin in admins collection...');
    let admin = await adminsCollection.findOne({ email: emailLower });
    
    if (!admin) {
      console.log('⚠️  Admin not found in admins collection, checking users...');
      // Bước 2: Tìm trong users với role admin
      admin = await usersCollection.findOne({ 
        email: emailLower,
        role: 'admin'
      });
    }
    
    if (!admin) {
      console.log('❌ Admin not found in any collection');
      console.log('====================================\n');
      return res.status(404).json({ 
        success: false,
        error: 'Email không tồn tại trong hệ thống' 
      });
    }
    
    console.log('✅ Admin found!');
    console.log(`   Name: ${admin.name || 'N/A'}`);
    console.log(`   Email: ${admin.email}`);
    
    // Bước 3: Tạo OTP ngẫu nhiên
    const otp = generateOTP();
    console.log(`🔑 OTP generated: ${otp}`);
    
    // Bước 4: Lưu OTP vào database
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    
    let collectionToUpdate;
    // Lưu vào collection tương ứng
    if (await adminsCollection.findOne({ email: emailLower })) {
      collectionToUpdate = adminsCollection;
    } else {
      collectionToUpdate = usersCollection;
    }
    
    const updateResult = await collectionToUpdate.updateOne(
      { email: emailLower },
      { 
        $set: { 
          reset_otp: otp,
          reset_otp_expires: otpExpiry,
          updated_at: new Date()
        }
      }
    );
    
    if (updateResult.matchedCount === 0) {
      console.log('❌ Failed to update OTP in database');
      return res.status(500).json({ 
        success: false,
        error: 'Không thể lưu mã OTP. Vui lòng thử lại.' 
      });
    }
    
    console.log('✅ OTP saved to database');
    console.log(`   Expires at: ${otpExpiry.toLocaleString('vi-VN')}`);
    
    // Bước 5: GỬI OTP QUA EMAIL
    console.log('📧 Sending OTP via email...');
    const emailResult = await sendOTPEmail(emailLower, admin.name || 'Quản trị viên', otp);
    
    if (!emailResult.success) {
      console.log('❌ Failed to send email');
      console.log(`   Error: ${emailResult.error}`);
      console.log('====================================\n');
      return res.status(500).json({ 
        success: false,
        error: 'Không thể gửi email. Vui lòng thử lại sau.',
        details: emailResult.error
      });
    }
    
    console.log('✅ OTP email sent successfully!');
    console.log('====================================\n');
    
    res.json({ 
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
      email: emailLower
    });
    
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    console.error('   Stack:', error.stack);
    console.log('====================================\n');
    
    // Provide more specific error messages
    if (error.code === 'ECONNREFUSED' || error.message.includes('connect')) {
      return res.status(503).json({ 
        success: false,
        error: 'Không thể kết nối với database. Vui lòng thử lại sau.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Lỗi xử lý yêu cầu. Vui lòng thử lại sau.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST verify OTP
 * Xác thực mã OTP trước khi cho phép đặt lại mật khẩu
 */
app.post('/api/auth/verify-otp', checkMongoConnection, async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log('\n🔍 === VERIFY OTP REQUEST ===');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 OTP: ${otp}`);
    
    // Tìm admin với OTP
    let admin = await adminsCollection.findOne({ 
      email: email,
      reset_otp: otp
    });
    
    if (!admin) {
      console.log('⚠️  Not found in admins, checking users...');
      admin = await usersCollection.findOne({ 
        email: email,
        reset_otp: otp
      });
    }
    
    if (!admin) {
      console.log('❌ OTP không đúng');
      console.log('===========================\n');
      return res.status(400).json({ 
        success: false,
        error: 'Mã OTP không đúng. Vui lòng kiểm tra lại.' 
      });
    }
    
    // Kiểm tra OTP còn hạn không
    if (admin.reset_otp_expires && new Date() > new Date(admin.reset_otp_expires)) {
      console.log('❌ OTP đã hết hạn');
      console.log(`   Expired at: ${new Date(admin.reset_otp_expires).toLocaleString('vi-VN')}`);
      console.log('===========================\n');
      return res.status(400).json({ 
        success: false,
        error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' 
      });
    }
    
    console.log('✅ OTP hợp lệ!');
    console.log('===========================\n');
    
    res.json({ 
      success: true,
      message: 'Mã OTP hợp lệ. Bạn có thể đặt mật khẩu mới.',
      email: email
    });
    
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    console.log('===========================\n');
    res.status(500).json({ 
      success: false,
      error: 'Lỗi xử lý yêu cầu' 
    });
  }
});

/**
 * POST reset password
 * Đặt lại mật khẩu sau khi verify OTP
 */
app.post('/api/auth/reset-password', checkMongoConnection, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    console.log('\n🔐 === RESET PASSWORD REQUEST ===');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 OTP: ${otp}`);
    
    // Bước 1: Tìm admin trong collection admins
    console.log('🔍 Searching for admin with OTP...');
    let admin = await adminsCollection.findOne({ 
      email: email,
      reset_otp: otp
    });
    
    let collection = adminsCollection;
    
    if (!admin) {
      console.log('⚠️  Not found in admins, checking users...');
      // Bước 2: Tìm trong users
      admin = await usersCollection.findOne({ 
        email: email,
        reset_otp: otp
      });
      collection = usersCollection;
    }
    
    if (!admin) {
      console.log('❌ Admin not found or OTP incorrect');
      console.log('===================================\n');
      return res.status(400).json({ error: 'Mã OTP không đúng' });
    }
    
    console.log('✅ Admin found with matching OTP!');
    
    // Bước 3: Kiểm tra OTP còn hạn không
    if (admin.reset_otp_expires && new Date() > new Date(admin.reset_otp_expires)) {
      console.log('❌ OTP expired');
      console.log(`   Expired at: ${new Date(admin.reset_otp_expires).toLocaleString('vi-VN')}`);
      console.log('===================================\n');
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }
    
    console.log('✅ OTP is valid and not expired');
    
    // Bước 4: Validate password mới
    if (!newPassword || newPassword.length < 6) {
      console.log('❌ Invalid new password');
      console.log('===================================\n');
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    
    // Bước 5: Cập nhật password mới và xóa OTP
    console.log('🔄 Updating password and clearing OTP...');
    await collection.updateOne(
      { email: email },
      { 
        $set: { 
          password: newPassword,
          updated_at: new Date()
        },
        $unset: { 
          reset_otp: '', 
          reset_otp_expires: '' 
        }
      }
    );
    
    console.log('✅ Password updated successfully!');
    console.log('===================================\n');
    
    res.json({ 
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.' 
    });
    
  } catch (error) {
    console.error('❌ Reset password error:', error);
    console.log('===================================\n');
    res.status(500).json({ error: 'Lỗi xử lý yêu cầu' });
  }
});

// ============================================================================
// USERS / CUSTOMERS ENDPOINTS
// ============================================================================

/**
 * GET all users
 */
app.get('/api/users', checkMongoConnection, async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET user by ID
 */
app.get('/api/users/:id', checkMongoConnection, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await usersCollection.findOne({ user_id: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * GET user by CustomerID (for admin customer detail)
 */
app.get('/api/users/customer/:customerID', checkMongoConnection, async (req, res) => {
  try {
    const { customerID } = req.params;
    
    console.log(`\n📋 === GET CUSTOMER DETAIL ===`);
    console.log(`📱 CustomerID: ${customerID}`);
    
    if (!customerID) {
      return res.status(400).json({ 
        error: 'CustomerID là bắt buộc',
        message: 'CustomerID is required'
      });
    }
    
    // Find user by CustomerID in MongoDB
    const user = await usersCollection.findOne({ CustomerID: customerID });
    
    if (!user) {
      console.log(`❌ Customer not found: ${customerID}`);
      return res.status(404).json({ 
        error: 'Không tìm thấy khách hàng',
        message: 'Customer not found'
      });
    }
    
    console.log(`✅ Found customer: ${user.CustomerID}`);
    
    // Return full user data (excluding password)
    const userData = { ...user };
    delete userData.Password;
    
    res.json({
      success: true,
      customer: userData
    });
  } catch (error) {
    console.error('❌ Error fetching customer:', error);
    res.status(500).json({ 
      error: 'Lỗi server khi lấy thông tin khách hàng',
      message: error.message 
    });
  }
});

/**
 * POST create new user
 */
app.post('/api/users', checkMongoConnection, async (req, res) => {
  try {
    const newUser = req.body;
    const result = await usersCollection.insertOne(newUser);
    
    // Tự động đồng bộ users về JSON sau khi tạo mới
    syncUsersToJsonAsync(usersCollection);
    
    res.status(201).json({ message: 'User created', id: result.insertedId });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT update user by CustomerID (for admin)
 * Cập nhật thông tin user theo CustomerID và tự động sync về JSON
 */
app.put('/api/users/customer/:customerID', checkMongoConnection, async (req, res) => {
  try {
    const { customerID } = req.params;
    const updateData = req.body;
    
    console.log('\n📝 === UPDATE USER BY CUSTOMERID (ADMIN) ===');
    console.log(`📱 CustomerID: ${customerID}`);
    console.log('📋 Update data:', updateData);
    
    // Validate CustomerID
    if (!customerID) {
      return res.status(400).json({ 
        error: 'CustomerID là bắt buộc',
        message: 'CustomerID is required'
      });
    }
    
    // Convert memberTier to CustomerTiering if provided
    if (updateData.memberTier) {
      updateData.CustomerTiering = updateData.memberTier;
      delete updateData.memberTier;
    }
    
    // Convert customerType to CustomerType if provided
    if (updateData.customerType) {
      updateData.CustomerType = updateData.customerType;
      delete updateData.customerType;
    }
    
    // Map field names from frontend to MongoDB format
    const mappedData = {};
    if (updateData.name !== undefined) mappedData.FullName = updateData.name;
    if (updateData.email !== undefined) mappedData.Email = updateData.email;
    if (updateData.phone !== undefined) mappedData.Phone = updateData.phone;
    if (updateData.address !== undefined) mappedData.Address = updateData.address;
    if (updateData.gender !== undefined) {
      // Convert gender format: "Nam" -> "male", "Nữ" -> "female"
      mappedData.Gender = updateData.gender === 'Nam' ? 'male' : 
                         updateData.gender === 'Nữ' ? 'female' : 
                         updateData.gender;
    }
    if (updateData.birthdate !== undefined && updateData.birthdate !== '---') {
      // Parse DD/MM/YYYY to Date
      const dateParts = updateData.birthdate.split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const year = parseInt(dateParts[2]);
        mappedData.BirthDay = new Date(year, month, day);
      }
    }
    if (updateData.CustomerTiering !== undefined) mappedData.CustomerTiering = updateData.CustomerTiering;
    if (updateData.CustomerType !== undefined) mappedData.CustomerType = updateData.CustomerType;
    
    // Add updatedAt timestamp
    mappedData.updatedAt = new Date();
    
    console.log('📋 Mapped update data:', mappedData);
    
    // Update user in MongoDB
    const result = await usersCollection.updateOne(
      { CustomerID: customerID },
      { $set: mappedData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `User with CustomerID ${customerID} not found`
      });
    }
    
    console.log(`✅ User ${customerID} updated successfully`);
    
    // Tự động đồng bộ users về JSON sau khi cập nhật
    syncUsersToJsonAsync(usersCollection);
    
    // Get updated user data
    const updatedUser = await usersCollection.findOne({ CustomerID: customerID });
    
    res.json({ 
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ 
      error: 'Failed to update user',
      message: error.message 
    });
  }
});

/**
 * DELETE user
 */
app.delete('/api/users/:id', checkMongoConnection, async (req, res) => {
  try {
    const customerID = req.params.id; // CustomerID can be string like "CUS000004" or MongoDB _id
    
    console.log(`\n🗑️ === DELETE CUSTOMER ===`);
    console.log(`📱 CustomerID: ${customerID}`);
    
    // Try to find user by CustomerID first (most common case)
    let user = await usersCollection.findOne({ CustomerID: customerID });
    
    // If not found by CustomerID, try to find by _id (MongoDB ObjectId)
    if (!user) {
      try {
        // Check if the id is a valid MongoDB ObjectId
        if (ObjectId.isValid(customerID)) {
          user = await usersCollection.findOne({ _id: new ObjectId(customerID) });
        }
      } catch (e) {
        // Ignore ObjectId parsing errors
        console.log(`⚠️ ObjectId parsing failed for: ${customerID}`);
      }
    }
    
    // If still not found, try by user_id (numeric)
    if (!user) {
      const userId = parseInt(customerID);
      if (!isNaN(userId)) {
        user = await usersCollection.findOne({ user_id: userId });
      }
    }
    
    if (!user) {
      console.log(`❌ Customer not found: ${customerID}`);
      return res.status(404).json({ 
        error: 'Không tìm thấy khách hàng',
        message: 'Customer not found' 
      });
    }
    
    console.log(`✅ Found customer: ${user.CustomerID || user._id}`);
    
    // Delete user by _id (MongoDB primary key)
    const result = await usersCollection.deleteOne({ _id: user._id });
    
    if (result.deletedCount === 0) {
      console.log(`❌ Failed to delete customer: ${customerID}`);
      return res.status(404).json({ 
        error: 'Không thể xóa khách hàng',
        message: 'Failed to delete customer' 
      });
    }
    
    console.log(`✅ Deleted customer successfully: ${user.CustomerID || user._id}`);
    
    // Tự động đồng bộ users về JSON sau khi xóa
    syncUsersToJsonAsync(usersCollection);
    
    res.json({ 
      success: true,
      message: 'Đã xóa khách hàng thành công',
      deletedCustomer: {
        CustomerID: user.CustomerID,
        FullName: user.FullName || user.full_name
      }
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ 
      error: 'Lỗi server khi xóa khách hàng',
      message: error.message 
    });
  }
});

/**
 * POST sync users from MongoDB to JSON
 * Đồng bộ users từ MongoDB về JSON file (có thể gọi thủ công)
 */
app.post('/api/users/sync', checkMongoConnection, async (req, res) => {
  try {
    console.log('\n🔄 [Manual Sync] Đồng bộ users từ MongoDB về JSON...');
    const result = await syncUsersToJson(usersCollection);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Đã đồng bộ ${result.count} users từ MongoDB về JSON`,
        count: result.count
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Lỗi khi đồng bộ',
        message: 'Không thể đồng bộ users'
      });
    }
  } catch (error) {
    console.error('❌ Error syncing users:', error);
    res.status(500).json({ 
      error: 'Lỗi khi đồng bộ users',
      message: error.message 
    });
  }
});

/**
 * POST sync all collections from MongoDB to JSON
 * Đồng bộ tất cả collections từ MongoDB về JSON files (có thể gọi thủ công)
 */
app.post('/api/sync/all', checkMongoConnection, async (req, res) => {
  try {
    console.log('\n🔄 [Manual Sync All] Đồng bộ tất cả collections từ MongoDB về JSON...');
    const result = await syncAllCollectionsToJson(db);
    
    if (result.success) {
      const summary = result.results
        .filter(r => r.success && !r.skipped && !r.empty)
        .map(r => `${r.collection}: ${r.count} documents`)
        .join(', ');
      
      res.json({
        success: true,
        message: `Đã đồng bộ tất cả collections từ MongoDB về JSON`,
        results: result.results,
        summary: summary
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Lỗi khi đồng bộ',
        message: 'Không thể đồng bộ collections'
      });
    }
  } catch (error) {
    console.error('❌ Error syncing all collections:', error);
    res.status(500).json({ 
      error: 'Lỗi khi đồng bộ collections',
      message: error.message 
    });
  }
});

// ============================================================================
// ORDERS ENDPOINTS
// ============================================================================

/**
 * POST create new order
 */
app.post('/api/orders', checkMongoConnection, async (req, res) => {
  try {
    console.log('📦 [Orders] Received POST request to create order');
    console.log('📦 [Orders] Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      CustomerID,
      shippingInfo,
      items,
      paymentMethod,
      subtotal,
      shippingFee,
      shippingDiscount,
      discount,
      vatRate,
      vatAmount,
      totalAmount,
      code,
      promotionName,
      wantInvoice,
      invoiceInfo,
      consultantCode,
    } = req.body;

    // Validate required fields
    if (!CustomerID || !shippingInfo || !items || items.length === 0) {
      console.error('❌ [Orders] Missing required fields:', { CustomerID: !!CustomerID, shippingInfo: !!shippingInfo, items: items?.length });
      return res.status(400).json({
        success: false,
        message: "Missing required fields: CustomerID, shippingInfo, or items",
      });
    }

    // Validate shipping info
    if (
      !shippingInfo.fullName ||
      !shippingInfo.phone ||
      !shippingInfo.address ||
      !shippingInfo.address.city ||
      !shippingInfo.address.district ||
      !shippingInfo.address.ward ||
      !shippingInfo.address.detail
    ) {
      console.error('❌ [Orders] Missing shipping info:', {
        fullName: !!shippingInfo.fullName,
        phone: !!shippingInfo.phone,
        address: !!shippingInfo.address,
        city: !!shippingInfo.address?.city,
        district: !!shippingInfo.address?.district,
        ward: !!shippingInfo.address?.ward,
        detail: !!shippingInfo.address?.detail
      });
      return res.status(400).json({
        success: false,
        message: "Missing required shipping information",
      });
    }

    // Validate numeric fields
    if (subtotal === undefined || totalAmount === undefined) {
      console.error('❌ [Orders] Missing numeric fields:', { subtotal, totalAmount });
      return res.status(400).json({
        success: false,
        message: "Missing required fields: subtotal or totalAmount",
      });
    }

    // Generate unique OrderID
    const OrderID = generateOrderID();

    console.log('📦 [Orders] Creating order with data:', {
      OrderID,
      CustomerID,
      itemsCount: items.length,
      subtotal,
      totalAmount,
      shippingInfo: {
        fullName: shippingInfo.fullName,
        phone: shippingInfo.phone,
        address: shippingInfo.address
      }
    });

    // Create new order using Mongoose Order model
    // Note: routes will be initialized by Mongoose default, we'll set it after creation
    const newOrder = new Order({
      OrderID,
      CustomerID,
      shippingInfo: {
        fullName: shippingInfo.fullName,
        phone: shippingInfo.phone,
        email: shippingInfo.email || "",
        address: {
          city: shippingInfo.address.city,
          district: shippingInfo.address.district,
          ward: shippingInfo.address.ward,
          detail: shippingInfo.address.detail
        },
        deliveryMethod: shippingInfo.deliveryMethod || "standard",
        warehouseAddress: shippingInfo.warehouseAddress || "",
        notes: shippingInfo.notes || ""
      },
      items: items.map(item => {
        // Handle image field - convert array to string if needed
        let imageValue = "";
        if (item.image) {
          if (Array.isArray(item.image)) {
            // If image is array, take first element
            imageValue = item.image[0] || "";
          } else {
            imageValue = String(item.image);
          }
        }
        
        return {
          sku: item.sku || "",
          productName: item.productName || "",
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          image: imageValue,
          unit: item.unit || "",
          category: item.category || "",
          subcategory: item.subcategory || ""
        };
      }),
      paymentMethod: paymentMethod || "cod",
      subtotal: Number(subtotal) || 0,
      shippingFee: Number(shippingFee) || 0,
      shippingDiscount: Number(shippingDiscount) || 0,
      discount: Number(discount) || 0,
      vatRate: Number(vatRate) || 0,
      vatAmount: Number(vatAmount) || 0,
      totalAmount: Number(totalAmount) || 0,
      code: code || "",
      promotionName: promotionName || "",
      wantInvoice: wantInvoice || false,
      invoiceInfo: invoiceInfo || {},
      consultantCode: consultantCode || "",
      status: "pending"
    });

    // Set routes after document creation (Mongoose Map)
    newOrder.routes.set("pending", new Date());

    console.log('📦 [Orders] Order object created, attempting to save...');
    
    // Save to database
    await newOrder.save();

    console.log(`✅ [Orders] Created new order: ${OrderID} for ${CustomerID}`);

    // Create notification for order creation (for user)
    try {
      await createOrderStatusNotification(CustomerID, OrderID, 'pending', totalAmount);
    } catch (notifError) {
      console.error('❌ [Notifications] Error creating order creation notification:', notifError);
      // Don't fail the request if notification creation fails
    }

    // Create notification for admin about new order
    try {
      await createAdminNotification('new_order', OrderID, CustomerID, totalAmount, {
        title: 'Đơn hàng mới',
        message: `Có đơn hàng mới #${OrderID} từ khách hàng ${CustomerID} với tổng giá trị ${totalAmount.toLocaleString('vi-VN')}₫`
      });
    } catch (adminNotifError) {
      console.error('❌ [Notifications] Error creating admin notification for new order:', adminNotifError);
      // Don't fail the request if notification creation fails
    }

    // Tự động lưu promotion usage nếu có sử dụng mã khuyến mãi
    if (code && code.trim() !== "") {
      try {
        // Tìm promotion dựa vào code
        const promotion = await Promotion.findOne({ code: code.trim() });

        if (promotion) {
          // Tạo record trong promotion_usage
          const promotionUsage = new PromotionUsage({
            promotion_id: promotion._id.toString(),
            user_id: CustomerID,
            order_id: OrderID,
            used_at: new Date(),
          });

          await promotionUsage.save();
          console.log(`✅ [PromotionUsage] Saved usage for promotion ${code} - Order ${OrderID}`);
        } else {
          console.warn(`⚠️ [PromotionUsage] Promotion not found for code: ${code}`);
        }
      } catch (usageError) {
        // Log lỗi nhưng không fail toàn bộ request
        console.error("❌ [PromotionUsage] Error saving promotion usage:", usageError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: newOrder,
    });
  } catch (error) {
    console.error("❌ [Orders] Error creating order:", error);
    console.error("❌ [Orders] Error stack:", error.stack);
    console.error("❌ [Orders] Error details:", {
      name: error.name,
      message: error.message,
      errors: error.errors
    });
    
    // Provide more detailed error message
    let errorMessage = "Failed to create order";
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors || {}).map(key => {
        return `${key}: ${error.errors[key].message}`;
      });
      errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    } else {
      errorMessage = error.message || "Failed to create order";
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: error.errors || undefined
    });
  }
});

/**
 * GET all orders
 */
app.get('/api/orders', checkMongoConnection, async (req, res) => {
  try {
    const { CustomerID } = req.query;
    
    console.log(`\n📦 === GET ORDERS ===`);
    console.log(`📱 CustomerID from query: ${CustomerID}`);
    
    let orders;
    if (CustomerID) {
      // Get orders by CustomerID
      orders = await ordersCollection.find({ CustomerID: CustomerID }).sort({ createdAt: -1 }).toArray();
      console.log(`✅ Found ${orders.length} orders for customer ${CustomerID}`);
      
      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } else {
      // Get all orders (for admin)
      orders = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray();
      console.log(`✅ Found ${orders.length} total orders`);
      
      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    }
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch orders',
      message: error.message 
    });
  }
});

/**
 * GET order by ID
 */
app.get('/api/orders/:id', checkMongoConnection, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await ordersCollection.findOne({ order_id: orderId });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * GET orders by CustomerID (for admin customer detail)
 */
app.get('/api/orders/customer/:customerID', checkMongoConnection, async (req, res) => {
  try {
    const { customerID } = req.params;
    
    console.log(`\n📦 === GET ORDERS BY CUSTOMERID ===`);
    console.log(`📱 CustomerID: ${customerID}`);
    
    if (!customerID) {
      return res.status(400).json({ 
        error: 'CustomerID là bắt buộc',
        message: 'CustomerID is required'
      });
    }
    
    // Find orders by CustomerID in MongoDB
    const orders = await ordersCollection.find({ CustomerID: customerID }).sort({ createdAt: -1 }).toArray();
    
    console.log(`✅ Found ${orders.length} orders for customer ${customerID}`);
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ 
      error: 'Lỗi server khi lấy danh sách đơn hàng',
      message: error.message 
    });
  }
});

/**
 * GET orders by user ID
 */
app.get('/api/orders/user/:userId', checkMongoConnection, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const orders = await ordersCollection.find({ user_id: userId }).toArray();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

/**
 * PUT update order status
 */
app.put('/api/orders/:orderId/status', checkMongoConnection, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body; // Add reason for cancellation

    console.log(`📦 [Orders] Updating order ${orderId} status to: ${status}`);

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipping",
      "delivered",
      "completed",
      "cancelled",
      "processing_return",
      "returning",
      "returned",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Get the current order to update routes
    const currentOrder = await Order.findOne({ OrderID: orderId });
    if (!currentOrder) {
      console.error(`❌ [Orders] Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // If status is "cancelled" and order is pending/confirmed, create notification for admin
    // BUT don't actually cancel the order yet - wait for admin approval
    if (status === "cancelled" && (currentOrder.status === "pending" || currentOrder.status === "confirmed")) {
      try {
        // Check if notification already exists
        const existingNotif = await notificationsCollection.findOne({
          type: 'order_cancellation_request',
          orderId: orderId,
          status: 'pending'
        });
        
        if (!existingNotif) {
          await notificationsCollection.insertOne({
            type: 'order_cancellation_request',
            orderId: orderId,
            customerId: currentOrder.CustomerID,
            orderTotal: currentOrder.totalAmount,
            reason: reason || 'Không có lý do',
            status: 'pending', // pending, approved, rejected
            createdAt: new Date(),
            updatedAt: new Date(),
            read: false
          });
          console.log(`📢 [Notifications] Created cancellation request notification for order ${orderId}`);
        } else {
          console.log(`📢 [Notifications] Cancellation request already exists for order ${orderId}`);
        }
        
        // Don't actually cancel the order - wait for admin approval
        // Return success but keep order status as is
        return res.json({
          success: true,
          message: "Yêu cầu hủy đơn hàng đã được gửi. Đang chờ xác nhận từ admin.",
          requiresApproval: true,
          data: currentOrder
        });
      } catch (notifError) {
        console.error('❌ [Notifications] Error creating notification:', notifError);
        // Continue with normal cancellation if notification fails
      }
    }

    // Initialize routes map if not exists
    let routes = currentOrder.routes;
    if (!routes || typeof routes !== 'object') {
      routes = {};
    }
    
    // Ensure routes is an object (not Map)
    const routesObject = routes instanceof Map ? Object.fromEntries(routes) : routes;
    
    // Update routes with new status
    routesObject[status] = new Date();

    // If order status is "delivered", automatically convert to "completed"
    let finalStatus = status;
    if (status === "delivered") {
      finalStatus = "completed";
      routesObject["completed"] = new Date();
      if (!routesObject["delivered"]) {
        routesObject["delivered"] = new Date();
      }
    }

    const order = await Order.findOneAndUpdate(
      { OrderID: orderId },
      { 
        status: finalStatus, 
        routes: routesObject,
        updatedAt: new Date() 
      },
      { new: true }
    );

    console.log(`✅ [Orders] Updated order ${orderId} status to: ${finalStatus}`);

    // Create notification for user based on order status change
    try {
      await createOrderStatusNotification(order.CustomerID, orderId, finalStatus, order.totalAmount);
    } catch (notifError) {
      console.error('❌ Error creating order status notification:', notifError);
      // Don't fail the request if notification creation fails
    }

    // Create admin notification for return requests
    if (finalStatus === 'processing_return' || finalStatus === 'returning' || finalStatus === 'returned') {
      try {
        const returnMessages = {
          'processing_return': {
            title: 'Yêu cầu trả hàng',
            message: `Khách hàng ${order.CustomerID} yêu cầu trả hàng cho đơn hàng #${orderId}`
          },
          'returning': {
            title: 'Đơn hàng đang được trả',
            message: `Đơn hàng #${orderId} của khách hàng ${order.CustomerID} đang trong quá trình trả hàng`
          },
          'returned': {
            title: 'Đơn hàng đã được trả',
            message: `Đơn hàng #${orderId} của khách hàng ${order.CustomerID} đã được trả thành công`
          }
        };
        
        const message = returnMessages[finalStatus];
        await createAdminNotification('return_request', orderId, order.CustomerID, order.totalAmount, message);
      } catch (adminNotifError) {
        console.error('❌ Error creating admin notification for return request:', adminNotifError);
        // Don't fail the request if notification creation fails
      }
    }

    // If order is completed or delivered, update customer stats
    if (finalStatus === "completed" || status === "delivered") {
      try {
        // Update customer TotalSpent and CustomerTiering
        const { updateUserTotalSpentAndTieringAsync } = require("./services/totalspent-tiering.service");
        await updateUserTotalSpentAndTieringAsync(User, Order, order.CustomerID);
        
        // Increment purchase_count for all products in order
        try {
          for (const item of order.items) {
            await Product.findOneAndUpdate(
              { sku: item.sku },
              { $inc: { purchase_count: item.quantity } },
              { new: true }
            );
          }
        } catch (productError) {
          console.error('Error updating product purchase_count:', productError);
        }
      } catch (error) {
        console.error('Error updating customer stats:', error);
      }
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("❌ [Orders] Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

/**
 * PUT update order
 */
// ========== DELETE ORDER ==========
// DELETE /api/orders/:orderId
app.delete('/api/orders/:orderId', checkMongoConnection, async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`🗑️ [Orders] Attempting to delete order with ID: ${orderId}`);

    // Try to find order by OrderID (supports both with and without ORD prefix)
    // First try exact match
    let order = await Order.findOneAndDelete({ OrderID: orderId });
    
    // If not found and orderId doesn't start with "ORD", try with "ORD" prefix
    if (!order && !orderId.startsWith('ORD')) {
      console.log(`🗑️ [Orders] Order not found with ${orderId}, trying with ORD prefix...`);
      order = await Order.findOneAndDelete({ OrderID: `ORD${orderId}` });
    }
    
    // If still not found and orderId starts with "ORD", try without prefix
    if (!order && orderId.startsWith('ORD')) {
      const orderIdWithoutPrefix = orderId.substring(3); // Remove "ORD" prefix
      console.log(`🗑️ [Orders] Order not found with ${orderId}, trying without ORD prefix: ${orderIdWithoutPrefix}...`);
      order = await Order.findOneAndDelete({ OrderID: orderIdWithoutPrefix });
    }

    if (!order) {
      console.log(`❌ [Orders] Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log(`✅ [Orders] Order deleted successfully: ${order.OrderID}`);

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("❌ [Orders] Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
});

app.put('/api/orders/:orderId', checkMongoConnection, async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderData = req.body;

    console.log(`📦 [Orders] Updating order ${orderId}`);
    console.log('📦 [Orders] Request body:', JSON.stringify(orderData, null, 2));

    // Validate required fields
    if (!orderData.CustomerID || !orderData.shippingInfo || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: CustomerID, shippingInfo, or items",
      });
    }

    // Validate shipping info
    if (
      !orderData.shippingInfo.fullName ||
      !orderData.shippingInfo.phone ||
      !orderData.shippingInfo.address ||
      !orderData.shippingInfo.address.city ||
      !orderData.shippingInfo.address.district ||
      !orderData.shippingInfo.address.ward ||
      !orderData.shippingInfo.address.detail
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required shipping information",
      });
    }

    // Check if order exists
    const existingOrder = await Order.findOne({ OrderID: orderId });
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update routes if status changed
    const routes = existingOrder.routes || {};
    const routesObject = routes instanceof Map ? Object.fromEntries(routes) : routes;
    
    if (orderData.status && orderData.status !== existingOrder.status) {
      routesObject[orderData.status] = new Date();
    }

    // Prepare update data
    const updateData = {
      CustomerID: orderData.CustomerID,
      shippingInfo: {
        fullName: orderData.shippingInfo.fullName,
        phone: orderData.shippingInfo.phone,
        email: orderData.shippingInfo.email || "",
        address: {
          city: orderData.shippingInfo.address.city,
          district: orderData.shippingInfo.address.district,
          ward: orderData.shippingInfo.address.ward,
          detail: orderData.shippingInfo.address.detail
        },
        deliveryMethod: orderData.shippingInfo.deliveryMethod || "standard",
        warehouseAddress: orderData.shippingInfo.warehouseAddress || "",
        notes: orderData.shippingInfo.notes || ""
      },
      items: orderData.items.map((item) => {
        let imageValue = "";
        if (item.image) {
          if (Array.isArray(item.image)) {
            imageValue = item.image[0] || "";
          } else {
            imageValue = String(item.image);
          }
        }
        return {
          sku: item.sku || "",
          productName: item.productName || "",
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          image: imageValue,
          unit: item.unit || "",
          category: item.category || "",
          subcategory: item.subcategory || ""
        };
      }),
      paymentMethod: orderData.paymentMethod || "cod",
      subtotal: Number(orderData.subtotal) || 0,
      shippingFee: Number(orderData.shippingFee) || 0,
      shippingDiscount: Number(orderData.shippingDiscount) || 0,
      discount: Number(orderData.discount) || 0,
      vatRate: Number(orderData.vatRate) || 0,
      vatAmount: Number(orderData.vatAmount) || 0,
      totalAmount: Number(orderData.totalAmount) || 0,
      code: orderData.code || "",
      promotionName: orderData.promotionName || "",
      wantInvoice: orderData.wantInvoice || false,
      invoiceInfo: orderData.invoiceInfo || {},
      consultantCode: orderData.consultantCode || "",
      routes: routesObject,
      updatedAt: new Date()
    };

    // Only update status if provided
    if (orderData.status) {
      updateData.status = orderData.status;
    }

    // Update order
    const updatedOrder = await Order.findOneAndUpdate(
      { OrderID: orderId },
      updateData,
      { new: true }
    );

    console.log(`✅ [Orders] Updated order ${orderId} successfully`);

    res.json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("❌ [Orders] Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
});

// ============================================================================
// PRODUCTS ENDPOINTS
// ============================================================================

/**
 * GET all products
 */
app.get('/api/products', checkMongoConnection, async (req, res) => {
  try {
    const products = await productsCollection.find({ status: 'Active' }).toArray();
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch products',
      message: error.message 
    });
  }
});

// ============================================================================
// PRODUCT METADATA ENDPOINTS - Must be placed BEFORE /:id route to avoid conflicts
// ============================================================================

/**
 * GET /api/products/metadata/categories - Lấy danh sách categories
 */
app.get('/api/products/metadata/categories', checkMongoConnection, async (req, res) => {
  try {
    const categories = await productsCollection.distinct("category", { status: "Active" });
    const filteredCategories = categories.filter(c => c && typeof c === 'string' && c.trim() !== '');
    res.json({
      success: true,
      data: filteredCategories,
      count: filteredCategories.length,
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

/**
 * GET /api/products/metadata/subcategories - Lấy danh sách subcategories
 */
app.get('/api/products/metadata/subcategories', checkMongoConnection, async (req, res) => {
  try {
    const subcategories = await productsCollection.distinct("subcategory", { status: "Active" });
    const filteredSubcategories = subcategories.filter(s => s && typeof s === 'string' && s.trim() !== '');
    res.json({
      success: true,
      data: filteredSubcategories,
      count: filteredSubcategories.length,
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

/**
 * GET /api/products/metadata/brands - Lấy danh sách brands
 */
app.get('/api/products/metadata/brands', checkMongoConnection, async (req, res) => {
  try {
    const brands = await productsCollection.distinct("brand", { status: "Active" });
    const filteredBrands = brands.filter(b => b && typeof b === 'string' && b.trim() !== '');
    res.json({
      success: true,
      data: filteredBrands,
      count: filteredBrands.length,
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

/**
 * GET /api/products/metadata/products - Lấy danh sách products (SKU và tên)
 */
app.get('/api/products/metadata/products', checkMongoConnection, async (req, res) => {
  try {
    const products = await productsCollection.find({ status: "Active" })
      .project({ sku: 1, product_name: 1, productName: 1 })
      .limit(1000)
      .toArray();
    
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

/**
 * GET product by ID or SKU
 */
app.get('/api/products/:id', checkMongoConnection, async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`[Products API] Fetching product with ID/SKU: ${id}`);
    
    // Strategy 1: Try to find by SKU first (most common case)
    let product = await productsCollection.findOne({ sku: id });
    
    if (product) {
      console.log(`[Products API] Found product by SKU: ${product.product_name || product.productName}`);
      return res.json({
        success: true,
        data: product,
      });
    }
    
    // Strategy 2: Try to find by _id as string (direct match)
    product = await productsCollection.findOne({ _id: id });
    
    if (product) {
      console.log(`[Products API] Found product by _id (string): ${product.product_name || product.productName}`);
      return res.json({
        success: true,
        data: product,
      });
    }
    
    // Strategy 3: Try to find by _id as ObjectId
    try {
      // Check if it looks like a valid ObjectId format (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        const objectId = new ObjectId(id);
        product = await productsCollection.findOne({ _id: objectId });
        
        if (product) {
          console.log(`[Products API] Found product by _id (ObjectId): ${product.product_name || product.productName}`);
          return res.json({
            success: true,
            data: product,
          });
        }
      }
    } catch (e) {
      // Invalid ObjectId format, continue
      console.log(`[Products API] Invalid ObjectId format: ${id}`);
    }
    
    // Strategy 4: Try to find by product_name (fallback)
    product = await productsCollection.findOne({ 
      $or: [
        { product_name: id },
        { productName: id }
      ]
    });
    
    if (product) {
      console.log(`[Products API] Found product by name: ${product.product_name || product.productName}`);
      return res.json({
        success: true,
        data: product,
      });
    }
    
    // Not found
    console.log(`[Products API] Product not found: ${id}`);
    return res.status(404).json({ 
      success: false,
      error: 'Product not found',
      message: `No product found with ID/SKU: ${id}`
    });
  } catch (error) {
    console.error('[Products API] Error fetching product:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch product',
      message: error.message 
    });
  }
});

/**
 * GET products by category
 */
app.get('/api/products/category/:category', checkMongoConnection, async (req, res) => {
  try {
    const category = req.params.category;
    const products = await productsCollection.find({ 
      category: category,
      status: 'Active'
    }).toArray();
    
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch products by category',
      message: error.message 
    });
  }
});

/**
 * GET products by category and subcategory
 */
app.get('/api/products/category/:category/:subcategory', checkMongoConnection, async (req, res) => {
  try {
    const category = req.params.category;
    const subcategory = req.params.subcategory;
    const products = await productsCollection.find({ 
      category: category,
      subcategory: subcategory,
      status: 'Active'
    }).toArray();
    
    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching products by category and subcategory:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch products by category and subcategory',
      message: error.message 
    });
  }
});

/**
 * PUT /api/products/:id - Cập nhật sản phẩm
 */
app.put('/api/products/:id', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(` [Products API] Updating product with ID: ${id}`);
    
    // Tìm product theo _id trước (vì frontend gửi _id từ MongoDB)
    let product = await productsCollection.findOne({ _id: id });
    
    // Nếu không tìm thấy bằng _id, thử tìm bằng SKU
    if (!product) {
      console.log(` [Products API] Not found by _id, trying SKU...`);
      product = await productsCollection.findOne({ sku: id });
    }

    if (!product) {
      console.log(` [Products API] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    console.log(` [Products API] Found product: ${product.product_name || product.productName} (${product._id})`);

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

    const result = await productsCollection.findOneAndUpdate(
      { _id: product._id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: "Không thể cập nhật sản phẩm",
      });
    }

    console.log(`\n✅ [Products API] Product updated successfully: ${result.value.product_name || result.value.productName}`);
    console.log(`📊 [Products API] Updated product data:`, JSON.stringify({
      _id: result.value._id,
      product_name: result.value.product_name,
      stock: result.value.stock,
      price: result.value.price
    }, null, 2));
    
    // Tự động đồng bộ với JSON file sau khi cập nhật MongoDB
    // Đợi sync hoàn thành trước khi trả response để đảm bảo file được cập nhật
    console.log(`\n🔄 [Products API] ========== BẮT ĐẦU ĐỒNG BỘ JSON ==========`);
    console.log(`🔄 [Products API] Đang đồng bộ products với JSON file...`);
    
    let syncSuccess = false;
    let syncError = null;
    
    try {
      const syncResult = await syncProductsToJson(productsCollection);
      if (syncResult.success) {
        syncSuccess = true;
        console.log(`✅ [Products API] ✅ Đã đồng bộ ${syncResult.count} products với JSON file`);
        console.log(`✅ [Products API] ========== ĐỒNG BỘ THÀNH CÔNG ==========\n`);
      } else {
        syncError = syncResult.error;
        console.error(`❌ [Products API] ❌ Không thể đồng bộ JSON: ${syncResult.error}`);
        console.error(`❌ [Products API] ========== ĐỒNG BỘ THẤT BẠI ==========\n`);
      }
    } catch (err) {
      syncError = err;
      console.error(`❌ [Products API] ❌ Lỗi khi đồng bộ JSON:`, err);
      console.error(`❌ [Products API] Stack trace:`, err.stack);
      console.error(`❌ [Products API] ========== ĐỒNG BỘ LỖI ==========\n`);
    }
    
    // Log kết quả cuối cùng
    if (syncSuccess) {
      console.log(`✅ [Products API] ✅ HOÀN TẤT: MongoDB đã cập nhật và JSON đã được đồng bộ\n`);
    } else {
      console.error(`⚠️  [Products API] ⚠️  CẢNH BÁO: MongoDB đã cập nhật nhưng JSON chưa được đồng bộ: ${syncError}\n`);
    }
    
    res.json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      data: result.value,
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

/**
 * PATCH /api/products/:id - Cập nhật một trường cụ thể của sản phẩm
 */
app.patch('/api/products/:id', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;
    
    if (!field) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chỉ định trường cần cập nhật",
      });
    }
    
    console.log(` [Products API] PATCH - Updating field "${field}" for product ID: ${id}`);
    
    // Tìm product theo _id trước
    let product = await productsCollection.findOne({ _id: id });
    
    // Nếu không tìm thấy bằng _id, thử tìm bằng SKU
    if (!product) {
      console.log(` [Products API] Not found by _id, trying SKU...`);
      product = await productsCollection.findOne({ sku: id });
    }

    if (!product) {
      console.log(` [Products API] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    console.log(` [Products API] Found product: ${product.product_name || product.productName} (${product._id})`);

    // Tạo update object với trường cụ thể
    const updateData = {
      [field]: value,
      post_date: new Date(), // Cập nhật ngày cập nhật mới nhất
    };

    const result = await productsCollection.findOneAndUpdate(
      { _id: product._id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: "Không thể cập nhật sản phẩm",
      });
    }

    console.log(` [Products API] Field "${field}" updated successfully`);
    
    // Tự động đồng bộ với JSON file sau khi cập nhật MongoDB
    try {
      console.log(` [Products API] Đang đồng bộ products với JSON file...`);
      const syncResult = await syncProductsToJson(productsCollection);
      if (syncResult.success) {
        console.log(` [Products API] ✅ Đã đồng bộ ${syncResult.count} products với JSON file`);
      } else {
        console.log(` [Products API] ⚠️  Không thể đồng bộ JSON: ${syncResult.error}`);
      }
    } catch (syncError) {
      console.error(` [Products API] ⚠️  Lỗi khi đồng bộ JSON: ${syncError.message}`);
      // Không fail request nếu sync JSON lỗi
    }
    
    res.json({
      success: true,
      message: `Đã cập nhật trường "${field}" thành công`,
      data: result.value,
    });
  } catch (error) {
    console.error(" [Products API] Error updating product field:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật sản phẩm",
      error: error.message,
    });
  }
});

/**
 * POST /api/products - Tạo sản phẩm mới
 */
app.post('/api/products', checkMongoConnection, async (req, res) => {
  try {
    const newProduct = {
      ...req.body,
      post_date: new Date(), // Set ngày tạo mới
    };
    
    const result = await productsCollection.insertOne(newProduct);

    const createdProduct = { ...newProduct, _id: result.insertedId };
    
    // Tự động đồng bộ với JSON file sau khi tạo sản phẩm mới
    try {
      console.log(` [Products API] Đang đồng bộ products với JSON file...`);
      const syncResult = await syncProductsToJson(productsCollection);
      if (syncResult.success) {
        console.log(` [Products API] ✅ Đã đồng bộ ${syncResult.count} products với JSON file`);
      } else {
        console.log(` [Products API] ⚠️  Không thể đồng bộ JSON: ${syncResult.error}`);
      }
    } catch (syncError) {
      console.error(` [Products API] ⚠️  Lỗi khi đồng bộ JSON: ${syncError.message}`);
      // Không fail request nếu sync JSON lỗi
    }

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: createdProduct,
    });
  } catch (error) {
    console.error(" [Products API] Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo sản phẩm",
      error: error.message,
    });
  }
});

/**
 * POST /api/products/sync - Đồng bộ thủ công products từ MongoDB về JSON (for testing)
 */
app.post('/api/products/sync', checkMongoConnection, async (req, res) => {
  try {
    console.log('\n🔄 [Manual Sync] Đồng bộ products từ MongoDB về JSON...');
    const syncResult = await syncProductsToJson(productsCollection);
    
    if (syncResult.success) {
      res.json({
        success: true,
        message: `Đã đồng bộ ${syncResult.count} products từ MongoDB về JSON`,
        count: syncResult.count
      });
    } else {
      res.status(500).json({
        success: false,
        error: syncResult.error || 'Lỗi khi đồng bộ',
        message: 'Không thể đồng bộ products'
      });
    }
  } catch (error) {
    console.error('❌ Error syncing products:', error);
    res.status(500).json({ 
      error: 'Lỗi khi đồng bộ products',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/products/:id - Xóa sản phẩm
 */
app.delete('/api/products/:id', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`\n🗑️ === DELETE PRODUCT ===`);
    console.log(`📦 Product ID/SKU: ${id}`);
    
    // Strategy 1: Try to find by SKU first (most common case from frontend)
    let product = await productsCollection.findOne({ sku: id });
    
    // Strategy 2: If not found by SKU, try to find by _id as ObjectId
    if (!product) {
      try {
        // Check if the id is a valid MongoDB ObjectId
        if (ObjectId.isValid(id)) {
          product = await productsCollection.findOne({ _id: new ObjectId(id) });
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
        product = await productsCollection.findOne({ _id: id });
        if (product) {
          console.log(`📦 [Products API] Found product by _id (string): ${product.product_name || product.productName}`);
        }
      } catch (e) {
        // Ignore errors
        console.log(`📦 [Products API] Error finding by _id string: ${id}`);
      }
    }
    
    // Strategy 4: If still not found, try to find by product name (exact match)
    if (!product) {
      try {
        product = await productsCollection.findOne({ 
          $or: [
            { product_name: id },
            { productName: id }
          ]
        });
        if (product) {
          console.log(`📦 [Products API] Found product by name (exact): ${product.product_name || product.productName}`);
        }
      } catch (e) {
        console.log(`📦 [Products API] Error finding by name: ${id}`);
      }
    }
    
    // Strategy 5: If still not found, try to find by product name (case-insensitive partial match)
    if (!product) {
      try {
        // Use regex for case-insensitive partial match
        const nameRegex = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        product = await productsCollection.findOne({ 
          $or: [
            { product_name: { $regex: nameRegex } },
            { productName: { $regex: nameRegex } }
          ]
        });
        if (product) {
          console.log(`📦 [Products API] Found product by name (partial match): ${product.product_name || product.productName}`);
        }
      } catch (e) {
        console.log(`📦 [Products API] Error finding by name regex: ${id}`);
      }
    }
    
    // Strategy 6: Try to find by code field (if exists)
    if (!product) {
      try {
        product = await productsCollection.findOne({ code: id });
        if (product) {
          console.log(`📦 [Products API] Found product by code: ${product.product_name || product.productName}`);
        }
      } catch (e) {
        console.log(`📦 [Products API] Error finding by code: ${id}`);
      }
    }

    if (!product) {
      console.log(`❌ [Products API] Product not found after trying all strategies: ${id}`);
      console.log(`   Tried: SKU, _id (ObjectId), _id (string), name (exact), name (partial), code`);
      
      // Try to get a sample of products to help debug
      try {
        const sampleProducts = await productsCollection.find({}).limit(3).toArray();
        console.log(`   Sample products in database:`);
        sampleProducts.forEach(p => {
          console.log(`     - _id: ${p._id}, SKU: ${p.sku || 'N/A'}, name: ${p.product_name || p.productName || 'N/A'}`);
        });
      } catch (e) {
        // Ignore
      }
      
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
        error: `Product with ID/SKU/Name "${id}" not found`,
        triedStrategies: ['SKU', '_id (ObjectId)', '_id (string)', 'name (exact)', 'name (partial)', 'code']
      });
    }

    console.log(`✅ [Products API] Found product: ${product.product_name || product.productName} (${product._id})`);

    // Option 1: Xóa hoàn toàn (uncomment if needed)
    // const result = await productsCollection.deleteOne({ _id: product._id });
    
    // Option 2: Đánh dấu là inactive (recommended để giữ lịch sử)
    const result = await productsCollection.updateOne(
      { _id: product._id },
      { 
        $set: { 
          status: 'Inactive', 
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      console.log(`❌ [Products API] Failed to delete product: ${id}`);
      return res.status(500).json({
        success: false,
        message: "Không thể xóa sản phẩm",
        error: "Failed to update product status"
      });
    }

    // Get updated product
    const updatedProduct = await productsCollection.findOne({ _id: product._id });

    console.log(`✅ [Products API] Product deleted successfully: ${product.product_name || product.productName}`);
    
    // Tự động đồng bộ products về JSON sau khi xóa
    syncProductsToJsonAsync(productsCollection);
    
    res.json({
      success: true,
      message: "Đã xóa sản phẩm thành công",
      data: updatedProduct,
      deletedProduct: {
        _id: updatedProduct._id,
        product_name: updatedProduct.product_name || updatedProduct.productName,
        sku: updatedProduct.sku
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

// ============================================================================
// PROMOTIONS ENDPOINTS
// ============================================================================

/**
 * GET all promotions
 */
app.get('/api/promotions', checkMongoConnection, async (req, res) => {
  try {
    const promotions = await promotionsCollection.find({}).toArray();
    res.json({
      success: true,
      data: promotions,
      count: promotions.length,
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch promotions',
      message: error.message 
    });
  }
});

/**
 * POST /api/promotions - Create new promotion
 */
app.post('/api/promotions', checkMongoConnection, async (req, res) => {
  try {
    const promotionData = req.body;
    
    console.log('\n📝 === CREATE PROMOTION ===');
    console.log('📋 Promotion data:', { code: promotionData.code, name: promotionData.name });
    
    // Validate required fields
    if (!promotionData.code || !promotionData.name || !promotionData.discount_value) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: code, name, discount_value',
        error: 'Missing required fields'
      });
    }
    
    // Check if code already exists
    const existingPromotion = await promotionsCollection.findOne({ code: promotionData.code });
    if (existingPromotion) {
      return res.status(400).json({
        success: false,
        message: `Mã khuyến mãi "${promotionData.code}" đã tồn tại`,
        error: 'Promotion code already exists'
      });
    }
    
    // Generate promotion_id if not provided
    if (!promotionData.promotion_id) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      promotionData.promotion_id = `PRO${timestamp}${random}`;
    }
    
    // Ensure dates are Date objects
    if (promotionData.start_date && typeof promotionData.start_date === 'string') {
      promotionData.start_date = new Date(promotionData.start_date);
    }
    if (promotionData.end_date && typeof promotionData.end_date === 'string') {
      promotionData.end_date = new Date(promotionData.end_date);
    }
    
    // Set default values
    promotionData.created_at = promotionData.created_at || new Date();
    promotionData.updated_at = promotionData.updated_at || new Date();
    promotionData.status = promotionData.status || 'Active';
    promotionData.usage_count = promotionData.usage_count || 0;
    
    // Insert into MongoDB
    const result = await promotionsCollection.insertOne(promotionData);
    
    console.log(`✅ Promotion created successfully: ${promotionData.promotion_id} - ${promotionData.code}`);
    
    // Get the created promotion
    const createdPromotion = await promotionsCollection.findOne({ _id: result.insertedId });
    
    res.status(201).json({
      success: true,
      message: 'Tạo khuyến mãi thành công',
      data: createdPromotion
    });
  } catch (error) {
    console.error('❌ Error creating promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo khuyến mãi',
      error: error.message
    });
  }
});

/**
 * PUT /api/promotions/:id - Update promotion (can find by promotion_id or code)
 */
app.put('/api/promotions/:id', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`\n✏️ === UPDATE PROMOTION ===`);
    console.log(`📋 Promotion ID/Code: ${id}`);
    console.log('📋 Update data:', { code: updateData.code, name: updateData.name });
    
    // Try to find by promotion_id first, then by code
    let promotion = await promotionsCollection.findOne({ promotion_id: id });
    if (!promotion) {
      promotion = await promotionsCollection.findOne({ code: id });
    }
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khuyến mãi',
        error: 'Promotion not found'
      });
    }
    
    // Prepare update data
    const updateFields = {
      updated_at: new Date()
    };
    
    // Update all fields from request body
    if (updateData.code !== undefined) updateFields.code = updateData.code;
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.type !== undefined) updateFields.type = updateData.type;
    if (updateData.scope !== undefined) updateFields.scope = updateData.scope;
    if (updateData.discount_type !== undefined) updateFields.discount_type = updateData.discount_type;
    if (updateData.discount_value !== undefined) updateFields.discount_value = Number(updateData.discount_value);
    if (updateData.max_discount_value !== undefined) updateFields.max_discount_value = Number(updateData.max_discount_value);
    if (updateData.min_order_value !== undefined) updateFields.min_order_value = Number(updateData.min_order_value);
    if (updateData.usage_limit !== undefined) updateFields.usage_limit = Number(updateData.usage_limit);
    if (updateData.user_limit !== undefined) updateFields.user_limit = Number(updateData.user_limit);
    if (updateData.is_first_order_only !== undefined) updateFields.is_first_order_only = updateData.is_first_order_only;
    if (updateData.status !== undefined) updateFields.status = updateData.status;
    
    // Handle dates
    if (updateData.start_date !== undefined) {
      updateFields.start_date = updateData.start_date instanceof Date 
        ? updateData.start_date 
        : new Date(updateData.start_date);
    }
    if (updateData.end_date !== undefined) {
      updateFields.end_date = updateData.end_date instanceof Date 
        ? updateData.end_date 
        : new Date(updateData.end_date);
    }
    
    // Update promotion
    const result = await promotionsCollection.updateOne(
      { _id: promotion._id },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khuyến mãi',
        error: 'Promotion not found'
      });
    }
    
    console.log(`✅ Promotion updated successfully: ${promotion.promotion_id || promotion.code}`);
    
    // Get updated promotion
    const updatedPromotion = await promotionsCollection.findOne({ _id: promotion._id });
    
    res.json({
      success: true,
      message: 'Cập nhật khuyến mãi thành công',
      data: updatedPromotion
    });
  } catch (error) {
    console.error('❌ Error updating promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật khuyến mãi',
      error: error.message
    });
  }
});

/**
 * DELETE /api/promotions/:id - Delete promotion (can find by promotion_id or code)
 */
app.delete('/api/promotions/:id', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`\n🗑️ === DELETE PROMOTION ===`);
    console.log(`📋 Promotion ID/Code: ${id}`);
    
    // Try to find by promotion_id first, then by code
    let promotion = await promotionsCollection.findOne({ promotion_id: id });
    if (!promotion) {
      promotion = await promotionsCollection.findOne({ code: id });
    }
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khuyến mãi',
        error: 'Promotion not found'
      });
    }
    
    // Delete promotion
    const result = await promotionsCollection.deleteOne({ _id: promotion._id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khuyến mãi',
        error: 'Promotion not found'
      });
    }
    
    console.log(`✅ Promotion deleted successfully: ${promotion.promotion_id || promotion.code}`);
    
    // Also delete promotion targets if exist
    try {
      await promotionTargetsCollection.deleteMany({ promotion_id: promotion.promotion_id || id });
      console.log(`✅ Deleted promotion targets for: ${promotion.promotion_id || id}`);
    } catch (targetError) {
      console.log('⚠️ Could not delete promotion targets (might not exist):', targetError.message);
    }
    
    res.json({
      success: true,
      message: 'Xóa khuyến mãi thành công',
      data: promotion
    });
  } catch (error) {
    console.error('❌ Error deleting promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa khuyến mãi',
      error: error.message
    });
  }
});

/**
 * GET all promotion targets
 */
app.get('/api/promotion-targets', checkMongoConnection, async (req, res) => {
  try {
    const targets = await promotionTargetsCollection.find({}).toArray();
    res.json({
      success: true,
      data: targets,
      count: targets.length,
    });
  } catch (error) {
    console.error('Error fetching promotion targets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch promotion targets',
      message: error.message 
    });
  }
});

/**
 * GET promotion target by promotion_id
 */
app.get('/api/promotion-targets/:promotionId', checkMongoConnection, async (req, res) => {
  try {
    const { promotionId } = req.params;
    const target = await promotionTargetsCollection.findOne({ promotion_id: promotionId });
    
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy promotion target',
        error: 'Promotion target not found'
      });
    }
    
    res.json({
      success: true,
      data: target
    });
  } catch (error) {
    console.error('Error fetching promotion target:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy promotion target',
      error: error.message
    });
  }
});

/**
 * POST /api/promotion-targets - Create or update promotion target
 */
app.post('/api/promotion-targets', checkMongoConnection, async (req, res) => {
  try {
    const { promotion_id, target_type, target_ref } = req.body;
    
    console.log('\n🎯 === CREATE/UPDATE PROMOTION TARGET ===');
    console.log('📋 Promotion ID:', promotion_id, 'Target type:', target_type);
    
    // Validate required fields
    if (!promotion_id || !target_type || !target_ref || !Array.isArray(target_ref)) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: promotion_id, target_type, target_ref',
        error: 'Missing required fields'
      });
    }
    
    // Check if target already exists for this promotion
    const existingTarget = await promotionTargetsCollection.findOne({ promotion_id });
    
    if (existingTarget) {
      // Update existing target
      const result = await promotionTargetsCollection.updateOne(
        { promotion_id },
        { $set: { target_type, target_ref, updated_at: new Date() } }
      );
      
      const updatedTarget = await promotionTargetsCollection.findOne({ promotion_id });
      
      console.log(`✅ Promotion target updated: ${promotion_id}`);
      
      return res.json({
        success: true,
        message: 'Cập nhật promotion target thành công',
        data: updatedTarget
      });
    }
    
    // Create new target
    const targetData = {
      promotion_id,
      target_type,
      target_ref,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await promotionTargetsCollection.insertOne(targetData);
    const newTarget = await promotionTargetsCollection.findOne({ _id: result.insertedId });
    
    console.log(`✅ Promotion target created: ${promotion_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Tạo promotion target thành công',
      data: newTarget
    });
  } catch (error) {
    console.error('❌ Error creating/updating promotion target:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo promotion target',
      error: error.message
    });
  }
});

/**
 * PUT /api/promotion-targets/:promotionId - Update promotion target
 */
app.put('/api/promotion-targets/:promotionId', checkMongoConnection, async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { target_type, target_ref } = req.body;
    
    console.log(`\n✏️ === UPDATE PROMOTION TARGET ===`);
    console.log(`📋 Promotion ID: ${promotionId}`);
    
    // Validate required fields
    if (!target_type || !target_ref || !Array.isArray(target_ref)) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: target_type, target_ref',
        error: 'Missing required fields'
      });
    }
    
    // Find and update target
    const result = await promotionTargetsCollection.updateOne(
      { promotion_id: promotionId },
      { $set: { target_type, target_ref, updated_at: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy promotion target',
        error: 'Promotion target not found'
      });
    }
    
    console.log(`✅ Promotion target updated: ${promotionId}`);
    
    const updatedTarget = await promotionTargetsCollection.findOne({ promotion_id: promotionId });
    
    res.json({
      success: true,
      message: 'Cập nhật promotion target thành công',
      data: updatedTarget
    });
  } catch (error) {
    console.error('❌ Error updating promotion target:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật promotion target',
      error: error.message
    });
  }
});

/**
 * DELETE /api/promotion-targets/:promotionId - Delete promotion target
 */
app.delete('/api/promotion-targets/:promotionId', checkMongoConnection, async (req, res) => {
  try {
    const { promotionId } = req.params;
    
    console.log(`\n🗑️ === DELETE PROMOTION TARGET ===`);
    console.log(`📋 Promotion ID: ${promotionId}`);
    
    const result = await promotionTargetsCollection.deleteOne({ promotion_id: promotionId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy promotion target',
        error: 'Promotion target not found'
      });
    }
    
    console.log(`✅ Promotion target deleted: ${promotionId}`);
    
    res.json({
      success: true,
      message: 'Xóa promotion target thành công'
    });
  } catch (error) {
    console.error('❌ Error deleting promotion target:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa promotion target',
      error: error.message
    });
  }
});

/**
 * GET all blogs
 */
app.get('/api/blogs', checkMongoConnection, async (req, res) => {
  try {
    const blogs = await blogsCollection.find({ 
      $or: [
        { status: 'Active' },
        { status: { $exists: false } },
        { status: null },
      ]
    }).sort({ pubDate: -1 }).toArray();
    
    // Normalize blog IDs: trim và loại bỏ dấu phẩy thừa
    const normalizedBlogs = blogs.map(blog => {
      if (blog.id && typeof blog.id === 'string') {
        blog.id = blog.id.trim().replace(/,$/, '').trim();
      }
      return blog;
    });
    
    res.json({
      success: true,
      data: normalizedBlogs,
      count: normalizedBlogs.length,
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch blogs',
      message: error.message 
    });
  }
});

/**
 * GET blog by ID
 */
app.get('/api/blogs/:id', checkMongoConnection, async (req, res) => {
  try {
    let { id } = req.params;
    // Trim ID để loại bỏ khoảng trắng và dấu phẩy thừa
    id = id.trim().replace(/,$/, '').trim();
    console.log(` [Blogs] Fetching blog with ID: "${id}"`);
    
    // Tạo regex để tìm ID với hoặc không có dấu phẩy ở cuối
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const idRegex = new RegExp(`^${escapedId},?$`);
    
    // Tìm blog với ID đã trim, và cả với các biến thể có dấu phẩy/khoảng trắng
    let blog = await blogsCollection.findOne({
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
      blog = await blogsCollection.findOne({
        $or: [
          { id: id },
          { id: id + ',' },
          { id: { $regex: idRegex } },
        ],
      });
    }

    if (!blog) {
      console.log(` [Blogs] Blog with ID "${id}" not found`);
      // Debug: Liệt kê một số IDs có trong database
      const sampleBlogs = await blogsCollection.find({}).limit(10).toArray();
      console.log(` [Blogs] Sample blog IDs in database:`, sampleBlogs.map(b => ({ id: `"${b.id}"`, title: b.title, status: b.status })));
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài viết",
      });
    }

    console.log(` [Blogs] Found blog: ${blog.title} (id: "${blog.id}", status: ${blog.status || 'undefined'})`);

    // Normalize blog ID: trim và loại bỏ dấu phẩy thừa (nếu có)
    const normalizedBlog = { ...blog };
    if (normalizedBlog.id && typeof normalizedBlog.id === 'string') {
      normalizedBlog.id = normalizedBlog.id.trim().replace(/,$/, '').trim();
    }

    // Tăng views
    const newViews = (blog.views || 0) + 1;
    await blogsCollection.updateOne(
      { _id: blog._id },
      { $set: { views: newViews } }
    );
    normalizedBlog.views = newViews;

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

/**
 * POST /api/blogs - Create new blog
 */
app.post('/api/blogs', checkMongoConnection, async (req, res) => {
  try {
    const { id, title, author, email, categoryTag, content, hashtags, img, excerpt, pubDate, status, views } = req.body;
    
    console.log('\n📝 === CREATE BLOG ===');
    console.log('📋 Blog data:', { id, title, author, email, categoryTag });
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề bài viết không được để trống',
        error: 'Title is required'
      });
    }
    
    if (!author || !author.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tác giả không được để trống',
        error: 'Author is required'
      });
    }
    
    // Generate blog ID if not provided
    let blogId = id;
    if (!blogId) {
      // Get the latest blog to generate next ID
      const latestBlog = await blogsCollection.find({}).sort({ pubDate: -1 }).limit(1).toArray();
      if (latestBlog.length > 0 && latestBlog[0].id) {
        const match = latestBlog[0].id.match(/B(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1]) + 1;
          blogId = `B${String(nextNum).padStart(4, '0')}`;
        } else {
          blogId = `B0001`;
        }
      } else {
        blogId = `B0001`;
      }
    }
    
    // Check if blog ID already exists
    const existingBlog = await blogsCollection.findOne({ id: blogId });
    if (existingBlog) {
      return res.status(400).json({
        success: false,
        message: `Blog với ID ${blogId} đã tồn tại`,
        error: 'Blog ID already exists'
      });
    }
    
    // Prepare blog data
    // Extract image from content if img is not provided
    let blogImg = img;
    if (!blogImg || blogImg.trim() === '') {
      // Try to extract image from content (HTML)
      if (content) {
        const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          blogImg = imgMatch[1];
        }
      }
      // Default placeholder if no image found
      if (!blogImg || blogImg.trim() === '') {
        blogImg = 'https://via.placeholder.com/800x400?text=Blog+Image';
      }
    }
    
    const blogData = {
      id: blogId,
      title: title.trim(),
      author: author.trim(),
      email: email || '',
      categoryTag: categoryTag || 'Sức khỏe',
      content: content || '',
      hashtags: hashtags || '',
      img: blogImg,
      excerpt: excerpt || (content ? content.replace(/<[^>]*>/g, '').substring(0, 200) : ''),
      pubDate: pubDate ? new Date(pubDate) : new Date(),
      status: status || 'Active',
      views: views || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert into MongoDB
    const result = await blogsCollection.insertOne(blogData);
    
    console.log(`✅ Blog created successfully: ${blogId} - ${title}`);
    
    // Get the created blog
    const createdBlog = await blogsCollection.findOne({ _id: result.insertedId });
    
    // Tự động đồng bộ blogs về JSON sau khi tạo
    syncBlogsToJsonAsync(blogsCollection);
    
    res.status(201).json({
      success: true,
      message: 'Tạo bài viết thành công',
      data: createdBlog
    });
  } catch (error) {
    console.error('❌ Error creating blog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo bài viết',
      error: error.message
    });
  }
});

/**
 * PUT /api/blogs/:id - Update blog
 */
app.put('/api/blogs/:id', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, email, categoryTag, content, hashtags, img, excerpt, pubDate, status, views } = req.body;
    
    console.log(`\n✏️ === UPDATE BLOG ===`);
    console.log(`📋 Blog ID: ${id}`);
    console.log('📋 Update data:', { title, author, email, categoryTag });
    
    // Find blog by id
    const blog = await blogsCollection.findOne({ id: id });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết',
        error: 'Blog not found'
      });
    }
    
    // Prepare update data
    const updateData = {
      updatedAt: new Date()
    };
    
    if (title !== undefined) updateData.title = title.trim();
    if (author !== undefined) updateData.author = author.trim();
    if (email !== undefined) updateData.email = email || '';
    if (categoryTag !== undefined) updateData.categoryTag = categoryTag;
    if (content !== undefined) updateData.content = content;
    if (hashtags !== undefined) updateData.hashtags = hashtags || '';
    if (img !== undefined) updateData.img = img;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (pubDate !== undefined) updateData.pubDate = new Date(pubDate);
    if (status !== undefined) updateData.status = status;
    if (views !== undefined) updateData.views = views;
    
    // Update blog
    const result = await blogsCollection.updateOne(
      { id: id },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết',
        error: 'Blog not found'
      });
    }
    
    console.log(`✅ Blog updated successfully: ${id}`);
    
    // Get updated blog
    const updatedBlog = await blogsCollection.findOne({ id: id });
    
    // Tự động đồng bộ blogs về JSON sau khi cập nhật
    syncBlogsToJsonAsync(blogsCollection);
    
    res.json({
      success: true,
      message: 'Cập nhật bài viết thành công',
      data: updatedBlog
    });
  } catch (error) {
    console.error('❌ Error updating blog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật bài viết',
      error: error.message
    });
  }
});

/**
 * DELETE /api/blogs/:id - Delete blog
 */
app.delete('/api/blogs/:id', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`\n🗑️ === DELETE BLOG ===`);
    console.log(`📋 Blog ID: ${id}`);
    
    // Try to find blog by id, blog_id, or _id
    let blog = await blogsCollection.findOne({ id: id });
    
    if (!blog) {
      // Try by blog_id
      blog = await blogsCollection.findOne({ blog_id: id });
    }
    
    if (!blog && ObjectId.isValid(id)) {
      // Try by MongoDB _id
      try {
        blog = await blogsCollection.findOne({ _id: new ObjectId(id) });
      } catch (e) {
        // Invalid ObjectId format
        console.log(`📋 Invalid ObjectId format: ${id}`);
      }
    }
    
    if (!blog) {
      console.log(`❌ Blog not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết',
        error: 'Blog not found'
      });
    }
    
    // Delete blog
    const result = await blogsCollection.deleteOne({ _id: blog._id });
    
    if (result.deletedCount === 0) {
      console.log(`❌ Failed to delete blog: ${id}`);
      return res.status(500).json({
        success: false,
        message: 'Không thể xóa bài viết',
        error: 'Failed to delete blog'
      });
    }
    
    console.log(`✅ Blog deleted successfully: ${blog.id || blog.blog_id || id}`);
    
    // Tự động đồng bộ blogs về JSON sau khi xóa
    syncBlogsToJsonAsync(blogsCollection);
    
    res.json({
      success: true,
      message: 'Xóa bài viết thành công',
      deletedBlog: {
        _id: blog._id,
        id: blog.id || blog.blog_id,
        title: blog.title
      }
    });
  } catch (error) {
    console.error('❌ Error deleting blog:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa bài viết',
      error: error.message
    });
  }
});

// ============================================================================
// ORDER DETAILS ENDPOINTS
// ============================================================================

/**
 * GET all order details
 */
app.get('/api/orderdetails', checkMongoConnection, async (req, res) => {
  try {
    const orderDetails = await orderDetailsCollection.find({}).toArray();
    res.json(orderDetails);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

/**
 * GET order detail by order ID
 */
app.get('/api/orderdetails/:orderId', checkMongoConnection, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const orderDetail = await orderDetailsCollection.findOne({ order_id: orderId });
    
    if (!orderDetail) {
      return res.status(404).json({ error: 'Order detail not found' });
    }
    
    res.json(orderDetail);
  } catch (error) {
    console.error('Error fetching order detail:', error);
    res.status(500).json({ error: 'Failed to fetch order detail' });
  }
});

// ============================================================================
// ADDRESS ENDPOINTS
// ============================================================================

/**
 * GET all provinces
 */
app.get('/api/provinces', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (!isMongoConnected || !provincesCollection) {
      console.warn('⚠️ MongoDB not connected, returning empty array');
      return res.json([]);
    }
    
    const provinces = await provincesCollection.find({}).toArray();
    console.log(`✅ Fetched ${provinces.length} provinces from MongoDB`);
    if (provinces.length === 0) {
      console.warn('⚠️ Provinces collection is empty!');
    }
    res.json(provinces);
  } catch (error) {
    console.error('❌ Error fetching provinces:', error);
    res.status(500).json({ error: 'Failed to fetch provinces', details: error.message });
  }
});

/**
 * GET all wards
 */
app.get('/api/wards', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (!isMongoConnected || !wardsCollection) {
      console.warn('⚠️ MongoDB not connected, returning empty array');
      return res.json([]);
    }
    
    const wards = await wardsCollection.find({}).toArray();
    console.log(`✅ Fetched ${wards.length} wards from MongoDB`);
    if (wards.length === 0) {
      console.warn('⚠️ Wards collection is empty!');
    }
    res.json(wards);
  } catch (error) {
    console.error('❌ Error fetching wards:', error);
    res.status(500).json({ error: 'Failed to fetch wards', details: error.message });
  }
});

/**
 * GET tree (hierarchical address structure)
 */
app.get('/api/tree', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (!isMongoConnected || !treeCollection) {
      console.warn('⚠️ MongoDB not connected, returning empty array');
      return res.json([]);
    }
    
    const tree = await treeCollection.find({}).toArray();
    console.log(`✅ Fetched ${tree.length} provinces from MongoDB tree collection`);
    if (tree.length === 0) {
      console.warn('⚠️ Tree collection is empty!');
    }
    res.json(tree);
  } catch (error) {
    console.error('❌ Error fetching tree:', error);
    res.status(500).json({ error: 'Failed to fetch tree', details: error.message });
  }
});

// ============================================================================
// ADDRESS ROUTES (User Address Management)
// ============================================================================

const addressRoutes = require('./routes/address');
app.use('/api/address', addressRoutes);

// ============================================================================
// REVIEWS ENDPOINTS
// ============================================================================

const reviewsRoutes = require('./routes/reviews');
app.use('/api/reviews', reviewsRoutes);

// ============================================================================
// CART ENDPOINTS
// ============================================================================

const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

// Wishlist routes
const wishlistRoutes = require('./routes/wishlist');
app.use('/api/wishlist', wishlistRoutes);

// Chat routes (với AI)
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// ============================================================================
// NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * Helper function: Create order status notification for user
 */
async function createOrderStatusNotification(customerId, orderId, status, orderTotal) {
  if (!notificationsCollection || !customerId || !orderId) {
    return;
  }

  let notificationType = 'order';
  let title = '';
  let message = '';
  
  switch (status) {
    case 'pending':
      title = 'Đơn hàng đã được tạo thành công';
      message = `Đơn hàng #${orderId} của bạn đã được tạo thành công. Chúng tôi sẽ xác nhận đơn hàng trong thời gian sớm nhất.`;
      break;
    case 'confirmed':
      title = 'Đơn hàng đã được xác nhận';
      message = `Đơn hàng #${orderId} của bạn đã được xác nhận và đang được chuẩn bị.`;
      break;
    case 'processing':
      title = 'Đơn hàng đang được xử lý';
      message = `Đơn hàng #${orderId} đang được xử lý và sẽ được giao trong thời gian sớm nhất.`;
      break;
    case 'shipping':
      title = 'Đơn hàng đang được giao';
      message = `Đơn hàng #${orderId} đang trên đường giao đến bạn. Vui lòng chuẩn bị sẵn sàng nhận hàng.`;
      break;
    case 'delivered':
    case 'completed':
      title = 'Đơn hàng đã giao thành công';
      message = `Đơn hàng #${orderId} đã được giao thành công. Cảm ơn bạn đã tin tưởng VGreen! Hãy đánh giá sản phẩm để nhận được nhiều ưu đãi hơn.`;
      break;
    case 'cancelled':
      title = 'Đơn hàng đã bị hủy';
      message = `Đơn hàng #${orderId} đã bị hủy. Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.`;
      break;
    case 'processing_return':
      title = 'Yêu cầu trả hàng đang được xử lý';
      message = `Yêu cầu trả hàng cho đơn hàng #${orderId} đang được xử lý. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.`;
      break;
    case 'returning':
      title = 'Đơn hàng đang được trả';
      message = `Đơn hàng #${orderId} đang trong quá trình trả hàng. Vui lòng chuẩn bị hàng hóa để hoàn trả.`;
      break;
    case 'returned':
      title = 'Đơn hàng đã được trả thành công';
      message = `Đơn hàng #${orderId} đã được trả thành công. Chúng tôi sẽ xử lý hoàn tiền trong thời gian sớm nhất.`;
      break;
    default:
      return; // Don't create notification for other statuses
  }

  try {
    await notificationsCollection.insertOne({
      type: notificationType,
      customerId: customerId,
      orderId: orderId,
      orderTotal: orderTotal,
      title: title,
      message: message,
      status: 'active',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ [Notifications] Created ${status} notification for order ${orderId}, customer ${customerId}`);
  } catch (error) {
    console.error(`❌ [Notifications] Error creating notification for order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Helper function: Create admin notification
 */
async function createAdminNotification(type, orderId, customerId, orderTotal, options = {}) {
  if (!notificationsCollection || !orderId) {
    return;
  }

  const title = options.title || 'Thông báo mới';
  const message = options.message || '';

  try {
    await notificationsCollection.insertOne({
      type: type,
      orderId: orderId,
      customerId: customerId || '',
      orderTotal: orderTotal || 0,
      title: title,
      message: message,
      status: 'active',
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ [Notifications] Created admin ${type} notification for order ${orderId}`);
  } catch (error) {
    console.error(`❌ [Notifications] Error creating admin notification for order ${orderId}:`, error);
    throw error;
  }
}

/**
 * GET /api/notifications - Get all notifications (for admin) or user notifications (if customerId provided)
 */
app.get('/api/notifications', checkMongoConnection, async (req, res) => {
  try {
    const { type, status, read, customerId } = req.query;
    
    const query = {};
    
    // If customerId is provided, filter by customerId (for user notifications)
    // If not, return all notifications (for admin)
    if (customerId) {
      query.customerId = customerId;
      // User notifications don't include admin-only types
      query.type = { $nin: ['order_cancellation_request', 'new_order', 'return_request', 'system'] };
    } else {
      // Admin: show admin notifications (new orders, cancellation requests, return requests, system)
      query.type = { $in: ['order_cancellation_request', 'new_order', 'return_request', 'system'] };
    }
    
    if (type && !customerId) query.type = type; // Only apply type filter for admin
    if (status) query.status = status;
    if (read !== undefined) query.read = read === 'true';
    
    const notifications = await notificationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/unread-count - Get count of unread notifications (admin or user)
 */
app.get('/api/notifications/unread-count', checkMongoConnection, async (req, res) => {
  try {
    const { customerId } = req.query;
    
    const query = { read: false };
    
    // If customerId is provided, count user notifications
    if (customerId) {
      query.customerId = customerId;
      // User notifications don't include admin-only types
      query.type = { $nin: ['order_cancellation_request', 'new_order', 'return_request', 'system'] };
    } else {
      // Admin: count admin notifications (new orders, cancellation requests, return requests, system)
      query.type = { $in: ['order_cancellation_request', 'new_order', 'return_request', 'system'] };
    }
    
    const count = await notificationsCollection.countDocuments(query);
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('❌ Error counting unread notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to count notifications',
      message: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id/read - Mark notification as read
 */
app.put('/api/notifications/:id/read', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await notificationsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification',
      message: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id/status - Update notification status (approve/reject cancellation)
 */
app.put('/api/notifications/:id/status', checkMongoConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action } = req.body; // action: 'approve' or 'reject'
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }
    
    const notification = await notificationsCollection.findOne({ _id: new ObjectId(id) });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // Update notification
    await notificationsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: newStatus,
          read: true,
          updatedAt: new Date() 
        } 
      }
    );
    
    // If approved and it's a cancellation request, update order status
    if (action === 'approve' && notification.type === 'order_cancellation_request') {
      try {
        const order = await Order.findOneAndUpdate(
          { OrderID: notification.orderId },
          { 
            status: 'cancelled',
            updatedAt: new Date() 
          },
          { new: true }
        );
        
        if (order) {
          console.log(`✅ [Notifications] Order ${notification.orderId} cancelled after admin approval`);
          
          // Create notification for user about cancellation
          try {
            await createOrderStatusNotification(
              notification.customerId,
              notification.orderId,
              'cancelled',
              notification.orderTotal
            );
          } catch (notifError) {
            console.error('❌ Error creating cancellation notification:', notifError);
          }
        }
      } catch (orderError) {
        console.error('❌ Error updating order status:', orderError);
        // Don't fail the notification update
      }
    }
    
    res.json({
      success: true,
      message: `Notification ${action === 'approve' ? 'approved' : 'rejected'}`,
      data: {
        id: id,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('❌ Error updating notification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification status',
      message: error.message
    });
  }
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
  console.log(`Database: ${DB_NAME}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  if (mongoClient) {
    console.log('📦 Closing MongoDB connection...');
    await mongoClient.close();
    console.log('✅ MongoDB connection closed');
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  if (mongoClient) {
    console.log('📦 Closing MongoDB connection...');
    await mongoClient.close();
    console.log('✅ MongoDB connection closed');
  }
  
  process.exit(0);
});

