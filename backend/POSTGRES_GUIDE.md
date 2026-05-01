# PostgreSQL + Prisma Integration Guide

## ✅ Setup Complete!

Your PostgreSQL database **mens_fashion** is now set up with Prisma ORM.

Database credentials:
- **Host**: localhost
- **Port**: 5432
- **Database**: mens_fashion
- **Username**: postgres
- **Password**: Harsha@9866

---

## Database Tables Created

All tables with proper relationships have been created:

1. **User** - Stores user/admin accounts
2. **Product** - Stores product details with images, prices, sizes, stock
3. **Cart** - User shopping carts
4. **CartItem** - Items in the cart
5. **Order** - Customer orders
6. **OrderItem** - Individual items in orders

---

## Verify Tables in pgAdmin

1. Open pgAdmin
2. Navigate: **Servers → PostgreSQL 18 → Databases → mens_fashion → Schemas → public → Tables**
3. You should see all 6 tables listed

---

## Test with Postman

### 1. Add a Product (Admin)

**Endpoint**: `POST http://localhost:5000/api/products`

**Headers**:
```
Content-Type: multipart/form-data
Authorization: Bearer <admin_jwt_token>  (optional for now)
```

**Body** (form-data):
```
name: "Premium Shirt"
description: "High-quality cotton shirt"
price: "99.99"
category: "Shirts"
sizes: "S,M,L,XL"
stock: "50"
images: [upload 1-6 images]
```

**Expected Response (201)**:
```json
{
  "id": "clh1a2b3c4d5e6f7g8h9i0j1",
  "name": "Premium Shirt",
  "description": "High-quality cotton shirt",
  "price": 99.99,
  "category": "Shirts",
  "sizes": ["S", "M", "L", "XL"],
  "stock": 50,
  "images": ["https://...", "https://..."],
  "createdAt": "2024-04-30T...",
  "updatedAt": "2024-04-30T..."
}
```

### 2. Get All Products

**Endpoint**: `GET http://localhost:5000/api/products`

**Query Parameters** (optional):
```
search=shirt          (search by name)
category=Shirts       (filter by category)
minPrice=50          (minimum price)
maxPrice=150         (maximum price)
size=L               (filter by size)
```

**Example**: `GET http://localhost:5000/api/products?category=Shirts&minPrice=50&maxPrice=150`

**Expected Response (200)**:
```json
[
  {
    "id": "clh1a2b3c4d5e6f7g8h9i0j1",
    "name": "Premium Shirt",
    "description": "High-quality cotton shirt",
    "price": 99.99,
    "category": "Shirts",
    "sizes": ["S", "M", "L"],
    "stock": 50,
    "images": ["https://..."],
    "createdAt": "2024-04-30T...",
    "updatedAt": "2024-04-30T..."
  }
]
```

### 3. Get Product by ID

**Endpoint**: `GET http://localhost:5000/api/products/{productId}`

**Expected Response (200)**:
```json
{
  "id": "clh1a2b3c4d5e6f7g8h9i0j1",
  "name": "Premium Shirt",
  ...
}
```

---

## Database Schema

### User Table
```
- id (string, Primary Key)
- name (string)
- email (string, Unique)
- password (string, hashed)
- role (string, default: "user")
- createdAt (DateTime)
- updatedAt (DateTime)
```

### Product Table
```
- id (string, Primary Key)
- name (string)
- description (string, optional)
- price (Float)
- images (String array)
- category (string)
- sizes (String array)
- stock (integer)
- createdAt (DateTime)
- updatedAt (DateTime)
```

### Cart Table
```
- id (string, Primary Key)
- userId (string, Foreign Key → User)
```

### CartItem Table
```
- id (string, Primary Key)
- cartId (string, Foreign Key → Cart)
- productId (string, Foreign Key → Product)
- quantity (integer)
```

### Order Table
```
- id (string, Primary Key)
- userId (string, Foreign Key → User)
- totalAmount (Float)
- status (string, default: "pending")
- paymentId (string, optional)
- createdAt (DateTime)
- updatedAt (DateTime)
```

### OrderItem Table
```
- id (string, Primary Key)
- orderId (string, Foreign Key → Order)
- productId (string, Foreign Key → Product)
- quantity (integer)
- price (Float) - snapshot of product price at order time
```

---

## Backend Code Integration

### Using Prisma Client

```javascript
const prisma = require('./utils/prisma');

// Create a product
const product = await prisma.product.create({
  data: {
    name: "Shirt",
    price: 99.99,
    category: "Shirts",
    sizes: ["S", "M", "L"],
    stock: 50,
    images: ["url1", "url2"]
  }
});

// Get all products
const products = await prisma.product.findMany();

// Get product by ID
const product = await prisma.product.findUnique({
  where: { id: "productId" }
});

// Get products with filters
const products = await prisma.product.findMany({
  where: {
    price: { gte: 50, lte: 150 },
    category: "Shirts"
  }
});
```

---

## API Endpoints Available

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products with filters |
| POST | `/api/products` | Create new product (admin) |
| GET | `/api/products/:id` | Get product by ID |
| PUT | `/api/products/:id` | Update product (admin) - TBD |
| DELETE | `/api/products/:id` | Delete product (admin) - TBD |

---

## Error Handling

All API responses follow this format:

**Success (200)**:
```json
{
  "id": "...",
  "name": "...",
  ...
}
```

**Error (4xx/5xx)**:
```json
{
  "message": "Error description",
  "error": "details"
}
```

---

## Next Steps

1. ✅ **Database**: PostgreSQL with Prisma ORM
2. ✅ **Tables**: All 6 tables created
3. ⏳ **Authentication**: Implement JWT with Prisma
4. ⏳ **Cart Management**: Build cart operations
5. ⏳ **Orders**: Implement order processing
6. ⏳ **Admin Panel**: Create admin dashboard

---

## Commands

```bash
# Start backend
npm run dev

# Test database connection
node testDb.js

# Create migration (after schema changes)
npx prisma migrate dev --name migration_name

# Generate Prisma Client
npx prisma generate

# View database in Prisma Studio
npx prisma studio
```

---

## Troubleshooting

**Issue**: Cannot connect to PostgreSQL
- Check PostgreSQL is running: Services → PostgreSQL
- Verify credentials in `.env`
- Test connection: `node testDb.js`

**Issue**: Tables not visible in pgAdmin
- Right-click mens_fashion database → Refresh
- Or restart pgAdmin

**Issue**: Migration fails
- Check `.env` DATABASE_URL is correct
- Ensure PostgreSQL is running
- Delete `migrations` folder and retry if schema is fresh

---

**Now you're ready to use PostgreSQL with Prisma ORM!** 🚀
