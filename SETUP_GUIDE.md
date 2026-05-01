# Men's Fashion E-commerce - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ installed
- MongoDB running locally OR MongoDB Atlas account

## 📥 Installation

```bash
# Install all dependencies
npm run install-all

# Or install separately:
cd backend && npm install
cd ../frontend && npm install
```

## ⚙️ Environment Setup

### Backend (.env)
Create `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mens-fashion-db
JWT_SECRET=your-secret-key-here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NODE_ENV=development
```

### Frontend (.env)
Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

## 🗄️ MongoDB Setup Option 1: Local MongoDB

```bash
# Windows (if installed):
mongod

# macOS (with Homebrew):
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
```

## 🌐 MongoDB Setup Option 2: Cloud (MongoDB Atlas)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create account & cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/mens-fashion-db`
4. Update `backend/.env` MONGO_URI

## 👤 Create Admin User

```bash
cd backend
node createAdmin.js
```

**Default Admin Credentials:**
- Email: `admin@example.com`
- Password: `admin123`

## ▶️ Start Development Servers

```bash
# From root directory
npm run dev

# Frontend: http://localhost:5173 (or 5174)
# Backend API: http://localhost:5000
```

## 🔐 Login to Admin Panel

1. Visit http://localhost:5173
2. Click "Login" in navbar
3. Enter admin credentials
4. Click "Admin" in navbar to access dashboard
5. Click "Add product" to create new products

## 📦 Add Products

Fill in the form:
- **Title**: Product name (e.g., "Classic White Shirt")
- **Description**: Product details
- **Category**: shirts / t-shirts / jeans
- **Price**: In rupees (e.g., 2999)
- **Inventory**: Stock quantity (e.g., 50)
- **Sizes**: Comma-separated (e.g., S,M,L,XL)
- **Images**: Upload 1-6 product photos

## 🛒 Customer Flow

1. Browse products on homepage
2. Click product to view details
3. Select size & quantity
4. Add to cart
5. Go to cart page
6. Proceed to checkout
7. Enter shipping address
8. Complete order

## 🐛 Troubleshooting

### API Connection Refused
- Check MongoDB is running
- Check backend is running on port 5000
- Check CORS is enabled

### PostCSS Error
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

### Port Already in Use
- Frontend: http://localhost:5174 (if 5173 is busy)
- Kill process: `lsof -i :5000` (macOS/Linux) or use Task Manager (Windows)

## 📚 API Endpoints

### Auth
- POST `/api/auth/signup` - Register
- POST `/api/auth/login` - Login

### Products
- GET `/api/products` - List all products
- GET `/api/products/:id` - Get product details
- POST `/api/products` - Create (admin only)
- PUT `/api/products/:id` - Update (admin only)
- DELETE `/api/products/:id` - Delete (admin only)

### Orders
- POST `/api/orders` - Create order (authenticated)
- GET `/api/orders/mine` - Get user orders
- GET `/api/orders/:id` - Get order details
- PUT `/api/orders/:id/pay` - Update payment

## 🎨 Design Features

- Premium black/white/beige theme
- Smooth Framer Motion animations
- Responsive design (mobile-first)
- Product card hover effects
- Loading skeletons
- Sticky navbar
- Hero section with CTA
