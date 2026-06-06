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

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Seuls les fichiers JPG, PNG et WebP sont autorisés'));
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error(`Type MIME non autorisé : ${file.mimetype}`));
    }
    cb(null, true);
  },
});

/** Vérifie les magic bytes (le MIME déclaré peut être falsifié). */
function validateImageMagicBytes(filePath: string): boolean {
  const buf = fs.readFileSync(filePath).subarray(0, 12);
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // PNG
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
}

// POST /api/uploads/photos — upload jusqu'à 5 photos, retourne les URLs
router.post('/photos', upload.array('photos', 5), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier reçu.' });
  }

  const validFiles: Express.Multer.File[] = [];
  for (const f of files) {
    const fullPath = path.join(photosDir, f.filename);
    if (!validateImageMagicBytes(fullPath)) {
      fs.unlinkSync(fullPath);
      continue;
    }
    validFiles.push(f);
  }

  if (validFiles.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier image valide (contenu non reconnu).' });
  }

  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  const urls = validFiles.map(f => `${baseUrl}/uploads/photos/${f.filename}`);
  res.json({ urls });
});

export default router;
