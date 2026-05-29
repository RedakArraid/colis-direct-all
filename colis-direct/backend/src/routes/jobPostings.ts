import express, { Request, Response } from 'express';
import { pool } from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// GET /api/job-postings - Get all active job postings (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { department, employment_type, featured_only } = req.query;
    
    let query = `
      SELECT 
        id,
        title,
        department,
        location,
        employment_type,
        description,
        requirements,
        benefits,
        salary_range,
        application_email,
        application_url,
        is_featured,
        posted_at,
        expires_at
      FROM job_postings
      WHERE is_active = true
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    // Filter by department
    if (department) {
      query += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }
    
    // Filter by employment type
    if (employment_type) {
      query += ` AND employment_type = $${paramCount}`;
      params.push(employment_type);
      paramCount++;
    }
    
    // Filter by featured
    if (featured_only === 'true') {
      query += ` AND is_featured = true`;
    }
    
    // Only show non-expired postings
    query += ` AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`;
    
    // Order by featured first, then by posted_at
    query += ` ORDER BY is_featured DESC, posted_at DESC`;
    
    const result = await pool.query(query as string, params as any[]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching job postings:', error);
    res.status(500).json({ error: 'Failed to fetch job postings' });
  }
});

// GET /api/job-postings/:id - Get a specific job posting (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        id,
        title,
        department,
        location,
        employment_type,
        description,
        requirements,
        benefits,
        salary_range,
        application_email,
        application_url,
        is_featured,
        posted_at,
        expires_at
      FROM job_postings
      WHERE id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job posting not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching job posting:', error);
    res.status(500).json({ error: 'Failed to fetch job posting' });
  }
});

// GET /api/job-postings/admin/all - Get all job postings (admin only)
router.get('/admin/all', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        jp.*,
        u.email as created_by_email,
        u.first_name as created_by_name
      FROM job_postings jp
      LEFT JOIN users u ON jp.created_by = u.id
      ORDER BY jp.created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all job postings:', error);
    res.status(500).json({ error: 'Failed to fetch job postings' });
  }
});

// POST /api/job-postings - Create a new job posting (admin only)
router.post('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const {
      title,
      department,
      location,
      employment_type,
      description,
      requirements,
      benefits,
      salary_range,
      application_email,
      application_url,
      is_active,
      is_featured,
      expires_at
    } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    const userId = (req as any).user?.id;
    
    const result = await pool.query(
      `INSERT INTO job_postings (
        title,
        department,
        location,
        employment_type,
        description,
        requirements,
        benefits,
        salary_range,
        application_email,
        application_url,
        is_active,
        is_featured,
        expires_at,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        title,
        department || null,
        location || null,
        employment_type || null,
        description,
        requirements || null,
        benefits || null,
        salary_range || null,
        application_email || null,
        application_url || null,
        is_active !== undefined ? is_active : true,
        is_featured !== undefined ? is_featured : false,
        expires_at || null,
        userId
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating job posting:', error);
    res.status(500).json({ error: 'Failed to create job posting' });
  }
});

// PUT /api/job-postings/:id - Update a job posting (admin only)
router.put('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      department,
      location,
      employment_type,
      description,
      requirements,
      benefits,
      salary_range,
      application_email,
      application_url,
      is_active,
      is_featured,
      expires_at
    } = req.body;
    
    const result = await pool.query(
      `UPDATE job_postings
      SET 
        title = COALESCE($1, title),
        department = $2,
        location = $3,
        employment_type = $4,
        description = COALESCE($5, description),
        requirements = $6,
        benefits = $7,
        salary_range = $8,
        application_email = $9,
        application_url = $10,
        is_active = COALESCE($11, is_active),
        is_featured = COALESCE($12, is_featured),
        expires_at = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *`,
      [
        title,
        department,
        location,
        employment_type,
        description,
        requirements,
        benefits,
        salary_range,
        application_email,
        application_url,
        is_active,
        is_featured,
        expires_at,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job posting not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating job posting:', error);
    res.status(500).json({ error: 'Failed to update job posting' });
  }
});

// DELETE /api/job-postings/:id - Delete a job posting (admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM job_postings WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job posting not found' });
    }
    
    res.json({ message: 'Job posting deleted successfully' });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    res.status(500).json({ error: 'Failed to delete job posting' });
  }
});

export default router;

