import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAdminActivity } from './activityLogs';

const router = express.Router();

// Get user by email — admin, ou l’utilisateur lit uniquement son propre email (pas d’énumération)
router.get('/by-email/:email', authenticate, async (req: AuthRequest, res) => {
  try {
    const requestedEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const isAdmin = req.user!.role === 'admin';
    const selfEmail = (req.user!.email || '').trim().toLowerCase();

    if (!isAdmin && requestedEmail !== selfEmail) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role, relay_point_id, is_pro FROM users WHERE LOWER(TRIM(email)) = $1',
      [requestedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { role, search } = req.query;
    let query = 'SELECT id, email, first_name, last_name, phone, role, relay_point_id, is_pro, created_at FROM users WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (role) {
      query += ` AND role = $${++paramCount}`;
      params.push(role);
    }

    if (search) {
      query += ` AND (email ILIKE $${++paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create user (admin only)
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { email, password, first_name, last_name, phone, role = 'client', is_pro = false, relay_point_id, address } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if address column exists
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'users' AND column_name = 'address'`
    );
    const hasAddressColumn = columnCheck.rows.length > 0;

    // Create user
    let result;
    if (hasAddressColumn) {
      result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_pro, relay_point_id, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, email, first_name, last_name, phone, role, relay_point_id, is_pro, created_at, address`,
        [email, hashedPassword, first_name || '', last_name || '', phone || null, role, is_pro, relay_point_id || null, address || null]
      );
    } else {
      result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_pro, relay_point_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, first_name, last_name, phone, role, relay_point_id, is_pro, created_at`,
        [email, hashedPassword, first_name || '', last_name || '', phone || null, role, is_pro, relay_point_id || null]
      );
    }

    const newUser = result.rows[0];

    // Log admin activity (ignore errors if table doesn't exist yet)
    try {
      await logAdminActivity(
        req.user!.id,
        'create_user',
        'user',
        newUser.id,
        { email: newUser.email, role: newUser.role, is_pro: newUser.is_pro },
        req
      );
    } catch (logError) {
      console.warn('Failed to log admin activity (non-critical):', logError);
    }

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { first_name, last_name, phone, email, role, relay_point_id, is_pro, address, commune, quartier, ville, complement_adresse, country_code, current_password } = req.body;
    const userId = req.params.id;
    const isAdmin = req.user!.role === 'admin';
    const isSelfUpdate = req.user!.id === userId;

    // Non-admin users can only update their own profile
    if (!isAdmin && !isSelfUpdate) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre profil' });
    }

    // Email is a sensitive field: require current password to change it
    if (!isAdmin && isSelfUpdate && email !== undefined) {
      if (!current_password) {
        return res.status(400).json({ error: 'Le mot de passe actuel est requis pour modifier l\'email' });
      }
      const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const isValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }
    }

    // Non-admin users cannot modify certain fields
    if (!isAdmin && (role !== undefined || relay_point_id !== undefined || is_pro !== undefined)) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier ce champ' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Fields that any user can update
    if (email !== undefined) {
      updates.push(`email = $${++paramCount}`);
      values.push(email);
    }
    if (first_name !== undefined) {
      updates.push(`first_name = $${++paramCount}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${++paramCount}`);
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${++paramCount}`);
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push(`address = $${++paramCount}`);
      values.push(address);
    }
    if (commune !== undefined) {
      updates.push(`commune = $${++paramCount}`);
      values.push(commune);
    }
    if (quartier !== undefined) {
      updates.push(`quartier = $${++paramCount}`);
      values.push(quartier);
    }
    if (ville !== undefined) {
      updates.push(`ville = $${++paramCount}`);
      values.push(ville);
    }
    if (complement_adresse !== undefined) {
      updates.push(`complement_adresse = $${++paramCount}`);
      values.push(complement_adresse);
    }
    if (country_code !== undefined) {
      updates.push(`country_code = $${++paramCount}`);
      values.push(country_code);
    }

    // Admin-only fields
    if (isAdmin) {
      if (role !== undefined) {
        updates.push(`role = $${++paramCount}`);
        values.push(role);
      }
      if (relay_point_id !== undefined) {
        updates.push(`relay_point_id = $${++paramCount}`);
        values.push(relay_point_id);
      }
      if (is_pro !== undefined) {
        updates.push(`is_pro = $${++paramCount}`);
        values.push(is_pro);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${++paramCount} RETURNING id, email, first_name, last_name, phone, role, relay_point_id, is_pro, address, commune, quartier, ville, complement_adresse, country_code`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log admin activity only if admin is updating
    if (isAdmin) {
      try {
        await logAdminActivity(
          req.user!.id,
          'update_user',
          'user',
          userId,
          { updates: Object.keys(updates), new_data: result.rows[0] },
          req
        );
      } catch (logError) {
        console.warn('Failed to log admin activity (non-critical):', logError);
      }
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Change user password (for own account)
router.post('/:id/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.params.id;
    const isAdmin = req.user!.role === 'admin';
    const isSelfUpdate = req.user!.id === userId;

    // Non-admin users can only change their own password
    if (!isAdmin && !isSelfUpdate) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre mot de passe' });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    // Get current user
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Non-admin users must always provide their current password
    if (!isAdmin) {
      if (!current_password) {
        return res.status(400).json({ error: 'Le mot de passe actuel est requis' });
      }
      const isValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la modification du mot de passe' });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password is required and must be at least 6 characters' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
      [hashedPassword, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log admin activity
    try {
      await logAdminActivity(
        req.user!.id,
        'reset_user_password',
        'user',
        req.params.id,
        { email: result.rows[0].email },
        req
      );
    } catch (logError) {
      console.warn('Failed to log admin activity (non-critical):', logError);
    }

    res.json({ message: 'Password reset successfully', email: result.rows[0].email });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    // Get user info before deletion for logging
    const userToDelete = await pool.query('SELECT email, role FROM users WHERE id = $1', [req.params.id]);
    
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);

    // Log admin activity
    if (userToDelete.rows[0]) {
      await logAdminActivity(
        req.user!.id,
        'delete_user',
        'user',
        req.params.id,
        { deleted_user_email: userToDelete.rows[0].email, deleted_user_role: userToDelete.rows[0].role },
        req
      );
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

