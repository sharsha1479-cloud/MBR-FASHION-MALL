const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getUsers,
  updateUserRole,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
} = require('../controllers/adminController');
const {
  getStores,
  createInventoryRecord,
  updateInventoryRecord,
  deleteInventoryRecord,
} = require('../controllers/storeInventoryController');

const router = express.Router();

router.get('/users', protect, admin, getUsers);
router.put('/users/:id/role', protect, admin, updateUserRole);
router.get('/orders', protect, admin, getAdminOrders);
router.get('/orders/:id', protect, admin, getAdminOrderById);
router.put('/orders/:id/status', protect, admin, updateOrderStatus);
router.get('/store-inventory', protect, admin, getStores);
router.post('/store-inventory', protect, admin, createInventoryRecord);
router.put('/store-inventory/:id', protect, admin, updateInventoryRecord);
router.delete('/store-inventory/:id', protect, admin, deleteInventoryRecord);

module.exports = router;
