const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error('Unsupported file type.');
      err.status = 400;
      return cb(err);
    }
    return cb(null, true);
  },
});

function parseLimit(raw) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(value, MAX_LIMIT);
}

function parseOffset(raw) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

module.exports = (Post) => {
  const router = express.Router();

  // Safe and idempotent: a read with no side effects, so retries are harmless.
  // Published posts only; there is no column to scope by viewer, so every
  // published row is returned to every caller.
  router.get('/posts', async (req, res) => {
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    try {
      const { rows, count } = await Post.findAndCountAll({
        where: { is_published: true },
        order: [
          ['created_at', 'DESC'],
          ['id', 'DESC'],
        ],
        limit,
        offset,
      });

      return res.json({ posts: rows, total: count, limit, offset });
    } catch (err) {
      console.error('Failed to list posts:', err);
      return res.status(500).json({ error: 'Failed to list posts.' });
    }
  });

  // Not idempotent: a retried request creates a second post. The write is a
  // single INSERT, so there is no partial state to reconcile.
  router.post('/posts', upload.single('file'), async (req, res) => {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const author =
      typeof req.body.author === 'string' && req.body.author.trim()
        ? req.body.author.trim()
        : null;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required.' });
    }

    const filePath = req.file ? path.join('uploads', req.file.filename) : null;
    const isPublished = req.body.is_published === 'true' || req.body.is_published === true;

    try {
      const post = await Post.create({
        title,
        content,
        author,
        file_path: filePath,
        is_published: isPublished,
      });
      return res.status(201).json(post);
    } catch (err) {
      console.error('Failed to create post:', err);
      return res.status(500).json({ error: 'Failed to create post.' });
    }
  });

  return router;
};
