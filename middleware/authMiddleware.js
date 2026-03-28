export const isAuth = (req, res, next) => {
  if (req.session?.userId) return next();
  return res.redirect('/login');
};

export const isGuest = (req, res, next) => {
  if (!req.session?.userId) return next();

  if (req.session.userRole === 'admin') {
    return res.redirect('/admin');
  }

  if (req.session.userRole === 'editor') {
    return res.redirect('/articles/create');
  }

  return res.redirect('/');
};

export const isAdmin = (req, res, next) => {
  if (!req.session?.userId) return res.redirect('/login');
  if (req.session.userRole !== 'admin') return res.redirect('/');
  return next();
};

export const isEditorOnly = (req, res, next) => {
  if (!req.session?.userId) return res.redirect('/login');
  if (req.session.userRole !== 'editor') return res.redirect('/');
  return next();
};