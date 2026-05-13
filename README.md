# MBR Fashion Hub

A modern e-commerce website for MBR Fashion Hub built with React, TypeScript, Tailwind CSS, Node.js, Express, Prisma, and MySQL.

## Structure

- `backend/` - API server with Express, Prisma/MySQL, JWT auth, local Multer uploads, and Razorpay order integration.
- `frontend/` - React + TypeScript + Tailwind shop interface, auth screens, cart, checkout, and admin dashboard.

## Setup

### Backend

1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. Provide values for `DATABASE_URL`, `JWT_SECRET`, and Razorpay credentials.
5. `npx prisma migrate deploy`
6. `npx prisma generate`
7. `npm run dev`

### Frontend

1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. `npm run dev`

## Notes

- Admin actions require a user with `isAdmin: true` in the database.
- Product, banner, and combo images are stored locally in `backend/uploads` and served from `/uploads`.
- Razorpay integration creates an order object and expects a payment fulfillment flow.
