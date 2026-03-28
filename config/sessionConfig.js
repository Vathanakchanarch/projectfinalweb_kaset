import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';

const MySQLStore = MySQLStoreFactory(session);

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'cyber_news_platform',
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 60 * 60 * 1000,
  createDatabaseTable: true
});

export const sessionConfig = session({
  key: 'kaset_news_session',
  secret: process.env.SESSION_SECRET || 'change_this_secret_in_production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 60 * 60 * 1000,
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
});