const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  subject: { type: String, required: true, trim: true },
  level: { type: String, enum: ['low', 'medium', 'advance'], required: true },
  timer: { type: Number, required: true, min: 1, max: 180 }, // minutes
  numQuestions: { type: Number, required: true, min: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
