const loadEnv = require('../config/loadEnv');
const { PrismaClient } = require('@prisma/client');

loadEnv();

const prisma = new PrismaClient();

module.exports = prisma;
