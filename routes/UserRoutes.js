const router = require('express').Router();

const UserController = require('../controllers/UserController');

// Middleware
const verifyToken = require('../helpers/verify-token');
const { imageUpload } = require('../helpers/image-upload');

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/checkuser', UserController.checkUser);
router.get('/:id', UserController.getUserById);
router.patch('/edit/:id', verifyToken, imageUpload.single('image'), UserController.editUser);
router.post('/forgot_password', UserController.forgotPassword);
router.post('/reset_password/:token/:id', UserController.resetPassword);

module.exports = router;
