const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const PDFDocument = require('pdfkit');


exports.submitAttempt = async (req, res) => {
  try {
    const { quizId, answers, timeTaken } = req.body;
    // Block re-attempt
    const existing = await Attempt.findOne({ userId: req.user._id, quizId });
    if (existing) return res.status(409).json({ error: 'You have already attempted this quiz.' });

    const questions = await Question.find({ quizId }).sort('order');
    if (!questions.length) return res.status(400).json({ error: 'No questions found for this quiz.' });

    let correctCount = 0;
    const gradedAnswers = questions.map(q => {
      const userAnswer = answers.find(a => a.questionId === q._id.toString());
      const selected = userAnswer ? userAnswer.selected : null;
      if (selected && selected === q.correctAnswer) correctCount++;
      return { questionId: q._id, selected };
    });

    const totalQuestions = questions.length;
    const wrongCount = gradedAnswers.filter(a => a.selected && a.selected !== questions.find(q => q._id.toString() === a.questionId.toString())?.correctAnswer).length;
    const skippedCount = gradedAnswers.filter(a => !a.selected).length;
    const score = correctCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    const attempt = await Attempt.create({
      userId: req.user._id,
      quizId,
      answers: gradedAnswers,
      score,
      totalQuestions,
      correctCount,
      wrongCount,
      skippedCount,
      timeTaken: timeTaken || 0,
      percentage
    });
    res.status(201).json({ attempt, correctAnswers: Object.fromEntries(questions.map(q => [q._id, q.correctAnswer])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyAttempts = async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.user._id })
      .populate('quizId', 'title subject level')
      .sort('-createdAt');
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAttemptById = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('quizId', 'title subject level')
      .populate('answers.questionId');
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });
    if (attempt.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Access denied.' });
    res.json(attempt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRankings = async (req, res) => {
  try {
    const { quizId } = req.query;
    const filter = quizId ? { quizId } : {};
    const rankings = await Attempt.aggregate([
      { $match: filter },
      { $group: { _id: '$userId', avgScore: { $avg: '$percentage' }, totalAttempts: { $sum: 1 }, totalScore: { $sum: '$score' } } },
      { $sort: { avgScore: -1, totalScore: -1 } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { 'user.name': 1, 'user.email': 1, avgScore: 1, totalAttempts: 1, totalScore: 1 } }
    ]);
    const withRank = rankings.map((r, i) => ({ ...r, rank: i + 1 }));
    res.json(withRank);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateUserResultPDF = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('quizId', 'title subject level')
      .populate('answers.questionId');

    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    // Verify user owns the attempt
    if (attempt.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=my-result-${attempt._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('Quizzy', 50, 40);
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#333').text('Your Quiz Result', 50, 75);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated on ${new Date().toLocaleDateString()}`, 50, 100);
    doc.moveTo(50, 120).lineTo(550, 120).stroke('#ddd');

    let y = 140;
    
    // Score Badge
    let scoreColor = '#dc3545';
    if (attempt.percentage >= 80) scoreColor = '#28a745';
    else if (attempt.percentage >= 50) scoreColor = '#fd7e14';
    
    doc.fontSize(32).font('Helvetica-Bold').fillColor(scoreColor).text(`${attempt.percentage}%`, 50, y);
    doc.fontSize(12).font('Helvetica').fillColor('#555').text(`Score: ${attempt.score} / ${attempt.totalQuestions}`, 50, y + 40);
    
    // Summary Right Side
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Summary:', 300, y);
    doc.fontSize(10).font('Helvetica').fillColor('#555')
      .text(`Quiz: ${attempt.quizId?.title || 'N/A'}`, 300, y + 20)
      .text(`Correct: ${attempt.correctCount}`, 300, y + 35)
      .text(`Wrong: ${attempt.wrongCount}`, 300, y + 50)
      .text(`Skipped: ${attempt.skippedCount}`, 300, y + 65)
      .text(`Time Taken: ${Math.floor(attempt.timeTaken / 60)}m ${attempt.timeTaken % 60}s`, 300, y + 80);

    y += 110;
    doc.moveTo(50, y).lineTo(550, y).stroke('#ddd');
    y += 20;

    // Breakdown Section
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333').text('Question Review', 50, y);
    y += 20;

    const colWidths = [30, 260, 100, 100];
    const x = 50;
    
    // Header
    doc.rect(x, y - 4, 490, 20).fill('#f5f5f5').stroke('#eee');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
    doc.text('#', x, y, { width: colWidths[0] - 4 });
    doc.text('Question', x + colWidths[0], y, { width: colWidths[1] - 4 });
    doc.text('Your Answer', x + colWidths[0] + colWidths[1], y, { width: colWidths[2] - 4 });
    doc.text('Correct Answer', x + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] - 4 });
    
    y += 20;

    attempt.answers.forEach((ans, i) => {
      if (y > 720) { doc.addPage(); y = 50; }
      const q = ans.questionId;
      if (!q) return;
      
      const qText = q.text.substring(0, 50) + (q.text.length > 50 ? '...' : '');
      const selectedText = ans.selected ? `${ans.selected}. ${q.options[ans.selected] || ''}`.substring(0, 20) : 'Skipped';
      const correctText = `${q.correctAnswer}. ${q.options[q.correctAnswer] || ''}`.substring(0, 20);
      
      doc.fontSize(9).font('Helvetica').fillColor('#555');
      doc.text(String(i + 1), x, y, { width: colWidths[0] - 4 });
      doc.text(qText, x + colWidths[0], y, { width: colWidths[1] - 4 });
      
      doc.fillColor(ans.selected === q.correctAnswer ? '#28a745' : (ans.selected ? '#dc3545' : '#6c757d'));
      doc.text(selectedText, x + colWidths[0] + colWidths[1], y, { width: colWidths[2] - 4 });
      
      doc.fillColor('#28a745');
      doc.text(correctText, x + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] - 4 });
      
      y += 20;
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
