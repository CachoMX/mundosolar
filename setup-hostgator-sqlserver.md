# HostGator SQL Server Setup Guide

## 🎯 Step 1: Get SQL Server Details from HostGator

### In your HostGator cPanel:

1. **Login to cPanel** (your-domain.com/cpanel)
2. **Find "SQL Server Databases"** (under Databases section)
3. **Create database if needed**:
   - Database Name: `mundosolar` (or your preferred name)
4. **Create database user**:
   - Username: `mundosolar_user`
   - Password: Generate strong password
5. **Add user to database** with ALL PRIVILEGES

### Get Connection Details:

You should find details like:
```
Server: sql123.hostgator.com (or similar)
Port: 1433
Database: your_cpanel_username_mundosolar
Username: your_cpanel_username_mundosolar_user
Password: [your-password]
```

## 🔧 Step 2: Update Your .env.local

Replace the placeholders with your actual values:

```env
# Example (replace with your actual values):
DATABASE_URL="sqlserver://sql123.hostgator.com:1433;database=myaccount_mundosolar;user=myaccount_mundosolar_user;password=MyStrongPassword123!;encrypt=true;trustServerCertificate=true"
```

### Common HostGator SQL Server formats:

**Format 1** (most common):
```env
DATABASE_URL="sqlserver://YOUR_SERVER:1433;database=YOUR_DATABASE;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"
```

**Format 2** (if Format 1 doesn't work):
```env
DATABASE_URL="sqlserver://YOUR_USER:YOUR_PASSWORD@YOUR_SERVER:1433/YOUR_DATABASE?encrypt=true&trustServerCertificate=true"
```

## 🚀 Step 3: Test Connection & Setup Database

```bash
# Navigate to your project
cd C:\Projects\mundosolar

# Regenerate Prisma client for SQL Server
npm run db:generate

# Test connection by creating tables
npm run db:migrate

# If migration works, populate with initial data
npm run db:seed

# Start the app
npm run dev
```

## 🔍 Troubleshooting Common Issues

### Connection Error: "Login failed"
- Double-check username/password
- Ensure user has database permissions
- Try alternative connection string format

### Connection Error: "Server not found"
- Verify server name (check HostGator cPanel)
- Ensure SQL Server is enabled on your hosting plan
- Try with/without port specification

### SSL/TLS Errors:
- Add `encrypt=false` if you get SSL errors
- Use `trustServerCertificate=true`

### Timeout Errors:
- Add `connectionTimeout=30000` to connection string
- HostGator shared hosting may have connection limits

## 📞 HostGator Support

If you can't find SQL Server details:
- **Live Chat**: Available 24/7
- **Phone**: 1-866-96-GATOR
- **Ask for**: "SQL Server database connection details"

## ✅ Success Indicators

When everything works, you'll see:
- ✅ Prisma generates client successfully
- ✅ Database migration creates 20+ tables
- ✅ Seed script adds admin user and sample data
- ✅ App runs at http://localhost:3000
- ✅ Login works with admin@mundosolar.com / admin123

## 💰 Cost Comparison

- **Your HostGator**: Already paid yearly ✅
- **Supabase Pro**: $25/month = $300/year ❌
- **Your savings**: $300+ per year! 🎉