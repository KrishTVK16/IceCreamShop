require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Use msnodesqlv8 for Windows Authentication support
let sql;
try {
    sql = require('mssql/msnodesqlv8');
} catch (err) {
    // Fallback to regular mssql if msnodesqlv8 not available
    sql = require('mssql');
    console.warn('⚠️  msnodesqlv8 not available, using tedious driver (Windows Auth may not work)');
}

const app = express();

// Admin email used for elevated stats (keep in sync with frontend)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'onlyvamsi08@gmail.com';
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
    : undefined;

app.use(cors({
    origin: corsOrigins || true,
    credentials: Boolean(corsOrigins)
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;

const buildDbConfig = () => {
    // Build object-based config (better for msnodesqlv8)
    // Note: Connection strings don't work well with msnodesqlv8, use object config instead
    if (!process.env.DB_SERVER || !process.env.DB_NAME) {
        throw new Error('DB_SERVER and DB_NAME must be provided.');
    }

    // Build server string with instance if provided
    let serverString = process.env.DB_SERVER;
    if (process.env.DB_INSTANCE) {
        serverString = `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE}`;
    }

    // Object-based config works better with msnodesqlv8
    const baseConfig = {
        server: serverString,
        database: process.env.DB_NAME,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
            enableArithAbort: true,
            connectTimeout: 30000,
            requestTimeout: 30000
        },
        pool: {
            max: Number(process.env.DB_POOL_MAX) || 10,
            min: Number(process.env.DB_POOL_MIN) || 0,
            idleTimeoutMillis: Number(process.env.DB_POOL_IDLE) || 30000
        }
    };

    // Only set port if no instance name (instance name includes port info)
    if (process.env.DB_PORT && !process.env.DB_INSTANCE) {
        baseConfig.port = Number(process.env.DB_PORT);
    }

    // SQL Server Authentication
    if (process.env.DB_USER && process.env.DB_USER.trim()) {
        baseConfig.user = process.env.DB_USER;
        baseConfig.password = process.env.DB_PASS || '';
    }
    // Windows Authentication - when user/password are empty, msnodesqlv8 uses Windows Auth automatically
    
    return baseConfig;
};

let poolPromise = null;
let isConnecting = false;

const connectDb = async () => {
    if (poolPromise) return poolPromise;
    if (isConnecting) {
        // Wait for existing connection attempt
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (poolPromise && !isConnecting) {
                    clearInterval(checkInterval);
                    resolve(poolPromise);
                }
            }, 100);
        });
    }

    isConnecting = true;
    const dbConfig = buildDbConfig();

    // Log the connection attempt for debugging
    if (typeof dbConfig === 'string') {
        console.log('📝 Attempting connection with connection string...');
        console.log('Connection string:', dbConfig.replace(/Password=[^;]+/gi, 'Password=***'));
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('✔ Connected to MSSQL via connection string');
                isConnecting = false;
                return pool;
            })
            .catch(err => {
                console.error('❌ Database connection failed');
                console.error('Error message:', err.message || 'No message');
                console.error('Error code:', err.code || 'No code');
                console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
                if (err.originalError) {
                    console.error('Original error:', JSON.stringify(err.originalError, Object.getOwnPropertyNames(err.originalError), 2));
                }
                isConnecting = false;
                poolPromise = null;
                return null;
            });
    } else {
        console.log(`📝 Attempting connection to: ${dbConfig.server}`);
        console.log(`Database: ${dbConfig.database}`);
        console.log(`Auth: ${dbConfig.user ? 'SQL Auth' : 'Windows Auth'}`);
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('✔ Connected to MSSQL');
                isConnecting = false;
                return pool;
            })
            .catch(err => {
                console.error('❌ Database connection failed');
                console.error('Error message:', err.message || 'No message');
                console.error('Error code:', err.code || 'No code');
                console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
                if (err.originalError) {
                    console.error('Original error:', JSON.stringify(err.originalError, Object.getOwnPropertyNames(err.originalError), 2));
                }
                console.error('Config used:', JSON.stringify({...dbConfig, password: '***', user: dbConfig.user ? '***' : undefined}, null, 2));
                isConnecting = false;
                poolPromise = null;
                return null;
            });
    }

    return poolPromise;
};

// Initialize connection
connectDb();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asyncHandler = fn => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        console.error('Unhandled error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

app.get('/api/health', asyncHandler(async (_req, res) => {
    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ status: 'error', message: 'Database not connected' });
    }
    try {
        await pool.request().query('SELECT 1 AS ok');
        res.json({ status: 'ok' });
    } catch (err) {
        res.status(503).json({ status: 'error', message: 'Database query failed' });
    }
}));

app.post('/api/register', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ message: 'Valid email is required.' });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const existing = await pool.request()
        .input('email', sql.NVarChar, email)
        .query('SELECT 1 FROM Users WHERE Email = @email');

    if (existing.recordset.length) {
        return res.status(409).json({ message: 'Email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.request()
        .input('email', sql.NVarChar, email)
        .input('hash', sql.NVarChar, hash)
        .query('INSERT INTO Users (Email, PasswordHash) VALUES (@email, @hash)');

    res.status(201).json({ message: 'Registered Successfully' });
}));

app.post('/api/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !emailRegex.test(email) || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query('SELECT TOP 1 * FROM Users WHERE Email = @email');

    if (!result.recordset.length) {
        return res.status(401).json({ message: 'Invalid Credentials' });
    }

    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.PasswordHash);

    if (!match) {
        return res.status(401).json({ message: 'Invalid Credentials' });
    }

    // Record login session
    await pool.request()
        .input('userId', sql.Int, user.Id)
        .query('INSERT INTO UserSessions (UserId, IsActive) VALUES (@userId, 1)');

    res.json({ 
        message: 'Login Successful',
        user: {
            id: user.Id,
            email: user.Email,
            createdAt: user.CreatedAt
        }
    });
}));

app.post('/api/contact', asyncHandler(async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || name.trim().length < 3) {
        return res.status(400).json({ message: 'Name must be at least 3 characters.' });
    }
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ message: 'Valid email is required.' });
    }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ message: 'Phone number must be 10 digits starting with 6-9.' });
    }
    if (!message || message.trim().length < 10) {
        return res.status(400).json({ message: 'Message must be at least 10 characters.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }
    await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .input('email', sql.NVarChar, email.trim())
        .input('phone', sql.NVarChar, phone.trim())
        .input('message', sql.NVarChar, message.trim())
        .query(`
            INSERT INTO ContactMessages (Name, Email, Phone, Message)
            VALUES (@name, @email, @phone, @message)
        `);

    res.status(201).json({ message: 'Message submitted successfully' });
}));

// Logout endpoint
app.post('/api/logout', asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    // Update active session with logout time
    await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            UPDATE UserSessions 
            SET LogoutTime = SYSUTCDATETIME(), IsActive = 0
            WHERE UserId = @userId AND IsActive = 1
        `);

    res.json({ message: 'Logout recorded successfully' });
}));

// Save cart endpoint
app.post('/api/cart', asyncHandler(async (req, res) => {
    const { userId, items } = req.body;

    if (!userId || !Array.isArray(items)) {
        return res.status(400).json({ message: 'User ID and items array are required.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // Clear existing cart
        await transaction.request()
            .input('userId', sql.Int, userId)
            .query('DELETE FROM Carts WHERE UserId = @userId');

        // Insert new cart items
        for (const item of items) {
            await transaction.request()
                .input('userId', sql.Int, userId)
                .input('itemName', sql.NVarChar, item.name)
                .input('price', sql.Decimal(10, 2), item.price)
                .input('quantity', sql.Int, item.quantity)
                .query(`
                    INSERT INTO Carts (UserId, ItemName, Price, Quantity)
                    VALUES (@userId, @itemName, @price, @quantity)
                `);
        }

        await transaction.commit();
        res.json({ message: 'Cart saved successfully' });
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}));

// Get cart endpoint
app.get('/api/cart/:userId', asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!userId) {
        return res.status(400).json({ message: 'Valid user ID is required.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT ItemName as name, Price as price, Quantity as quantity FROM Carts WHERE UserId = @userId');

    res.json({ items: result.recordset });
}));

// Create order endpoint
app.post('/api/orders', asyncHandler(async (req, res) => {
    const { userId, items, totalAmount } = req.body;

    if (!userId || !Array.isArray(items) || !totalAmount) {
        return res.status(400).json({ message: 'User ID, items array, and total amount are required.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // Create order
        const orderResult = await transaction.request()
            .input('userId', sql.Int, userId)
            .input('totalAmount', sql.Decimal(10, 2), totalAmount)
            .query(`
                INSERT INTO Orders (UserId, TotalAmount, Status)
                OUTPUT INSERTED.Id
                VALUES (@userId, @totalAmount, 'Pending')
            `);

        const orderId = orderResult.recordset[0].Id;

        // Insert order items
        for (const item of items) {
            const subTotal = item.price * item.quantity;
            await transaction.request()
                .input('orderId', sql.Int, orderId)
                .input('itemName', sql.NVarChar, item.name)
                .input('price', sql.Decimal(10, 2), item.price)
                .input('quantity', sql.Int, item.quantity)
                .input('subTotal', sql.Decimal(10, 2), subTotal)
                .query(`
                    INSERT INTO OrderItems (OrderId, ItemName, Price, Quantity, SubTotal)
                    VALUES (@orderId, @itemName, @price, @quantity, @subTotal)
                `);
        }

        // Clear cart after order
        await transaction.request()
            .input('userId', sql.Int, userId)
            .query('DELETE FROM Carts WHERE UserId = @userId');

        await transaction.commit();
        res.status(201).json({ message: 'Order created successfully', orderId });
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}));

// Get orders endpoint
app.get('/api/orders/:userId', asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!userId) {
        return res.status(400).json({ message: 'Valid user ID is required.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const ordersResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT Id, TotalAmount, Status, CreatedAt
            FROM Orders
            WHERE UserId = @userId
            ORDER BY CreatedAt DESC
        `);

    const orders = ordersResult.recordset;

    // Get order items for each order
    for (const order of orders) {
        const itemsResult = await pool.request()
            .input('orderId', sql.Int, order.Id)
            .query(`
                SELECT ItemName as name, Price as price, Quantity as quantity, SubTotal
                FROM OrderItems
                WHERE OrderId = @orderId
            `);
        order.items = itemsResult.recordset;
    }

    res.json({ orders });
}));

// Get user stats endpoint
app.get('/api/user/stats/:userId', asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!userId) {
        return res.status(400).json({ message: 'Valid user ID is required.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    // First, fetch the user to know if they are admin
    const userResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT TOP 1 Email FROM Users WHERE Id = @userId');

    if (!userResult.recordset.length) {
        return res.status(404).json({ message: 'User not found.' });
    }

    const userEmail = userResult.recordset[0].Email;
    const isAdmin = userEmail === ADMIN_EMAIL;

    if (isAdmin) {
        // Admin sees overall shop stats
        const statsResult = await pool.request().query(`
            SELECT
                -- Overall totals
                (SELECT COUNT(*) FROM Orders) AS totalOrders,
                (SELECT ISNULL(SUM(TotalAmount), 0) FROM Orders) AS totalRevenue,

                -- Today's revenue
                (SELECT ISNULL(SUM(TotalAmount), 0)
                 FROM Orders
                 WHERE CAST(CreatedAt AS DATE) = CAST(SYSUTCDATETIME() AS DATE)) AS revenueToday,

                -- This month's revenue
                (SELECT ISNULL(SUM(TotalAmount), 0)
                 FROM Orders
                 WHERE YEAR(CreatedAt) = YEAR(SYSUTCDATETIME())
                   AND MONTH(CreatedAt) = MONTH(SYSUTCDATETIME())) AS revenueMonth,

                -- Status breakdown
                (SELECT COUNT(*) FROM Orders WHERE Status = 'Pending') AS pendingOrders,
                (SELECT COUNT(*) FROM Orders WHERE Status = 'Accepted') AS acceptedOrders,
                (SELECT COUNT(*) FROM Orders WHERE Status = 'Completed') AS completedOrders
        `);

        const row = statsResult.recordset[0] || {};

        return res.json({
            mode: 'admin',
            totalOrders: row.totalOrders || 0,
            totalRevenue: parseFloat(row.totalRevenue || 0),
            revenueToday: parseFloat(row.revenueToday || 0),
            revenueMonth: parseFloat(row.revenueMonth || 0),
            pendingOrders: row.pendingOrders || 0,
            acceptedOrders: row.acceptedOrders || 0,
            completedOrders: row.completedOrders || 0
        });
    }

    // Normal user: personal stats only
    const statsResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT 
                COUNT(DISTINCT O.Id) as totalOrders,
                ISNULL(SUM(O.TotalAmount), 0) as totalSpent
            FROM Orders O
            WHERE O.UserId = @userId
        `);

    const stats = statsResult.recordset[0] || { totalOrders: 0, totalSpent: 0 };

    res.json({
        mode: 'user',
        totalOrders: stats.totalOrders,
        totalSpent: parseFloat(stats.totalSpent || 0)
    });
}));

// ---------------- ADMIN ENDPOINTS (basic, no auth) ----------------

// Get all users with basic stats
app.get('/api/admin/users', asyncHandler(async (_req, res) => {
    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const result = await pool.request().query(`
        SELECT 
            U.Id,
            U.Email,
            U.CreatedAt,
            ISNULL(COUNT(DISTINCT O.Id), 0) AS TotalOrders,
            ISNULL(SUM(O.TotalAmount), 0) AS TotalSpent
        FROM Users U
        LEFT JOIN Orders O ON O.UserId = U.Id
        GROUP BY U.Id, U.Email, U.CreatedAt
        ORDER BY U.CreatedAt DESC
    `);

    res.json({ users: result.recordset });
}));

// Get all orders with user email
app.get('/api/admin/orders', asyncHandler(async (_req, res) => {
    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const result = await pool.request().query(`
        SELECT 
            O.Id,
            O.UserId,
            U.Email,
            O.TotalAmount,
            O.Status,
            O.CreatedAt
        FROM Orders O
        INNER JOIN Users U ON U.Id = O.UserId
        ORDER BY O.CreatedAt DESC
    `);

    res.json({ orders: result.recordset });
}));

// Update order status (Pending / Accepted / Completed)
app.patch('/api/admin/orders/:orderId/status', asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.orderId);
    const { status } = req.body;

    if (!orderId || !status) {
        return res.status(400).json({ message: 'Order ID and status are required.' });
    }

    const allowedStatuses = ['Pending', 'Accepted', 'Completed'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
    }

    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    await pool.request()
        .input('orderId', sql.Int, orderId)
        .input('status', sql.NVarChar, status)
        .query(`
            UPDATE Orders
            SET Status = @status
            WHERE Id = @orderId
        `);

    res.json({ message: 'Order status updated successfully.' });
}));

// Get recent contact messages
app.get('/api/admin/contacts', asyncHandler(async (_req, res) => {
    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const result = await pool.request().query(`
        SELECT TOP 100
            Id,
            Name,
            Email,
            Phone,
            Message,
            CreatedAt
        FROM ContactMessages
        ORDER BY CreatedAt DESC
    `);

    res.json({ contacts: result.recordset });
}));

// Simple admin summary
app.get('/api/admin/summary', asyncHandler(async (_req, res) => {
    const pool = await connectDb();
    if (!pool) {
        return res.status(503).json({ message: 'Database connection unavailable. Please try again later.' });
    }

    const result = await pool.request().query(`
        SELECT
            (SELECT COUNT(*) FROM Users) AS totalUsers,
            (SELECT COUNT(*) FROM Orders) AS totalOrders,
            (SELECT ISNULL(SUM(TotalAmount),0) FROM Orders) AS totalRevenue,
            (SELECT COUNT(*) FROM ContactMessages) AS totalContacts
    `);

    const row = result.recordset[0] || {
        totalUsers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalContacts: 0
    };

    res.json({
        totalUsers: row.totalUsers,
        totalOrders: row.totalOrders,
        totalRevenue: parseFloat(row.totalRevenue || 0),
        totalContacts: row.totalContacts
    });
}));

app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server Running on port ${PORT}`);
});
