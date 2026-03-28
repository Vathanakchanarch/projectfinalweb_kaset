import { Router } from 'express';
const router = Router();

import {
  getCreateUser,
  createUser,
  login,
  loginUser,
  listUser,
  findUser,
  suspendUser,
  getForgot,
  postForgot,
  getVerifyOtp,
  postVerifyOtp,
  getResetPassword,
  postResetPassword,
  getResetSuccess
} from '../controllers/userController.js';

import {
  getDashboard,
  getDashboardMore,
  getArticleDetail,
  getCreateArticle,
  postCreateArticle,
  deleteArticle
} from '../controllers/articleController.js';

import { getAdminOverview, getAdminUsers } from '../controllers/adminController.js';
import { isAdmin, isGuest, isEditorOnly } from '../middleware/authMiddleware.js';
import { sendResetEmail } from '../utils/mailer.js';

/* PUBLIC */
router.get('/', getDashboard);
router.get('/dashboard', getDashboard);
router.get('/dashboard/load-more', getDashboardMore);

/* ARTICLE ROUTES */
/* IMPORTANT: create must be before :id */
router.get('/articles/create', isEditorOnly, getCreateArticle);
router.post('/articles/create', isEditorOnly, postCreateArticle);

router.get('/articles/:id', getArticleDetail);

/* AUTH */
router.get('/login', isGuest, login);
router.post('/login', isGuest, loginUser);

router.get('/forgot', isGuest, getForgot);
router.post('/forgot', isGuest, postForgot);
router.get('/forgot/verify', isGuest, getVerifyOtp);
router.post('/forgot/verify', isGuest, postVerifyOtp);
router.get('/forgot/reset', isGuest, getResetPassword);
router.post('/forgot/reset', isGuest, postResetPassword);
router.get('/forgot/success', isGuest, getResetSuccess);

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

/* ADMIN ONLY */
router.get('/create', isAdmin, getCreateUser);
router.post('/create', isAdmin, createUser);

router.get('/admin', isAdmin, getAdminOverview);
router.get('/admin/users', isAdmin, getAdminUsers);

router.get('/users', isAdmin, listUser);
router.post('/users/find', isAdmin, findUser);
router.post('/users/delete/:id', isAdmin, suspendUser);
router.post('/articles/delete/:id', isAdmin, deleteArticle);

router.get('/test-mail', async (req, res) => {
  try {
    const info = await sendResetEmail('test@example.com', '123456');
    return res.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

export default router;