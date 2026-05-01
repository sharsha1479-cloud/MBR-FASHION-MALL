const prisma = require('./utils/prisma');

async function testConnection() {
  try {
    // Test connection by querying current database
    const users = await prisma.user.findMany();
    console.log('✅ Database connected successfully!');
    console.log('Current users:', users.length ? users : 'No users yet');

    const products = await prisma.product.findMany();
    console.log('Current products:', products.length ? products : 'No products yet');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();