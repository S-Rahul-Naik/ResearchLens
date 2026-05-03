const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const cloudinary = require('../services/cloudinary');

const router = express.Router();

// Multer — memory storage for avatar uploads, then we stream to Cloudinary
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars'));
    }
  },
});

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// ─── POST /api/auth/signup ────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

// ─── PATCH /api/auth/profile ──────────────────────────────
// Update display name
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    req.user.name = name.trim();
    await req.user.save({ validateModifiedOnly: true });
    res.json({ user: req.user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/avatar ────────────────────────────────
// Upload avatar to Cloudinary
router.post('/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  try {
    // Delete old avatar from Cloudinary if it exists
    if (req.user.avatarPublicId) {
      await cloudinary.uploader.destroy(req.user.avatarPublicId).catch(() => {});
    }

    // Upload new avatar via stream
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'researchlens/avatars',
          public_id: `user_${req.user._id}`,
          overwrite: true,
          transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    req.user.avatar = result.secure_url;
    req.user.avatarPublicId = result.public_id;
    await req.user.save({ validateModifiedOnly: true });

    res.json({ user: req.user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/auth/password ─────────────────────────────
router.patch('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
