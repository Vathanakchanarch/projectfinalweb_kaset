import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';

import routes from './routes/index.js';
import { sessionConfig } from './config/sessionConfig.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionConfig);
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'templates/mains');

app.use((req, res, next) => {
  res.locals.userName = req.session?.userName || null;
  res.locals.userRole = req.session?.userRole || null;
  res.locals.userEmail = req.session?.userEmail || null;
  res.locals.hideFooter = false;
  next();
});

app.use('/', routes);

const PORT = process.env.PORT_APP || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
