const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  duration: { type: Number, required: true },
  negativeMarking: { type: Number, required: true },
  marksPerCorrect: { type: Number, required: true, default: 1 },
  questions: { 
    type: Array, 
    required: true,
    validate: {
      validator: function(questions) {
        return questions.every(q => {
          if (q.type === 'subjective') {
            return typeof q.text === 'string' && 
                   (q.image === undefined || typeof q.image === 'string');
          }
          return true;
        });
      },
      message: 'Invalid question format'
    }
  },
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
        marksPerCorrect: Number
      }
    }
  ]
});

module.exports = mongoose.models.Test || mongoose.model("Test", TestSchema);
