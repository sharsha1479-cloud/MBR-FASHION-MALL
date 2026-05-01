# 🚀 QUICK START - Admin Panel Setup

## Step 1: Start MongoDB

**Windows (Command Prompt as Admin):**
```bash
mongod
```

**macOS (with Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**OR Use MongoDB Atlas (Cloud):**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string
4. Update `backend/.env`:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mens-fashion-db
   ```

## Step 2: Create Admin User

**Terminal 1 - From project root:**
```bash
cd backend
node createAdmin.js
```

**Expected Output:**
```
Connected to MongoDB
Admin user created successfully!
Email: admin@example.com
Password: admin123
```

## Step 3: Start Development Servers

**From project root directory:**
```bash
npm run dev
```

**You should see:**
- Backend: `Server running on port 5000`
- Frontend: `Local: http://localhost:5173` (or 5174)

## Step 4: Access Admin Panel

1. **Open browser:** http://localhost:5173
2. **Click "Login"** in top navbar
3. **Enter credentials:**
   - Email: `admin@example.com`
   - Password: `admin123`
4. **Click "Admin"** in navbar (appears after login)
5. **Click "Add product"** button

## Step 5: Add Your First Product

**Fill the form:**

| Field | Example |
|-------|---------|
| Title | Classic White Shirt |
| Description | Premium cotton shirt, perfect for everyday wear |
| Category | shirts |
| Price | 2999 |
| Inventory | 100 |
| Sizes | S,M,L,XL |
| Images | Select 1-6 product photos |

**Click "Save product"** → Product appears on homepage!

## 🎯 Test the App

1. **Homepage:** View your newly added products
2. **Product Detail:** Click any product to see details
3. **Add to Cart:** Select size & quantity, add to cart
4. **Cart:** View and edit cart items
5. **Checkout:** Test checkout flow (creates order)
6. **Admin:** Edit/delete products from dashboard

## 📝 Tips

- Products appear instantly on homepage after creation
- You can upload multiple product images (jpg, png, webp)
- Use sizes: S, M, L, XL, XXL, etc.
- Price in INR (₹)
- Keep inventory updated for stock management

## ✅ Common Issues & Solutions

### Issue: "Failed to load resource: net::ERR_CONNECTION_REFUSED"
**Solution:** MongoDB is not running
```bash
# Check if MongoDB is running, then try Step 1 again
mongod
```

### Issue: "Port 5173 is in use"
**Solution:** Frontend will automatically try port 5174
- Just use: http://localhost:5174

### Issue: "EADDRINUSE: address already in use :::5000"
**Solution:** Kill process on port 5000
```bash
# macOS/Linux:
lsof -i :5000  # Find process ID
kill -9 <PID>

# Windows (PowerShell as Admin):
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: Admin user creation fails
**Solutions:**
1. Make sure MongoDB is running
2. Delete `createAdmin.js` and recreate user manually via:
   - MongoDB Compass GUI, or
   - MongoDB Atlas dashboard

## 🔗 Useful Links

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- MongoDB Docs: https://docs.mongodb.com/
- React DevTools: https://react-devtools-tutorial.vercel.app/

## 📦 What's Next?

After adding products:
- **Test checkout flow**
- **Set up Cloudinary** for direct image hosting
- **Set up Razorpay** for real payments
- **Deploy to production** (Vercel, Heroku, etc.)

---

💡 **Need Help?** Check SETUP_GUIDE.md for detailed instructions
