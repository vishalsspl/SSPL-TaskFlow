import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// @route   POST /api/upload
// @desc    Upload a file
// @access  Private
router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Enforce 500KB limit for MEMBER role
  if (req.user?.role === 'MEMBER' && req.file.size > 500 * 1024) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Members are restricted to a maximum file size of 500KB.' });
  }

  // Construct URL to access the file
  // In production, this might be a full URL, but here we'll use a relative path
  // so the frontend can append it to the backend URL
  const fileUrl = `/uploads/${req.file.filename}`;

  res.json({
    url: fileUrl,
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype,
  });
});

export default router;
