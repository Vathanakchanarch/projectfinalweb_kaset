import bcrypt from 'bcrypt';
import User from '../models/userModel.js';
import { generateOtp6, sendResetEmail } from '../utils/mailer.js';

function isKasetEmail(email) {
  return /^[A-Za-z0-9._%+-]+@kasetnews\.com$/i.test(String(email || '').trim());
}

function isMediumStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(String(password || ''));
}

export async function getCreateUser(req, res) {
  try {
    return res.render('users/userIndex', {
      title: 'Create User',
      error: null,
      hideFooter: true,
      formData: {
        firstName: '',
        lastName: '',
        email: '',
        role: 'editor'
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
}

export async function createUser(req, res) {
  const {
    fullName,
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    role
  } = req.body;

  const viewData = {
    title: 'Create User',
    hideFooter: true,
    formData: {
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      role: role || 'editor'
    }
  };

  if (!email || !password || !confirmPassword) {
    return res.status(400).render('users/userIndex', {
      ...viewData,
      error: 'Email and passwords are required.'
    });
  }

  if (!isKasetEmail(email)) {
    return res.status(400).render('users/userIndex', {
      ...viewData,
      error: 'Only email addresses ending with @kasetnews.com are allowed.'
    });
  }

  if (!isMediumStrongPassword(password)) {
    return res.status(400).render('users/userIndex', {
      ...viewData,
      error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).render('users/userIndex', {
      ...viewData,
      error: 'Passwords do not match.'
    });
  }

  try {
    const full_name =
      (fullName && fullName.trim()) ||
      [firstName, lastName].filter(Boolean).join(' ').trim();

    if (!full_name) {
      return res.status(400).render('users/userIndex', {
        ...viewData,
        error: 'Full name is required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const allowedRoles = new Set(['editor', 'admin']);
    const safeRole = allowedRoles.has(role) ? role : 'editor';
    const safeStatus = 'active';

    const password_hash = await bcrypt.hash(password, 10);

    await User.create({
      full_name,
      email: normalizedEmail,
      password_hash,
      role: safeRole,
      status: safeStatus
    });

    return res.redirect('/admin/users');
  } catch (error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).render('users/userIndex', {
        ...viewData,
        error: 'Email already exists.'
      });
    }

    return res.status(500).send('Server Error');
  }
}

export async function login(req, res) {
  try {
    return res.render('users/login', {
      title: 'Login',
      error: null,
      email: '',
      hideFooter: true
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render('users/login', {
      title: 'Login',
      error: 'Email and password are required.',
      email: String(email || ''),
      hideFooter: true
    });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const [rows] = await User.findByEmail(normalizedEmail);

    if (!rows.length) {
      return res.status(401).render('users/login', {
        title: 'Login',
        error: 'Invalid email or password',
        email: normalizedEmail,
        hideFooter: true
      });
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return res.status(403).render('users/login', {
        title: 'Login',
        error: 'Your account is suspended',
        email: normalizedEmail,
        hideFooter: true
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).render('users/login', {
        title: 'Login',
        error: 'Invalid email or password',
        email: normalizedEmail,
        hideFooter: true
      });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate(err => (err ? reject(err) : resolve()));
    });

    req.session.userId = user.user_id;
    req.session.userName = user.full_name;
    req.session.userRole = user.role;
    req.session.userEmail = user.email;

    if (user.role === 'admin') {
      return res.redirect('/admin');
    }

    return res.redirect('/articles/create');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
}

export async function listUser(req, res) {
  try {
    const [rows] = await User.fetchAll();
    return res.render('users/list', {
      title: 'Users',
      users: rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
}

export async function findUser(req, res) {
  try {
    const { name, fullName, firstName, lastName } = req.body;

    const term =
      (name && name.trim()) ||
      (fullName && fullName.trim()) ||
      [firstName, lastName].filter(Boolean).join(' ').trim();

    if (!term) {
      const [rows] = await User.fetchAll();
      return res.render('users/list', {
        title: 'Users',
        users: rows
      });
    }

    const [rows] = await User.findByFullName(term);

    return res.render('users/list', {
      title: 'Find User',
      users: rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
}

export async function suspendUser(req, res) {
  try {
    const { id } = req.params;

    if (req.session.userId === id) {
      return res.status(400).send('You cannot suspend your own account.');
    }

    await User.suspendById(id);
    return res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
}

export async function getForgot(req, res) {
  return res.render('auth/forgotEmail', {
    title: 'Forgot Password',
    error: null,
    success: null,
    email: '',
    hideFooter: true
  });
}

export async function postForgot(req, res) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).render('auth/forgotEmail', {
        title: 'Forgot Password',
        error: 'Email is required',
        success: null,
        email: '',
        hideFooter: true
      });
    }

    const code = generateOtp6();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const [result] = await User.createOtpForEmail(email, code, expiresAt);

    if (!result) {
      return res.status(404).render('auth/forgotEmail', {
        title: 'Forgot Password',
        error: 'Email does not exist',
        success: null,
        email,
        hideFooter: true
      });
    }

    await sendResetEmail(email, code);

    req.session.resetEmail = email;
    return res.redirect('/forgot/verify');
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).render('auth/forgotEmail', {
      title: 'Forgot Password',
      error: 'Failed to send reset code',
      success: null,
      email: String(req.body.email || ''),
      hideFooter: true
    });
  }
}

export async function getVerifyOtp(req, res) {
  if (!req.session.resetEmail) {
    return res.redirect('/forgot');
  }

  return res.render('auth/forgotVerify', {
    title: 'Verify Code',
    email: req.session.resetEmail,
    error: null,
    hideFooter: true
  });
}

export async function postVerifyOtp(req, res) {
  try {
    if (!req.session.resetEmail) {
      return res.redirect('/forgot');
    }

    const code = String(req.body.code || '').trim();

    if (!code) {
      return res.status(400).render('auth/forgotVerify', {
        title: 'Verify Code',
        email: req.session.resetEmail,
        error: 'Code is required',
        hideFooter: true
      });
    }

    const [rows] = await User.findValidOtp(req.session.resetEmail, code);

    if (!rows.length) {
      return res.status(400).render('auth/forgotVerify', {
        title: 'Verify Code',
        email: req.session.resetEmail,
        error: 'Invalid or expired code',
        hideFooter: true
      });
    }

    const otp = rows[0];
    await User.markOtpUsed(otp.otp_id);

    req.session.resetVerified = true;
    return res.redirect('/forgot/reset');
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).render('auth/forgotVerify', {
      title: 'Verify Code',
      email: req.session.resetEmail,
      error: 'Server error verifying code',
      hideFooter: true
    });
  }
}

export async function getResetPassword(req, res) {
  if (!req.session.resetEmail || !req.session.resetVerified) {
    return res.redirect('/forgot');
  }

  return res.render('auth/forgotReset', {
    title: 'Reset Password',
    email: req.session.resetEmail,
    error: null,
    hideFooter: true
  });
}

export async function postResetPassword(req, res) {
  try {
    if (!req.session.resetEmail || !req.session.resetVerified) {
      return res.redirect('/forgot');
    }

    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).render('auth/forgotReset', {
        title: 'Reset Password',
        email: req.session.resetEmail,
        error: 'Password and confirm password are required',
        hideFooter: true
      });
    }

    if (!isMediumStrongPassword(password)) {
      return res.status(400).render('auth/forgotReset', {
        title: 'Reset Password',
        email: req.session.resetEmail,
        error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.',
        hideFooter: true
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('auth/forgotReset', {
        title: 'Reset Password',
        email: req.session.resetEmail,
        error: 'Passwords do not match',
        hideFooter: true
      });
    }

    const hash = await bcrypt.hash(password, 10);
    await User.updatePasswordByEmail(req.session.resetEmail, hash);

    delete req.session.resetEmail;
    delete req.session.resetVerified;

    return res.redirect('/forgot/success');
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).render('auth/forgotReset', {
      title: 'Reset Password',
      email: req.session.resetEmail,
      error: 'Server error resetting password',
      hideFooter: true
    });
  }
}

export async function getResetSuccess(req, res) {
  return res.render('auth/forgotSuccess', {
    title: 'Password Updated',
    success: 'Your password has been reset successfully',
    hideFooter: true
  });
}
