const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const { sendOTPEmail, generateOTP } = require('./email-service');

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
console.log('\n🔗 Attempting to connect to MongoDB...');
console.log(`   URI: ${MONGODB_URI}`);
console.log(`   Database: ${DB_NAME}\n`);

MongoClient.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  connectTimeoutMS: 5000
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
 * POST admin login
 * Kiểm tra trong collection 'admins' trước, sau đó mới kiểm tra 'users' với role admin
 */
app.post('/api/auth/login', checkMongoConnection, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('\n🔐 === LOGIN REQUEST ===');
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
    
    res.json({
      token: token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    console.log('======================\n');
    res.status(500).json({ error: 'Lỗi đăng nhập' });
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
 * POST create new user
 */
app.post('/api/users', checkMongoConnection, async (req, res) => {
  try {
    const newUser = req.body;
    const result = await usersCollection.insertOne(newUser);
    res.status(201).json({ message: 'User created', id: result.insertedId });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT update user
 */
app.put('/api/users/:id', checkMongoConnection, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updateData = req.body;
    
    const result = await usersCollection.updateOne(
      { user_id: userId },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User updated' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE user
 */
app.delete('/api/users/:id', checkMongoConnection, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await usersCollection.deleteOne({ user_id: userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================================================
// ORDERS ENDPOINTS
// ============================================================================

/**
 * GET all orders
 */
app.get('/api/orders', checkMongoConnection, async (req, res) => {
  try {
    const orders = await ordersCollection.find({}).toArray();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
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

// ============================================================================
// PRODUCTS ENDPOINTS
// ============================================================================

/**
 * GET all products
 */
app.get('/api/products', checkMongoConnection, async (req, res) => {
  try {
    const products = await productsCollection.find({}).toArray();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET product by ID
 */
app.get('/api/products/:id', checkMongoConnection, async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
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
    res.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Failed to fetch promotions' });
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

