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
    type: String, // Can be "1/3", "0.33", "1" etc.
    default: '0'
  },
  image: {
    type: String
  }
});

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Test', testSchema);
