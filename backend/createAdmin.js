const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const loadEnv = require('./config/loadEnv');

loadEnv();

const prisma = new PrismaClient();
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD;

async function createAdmin() {
  try {
    if (!adminPassword || adminPassword.length < 12) {
      throw new Error('ADMIN_PASSWORD must be set and at least 12 characters long');
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'Admin User',
        password: hashedPassword,
        isAdmin: true,
        role: 'admin'
      },
      create: {
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        isAdmin: true,
        role: 'admin'
      }
    });
    console.log('Admin user is ready!');
    console.log(`Email: ${adminEmail}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
