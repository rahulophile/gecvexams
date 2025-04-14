const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['objective', 'subjective'],
    required: true
  },
  options: [{
    type: String
  }],
  correctAnswer: {
    type: Number,
    required: function() {
      return this.type === 'objective';
    }
  },
  negativeMarking: {
    type: String,
    default: '0',
    validate: {
      validator: function(v) {
        // Allow fractions (e.g., "1/3"), decimals (e.g., "0.33"), or integers
        return /^\d*\/?\d*\.?\d*$/.test(v) || v === '0';
      },
      message: props => `${props.value} is not a valid negative marking value! Use format like "1/3", "0.33", or "1"`
    }
  },
  image: {
    type: String
  }
});

const testSchema = new mongoose.Schema({
  roomNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  date: { 
    type: String, 
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  duration: { 
    type: Number, 
    required: true 
  },
  negativeMarking: { 
    type: String,
    default: '0',
    validate: {
      validator: function(v) {
        return /^\d*\/?\d*\.?\d*$/.test(v) || v === '0';
      },
      message: props => `${props.value} is not a valid negative marking value!`
    }
  },
  questions: [questionSchema],
  correctAnswers: { 
    type: Object, 
    required: true 
  },
  submissions: [
    {
      studentName: String,
      branch: String,
      regNo: String,
      answers: Object,
      submittedAt: { 
        type: Date, 
        default: Date.now 
      }
    }
  ]
});

module.exports = mongoose.models.Test || mongoose.model("Test", testSchema);
