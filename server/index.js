const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const coursesRoutes = require('./routes/courses');
const slidesRoutes = require('./routes/slides');
const progressRoutes = require('./routes/progress');
const questionsRoutes = require('./routes/questions');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/slides', slidesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Serve Next.js static build files (frontend)
const outDir = path.join(__dirname, '../out');
if (fs.existsSync(outDir)) {
  app.use(express.static(outDir));
  
  // Catch-all handler: send back Next.js's index.html file for client-side routing
  app.get('*', (req, res) => {
    // Don't interfere with API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    const indexPath = path.join(outDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not found. Please run: npm run build');
    }
  });
} else {
  // If out directory doesn't exist, show helpful message
  app.get('/', (req, res) => {
    res.status(503).send(`
      <html>
        <head><title>Frontend Not Built</title></head>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1>Frontend not found</h1>
          <p>Please run: <code>npm run build</code> to build the Next.js frontend.</p>
          <p>API is available at: <a href="/api/health">/api/health</a></p>
        </body>
      </html>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (fs.existsSync(outDir)) {
    console.log(`Serving Next.js frontend from: ${outDir}`);
  } else {
    console.log(`Warning: Frontend build not found at ${outDir}. Run 'npm run build' to build the frontend.`);
  }
});

