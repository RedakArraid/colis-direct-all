import { pool } from '../db/connection';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function resetAdminPassword() {
  try {
    const email = process.argv[2] || 'admin@colisdirect.ci';
    const newPassword = process.argv[3] || 'admin123';

    console.log(`Resetting password for ${email}...`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, role',
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      console.error(`User ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Password reset successfully for ${email}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   Role: ${result.rows[0].role}`);
  } catch (error: any) {
    console.error('Error resetting password:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();

