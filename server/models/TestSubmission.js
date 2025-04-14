const mongoose = require('mongoose');

const testSubmissionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Test'
  },
  userId: {
    type: String,
    required: true
  },
  answers: {
    type: Object,
    required: true
  },
  subjectiveAnswers: {
    type: Object,
    default: {}
  },
  score: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  incorrectAnswers: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster queries
testSubmissionSchema.index({ testId: 1, userId: 1 });

const TestSubmission = mongoose.model('TestSubmission', testSubmissionSchema);

module.exports = TestSubmission; 