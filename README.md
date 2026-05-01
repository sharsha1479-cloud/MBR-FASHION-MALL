# Men's Fashion E-commerce

A modern e-commerce website for men's fashion built with React, TypeScript, Tailwind CSS, Node.js, Express, and MongoDB.

## Structure

- `backend/` - API server with Express, MongoDB, JWT auth, Cloudinary uploads, and Razorpay order integration.
- `frontend/` - React + TypeScript + Tailwind shop interface, auth screens, cart, checkout, and admin dashboard.

## Setup

### Backend

1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. Provide values for `MONGO_URI`, `JWT_SECRET`, Cloudinary, and Razorpay credentials.
5. `npm run dev`

### Frontend

1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env`
4. `npm run dev`

## Notes

- Admin actions require a user with `isAdmin: true` in the database.
- Product images are uploaded to Cloudinary.
- Razorpay integration creates an order object and expects a payment fulfillment flow.
