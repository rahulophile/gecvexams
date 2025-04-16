const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
// const Test = require("../models/Test"); // Ensure this is the correct path
// hello

const router = express.Router();

const ADMIN_USERNAME = "1901020";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync("190102002", 10); // Store hashed password securely
const SECRET_KEY = "your_secret_key"; // Change this to a strong secret

// ✅ MongoDB Test Schema
const TestSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  duration: { type: Number, required: true },
  negativeMarking: { type: Number, required: true },
  marksPerCorrect: { type: Number, required: true, default: 1 },
  questions: [{
    type: { 
      type: String, 
      enum: ['objective', 'subjective'], 
      required: true 
    },
    text: { type: String, required: true },
    options: { 
      type: [String], 
      required: function() { return this.type === 'objective'; } 
    },
    correctAnswer: { type: String, required: true },
    image: { type: String, required: false }
  }],
  correctAnswers: { type: Object, required: true },
  submissions: [
    {
      studentName: String,
      branch: String,
      regNo: String,
      answers: Object,
      submittedAt: { type: Date, default: Date.now },
      score: {
        correct: Number,
        incorrect: Number,
        final: Number,
        negativeMarking: Number,
        marksPerCorrect: Number,
        marksForCorrect: Number,
        marksDeducted: Number
      }
    }
  ],
  progress: { type: Object }
});

const TestModel = mongoose.model("Test", TestSchema);

// ✅ Admin Login Route
router.post("/admin-login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password are required!" });
  }

  if (username !== ADMIN_USERNAME || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  // Add isAdmin flag to the token
  const token = jwt.sign({ username, isAdmin: true }, SECRET_KEY, { expiresIn: "1h" });
  res.status(200).json({ success: true, message: "Login successful!", token });
});

// ✅ Middleware to Verify Admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized! Token missing." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log("Decoded Token:", decoded); // 🔥 Debugging
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    res.status(403).json({ success: false, error: "Forbidden! Invalid token." });
  }
};

// ✅ Create Test Route (Admin Only)
router.post("/create-test", verifyAdmin, async (req, res) => {
  try {
    const { roomNumber, date, time, duration, negativeMarking, marksPerCorrect, questions } = req.body;

    // Validate required fields
    if (!roomNumber || !date || !time || !duration || negativeMarking === undefined || marksPerCorrect === undefined || !questions) {
      return res.status(400).json({ 
        success: false, 
        error: "All fields are required!" 
      });
    }

    // Validate negative marking
    const parsedNegativeMarking = parseFloat(negativeMarking);
    if (isNaN(parsedNegativeMarking) || parsedNegativeMarking < 0) {
      return res.status(400).json({
        success: false,
        error: "Negative marking must be a non-negative number"
      });
    }

    // Validate marks per correct
    const parsedMarksPerCorrect = parseFloat(marksPerCorrect);
    if (isNaN(parsedMarksPerCorrect) || parsedMarksPerCorrect <= 0) {
      return res.status(400).json({
        success: false,
        error: "Marks per correct must be a positive number"
      });
    }

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one question is required"
      });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (!question.type || !['objective', 'subjective'].includes(question.type)) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: Invalid question type. Must be either 'objective' or 'subjective'`
        });
      }

      if (!question.text) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: Question text is required`
        });
      }

      if (question.type === 'objective') {
        if (!Array.isArray(question.options) || question.options.length === 0) {
          return res.status(400).json({
            success: false,
            error: `Question ${i + 1}: Options are required for objective questions`
          });
        }

        if (!question.correctAnswer) {
          return res.status(400).json({
            success: false,
            error: `Question ${i + 1}: Correct answer is required for objective questions`
          });
        }

        // Validate that correct answer exists in options
        if (!question.options.includes(question.correctAnswer)) {
          return res.status(400).json({
            success: false,
            error: `Question ${i + 1}: Correct answer must be one of the provided options`
          });
        }
      } else {
        // For subjective questions, use the text as correct answer if not provided
        if (!question.correctAnswer) {
          question.correctAnswer = question.text;
        }
      }
    }

    const existingTest = await TestModel.findOne({ roomNumber });
    if (existingTest) {
      return res.status(400).json({
        success: false,
        error: "Test with this room number already exists!"
      });
    }

    // Create moment object in local timezone
    const localDateTime = moment.tz(`${date} ${time}`, "Asia/Kolkata");
    
    // Store the date and time in local timezone
    const newTest = new TestModel({
      roomNumber,
      date: localDateTime.format("YYYY-MM-DD"),
      time: localDateTime.format("HH:mm"),
      duration: Number(duration),
      negativeMarking: parsedNegativeMarking,
      marksPerCorrect: Number(marksPerCorrect),
      questions,
      correctAnswers: questions.reduce((acc, q, index) => {
        acc[index] = q.correctAnswer;
        return acc;
      }, {})
    });

    await newTest.save();
    res.status(201).json({ success: true, message: "Test created successfully!" });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Internal Server Error" 
    });
  }
});

// ✅ Get All Tests (Admin Only)
router.get("/get-tests", verifyAdmin, async (req, res) => {
  try {
    const tests = await TestModel.find();
    res.status(200).json({ success: true, tests });
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ✅ Get Test by Room Number (For Students)
router.get("/get-test/:roomNumber", async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const test = await TestModel.findOne({ roomNumber });
    
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    // Don't send correctAnswers to students
    const testWithoutAnswers = {
      ...test.toObject(),
      correctAnswers: undefined
    };

    res.json({ success: true, test: testWithoutAnswers });
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ✅ Delete Test (Admin Only)
router.delete("/delete-test/:roomNumber", verifyAdmin, async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const deletedTest = await TestModel.findOneAndDelete({ roomNumber });

    if (!deletedTest) {
      return res.status(404).json({ success: false, error: "Test not found!" });
    }

    res.status(200).json({ success: true, message: "Test deleted successfully!" });
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ✅ Submit Test (Student)
router.post("/submit-test", async (req, res) => {
  try {
    const { roomNumber, userDetails, answers } = req.body;
    
    // Find the test first to get negative marking and marks per correct
    const test = await TestModel.findOne({ roomNumber });
    if (!test) {
      return res.status(404).json({ 
        success: false, 
        message: "Test not found" 
      });
    }

    // Calculate score
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    
    // Process each answer
    test.questions.forEach((question, index) => {
      if (question.type === 'objective' && answers[index] !== undefined) {
        if (answers[index] === test.correctAnswers[index]) {
          correctAnswers++;
        } else {
          incorrectAnswers++;
        }
      }
    });

    // Calculate final score with marks per correct and negative marking
    const marksPerCorrect = test.marksPerCorrect || 1; // Default to 1 if not set
    const marksForCorrect = correctAnswers * marksPerCorrect;
    const marksDeducted = test.negativeMarking * incorrectAnswers;
    const finalScore = marksForCorrect - marksDeducted;
    const adjustedScore = Math.max(0, finalScore);

    // Create submission object
    const submission = {
      studentName: userDetails.name,
      branch: userDetails.branch,
      regNo: userDetails.regNo,
      answers: answers,
      submittedAt: new Date(),
      score: {
        correct: correctAnswers,
        incorrect: incorrectAnswers,
        final: adjustedScore,
        negativeMarking: test.negativeMarking,
        marksPerCorrect: marksPerCorrect,
        marksForCorrect: marksForCorrect,
        marksDeducted: marksDeducted
      }
    };

    // Update the test with submission
    const updatedTest = await TestModel.findOneAndUpdate(
      { roomNumber: roomNumber },
      { $push: { submissions: submission } },
      { new: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ 
        success: false, 
        message: "Test not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Test submitted successfully",
      score: submission.score
    });

  } catch (error) {
    console.error("Error submitting test:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
});

// Add this route
router.get("/verify-room/:roomNumber", async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const test = await TestModel.findOne({ roomNumber });
    
    if (!test) {
      return res.status(404).json({ 
        success: false, 
        message: "Test not found" 
      });
    }

    // Create moment object for test start time in local timezone
    const testStartDateTime = moment.tz(`${test.date} ${test.time}`, "Asia/Kolkata");
    const now = moment();

    // Calculate test end time
    const testEndDateTime = testStartDateTime.clone().add(test.duration + 10, 'minutes');
    const originalEndTime = testStartDateTime.clone().add(test.duration, 'minutes');

    // Check if test has ended (including grace period)
    if (now.isAfter(testEndDateTime)) {
      return res.json({
        success: false,
        testEnded: true,
        message: "Test has ended",
        testInfo: {
          date: test.date,
          time: test.time,
          duration: test.duration,
          endTime: originalEndTime.format("HH:mm"),
          graceEndTime: testEndDateTime.format("HH:mm")
        }
      });
    }

    // If we're in grace period, send a warning
    if (now.isAfter(originalEndTime)) {
      const graceTimeLeft = Math.floor(testEndDateTime.diff(now, 'minutes'));
      return res.json({
        success: true,
        inGracePeriod: true,
        message: `You are in grace period. The test officially ended at ${originalEndTime.format("HH:mm")}. You have ${graceTimeLeft} minutes left to submit.`
      });
    }

    // Check if test time has arrived
    if (now.isBefore(testStartDateTime)) {
      const diff = testStartDateTime.diff(now);
      const days = Math.floor(diff.asDays());
      const hours = Math.floor(diff.asHours() % 24);
      const minutes = Math.floor(diff.asMinutes() % 60);

      return res.json({ 
        success: false, 
        notStarted: true,
        message: "Test has not started yet",
        startTime: {
          days,
          hours,
          minutes,
          date: test.date,
          time: test.time
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error verifying room:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

// Add this route to check if registration number exists
router.post("/check-registration", async (req, res) => {
  try {
    const { roomNumber, regNo } = req.body;
    
    const test = await TestModel.findOne({ roomNumber });
    if (!test) {
      return res.status(404).json({ 
        success: false, 
        message: "Test not found" 
      });
    }

    // Check if registration number already exists in submissions
    const existingSubmission = test.submissions.find(
      sub => sub.regNo === regNo
    );

    if (existingSubmission) {
      return res.json({ 
        success: false, 
        message: "This registration number has already submitted the test." 
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error checking registration:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

// Define a new route
router.get("/responses", async (req, res) => {
  try {
    const tests = await TestModel.find();
    res.json({ success: true, responses: tests });
  } catch (error) {
    console.error("Error fetching responses:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Use SECRET_KEY instead of process.env.JWT_SECRET
    const decoded = jwt.verify(token, SECRET_KEY);
    if (!decoded.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Add verification endpoint
router.get('/verify-admin', verifyAdminToken, (req, res) => {
  res.json({ success: true, message: 'Token is valid' });
});

// Update your existing protected routes to use verifyAdminToken
router.get("/get-test-responses/:roomNumber", verifyAdminToken, async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const test = await TestModel.findOne({ roomNumber });
    
    if (!test) {
      return res.status(404).json({ 
        success: false, 
        message: "Room number does not exist" 
      });
    }

    // Check if test has subjective questions
    const hasSubjective = test.questions.some(q => q.type === 'subjective');

    // Map submissions to response format
    const responses = (test.submissions || []).map(submission => {
      let correctAnswers = 0;
      let incorrectAnswers = 0;
      let subjectiveAnswers = [];
      
      // Process each answer
      test.questions.forEach((question, index) => {
        if (question.type === 'objective') {
          // Handle objective questions
          if (submission.answers && submission.answers[index] !== undefined) {
            if (submission.answers[index] === test.correctAnswers[index]) {
              correctAnswers++;
            } else {
              incorrectAnswers++;
            }
          }
        } else if (question.type === 'subjective') {
          // Handle subjective answers
          const answer = submission.answers ? submission.answers[index] : null;
          subjectiveAnswers.push({
            questionNumber: index + 1,
            questionText: question.text,
            answer: answer ? answer.trim() : "Did not attempt this question"
          });
        }
      });

      // Calculate final score with marks per correct and negative marking
      const marksPerCorrect = test.marksPerCorrect || 1;
      const marksForCorrect = correctAnswers * marksPerCorrect;
      const marksDeducted = test.negativeMarking * incorrectAnswers;
      const finalScore = marksForCorrect - marksDeducted;
      const adjustedScore = Math.max(0, finalScore);

      return {
        studentName: submission.studentName || 'N/A',
        regNo: submission.regNo || 'N/A',
        branch: submission.branch || 'N/A',
        answers: submission.answers || {},
        score: {
          correct: correctAnswers,
          incorrect: incorrectAnswers,
          final: adjustedScore,
          negativeMarking: test.negativeMarking,
          marksPerCorrect: marksPerCorrect,
          marksForCorrect: marksForCorrect,
          marksDeducted: marksDeducted
        }
      };
    });

    // Sort responses by final score
    const sortedResponses = responses.sort((a, b) => b.score.final - a.score.final);

    res.json({ 
      success: true, 
      responses: sortedResponses,
      hasSubjective,
      testDetails: {
        roomNumber: test.roomNumber,
        date: test.date,
        time: test.time,
        duration: test.duration,
        negativeMarking: test.negativeMarking,
        marksPerCorrect: test.marksPerCorrect,
        questions: test.questions,
        correctAnswers: test.correctAnswers
      }
    });

  } catch (error) {
    console.error("Error fetching test responses:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

// Add this route for checking room availability
router.get("/check-room/:roomNumber", verifyAdmin, async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const existingTest = await TestModel.findOne({ roomNumber });
    
    res.json({
      success: true,
      available: !existingTest,
      message: existingTest ? "Room number already exists" : "Room number is available"
    });
  } catch (error) {
    console.error("Error checking room:", error);
    res.status(500).json({
      success: false,
      message: "Error checking room availability"
    });
  }
});

// Save test progress
router.post("/save-progress", async (req, res) => {
  try {
    const { roomNumber, userDetails, answers, currentQuestionIndex } = req.body;
    
    // Find the test
    const test = await TestModel.findOne({ roomNumber });
    if (!test) {
      return res.status(404).json({ 
        success: false, 
        message: "Test not found" 
      });
    }

    // Check if there's an existing progress for this user
    const existingProgress = test.progress || {};
    const userProgress = existingProgress[userDetails.regNo] || {};

    // Update progress
    const updatedProgress = {
      ...existingProgress,
      [userDetails.regNo]: {
        ...userProgress,
        answers: answers,
        currentQuestionIndex: currentQuestionIndex,
        lastSaved: new Date(),
        userDetails: userDetails
      }
    };

    // Update the test with progress
    const updatedTest = await TestModel.findOneAndUpdate(
      { roomNumber: roomNumber },
      { $set: { progress: updatedProgress } },
      { new: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ 
        success: false, 
        message: "Test not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Progress saved successfully"
    });

  } catch (error) {
    console.error("Error saving progress:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
});

module.exports = router;
