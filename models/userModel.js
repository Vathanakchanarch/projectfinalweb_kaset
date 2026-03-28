import db from '../config/db.js';

class User {
  static async fetchAll() {
    return db.execute(`
      SELECT
        user_id AS id,
        full_name AS username,
        email,
        role,
        status,
        DATE_FORMAT(created_at, '%M %d, %Y') AS joinDate
      FROM users
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);
  }

  static async countAll() {
    return db.execute(`
      SELECT COUNT(*) AS totalUsers
      FROM users
      WHERE status = 'active'
    `);
  }

  static async create({ full_name, email, password_hash, role = 'editor', status = 'active' }) {
    const sql = `
      INSERT INTO users (full_name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    return db.execute(sql, [full_name, email, password_hash, role, status]);
  }

  static async findByEmail(email) {
    const sql = `
      SELECT user_id, full_name, email, password_hash, role, status, created_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `;
    return db.execute(sql, [email]);
  }

  static async findByFullName(name) {
    const sql = `
      SELECT
        user_id AS id,
        full_name AS username,
        email,
        role,
        status,
        DATE_FORMAT(created_at, '%M %d, %Y') AS joinDate
      FROM users
      WHERE full_name LIKE ?
        AND status = 'active'
      ORDER BY created_at DESC
    `;
    return db.execute(sql, [`%${name}%`]);
  }

  static async updateById(user_id, { status, role }) {
    const sets = [];
    const params = [];

    if (status) {
      sets.push('status = ?');
      params.push(status);
    }

    if (role) {
      sets.push('role = ?');
      params.push(role);
    }

    if (!sets.length) return [[], null];

    params.push(user_id);

    const sql = `UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`;
    return db.execute(sql, params);
  }

  static async suspendById(user_id) {
    return db.execute(
      `UPDATE users SET status = 'suspended' WHERE user_id = ?`,
      [user_id]
    );
  }

  static async createOtpForEmail(email, code, expiresAt) {
    const [rows] = await this.findByEmail(email);
    if (!rows.length) return [null, null];

    const user = rows[0];

    const sql = `
      INSERT INTO user_otps (user_id, otp_code, otp_type, expires_at, is_used)
      VALUES (?, ?, 'password_reset', ?, FALSE)
    `;
    return db.execute(sql, [user.user_id, code, expiresAt]);
  }

  static async findValidOtp(email, code) {
    const [rows] = await this.findByEmail(email);
    if (!rows.length) return [[], null];

    const user = rows[0];

    const sql = `
      SELECT otp_id, user_id, otp_code, otp_type, expires_at, is_used, created_at
      FROM user_otps
      WHERE user_id = ?
        AND otp_code = ?
        AND otp_type = 'password_reset'
        AND is_used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return db.execute(sql, [user.user_id, code]);
  }

  static async markOtpUsed(otp_id) {
    return db.execute(
      `UPDATE user_otps SET is_used = TRUE WHERE otp_id = ?`,
      [otp_id]
    );
  }

  static async updatePasswordByEmail(email, newPasswordHash) {
    return db.execute(
      `UPDATE users SET password_hash = ? WHERE email = ? LIMIT 1`,
      [newPasswordHash, email]
    );
  }
}

export default User;