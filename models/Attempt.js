const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selected: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null }
  }],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  wrongCount: { type: Number, required: true },
  skippedCount: { type: Number, required: true },
  timeTaken: { type: Number, default: 0 }, // seconds
  percentage: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Attempt', attemptSchema);
