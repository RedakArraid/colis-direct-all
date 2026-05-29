import express, { Request, Response } from 'express';
import { pool } from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads/cvs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `cv-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF, DOC et DOCX sont autorisés'));
    }
  }
});

// POST /api/job-applications - Submit a job application (public)
router.post('/', upload.single('cv'), async (req: Request, res: Response) => {
  try {
    const {
      job_posting_id,
      first_name,
      last_name,
      email,
      phone,
      cover_letter
    } = req.body;

    if (!job_posting_id || !first_name || !last_name || !email) {
      return res.status(400).json({ error: 'Les champs obligatoires sont manquants' });
    }

    // Verify job posting exists and is active
    const jobCheck = await pool.query(
      'SELECT id, title FROM job_postings WHERE id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
      [job_posting_id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Offre d\'emploi introuvable ou expirée' });
    }

    const cvFilePath = req.file ? `/uploads/cvs/${req.file.filename}` : null;
    const cvFileName = req.file ? req.file.originalname : null;

    const result = await pool.query(
      `INSERT INTO job_applications (
        job_posting_id,
        first_name,
        last_name,
        email,
        phone,
        cover_letter,
        cv_file_path,
        cv_file_name,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING id, created_at`,
      [
        job_posting_id,
        first_name,
        last_name,
        email,
        phone || null,
        cover_letter || null,
        cvFilePath,
        cvFileName
      ]
    );

    res.status(201).json({
      message: 'Candidature soumise avec succès',
      application_id: result.rows[0].id
    });
  } catch (error: any) {
    console.error('Error submitting job application:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    if (error.message && error.message.includes('autorisés')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erreur lors de la soumission de la candidature' });
  }
});

// GET /api/job-applications/admin/all - Get all applications (admin only)
router.get('/admin/all', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { job_posting_id, status } = req.query;
    
    let query = `
      SELECT 
        ja.*,
        jp.title as job_title,
        jp.department as job_department
      FROM job_applications ja
      JOIN job_postings jp ON ja.job_posting_id = jp.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    if (job_posting_id) {
      query += ` AND ja.job_posting_id = $${paramCount}`;
      params.push(job_posting_id);
      paramCount++;
    }
    
    if (status) {
      query += ` AND ja.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ` ORDER BY ja.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({ error: 'Failed to fetch job applications' });
  }
});

// GET /api/job-applications/admin/:id - Get a specific application (admin only)
router.get('/admin/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        ja.*,
        jp.title as job_title,
        jp.department as job_department,
        jp.description as job_description
      FROM job_applications ja
      JOIN job_postings jp ON ja.job_posting_id = jp.id
      WHERE ja.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature introuvable' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching job application:', error);
    res.status(500).json({ error: 'Failed to fetch job application' });
  }
});

// PUT /api/job-applications/admin/:id/status - Update application status (admin only)
router.put('/admin/:id/status', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!status || !['pending', 'reviewed', 'rejected', 'accepted'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    
    const result = await pool.query(
      `UPDATE job_applications
      SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *`,
      [status, notes || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature introuvable' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// GET /api/job-applications/admin/:id/cv - Download CV file (admin only)
router.get('/admin/:id/cv', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT cv_file_path, cv_file_name FROM job_applications WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0 || !result.rows[0].cv_file_path) {
      return res.status(404).json({ error: 'CV introuvable' });
    }
    
    const filePath = path.join(__dirname, '../../', result.rows[0].cv_file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier CV introuvable' });
    }
    
    res.download(filePath, result.rows[0].cv_file_name || 'cv.pdf');
  } catch (error) {
    console.error('Error downloading CV:', error);
    res.status(500).json({ error: 'Failed to download CV' });
  }
});

export default router;

