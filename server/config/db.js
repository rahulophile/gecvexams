const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true); // Prevents deprecation warnings

    await mongoose.connect(process.env.MONGO_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Wait 5s before failing
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log("✅ MongoDB Connected Successfully!");
    
    // Enable debug mode if specified in .env
    if (process.env.MONGO_DEBUG === "true") {
      mongoose.set("debug", true);
      console.log("⚡ MongoDB Debug Mode Enabled!");
    }

  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1); // Exit if DB connection fails
  }
};

module.exports = connectDB;
