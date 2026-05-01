const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getUsers,
  updateUserRole,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/users', protect, admin, getUsers);
router.put('/users/:id/role', protect, admin, updateUserRole);
router.get('/orders', protect, admin, getAdminOrders);
router.get('/orders/:id', protect, admin, getAdminOrderById);
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
