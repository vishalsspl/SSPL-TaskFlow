# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Issue: "npm install" fails
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Issue: Cannot find module errors
**Solution:**
```bash
# Ensure you're in the correct directory
cd backend  # or frontend

# Install dependencies
npm install

# For Prisma client errors
npm run db:generate
```

### Database Issues

#### Issue: "Can't reach database server"
**Solutions:**
1. Check if PostgreSQL is running:
   ```bash
   # Windows
   Get-Service postgresql*
   
   # If not running, start it
   Start-Service postgresql-x64-14  # adjust version number
   ```

2. Verify DATABASE_URL in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/taskmanagement"
   ```

3. Test connection:
   ```bash
   psql -U postgres -d taskmanagement
   ```

#### Issue: "Database doesn't exist"
**Solution:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE taskmanagement;

# Exit
\q

# Run migrations
cd backend
npm run db:migrate
```

#### Issue: Prisma migration fails
**Solution:**
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --name init

# Generate client
npm run db:generate
```

#### Issue: "Seed data won't load"
**Solution:**
```bash
cd backend

# Ensure database is migrated
npm run db:migrate

# Try seeding again
npm run db:seed

# If still fails, check for errors in seed.js
node prisma/seed.js
```

### Backend Issues

#### Issue: Port 5000 already in use
**Solution 1 - Change port:**
Edit `backend/.env`:
```env
PORT=5001
```

**Solution 2 - Kill process on port:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

#### Issue: JWT token errors
**Solutions:**
1. Ensure JWT_SECRET is set in `backend/.env`
2. Clear browser localStorage and login again
3. Check token expiration (default 7 days)

#### Issue: CORS errors
**Solution:**
Update CORS configuration in `backend/src/server.js`:
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

#### Issue: "Cannot read properties of undefined"
**Solution:**
- Check if all required environment variables are set
- Verify database connection
- Check if Prisma client is generated: `npm run db:generate`

### Frontend Issues

#### Issue: Port 5173 already in use
**Solution:**
Edit `frontend/vite.config.js`:
```javascript
export default defineConfig({
  // ...
  server: {
    port: 5174,  // Change to different port
  },
});
```

#### Issue: "Network Error" when calling API
**Solutions:**
1. Verify backend is running: http://localhost:5000/api/health
2. Check `VITE_API_URL` in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
3. Restart frontend dev server after changing .env

#### Issue: Login doesn't work / redirect loop
**Solutions:**
1. Clear browser cache and localStorage:
   ```javascript
   // In browser console
   localStorage.clear();
   ```
2. Check Network tab for API response
3. Verify backend is running
4. Check credentials

#### Issue: Charts not rendering
**Solutions:**
1. Ensure Recharts is installed:
   ```bash
   npm install recharts
   ```
2. Check browser console for errors
3. Verify data structure matches chart expectations

#### Issue: Images/avatars not loading
**Solutions:**
1. Check network tab for 404 errors
2. Verify avatar URLs in database
3. Use placeholder images if needed

### Authentication Issues

#### Issue: "Invalid credentials" on login
**Solutions:**
1. Verify email and password are correct
2. Check if user exists in database
3. Try demo credentials: `admin@demo.com` / `password123`
4. Reseed database if needed

#### Issue: Token expired errors
**Solutions:**
1. Login again to get new token
2. Increase token expiration in `backend/src/controllers/authController.js`:
   ```javascript
   const token = jwt.sign(payload, process.env.JWT_SECRET, {
     expiresIn: '30d'  // Increase from 7d
   });
   ```

#### Issue: Automatically logged out
**Causes:**
- Token expired (7 days by default)
- 401 error from API
- localStorage cleared

**Solution:**
- Login again
- Check API endpoint responses

### Data Issues

#### Issue: No projects showing
**Solutions:**
1. Login with correct user
2. Check if projects exist for your organization
3. Reseed database:
   ```bash
   cd backend
   npm run db:seed
   ```

#### Issue: Tasks not appearing
**Solutions:**
1. Verify task filters
2. Check if tasks exist for selected project
3. Look at API response in Network tab

#### Issue: Dashboard shows zero/incorrect data
**Solutions:**
1. Create some tasks first
2. Check project ID in URL
3. Verify API endpoint: `/api/dashboard/:projectId`
4. Check browser console for errors

### Export Issues

#### Issue: PDF export fails
**Solutions:**
1. Check Puppeteer installation:
   ```bash
   cd backend
   npm install puppeteer
   ```
2. Check backend logs for errors
3. Verify HTML content is being sent

#### Issue: PNG export is blank
**Solutions:**
1. Ensure html2canvas is installed:
   ```bash
   cd frontend
   npm install html2canvas
   ```
2. Wait for page to fully load before exporting
3. Check dashboard ref is correctly set

### Presentation Mode Issues

#### Issue: Presentation mode layout broken
**Solutions:**
1. Check CSS in `ProjectView.jsx`
2. Verify presentationMode state toggle
3. Clear browser cache

#### Issue: Can't exit presentation mode
**Solution:**
- Press ESC key
- Click "Exit Presentation" button
- Refresh page

### Development Issues

#### Issue: Hot reload not working
**Solutions:**
1. Restart dev server
2. Check if files are being watched
3. Clear `.vite` cache folder

#### Issue: Changes not reflecting
**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Restart dev server
4. Check if you're editing correct file

#### Issue: Build fails
**Solutions:**
1. Fix TypeScript/ESLint errors
2. Check import paths
3. Verify all dependencies installed

### Performance Issues

#### Issue: Slow API responses
**Solutions:**
1. Check database indexes
2. Optimize queries in controllers
3. Add pagination for large datasets
4. Use database connection pooling

#### Issue: Frontend is slow
**Solutions:**
1. Check for unnecessary re-renders
2. Optimize component structure
3. Use React.memo for expensive components
4. Check network requests (too many?)

### Browser-Specific Issues

#### Issue: Works in Chrome but not Firefox/Safari
**Solutions:**
1. Check browser console for errors
2. Verify CSS compatibility
3. Check if features are supported (LocalStorage, etc.)
4. Test in different browsers

### Deployment Issues

#### Issue: Production build fails
**Solutions:**
1. Set NODE_ENV=production
2. Fix any build errors/warnings
3. Check environment variables
4. Build locally first to test

#### Issue: API not accessible in production
**Solutions:**
1. Update VITE_API_URL for production
2. Configure CORS for production domain
3. Check firewall/security groups
4. Verify SSL certificates

## Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Read error messages carefully
3. Check browser console
4. Check backend logs
5. Verify all setup steps completed
6. Try with demo data

### Useful Debug Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check PostgreSQL version
psql --version

# Check if PostgreSQL is running
Get-Service postgresql*  # Windows
brew services list  # macOS (Homebrew)

# Check if ports are in use
netstat -ano | findstr :5000  # Windows
lsof -i :5000  # macOS/Linux

# View Prisma Studio
cd backend
npm run db:studio

# Check database
psql -U postgres -d taskmanagement -c "SELECT COUNT(*) FROM projects;"

# Test API
curl http://localhost:5000/api/health
```

### Log Files to Check

1. **Browser Console** (F12)
   - JavaScript errors
   - Network requests
   - State changes

2. **Backend Terminal**
   - Server errors
   - Database queries
   - API requests

3. **PostgreSQL Logs**
   - Query errors
   - Connection issues

### Common Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Invalid data sent to API |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Backend error, check logs |

## Still Having Issues?

1. Delete everything and start fresh:
   ```bash
   # Delete node_modules
   rm -rf node_modules backend/node_modules frontend/node_modules
   
   # Delete database
   psql -U postgres -c "DROP DATABASE taskmanagement;"
   psql -U postgres -c "CREATE DATABASE taskmanagement;"
   
   # Reinstall and setup
   npm run install-all
   cd backend
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   cd ..
   npm run dev
   ```

2. Check versions match:
   - Node.js 18+
   - PostgreSQL 14+
   - npm 9+

3. Review documentation:
   - README.md
   - SETUP.md
   - API.md
   - FEATURES.md
