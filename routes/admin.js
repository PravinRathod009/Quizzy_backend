const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');

router.use(verifyToken, isAdmin);

router.get('/dashboard', ctrl.getDashboardStats);
router.get('/users', ctrl.getAllUsers);
router.put('/users/:id/toggle', ctrl.toggleUserStatus);
router.get('/attempts', ctrl.getAllAttempts);
router.get('/attempts/:id/pdf', ctrl.generateAttemptPDF);
router.get('/reports/period/:period', ctrl.generatePeriodReport);
router.get('/reports/:type', ctrl.generateReport);

module.exports = router;
