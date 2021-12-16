const router = require('express').Router();

const CategoryController = require('../controllers/CategoryController');

// middlewares
const verifyToken = require('../helpers/verify-token');

router.get('/', CategoryController.getAllCategories);
router.get('/:id', CategoryController.getCategoryById);
router.post('/create', verifyToken, CategoryController.create);

module.exports = router;