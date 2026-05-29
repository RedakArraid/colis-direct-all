import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const photosDir = path.join(__dirname, '../../uploads/photos');
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, photosDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `photo-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPG, PNG et WebP sont autorisés'));
    }
  },
});

// POST /api/uploads/photos — upload jusqu'à 5 photos, retourne les URLs
router.post('/photos', upload.array('photos', 5), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier reçu.' });
  }
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  const urls = files.map(f => `${baseUrl}/uploads/photos/${f.filename}`);
  res.json({ urls });
});

export default router;
