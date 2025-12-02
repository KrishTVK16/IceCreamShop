// Alternative server.js with Connection String support
// Use this if the regular server.js doesn't work with Windows Authentication
// Rename this to server.js (backup original first)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Use msnodesqlv8 for Windows Authentication support
let sql;
try {
    sql = require('mssql/msnodesqlv8');
} catch (err) {
    sql = require('mssql');
    console.warn('⚠️  msnodesqlv8 not available, using tedious driver');
}

const app = express();
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
    // Option 1: Use connection string from .env (PRIORITY)
    if (process.env.DB_CONNECTION_STRING && process.env.DB_CONNECTION_STRING.trim()) {
        console.log('📝 Using connection string from DB_CONNECTION_STRING');
        return process.env.DB_CONNECTION_STRING.trim();
    }

    // Option 2: Build connection string or config object
    if (!process.env.DB_SERVER || !process.env.DB_NAME) {
        throw new Error('DB_SERVER and DB_NAME must be provided, or set DB_CONNECTION_STRING');
    }

    let serverString = process.env.DB_SERVER;
    if (process.env.DB_INSTANCE) {
        serverString = `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE}`;
    }

    // If USE_CONNECTION_STRING is set, build connection string
    if (process.env.USE_CONNECTION_STRING === 'true') {
        let connString = `Server=${serverString};Database=${process.env.DB_NAME};`;
        
        if (process.env.DB_USER && process.env.DB_USER.trim()) {
            // SQL Server Authentication
            connString += `User Id=${process.env.DB_USER};Password=${process.env.DB_PASS || ''};`;
        } else {
            // Windows Authentication
            connString += `Trusted_Connection=True;`;
        }
        
        connString += `TrustServerCertificate=True;`;
        
        if (process.env.DB_ENCRYPT === 'true') {
            connString += `Encrypt=True;`;
        }
        
        console.log('📝 Using built connection string');
        return connString;
    }

    // Option 3: Use object-based config (original method)
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

    if (process.env.DB_PORT && !process.env.DB_INSTANCE) {
        baseConfig.port = Number(process.env.DB_PORT);
    }

    if (process.env.DB_USER && process.env.DB_USER.trim()) {
        baseConfig.user = process.env.DB_USER;
        baseConfig.password = process.env.DB_PASS || '';
    }

    console.log('📝 Using object-based config');
    return baseConfig;
};

let poolPromise = null;
let isConnecting = false;

const connectDb = async () => {
    if (poolPromise) return poolPromise;
    if (isConnecting) {
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
    
    // Handle connection string (string) vs config object
    if (typeof dbConfig === 'string') {
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('✔ Connected to MSSQL via connection string');
                isConnecting = false;
                return pool;
            })
            .catch(err => {
                console.error('❌ Database connection failed:', err.message);
                console.error('Connection string used:', dbConfig.replace(/Password=[^;]+/, 'Password=***'));
                isConnecting = false;
                poolPromise = null;
                return null;
            });
    } else {
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('✔ Connected to MSSQL');
                isConnecting = false;
                return pool;
            })
            .catch(err => {
                console.error('❌ Database connection failed:', err.message);
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

    res.json({ message: 'Login Successful' });
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

app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server Running on port ${PORT}`);
});

