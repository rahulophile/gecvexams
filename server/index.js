require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require('path');
const multer = require('multer');

const app = express();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  cors({
    origin: "https://examgecv.onrender.com",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

// Validate Environment Variables
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env file");
  process.exit(1);
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Import Routes
const testRoutes = require("./routes/testRoutes");
app.use("/api", testRoutes);

// Image upload endpoint
app.post("/api/upload-image", upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    // Return the full URL including the server's base URL
    const imageUrl = `http://localhost:8080/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Error uploading image' });
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the status page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("🔄 Closing server...");
  await mongoose.connection.close();
  console.log("🛑 MongoDB connection closed.");
  process.exit(0);
});

app.post("/api/create-test", async (req, res) => {
    try {
      const { roomNumber, date, time, duration, negativeMarking, questions, correctAnswers } = req.body;
      
      // Save the test in your database (MongoDB or another DB)
      const newTest = new TestModel({ roomNumber, date, time, duration, negativeMarking, questions, correctAnswers });
      await newTest.save();
      
      res.status(201).json({ success: true, message: "Test created successfully!" });
    } catch (error) {
      console.error("Error creating test:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});