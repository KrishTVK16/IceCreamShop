# Backend Setup - COMPLETE ✅

## Configuration Summary

✅ **Windows Authentication** - Using `msnodesqlv8` driver for native Windows Auth support  
✅ **Database**: RRzDBdev_1 on TVK-5559-PC\SQLEXPRESS  
✅ **No SQL Login Required** - Uses your Windows credentials automatically  
✅ **Server Running**: http://localhost:3000  

## Current Status

The application is now **fully functional** with Windows Authentication!

### Configuration Files

**`.env`** (Windows Authentication):
```
PORT=3000
DB_SERVER=TVK-5559-PC
DB_INSTANCE=SQLEXPRESS
DB_NAME=RRzDBdev_1
DB_USER=
DB_PASS=
```

## Running the Application

### 1. Start Backend Server
```powershell
cd E:\RockzAndRollz\backend
npm run dev
```

You should see:
```
🚀 Server Running on port 3000
✔ Connected to MSSQL
```

### 2. Start Frontend Server
In a new terminal:
```powershell
cd E:\RockzAndRollz
npx http-server -p 5500 .
```

### 3. Access Application
Open browser: `http://localhost:5500`

## API Endpoints

- **Health Check**: `GET http://localhost:3000/api/health`
- **Register**: `POST http://localhost:3000/api/register`
- **Login**: `POST http://localhost:3000/api/login`
- **Contact**: `POST http://localhost:3000/api/contact`

## How It Works

1. **Windows Authentication**: The `msnodesqlv8` driver automatically uses your Windows credentials when `DB_USER` and `DB_PASS` are empty.

2. **Database Connection**: Connects to `TVK-5559-PC\SQLEXPRESS` using your Windows account.

3. **No Password Needed**: Since you're using Windows Authentication, no SQL Server login is required.

## Troubleshooting

### If connection fails:

1. **Check SQL Server is running**:
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*SQL*"}
   ```

2. **Verify you can connect with sqlcmd**:
   ```powershell
   sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -Q "SELECT @@VERSION"
   ```

3. **Check database exists**:
   ```powershell
   sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -Q "SELECT name FROM sys.databases WHERE name = 'RRzDBdev_1'"
   ```

4. **Restart backend server**:
   ```powershell
   # Stop all node processes
   Get-Process node | Stop-Process -Force
   # Then restart
   cd E:\RockzAndRollz\backend
   npm run dev
   ```

## Database Tables

- **Users**: Stores user accounts (Email, PasswordHash)
- **ContactMessages**: Stores contact form submissions (Name, Email, Phone, Message, CreatedAt)

Both tables are automatically created when you run `db.sql`.

## Notes

- The `msnodesqlv8` package provides native Windows Authentication support
- No SQL Server login credentials needed
- Uses your Windows account automatically
- Works seamlessly with SQL Server Management Studio authentication
