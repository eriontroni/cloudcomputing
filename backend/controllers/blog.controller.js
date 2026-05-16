const { sql, blogPool } = require('../config/db');

// ── STATS ──────────────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM posts) AS totalPosts,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) AS totalUsers,
        (SELECT COUNT(*) FROM comments) AS totalComments,
        (SELECT ISNULL(SUM(likes_count), 0) FROM posts) AS totalLikes
    `);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

// ── USERS ──────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT user_id, username, email,
               ISNULL(first_name, '') + ' ' + ISNULL(last_name, '') AS full_name,
               role, is_active, created_at,
               (SELECT COUNT(*) FROM posts WHERE user_id = u.user_id) AS post_count
        FROM users u
        WHERE (username LIKE @search OR email LIKE @search
               OR first_name LIKE @search OR last_name LIKE @search)
          AND is_active = 1
        ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const count = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .query(`
        SELECT COUNT(*) AS total FROM users
        WHERE (username LIKE @search OR email LIKE @search
               OR first_name LIKE @search OR last_name LIKE @search)
          AND is_active = 1
      `);
    res.json({ success: true, data: result.recordset, total: count.recordset[0].total });
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { username, email, full_name, password_hash, role = 'author' } = req.body;
    const parts = (full_name || '').trim().split(' ');
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('password_hash', sql.NVarChar, password_hash || 'changeme123')
      .input('role', sql.NVarChar, role)
      .query(`
        INSERT INTO users (username, email, first_name, last_name, password_hash, role, is_active, created_at)
        OUTPUT INSERTED.*
        VALUES (@username, @email, @first_name, @last_name, @password_hash, @role, 1, GETDATE())
      `);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    const { username, email, full_name, role } = req.body;
    const parts = (full_name || '').trim().split(' ');
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('role', sql.NVarChar, role)
      .query(`
        UPDATE users SET username=@username, email=@email,
          first_name=@first_name, last_name=@last_name, role=@role
        OUTPUT INSERTED.*
        WHERE user_id=@id AND is_active=1
      `);
    if (!result.recordset.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id)
      .query(`UPDATE users SET is_active=0 WHERE user_id=@id`);
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { next(err); }
};

// ── POSTS ──────────────────────────────────────────────────────────────────
exports.getPosts = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { search = '', status = '', category_id = '', author_id = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let where = `WHERE (p.title LIKE @search OR p.content LIKE @search)`;
    if (status) where += ` AND p.status = @status`;
    if (category_id) where += ` AND p.category_id = @category_id`;
    if (author_id) where += ` AND p.user_id = @author_id`;

    const req2 = pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));
    if (status) req2.input('status', sql.NVarChar, status);
    if (category_id) req2.input('category_id', sql.Int, parseInt(category_id));
    if (author_id) req2.input('author_id', sql.Int, parseInt(author_id));

    const result = await req2.query(`
      SELECT p.post_id, p.title, p.slug, p.status, p.likes_count, p.views_count,
             p.created_at, p.published_at,
             u.username AS author_name, c.name AS category_name,
             (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.post_id) AS comment_count,
             LEFT(p.content, 200) AS excerpt
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      ${where}
      ORDER BY p.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const countReq = pool.request().input('search', sql.NVarChar, `%${search}%`);
    if (status) countReq.input('status', sql.NVarChar, status);
    if (category_id) countReq.input('category_id', sql.Int, parseInt(category_id));
    if (author_id) countReq.input('author_id', sql.Int, parseInt(author_id));
    const count = await countReq.query(`SELECT COUNT(*) AS total FROM posts p ${where}`);

    res.json({ success: true, data: result.recordset, total: count.recordset[0].total });
  } catch (err) { next(err); }
};

exports.getPostById = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    const result = await pool.request().input('id', sql.Int, id).query(`
      SELECT p.*, u.username AS author_name, c.name AS category_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.post_id = @id
    `);
    if (!result.recordset.length) return res.status(404).json({ success: false, message: 'Post not found' });
    const tags = await pool.request().input('id', sql.Int, id).query(`
      SELECT t.tag_id, t.name FROM post_tags pt JOIN tags t ON pt.tag_id = t.tag_id WHERE pt.post_id = @id
    `);
    res.json({ success: true, data: { ...result.recordset[0], tags: tags.recordset } });
  } catch (err) { next(err); }
};

exports.createPost = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { title, slug, content, author_id, category_id, status = 'draft', tags = [] } = req.body;
    const published_at = status === 'published' ? 'GETDATE()' : 'NULL';

    const result = await pool.request()
      .input('title', sql.NVarChar, title)
      .input('slug', sql.NVarChar, slug)
      .input('content', sql.NVarChar(sql.MAX), content || '')
      .input('user_id', sql.Int, author_id || null)
      .input('category_id', sql.Int, category_id || null)
      .input('status', sql.NVarChar, status)
      .query(`
        INSERT INTO posts (title, slug, content, user_id, category_id, status, likes_count, views_count, created_at, published_at)
        OUTPUT INSERTED.*
        VALUES (@title, @slug, @content, @user_id, @category_id, @status, 0, 0, GETDATE(), ${published_at})
      `);

    const post = result.recordset[0];
    for (const tagId of tags) {
      await pool.request()
        .input('post_id', sql.Int, post.post_id)
        .input('tag_id', sql.Int, tagId)
        .query(`INSERT INTO post_tags (post_id, tag_id) VALUES (@post_id, @tag_id)`);
    }
    res.status(201).json({ success: true, data: post });
  } catch (err) { next(err); }
};

exports.updatePost = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    const { title, slug, content, category_id, status, tags = [] } = req.body;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('title', sql.NVarChar, title)
      .input('slug', sql.NVarChar, slug)
      .input('content', sql.NVarChar(sql.MAX), content || '')
      .input('category_id', sql.Int, category_id || null)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE posts SET title=@title, slug=@slug, content=@content, category_id=@category_id, status=@status,
          published_at = CASE WHEN @status='published' AND published_at IS NULL THEN GETDATE() ELSE published_at END
        OUTPUT INSERTED.*
        WHERE post_id=@id
      `);
    if (!result.recordset.length) return res.status(404).json({ success: false, message: 'Post not found' });

    await pool.request().input('id', sql.Int, id).query(`DELETE FROM post_tags WHERE post_id=@id`);
    for (const tagId of tags) {
      await pool.request()
        .input('post_id', sql.Int, id)
        .input('tag_id', sql.Int, tagId)
        .query(`INSERT INTO post_tags (post_id, tag_id) VALUES (@post_id, @tag_id)`);
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id)
      .query(`UPDATE posts SET status='archived' WHERE post_id=@id`);
    res.json({ success: true, message: 'Post archived' });
  } catch (err) { next(err); }
};

// ── COMMENTS ───────────────────────────────────────────────────────────────
exports.getComments = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { post_id = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let where = `WHERE 1=1`;
    if (post_id) where += ` AND c.post_id = @post_id`;

    const req2 = pool.request()
      .input('offset', sql.Int, parseInt(offset))
      .input('limit', sql.Int, parseInt(limit));
    if (post_id) req2.input('post_id', sql.Int, parseInt(post_id));

    const result = await req2.query(`
      SELECT c.comment_id, c.content, c.is_approved, c.created_at,
             u.username AS author_name, p.title AS post_title, c.post_id
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.user_id
      LEFT JOIN posts p ON c.post_id = p.post_id
      ${where}
      ORDER BY c.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

exports.approveComment = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id)
      .query(`UPDATE comments SET is_approved=1 WHERE comment_id=@id`);
    res.json({ success: true, message: 'Comment approved' });
  } catch (err) { next(err); }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id)
      .query(`DELETE FROM comments WHERE comment_id=@id`);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
};

// ── CATEGORIES ─────────────────────────────────────────────────────────────
exports.getCategories = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const result = await pool.request().query(`
      SELECT c.category_id, c.name, c.slug,
             CAST(c.description AS NVARCHAR(MAX)) AS description,
             (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.category_id) AS post_count
      FROM categories c ORDER BY c.name
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { name, slug, description } = req.body;
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('slug', sql.NVarChar, slug)
      .input('description', sql.NVarChar, description || null)
      .query(`INSERT INTO categories (name, slug, description) OUTPUT INSERTED.* VALUES (@name, @slug, @description)`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    const { name, slug, description } = req.body;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('slug', sql.NVarChar, slug)
      .input('description', sql.NVarChar, description || null)
      .query(`UPDATE categories SET name=@name, slug=@slug, description=@description OUTPUT INSERTED.* WHERE category_id=@id`);
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM categories WHERE category_id=@id`);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) { next(err); }
};

// ── TAGS ───────────────────────────────────────────────────────────────────
exports.getTags = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const result = await pool.request().query(`
      SELECT t.tag_id, t.name, t.slug,
             (SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id = t.tag_id) AS usage_count
      FROM tags t ORDER BY t.name
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

exports.createTag = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { name, slug } = req.body;
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('slug', sql.NVarChar, slug)
      .query(`INSERT INTO tags (name, slug) OUTPUT INSERTED.* VALUES (@name, @slug)`);
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

exports.deleteTag = async (req, res, next) => {
  try {
    const pool = await blogPool;
    const { id } = req.params;
    await pool.request().input('id', sql.Int, id).query(`DELETE FROM tags WHERE tag_id=@id`);
    res.json({ success: true, message: 'Tag deleted' });
  } catch (err) { next(err); }
};
