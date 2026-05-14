const router = require('express').Router();
const ctrl = require('../controllers/quizController');
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');

// Public (with optional auth for attempt status)
router.get('/', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) return verifyToken(req, res, next);
  next();
}, ctrl.getAllQuizzes);

router.get('/:id', ctrl.getQuizById);
router.get('/:id/questions', verifyToken, ctrl.getQuizQuestions);

// Admin only
router.post('/', verifyToken, isAdmin, ctrl.createQuiz);
router.put('/:id', verifyToken, isAdmin, ctrl.updateQuiz);
router.delete('/:id', verifyToken, isAdmin, ctrl.deleteQuiz);

router.get('/:id/admin-questions', verifyToken, isAdmin, ctrl.getAdminQuestions);
router.post('/:id/questions', verifyToken, isAdmin, ctrl.addQuestion);
router.post('/:id/questions/bulk', verifyToken, isAdmin, ctrl.bulkAddQuestions);
router.put('/:id/questions/:qid', verifyToken, isAdmin, ctrl.updateQuestion);
router.delete('/:id/questions/:qid', verifyToken, isAdmin, ctrl.deleteQuestion);

module.exports = router;
