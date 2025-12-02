# Quick Start Guide - Choose Your Method

## Current Status Check

First, test if current setup works:
```powershell
cd E:\RockzAndRollz\backend
node server.js
```

If you see `✔ Connected to MSSQL` → **You're done!** ✅

If you see connection errors → Follow one of these methods:

---

## Method A: Connection String (Easiest)

### Step 1: Update .env
```
PORT=3000
DB_CONNECTION_STRING=Server=TVK-5559-PC\SQLEXPRESS;Database=RRzDBdev_1;Trusted_Connection=True;TrustServerCertificate=True;
```

### Step 2: Use Alternative Server
```powershell
# Backup current server.js
copy server.js server_backup.js

# Use connection string version
copy server_connection_string.js server.js
```

### Step 3: Test
```powershell
node server.js
```

---

## Method B: Current Configuration (Already Set)

### Current .env
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
DB_USER=
DB_PASS=
```

This is already configured with your server name from SSMS.

---

## Method C: Create SQL Login (If Windows Auth Fails)

### Step 1: In SSMS, run:
```sql
CREATE LOGIN [rrz_app_user] WITH PASSWORD = 'MyPassword123!', 
    DEFAULT_DATABASE = [RRzDBdev_1],
    CHECK_EXPIRATION = OFF,
    CHECK_POLICY = OFF;
GO

USE [RRzDBdev_1]
GO
CREATE USER [rrz_app_user] FOR LOGIN [rrz_app_user];
ALTER ROLE [db_owner] ADD MEMBER [rrz_app_user];
GO
```

### Step 2: Update .env
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
DB_USER=rrz_app_user
DB_PASS=MyPassword123!
```

---

## Full Documentation

See `MANUAL_SETUP_GUIDE.md` for complete step-by-step instructions.

