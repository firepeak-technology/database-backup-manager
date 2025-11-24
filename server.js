import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import { google } from 'googleapis';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve static frontend files if they exist
if (existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  profile.tokens = { accessToken, refreshToken };
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Ensure directories exist
await fs.mkdir('./configs', { recursive: true });
await fs.mkdir('./backups', { recursive: true });
await fs.mkdir('./logs', { recursive: true });

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// Routes
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: req.isAuthenticated() });
});

app.get('/api/auth/google',
  passport.authenticate('google', { 
    scope: [
      'profile', 
      'email',
      'https://www.googleapis.com/auth/drive.file'
    ],
    accessType: 'offline',
    prompt: 'consent'
  })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  }
);

app.post('/api/auth/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

// Get all configs
app.get('/api/configs', requireAuth, async (req, res) => {
  try {
    const files = await fs.readdir('./configs');
    const configs = [];
    
    for (const file of files) {
      if (file.endsWith('.env')) {
        const content = await fs.readFile(`./configs/${file}`, 'utf8');
        const config = parseEnvFile(content);
        config.appName = file.replace('.env', '');
        configs.push(config);
      }
    }
    
    res.json({ configs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new config
app.post('/api/configs', requireAuth, async (req, res) => {
  try {
    const { appName, ...config } = req.body;
    const envContent = createEnvContent(config);
    await fs.writeFile(`./configs/${appName}.env`, envContent);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete config
app.delete('/api/configs/:appName', requireAuth, async (req, res) => {
  try {
    await fs.unlink(`./configs/${req.params.appName}.env`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run backup manually
app.post('/api/backups/run/:appName', requireAuth, async (req, res) => {
  try {
    const { appName } = req.params;
    const tokens = req.user.tokens;
    
    runBackup(appName, tokens).catch(err => {
      console.error(`Backup failed for ${appName}:`, err);
    });
    
    res.json({ success: true, message: 'Backup started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get backup history
app.get('/api/backups/history', requireAuth, async (req, res) => {
  try {
    const logPath = './logs/backup-history.json';
    let history = [];
    
    try {
      const content = await fs.readFile(logPath, 'utf8');
      history = JSON.parse(content);
    } catch (err) {
      // File doesn't exist yet
    }
    
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Utility functions
function parseEnvFile(content) {
  const config = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const [key, value] = line.split('=');
    if (key && value) {
      config[key.trim()] = value.trim().replace(/['"]/g, '');
    }
  }
  
  return {
    dbType: config.DB_TYPE,
    dbHost: config.DB_HOST,
    dbPort: config.DB_PORT,
    dbName: config.DB_NAME,
    dbUser: config.DB_USER,
    backupKeepDays: config.BACKUP_KEEP_DAYS,
    backupKeepDriveDays: config.BACKUP_KEEP_DRIVE_DAYS,
    googleDriveFolderId: config.GOOGLE_DRIVE_FOLDER_ID
  };
}

function createEnvContent(config) {
  return `DB_TYPE=${config.dbType}
DB_HOST=${config.dbHost}
DB_PORT=${config.dbPort}
DB_NAME=${config.dbName}
DB_USER=${config.dbUser}
DB_PASSWORD=${config.dbPassword}
BACKUP_KEEP_DAYS=${config.backupKeepDays}
BACKUP_KEEP_DRIVE_DAYS=${config.backupKeepDriveDays}
GOOGLE_DRIVE_FOLDER_ID=${config.googleDriveFolderId}`;
}

async function runBackup(appName, tokens) {
  const configPath = `./configs/${appName}.env`;
  const configContent = await fs.readFile(configPath, 'utf8');
  const config = parseEnvFile(configContent);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = config.dbType === 'postgresql' ? 'dump' : 'sql';
  const filename = `${appName}_${timestamp}.${extension}`;
  const outputPath = path.join('./backups', filename);
  
  console.log(`Starting backup for ${appName}...`);
  
  try {
    if (config.dbType === 'postgresql') {
      const dbPassword = configContent.match(/DB_PASSWORD=(.*)/)?.[1] || '';
      const cmd = `PGPASSWORD="${dbPassword}" pg_dump -h ${config.dbHost} -p ${config.dbPort} -U ${config.dbUser} -F c -b -v -f "${outputPath}" ${config.dbName}`;
      await execAsync(cmd);
    } else if (config.dbType === 'mysql') {
      const dbPassword = configContent.match(/DB_PASSWORD=(.*)/)?.[1] || '';
      const cmd = `mysqldump -h ${config.dbHost} -P ${config.dbPort} -u ${config.dbUser} -p"${dbPassword}" ${config.dbName} > "${outputPath}"`;
      await execAsync(cmd);
    }
    
    const stats = await fs.stat(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    let driveFileId = null;
    if (tokens && config.googleDriveFolderId) {
      driveFileId = await uploadToGoogleDrive(outputPath, filename, config.googleDriveFolderId, tokens);
    }
    
    await logBackup({
      appName,
      timestamp: new Date().toISOString(),
      filename,
      size: `${sizeMB} MB`,
      success: true,
      driveFileId
    });
    
    console.log(`✓ Backup completed for ${appName}: ${sizeMB} MB`);
  } catch (err) {
    console.error(`✗ Backup failed for ${appName}:`, err.message);
    
    await logBackup({
      appName,
      timestamp: new Date().toISOString(),
      filename,
      success: false,
      error: err.message
    });
  }
}

async function uploadToGoogleDrive(filePath, filename, folderId, tokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken
  });
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const fileMetadata = {
    name: filename,
    parents: [folderId]
  };
  
  const media = {
    mimeType: 'application/octet-stream',
    body: createReadStream(filePath)
  };
  
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id'
  });
  
  return response.data.id;
}

async function logBackup(entry) {
  const logPath = './logs/backup-history.json';
  let history = [];
  
  try {
    const content = await fs.readFile(logPath, 'utf8');
    history = JSON.parse(content);
  } catch (err) {
    // File doesn't exist yet
  }
  
  history.unshift(entry);
  history = history.slice(0, 100);
  
  await fs.writeFile(logPath, JSON.stringify(history, null, 2));
}

async function runAllBackups(tokens) {
  const files = await fs.readdir('./configs');
  
  for (const file of files) {
    if (file.endsWith('.env')) {
      const appName = file.replace('.env', '');
      await runBackup(appName, tokens);
    }
  }
}

// Schedule daily backups at 1 AM
cron.schedule('0 1 * * *', async () => {
  console.log('Running scheduled backups...');
  
  try {
    await runAllBackups(null);
  } catch (err) {
    console.error('Scheduled backup failed:', err);
  }
});

app.listen(PORT, () => {
  console.log(`Backup server running on port ${PORT}`);
  console.log(`Scheduled backups: Daily at 01:00`);
});

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Run: npm run build in frontend directory');
  }
});
