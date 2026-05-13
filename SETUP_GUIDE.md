# MBR Fashion Hub - Setup Guide

## Prerequisites

- Node.js v18+
- MySQL database, such as Hostinger Business hosting MySQL

## Installation

```bash
npm run install-all
```

## Backend Environment

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL="mysql://username:password@localhost:3306/database_name"
JWT_SECRET=your-secret-key-here
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NODE_ENV=development
```

Cloudinary variables may exist in older env files, but image upload currently uses local Multer storage in `backend/uploads`.

## Frontend Environment

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Database Setup

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

For local development with a fresh MySQL database:

```bash
cd backend
npx prisma migrate dev
```

## Create Admin User

```bash
cd backend
node createAdmin.js
```

Default admin credentials:

- Email: `admin@example.com`
- Password: `admin123`

## Start Development Servers

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

## API Endpoints

- POST `/api/auth/signup` - Register
- POST `/api/auth/login` - Login
- GET `/api/products` - List products
- POST `/api/products` - Create product, admin only
- PUT `/api/products/:id` - Update product, admin only
- DELETE `/api/products/:id` - Delete product, admin only
- POST `/api/orders` - Create order
- GET `/api/orders/mine` - Get user orders
