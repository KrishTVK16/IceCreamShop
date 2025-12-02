# Documentation Index - Rockz & Rollz Backend

## 📚 Available Documentation

### 1. **QUICK_START.md** ⚡ START HERE
   - Quick troubleshooting guide
   - 3 simple methods to fix connection issues
   - Fastest way to get running

### 2. **MANUAL_SETUP_GUIDE.md** 📖 COMPLETE GUIDE
   - **Comprehensive step-by-step manual setup**
   - All 3 methods explained in detail:
     - Method 1: Windows Authentication
     - Method 2: Connection String Approach
     - Method 3: SQL Server Authentication
   - Troubleshooting section
   - Testing & verification steps
   - **Use this if current setup doesn't work**

### 3. **README_SETUP.md** 📋 CURRENT SETUP
   - Current working configuration
   - Quick reference for running the app
   - Basic troubleshooting

---

## 🔧 Alternative Server Files

### **server.js** (Current)
- Uses Windows Authentication with msnodesqlv8
- Object-based configuration

### **server_connection_string.js** (Backup)
- Supports connection strings
- More flexible configuration options
- Use if server.js doesn't work

**To use connection string version:**
```powershell
copy server.js server_backup.js
copy server_connection_string.js server.js
```

---

## 📝 Configuration Files

### **.env** (Required)
- Database connection settings
- See examples in MANUAL_SETUP_GUIDE.md

### **env.sample** (Template)
- Example configuration
- Copy to .env and modify

### **db.sql** (Database Schema)
- Creates database and tables
- Run once: `sqlcmd -S TVK-5559-PC\SQLEXPRESS -E -i db.sql`

---

## 🚀 Quick Commands

### Start Backend
```powershell
cd E:\RockzAndRollz\backend
npm run dev
```

### Start Frontend
```powershell
cd E:\RockzAndRollz
npx http-server -p 5500 .
```

### Test API
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health
```

---

## 🆘 Need Help?

1. **Quick fix?** → Read `QUICK_START.md`
2. **Complete setup?** → Read `MANUAL_SETUP_GUIDE.md`
3. **Current setup info?** → Read `README_SETUP.md`

---

## 📋 Setup Checklist

- [ ] SQL Server running
- [ ] Database `RRzDBdev_1` exists
- [ ] Tables created (run `db.sql`)
- [ ] `.env` file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Backend starts without errors
- [ ] API health check returns `{"status":"ok"}`
- [ ] Frontend accessible on port 5500

---

**Last Updated:** Based on your SQL Server Management Studio setup with Windows Authentication

