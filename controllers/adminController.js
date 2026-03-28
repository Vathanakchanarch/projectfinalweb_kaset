import User from '../models/userModel.js';
import ArticleModel from '../models/articleModel.js';

export async function getAdminOverview(req, res) {
  try {
    const [[articleCountRow]] = await ArticleModel.countAll();
    const [[userCountRow]] = await User.countAll();
    const [recentActivities] = await ArticleModel.getRecentActivities(10);

    return res.render('admin/admin_overview', {
      title: 'Admin Overview',
      admin: {
        email: req.session.userEmail || 'admin@kasetnews.com'
      },
      totalArticles: articleCountRow.totalArticles,
      totalUsers: userCountRow.totalUsers,
      recentActivities,
      hideFooter: true
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
}

export async function getAdminUsers(req, res) {
  try {
    const [users] = await User.fetchAll();

    return res.render('admin/admin_users', {
      title: 'Admin Users',
      admin: {
        email: req.session.userEmail || 'admin@kasetnews.com'
      },
      users,
      hideFooter: true
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
}