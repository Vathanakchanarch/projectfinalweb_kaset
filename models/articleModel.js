import db from '../config/db.js';

class ArticleModel {
  static async search({ categorySlug = null, term = null, limit = 4, offset = 0 } = {}) {
    const whereParts = [`a.status = 'published'`];
    const params = [];

    if (categorySlug) {
      whereParts.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (term && term.trim()) {
      const cleanTerm = term.trim();
      whereParts.push('(a.title LIKE ? OR a.content LIKE ?)');
      params.push(`%${cleanTerm}%`, `%${cleanTerm}%`);
    }

    const safeLimit = Number.parseInt(limit, 10);
    const safeOffset = Number.parseInt(offset, 10);

    const finalLimit = Number.isInteger(safeLimit) && safeLimit >= 0 ? safeLimit : 4;
    const finalOffset = Number.isInteger(safeOffset) && safeOffset >= 0 ? safeOffset : 0;

    const where = `WHERE ${whereParts.join(' AND ')}`;

    const sql = `
      SELECT
        a.article_id,
        a.title,
        a.content,
        a.published_at,
        c.name AS category_name,
        c.slug AS category_slug
      FROM articles a
      LEFT JOIN categories c ON c.category_id = a.category_id
      ${where}
      ORDER BY a.published_at DESC, a.created_at DESC
      LIMIT ${finalLimit} OFFSET ${finalOffset};
    `;

    return db.execute(sql, params);
  }

  static async countSearch({ categorySlug = null, term = null } = {}) {
    const whereParts = [`a.status = 'published'`];
    const params = [];

    if (categorySlug) {
      whereParts.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (term && term.trim()) {
      const cleanTerm = term.trim();
      whereParts.push('(a.title LIKE ? OR a.content LIKE ?)');
      params.push(`%${cleanTerm}%`, `%${cleanTerm}%`);
    }

    const where = `WHERE ${whereParts.join(' AND ')}`;

    const sql = `
      SELECT COUNT(*) AS total
      FROM articles a
      LEFT JOIN categories c ON c.category_id = a.category_id
      ${where}
    `;

    return db.execute(sql, params);
  }

  static async getById(articleId) {
    const sql = `
      SELECT
        a.article_id,
        a.title,
        a.content,
        a.published_at,
        a.created_at,
        a.status,
        c.name AS category_name,
        c.slug AS category_slug,
        u.full_name AS author_name
      FROM articles a
      LEFT JOIN categories c ON c.category_id = a.category_id
      LEFT JOIN users u ON u.user_id = a.editor_id
      WHERE a.article_id = ?
        AND a.status = 'published'
      LIMIT 1
    `;
    return db.execute(sql, [articleId]);
  }

  static async create({ title, content, categorySlug, editorId }) {
    const sql = `
      INSERT INTO articles (title, content, category_id, editor_id, status, published_at)
      SELECT ?, ?, c.category_id, ?, 'published', NOW()
      FROM categories c
      WHERE c.slug = ?
      LIMIT 1
    `;
    return db.execute(sql, [title, content, editorId, categorySlug]);
  }

  static async countAll() {
    return db.execute(`
      SELECT COUNT(*) AS totalArticles
      FROM articles
      WHERE status = 'published'
    `);
  }

  static async getRecentActivities(limit = 10) {
    const safeLimit = Number.parseInt(limit, 10);
    const finalLimit = Number.isInteger(safeLimit) && safeLimit >= 0 ? safeLimit : 10;

    return db.execute(
      `
      SELECT
        a.article_id AS id,
        u.full_name AS username,
        a.title,
        DATE_FORMAT(a.published_at, '%Y-%m-%d %H:%i:%s') AS time
      FROM articles a
      LEFT JOIN users u ON u.user_id = a.editor_id
      WHERE a.status = 'published'
      ORDER BY a.published_at DESC
      LIMIT ${finalLimit}
      `
    );
  }

  static async deleteById(articleId) {
    return db.execute(`DELETE FROM articles WHERE article_id = ?`, [articleId]);
  }
}

export default ArticleModel;
