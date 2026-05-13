# QUICK START - Admin Panel Setup

## Step 1: Configure MySQL

Create a MySQL database in Hostinger, then update `backend/.env`:

```env
DATABASE_URL="mysql://username:password@localhost:3306/database_name"
```

## Step 2: Apply Prisma Schema

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

## Step 3: Create Admin User

```bash
cd backend
node createAdmin.js
```

## Step 4: Start Development Servers

```bash
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## Step 5: Add Your First Product

1. Open the frontend.
2. Log in with the admin account.
3. Go to the admin dashboard.
4. Add a product with name, category, price, stock, sizes, and images.

Images are stored locally in `backend/uploads`; Cloudinary is not used by the current upload flow.
