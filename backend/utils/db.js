const mongoose = require('mongoose');

const connectDB = async () => {
  let retries = 5;
  
  const tryConnect = async () => {
    try {
      const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mens-fashion-db';
      const conn = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`✓ MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries -= 1;
      if (retries > 0) {
        console.log(`⚠ MongoDB connection failed. Retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return tryConnect();
      } else {
        console.error(`✗ MongoDB connection failed after 5 attempts`);
        console.error(`   Make sure MongoDB is running on localhost:27017`);
        console.error(`   Or update MONGO_URI in backend/.env`);
        process.exit(1);
      }
    }
  };

  return tryConnect();
};

module.exports = connectDB;
