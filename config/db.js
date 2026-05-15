const mongoose = require('mongoose');

const connectDB = async () => {
  try {
  const conn = await mongoose.connect('mongodb+srv://shrichavan9211_db_user:EWVtWEesLwyQ8maA@cluster0.xnx16my.mongodb.net/?appName=Cluster0');
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
