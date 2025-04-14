require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware
app.use(express.json());
app.use(cors());

// Configure CORS
app.use(
  cors({
    origin: ["http://localhost:5173", "https://examgecv.onrender.com"],
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

// Serve static files from uploads directory with proper caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

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
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log('Uploaded image URL:', imageUrl); // Debug log
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Error uploading image' });
  }
});

// Error handling middleware for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

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
      const { roomNumber, date, time, duration, negativeMarking, questions } = req.body;
      
      // Validate questions array
      if (!Array.isArray(questions)) {
        return res.status(400).json({ 
          success: false, 
          message: "Questions must be an array" 
        });
      }

      // Process each question
      const processedQuestions = questions.map(question => {
        if (question.type === 'subjective' && question.image) {
          // Ensure the image URL is properly formatted
          if (!question.image.startsWith('http')) {
            question.image = `${req.protocol}://${req.get('host')}${question.image}`;
          }
        }
        return question;
      });

      // Create the test with processed questions
      const newTest = new TestModel({ 
        roomNumber, 
        date, 
        time, 
        duration, 
        negativeMarking, 
        questions: processedQuestions,
        correctAnswers: questions.reduce((acc, q, index) => {
          acc[index] = q.correctAnswer;
          return acc;
        }, {})
      });

      await newTest.save();
      
      res.status(201).json({ 
        success: true, 
        message: "Test created successfully!",
        test: newTest
      });
    } catch (error) {
      console.error("Error creating test:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error",
        error: error.message 
      });
    }
});

app.post('/api/submit-test', async (req, res) => {
  try {
    const { testId, userId, answers, subjectiveAnswers, score, correctAnswers, incorrectAnswers, totalQuestions } = req.body;

    // Create a new test submission
    const submission = new TestSubmission({
      testId,
      userId,
      answers,
      subjectiveAnswers,
      score,
      correctAnswers,
      incorrectAnswers,
      totalQuestions,
      submittedAt: new Date()
    });

    await submission.save();

    res.json({
      success: true,
      message: 'Test submitted successfully',
      submission
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit test',
      error: error.message
    });
  }
});

// Add route to get test results
app.get('/api/test-results/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    
    const submissions = await TestSubmission.find({ testId })
      .populate('userId', 'name regNo branch')
      .sort({ score: -1 });

    res.json({
      success: true,
      submissions
    });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test results',
      error: error.message
    });
  }
});

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});