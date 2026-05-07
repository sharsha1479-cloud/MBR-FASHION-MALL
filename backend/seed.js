#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedCategories() {
  const categories = [
    {
      value: 'shirts',
      label: 'Shirts',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center'
    },
    {
      value: 't-shirts',
      label: 'T-Shirts',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center'
    },
    {
      value: 'jeans',
      label: 'Jeans',
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&crop=center'
    },
    {
      value: 'jackets',
      label: 'Jackets',
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop&crop=center'
    },
    {
      value: 'sneakers',
      label: 'Sneakers',
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&crop=center'
    },
    {
      value: 'accessories',
      label: 'Accessories',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&crop=center'
    }
  ];

  console.log('🌱 Starting category seeding with high-quality images...');

  for (const category of categories) {
    try {
      const existing = await prisma.category.findUnique({
        where: { value: category.value }
      });

      if (!existing) {
        const created = await prisma.category.create({ data: category });
        console.log('✅ Created category:', created.label);
      } else {
        console.log('⚠️  Category already exists:', category.label);
      }
    } catch (error) {
      console.error('❌ Error creating category', category.label, ':', error.message);
    }
  }

  console.log('🎉 Seeding completed! Categories are now available with beautiful images.');
  await prisma.$disconnect();
}

seedCategories().catch(console.error);