# Database Connectivity Checking Methods

## Quick Checklist

### ✅ Method 1: Check SQL Server is Running
```powershell
Get-Service | Where-Object {$_.Name -like "*SQL*"}
```

**Expected:** You should see services like:
- `MSSQL$SQLEXPRESS` - Status: Running
- `SQLBrowser` - Status: Running (optional but recommended)

**If stopped:**
```powershell
Start-Service -Name "MSSQL$SQLEXPRESS"
Start-Service -Name "SQLBrowser"
```

---

### ✅ Method 2: Test SQL Server Connection (Windows Auth)
```powershell
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -Q "SELECT @@VERSION"
```

**Expected:** Should return SQL Server version information

**If fails:** SQL Server is not accessible or not running

---

### ✅ Method 3: Check Database Exists
```powershell
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -Q "SELECT name FROM sys.databases WHERE name = 'RRzDBdev_1'"
```

**Expected:** Should return `RRzDBdev_1`

**If empty:** Database doesn't exist - create it:
```sql
CREATE DATABASE RRzDBdev_1;
GO
```

---

### ✅ Method 4: Check Tables Exist
```powershell
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -d RRzDBdev_1 -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
```

**Expected:** Should return:
- `Users`
- `ContactMessages`

**If empty:** Run `db.sql`:
```powershell
cd E:\RockzAndRollz\backend
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -i db.sql
```

---

### ✅ Method 5: Verify .env File Configuration
```powershell
cd E:\RockzAndRollz\backend
Get-Content .env
```

**Expected:**
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
DB_USER=
DB_PASS=
```

**If missing:** Copy from `env.sample`:
```powershell
Copy-Item env.sample .env
```

---

### ✅ Method 6: Check Dependencies Installed
```powershell
cd E:\RockzAndRollz\backend
npm list msnodesqlv8 mssql
```

**Expected:** Should show versions installed

**If missing:**
```powershell
npm install
```

---

### ✅ Method 7: Test Backend Server Start
```powershell
cd E:\RockzAndRollz\backend
node server.js
```

**Expected Output:**
```
🚀 Server Running on port 3000
✔ Connected to MSSQL via connection string
```

**If you see errors:**
- `❌ Database connection failed` → Check Methods 1-4
- `Cannot find module` → Run `npm install`
- `Port 3000 already in use` → Change PORT in .env or kill process

**To stop:** Press `Ctrl+C`

---

### ✅ Method 8: Test API Health Endpoint
**While server is running**, open new PowerShell:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health -UseBasicParsing
```

**Expected:** Status Code: 200, Content: `{"status":"ok"}`

**If fails:**
- Server not running → Use Method 7
- Connection refused → Check if server started successfully
- 503 error → Database connection issue

---

### ✅ Method 9: Test Database Query Directly
**In SQL Server Management Studio:**
```sql
USE RRzDBdev_1;
SELECT COUNT(*) AS UserCount FROM Users;
SELECT COUNT(*) AS ContactCount FROM ContactMessages;
```

**Expected:** Should return counts (may be 0 if no data yet)

**If error:** Tables don't exist - run `db.sql`

---

### ✅ Method 10: Check Connection String Format
**Test the exact connection string:**
```powershell
cd E:\RockzAndRollz\backend
node -e "require('dotenv').config(); const sql = require('mssql/msnodesqlv8'); const connStr = 'Server=TVK-5559-PC\\SQLEXPRESS;Database=RRzDBdev_1;Trusted_Connection=True;TrustServerCertificate=True;'; sql.connect(connStr).then(() => { console.log('✅ Connection successful!'); process.exit(0); }).catch(e => { console.error('❌ Error:', e.message); process.exit(1); });"
```

**Expected:** `✅ Connection successful!`

**If fails:** Check error message for specific issue

---

### ✅ Method 11: Check Windows Authentication Permissions
**In SQL Server Management Studio:**
1. Connect to `TVK-5559-PC\SQLEXPRESS`
2. Expand **Security** → **Logins**
3. Find your Windows account (should be there)
4. Right-click → **Properties** → **User Mapping**
5. Check if `RRzDBdev_1` is mapped with `db_owner` role

**If not mapped:**
```sql
USE [RRzDBdev_1];
CREATE USER [YourDomain\YourUsername] FOR LOGIN [YourDomain\YourUsername];
ALTER ROLE [db_owner] ADD MEMBER [YourDomain\YourUsername];
GO
```

---

### ✅ Method 12: Check Firewall Settings
```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*SQL*"}
```

**If SQL Server port is blocked:**
```powershell
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow
```

---

### ✅ Method 13: Check TCP/IP Protocol Enabled
**Using SQL Server Configuration Manager:**
1. Open: `SQLServerManager15.msc` (or `SQLServerManager14.msc`)
2. Navigate: **SQL Server Network Configuration** → **Protocols for SQLEXPRESS**
3. Check **TCP/IP** is **Enabled**
4. If disabled, enable it and **restart SQL Server**

---

### ✅ Method 14: Verify Server Name Format
**Test different server name formats:**
```powershell
# Try 1: With instance
sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -Q "SELECT @@SERVERNAME"

# Try 2: With localhost (if TVK-5559-PC doesn't work)
sqlcmd -S localhost\SQLEXPRESS -E -Q "SELECT @@SERVERNAME"

# Try 3: With IP address (find your IP first)
ipconfig
sqlcmd -S 192.168.x.x\SQLEXPRESS -E -Q "SELECT @@SERVERNAME"
```

**Use whichever works in your .env file**

---

### ✅ Method 15: Check Node.js and npm Versions
```powershell
node --version
npm --version
```

**Expected:**
- Node.js: v18+ or v24.11.1 (your version)
- npm: v8+ or v10.9.0 (your version)

---

### ✅ Method 16: Test Full Registration Flow
**While server is running:**
```powershell
$body = @{
    email = "test@example.com"
    password = "TestPassword123"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3000/api/register -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

**Expected:** Status 201, `{"message":"Registered Successfully"}`

**Then verify in database:**
```sql
USE RRzDBdev_1;
SELECT * FROM Users;
```

---

### ✅ Method 17: Check Port Availability
```powershell
netstat -ano | findstr :3000
```

**If port is in use:**
- Note the PID (last column)
- Kill it: `taskkill /PID <PID> /F`
- Or change PORT in .env to 3001

---

### ✅ Method 18: View Detailed Connection Logs
**Add to server.js temporarily for debugging:**
```javascript
console.log('Connection string:', dbConfig.replace(/Password=[^;]+/, 'Password=***'));
```

**Or check SQL Server error logs:**
```
C:\Program Files\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQL\Log\
```

---

## Quick Diagnostic Script

Save this as `check-setup.ps1`:

```powershell
Write-Host "=== Database Setup Check ===" -ForegroundColor Cyan

# Check SQL Server
Write-Host "`n1. Checking SQL Server..." -ForegroundColor Yellow
$sqlService = Get-Service | Where-Object {$_.Name -eq "MSSQL`$SQLEXPRESS"}
if ($sqlService.Status -eq 'Running') {
    Write-Host "   ✅ SQL Server is running" -ForegroundColor Green
} else {
    Write-Host "   ❌ SQL Server is not running" -ForegroundColor Red
}

# Check Database
Write-Host "`n2. Checking Database..." -ForegroundColor Yellow
$result = sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -Q "SELECT name FROM sys.databases WHERE name = 'RRzDBdev_1'" -h -1 2>&1
if ($result -match "RRzDBdev_1") {
    Write-Host "   ✅ Database RRzDBdev_1 exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Database RRzDBdev_1 not found" -ForegroundColor Red
}

# Check .env
Write-Host "`n3. Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".\backend\.env") {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
    Get-Content ".\backend\.env" | Select-String "DB_SERVER|DB_NAME"
} else {
    Write-Host "   ❌ .env file not found" -ForegroundColor Red
}

# Check Dependencies
Write-Host "`n4. Checking Dependencies..." -ForegroundColor Yellow
cd backend
if (Test-Path "node_modules\msnodesqlv8") {
    Write-Host "   ✅ msnodesqlv8 installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ msnodesqlv8 not installed - run: npm install" -ForegroundColor Red
}

Write-Host "`n=== Check Complete ===" -ForegroundColor Cyan
```

---

## Troubleshooting Flow

1. **Server won't start** → Methods 1, 5, 6, 15
2. **Connection failed** → Methods 2, 3, 4, 10, 11, 13
3. **Database not found** → Method 3, run `db.sql`
4. **Tables not found** → Method 4, run `db.sql`
5. **Permission denied** → Method 11
6. **Port in use** → Method 17
7. **API returns 503** → Methods 7, 8, 10

---

## Success Indicators

✅ **Everything is working if:**
- Method 1: SQL Server services are running
- Method 2: sqlcmd connects successfully
- Method 3: Database exists
- Method 4: Tables exist
- Method 7: Server starts with "✔ Connected to MSSQL"
- Method 8: API health returns `{"status":"ok"}`

If all these pass, your database connectivity is **100% working**! 🎉

