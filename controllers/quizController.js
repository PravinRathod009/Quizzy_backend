const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');

// ── Public / User ──────────────────────────────────────────────

exports.getAllQuizzes = async (req, res) => {
  try {
    const { subject, level } = req.query;
    const filter = { isActive: true };
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (level) filter.level = level;
    const quizzes = await Quiz.find(filter).sort('-createdAt').populate('createdBy', 'name');
    // Attach attempt info for logged-in user
    if (req.user) {
      const attempts = await Attempt.find({ userId: req.user._id }).select('quizId');
      const attemptedIds = new Set(attempts.map(a => a.quizId.toString()));
      const withStatus = quizzes.map(q => ({
        ...q.toObject(),
        attempted: attemptedIds.has(q._id.toString())
      }));
      return res.json(withStatus);
    }
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'name');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getQuizQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ quizId: req.params.id }).sort('order');
    // Strip correct answers for the attempt
    const sanitized = questions.map(q => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      order: q.order
    }));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Admin ──────────────────────────────────────────────────────

exports.createQuiz = async (req, res) => {
  try {
    const { title, description, subject, level, timer, numQuestions } = req.body;
    if (!title || !subject || !level || !timer || !numQuestions)
      return res.status(400).json({ error: 'All fields are required.' });
    const quiz = await Quiz.create({
      title, description, subject, level,
      timer: Number(timer), numQuestions: Number(numQuestions),
      createdBy: req.user._id
    });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
    await Question.deleteMany({ quizId: req.params.id });
    await Attempt.deleteMany({ quizId: req.params.id });
    res.json({ message: 'Quiz, questions and attempts deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Questions ─────────────────────────────────────────────────

exports.addQuestion = async (req, res) => {
  try {
    const { text, options, correctAnswer, order } = req.body;
    if (!text || !options || !correctAnswer)
      return res.status(400).json({ error: 'text, options, and correctAnswer are required.' });
    const question = await Question.create({
      quizId: req.params.id, text, options, correctAnswer, order: order || 0
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkAddQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0)
      return res.status(400).json({ error: 'Questions array is required.' });
    // Delete existing questions first (replace mode)
    await Question.deleteMany({ quizId: req.params.id });
    const docs = questions.map((q, i) => ({
      quizId: req.params.id,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer.toUpperCase(),
      order: i
    }));
    const inserted = await Question.insertMany(docs);
    // Update quiz numQuestions
    await Quiz.findByIdAndUpdate(req.params.id, { numQuestions: inserted.length });
    res.status(201).json({ count: inserted.length, questions: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAdminQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ quizId: req.params.id }).sort('order');
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.qid, req.body, { new: true });
    if (!q) return res.status(404).json({ error: 'Question not found.' });
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.qid);
    res.json({ message: 'Question deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
