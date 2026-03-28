import 'dotenv/config'; // Loads variables from .env immediately
import express from 'express';
import userRoutes from './routes/userRoutes.js';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sessionConfig } from './config/sessionConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();


// Session Config (Essential for Security)
app.use(sessionConfig);

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(expressLayouts);


// Use built-in express parser instead of body-parser package
app.use(express.urlencoded({ extended: false }));

app.set('layout', 'templates/mains'); // Set default layout
// app.set('view options', { debug: true });
app.use('/', userRoutes);

const PORT = process.env.PORT_APP || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));