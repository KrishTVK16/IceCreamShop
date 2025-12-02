# Complete Manual Setup Guide - Rockz & Rollz Application

## Table of Contents
1. [Prerequisites Check](#prerequisites-check)
2. [Method 1: Windows Authentication (Current Setup)](#method-1-windows-authentication-current-setup)
3. [Method 2: Connection String Approach](#method-2-connection-string-approach)
4. [Method 3: SQL Server Authentication](#method-3-sql-server-authentication)
5. [Troubleshooting](#troubleshooting)
6. [Testing & Verification](#testing--verification)

---

## Prerequisites Check

### Step 1: Verify SQL Server Installation
1. Open **SQL Server Management Studio (SSMS)**
2. Connect to: `TVK-5559-PC\SQLEXPRESS` (your server name)
3. Use **Windows Authentication**
4. If connection succeeds, your server name is: `TVK-5559-PC\SQLEXPRESS`

### Step 2: Verify Database Exists
1. In SSMS, expand **Databases**
2. Check if `RRzDBdev_1` exists
3. If NOT exists, run this in SSMS:
   ```sql
   CREATE DATABASE RRzDBdev_1;
   GO
   ```

### Step 3: Verify Node.js Installation
1. Open PowerShell
2. Run: `node --version` (should show v24.11.1 or similar)
3. Run: `npm --version` (should show version number)

### Step 4: Check Project Location
- Navigate to: `E:\RockzAndRollz\backend`
- Verify these files exist:
  - `package.json`
  - `server.js`
  - `.env` (or create it)
  - `db.sql`

---

## Method 1: Windows Authentication (Current Setup)

### Step 1: Install Dependencies
```powershell
cd E:\RockzAndRollz\backend
npm install
```

### Step 2: Install Windows Auth Driver
```powershell
npm install msnodesqlv8 --save
```

### Step 3: Create/Update .env File
Create file: `E:\RockzAndRollz\backend\.env`

**Content:**
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
DB_USER=
DB_PASS=
```

### Step 4: Verify server.js Uses msnodesqlv8
Open `server.js` and ensure it starts with:
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Use msnodesqlv8 for Windows Authentication
let sql;
try {
    sql = require('mssql/msnodesqlv8');
} catch (err) {
    sql = require('mssql');
    console.warn('⚠️  msnodesqlv8 not available');
}
```

### Step 5: Create Database Tables
In SSMS, open `db.sql` and execute it, OR run:
```powershell
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -i db.sql
```

### Step 6: Test Connection
```powershell
cd E:\RockzAndRollz\backend
node server.js
```

**Expected Output:**
```
🚀 Server Running on port 3000
✔ Connected to MSSQL
```

**If you see errors, proceed to Method 2 or 3.**

---

## Method 2: Connection String Approach

If Windows Authentication doesn't work, use a connection string.

### Step 1: Update server.js to Support Connection String

Replace the `buildDbConfig()` function in `server.js` with:

```javascript
const buildDbConfig = () => {
    // Option 1: Use connection string from .env
    if (process.env.DB_CONNECTION_STRING) {
        return process.env.DB_CONNECTION_STRING;
    }

    // Option 2: Build connection string
    if (!process.env.DB_SERVER || !process.env.DB_NAME) {
        throw new Error('DB_SERVER and DB_NAME must be provided.');
    }

    let serverString = process.env.DB_SERVER;
    if (process.env.DB_INSTANCE) {
        serverString = `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE}`;
    }

    // Windows Authentication Connection String
    const connectionString = `Server=${serverString};Database=${process.env.DB_NAME};Trusted_Connection=True;TrustServerCertificate=True;`;

    return connectionString;
};
```

### Step 2: Update connectDb() Function

Replace the `connectDb()` function with:

```javascript
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
    
    // Use connection string if it's a string
    if (typeof dbConfig === 'string') {
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('✔ Connected to MSSQL via connection string');
                isConnecting = false;
                return pool;
            })
            .catch(err => {
                console.error('❌ Database connection failed:', err.message);
                isConnecting = false;
                poolPromise = null;
                return null;
            });
    } else {
        // Original object-based config
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
```

### Step 3: Update .env File

**Option A: Full Connection String**
```
PORT=3000
DB_CONNECTION_STRING=Server=TVK-5559-PC\SQLEXPRESS;Database=RRzDBdev_1;Trusted_Connection=True;TrustServerCertificate=True;
```

**Option B: Individual Parameters (auto-built)**
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
```

### Step 4: Test
```powershell
cd E:\RockzAndRollz\backend
node server.js
```

---

## Method 3: SQL Server Authentication

If Windows Auth doesn't work, create a SQL login.

### Step 1: Enable SQL Server Authentication

1. Open **SQL Server Configuration Manager**
   - Press `Win + R`, type: `SQLServerManager15.msc` (or `SQLServerManager14.msc` for older versions)
   - Press Enter

2. OR use SSMS:
   - Right-click server → **Properties** → **Security**
   - Select **SQL Server and Windows Authentication mode**
   - Click **OK**
   - **Restart SQL Server** (Services → SQL Server (SQLEXPRESS) → Restart)

### Step 2: Create SQL Login

**In SSMS, run this SQL:**

```sql
USE [master]
GO

-- Create login
CREATE LOGIN [rrz_app_user] WITH PASSWORD = 'YourSecurePassword123!', 
    DEFAULT_DATABASE = [RRzDBdev_1],
    CHECK_EXPIRATION = OFF,
    CHECK_POLICY = OFF;
GO

-- Grant access to database
USE [RRzDBdev_1]
GO

CREATE USER [rrz_app_user] FOR LOGIN [rrz_app_user];
ALTER ROLE [db_owner] ADD MEMBER [rrz_app_user];
GO
```

**OR use PowerShell:**
```powershell
cd E:\RockzAndRollz\backend
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -Q "CREATE LOGIN [rrz_app_user] WITH PASSWORD = 'YourSecurePassword123!', DEFAULT_DATABASE = [RRzDBdev_1], CHECK_EXPIRATION = OFF, CHECK_POLICY = OFF;"
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -d RRzDBdev_1 -Q "CREATE USER [rrz_app_user] FOR LOGIN [rrz_app_user]; ALTER ROLE [db_owner] ADD MEMBER [rrz_app_user];"
```

### Step 3: Update .env File
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
DB_USER=rrz_app_user
DB_PASS=YourSecurePassword123!
```

### Step 4: Test SQL Login
```powershell
sqlcmd -S TVK-5559-PC\SQLEXPRESS -U rrz_app_user -P "YourSecurePassword123!" -Q "SELECT 'Connection successful!'"
```

### Step 5: Test Server
```powershell
cd E:\RockzAndRollz\backend
node server.js
```

---

## Troubleshooting

### Issue 1: "Failed to connect to localhost\SQLEXPRESS"

**Solutions:**
1. **Verify server name matches SSMS:**
   ```
   DB_SERVER=TVK-5559-PC
   ```

2. **Check SQL Server is running:**
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*SQL*"}
   ```
   If stopped, start it:
   ```powershell
   Start-Service -Name "MSSQL$SQLEXPRESS"
   ```

3. **Check TCP/IP is enabled:**
   - Open **SQL Server Configuration Manager**
   - **SQL Server Network Configuration** → **Protocols for SQLEXPRESS**
   - Enable **TCP/IP**
   - Restart SQL Server

4. **Check SQL Server Browser is running:**
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*Browser*"}
   Start-Service -Name "SQLBrowser"
   ```

### Issue 2: "Login failed for user"

**Solutions:**
1. Verify login exists:
   ```sql
   SELECT name FROM sys.server_principals WHERE name = 'rrz_app_user';
   ```

2. Check password is correct in `.env`

3. Verify SQL Server Authentication is enabled (Method 3, Step 1)

### Issue 3: "Database 'RRzDBdev_1' does not exist"

**Solution:**
```sql
CREATE DATABASE RRzDBdev_1;
GO
```

Then run `db.sql` to create tables.

### Issue 4: "msnodesqlv8 module not found"

**Solution:**
```powershell
cd E:\RockzAndRollz\backend
npm install msnodesqlv8 --save
```

If installation fails, use Method 2 (Connection String) or Method 3 (SQL Auth).

### Issue 5: Port 3000 already in use

**Solution:**
1. Find process using port 3000:
   ```powershell
   netstat -ano | findstr :3000
   ```
2. Kill the process (replace PID with actual number):
   ```powershell
   taskkill /PID <PID> /F
   ```
3. OR change port in `.env`:
   ```
   PORT=3001
   ```

### Issue 6: "Cannot find module 'mssql'"

**Solution:**
```powershell
cd E:\RockzAndRollz\backend
npm install
```

---

## Testing & Verification

### Step 1: Test Database Connection
```powershell
# Windows Auth
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -Q "SELECT @@VERSION"

# SQL Auth
sqlcmd -S TVK-5559-PC\SQLEXPRESS -U rrz_app_user -P "YourPassword" -Q "SELECT @@VERSION"
```

### Step 2: Test Backend Server
```powershell
cd E:\RockzAndRollz\backend
node server.js
```

**Expected:**
```
🚀 Server Running on port 3000
✔ Connected to MSSQL
```

### Step 3: Test API Health Endpoint
Open browser or PowerShell:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health -UseBasicParsing
```

**Expected:** `{"status":"ok"}`

### Step 4: Test Database Tables
```sql
-- In SSMS or sqlcmd
USE RRzDBdev_1;
SELECT COUNT(*) FROM Users;
SELECT COUNT(*) FROM ContactMessages;
```

### Step 5: Test Frontend
```powershell
cd E:\RockzAndRollz
npx http-server -p 5500 .
```

Open: `http://localhost:5500`

### Step 6: Test Registration
1. Go to Login page
2. Click "Create account"
3. Enter email and password
4. Submit
5. Check database:
   ```sql
   SELECT * FROM Users;
   ```

### Step 7: Test Contact Form
1. Fill contact form
2. Submit
3. Check database:
   ```sql
   SELECT * FROM ContactMessages;
   ```

---

## Complete .env File Examples

### Example 1: Windows Auth (Method 1)
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
DB_USER=
DB_PASS=
```

### Example 2: Connection String (Method 2)
```
PORT=3000
DB_CONNECTION_STRING=Server=TVK-5559-PC\SQLEXPRESS;Database=RRzDBdev_1;Trusted_Connection=True;TrustServerCertificate=True;
```

### Example 3: SQL Auth (Method 3)
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
DB_USER=rrz_app_user
DB_PASS=YourSecurePassword123!
```

---

## Quick Reference: Connection Strings

### Windows Authentication
```
Server=TVK-5559-PC\SQLEXPRESS;Database=RRzDBdev_1;Trusted_Connection=True;TrustServerCertificate=True;
```

### SQL Server Authentication
```
Server=TVK-5559-PC\SQLEXPRESS;Database=RRzDBdev_1;User Id=rrz_app_user;Password=YourPassword;TrustServerCertificate=True;
```

---

## Final Checklist

- [ ] SQL Server is running
- [ ] Database `RRzDBdev_1` exists
- [ ] Tables `Users` and `ContactMessages` exist
- [ ] `.env` file is configured correctly
- [ ] Dependencies installed (`npm install`)
- [ ] `msnodesqlv8` installed (for Windows Auth)
- [ ] Backend server starts without errors
- [ ] API health endpoint returns `{"status":"ok"}`
- [ ] Frontend server runs on port 5500
- [ ] Can register new users
- [ ] Can login with registered users
- [ ] Contact form saves to database

---

## Need Help?

If all methods fail:
1. Check SQL Server error logs: `C:\Program Files\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQL\Log\`
2. Check Node.js console for detailed error messages
3. Verify firewall allows port 1433 (SQL Server) and 3000 (Backend)
4. Try connecting with SSMS first to verify SQL Server works
5. Verify server name in SSMS: Right-click server → Properties → General → Server name should be `TVK-5559-PC\SQLEXPRESS`

---

**Configuration:**
- **Server**: `TVK-5559-PC\SQLEXPRESS`
- **Database**: `RRzDBdev_1`
- **Authentication**: Windows Authentication (uses your Windows credentials)

**Last Updated:** Based on SQL Server Management Studio 15.0.18131.0 with Windows Authentication

