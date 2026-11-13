import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { storage, normalizePhone } from './storage.js';

export const authRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexcall_super_secret_jwt_key_2026';

// Middleware to verify JWT token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    const user = storage.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  });
}

// Generate JWT token helper
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 1. REGISTER - Requires BOTH Mobile Number AND Email ID
authRouter.post('/register', (req, res) => {
  try {
    const { name, email, phone, displayPhone, password, avatar, title } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email ID is required' });
    }
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    const normPhone = normalizePhone(phone);
    if (normPhone.length < 7) {
      return res.status(400).json({ error: 'Please enter a valid mobile number with at least 7 digits' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const newUser = storage.createUser({
      name,
      email,
      phone,
      displayPhone,
      password,
      avatar,
      title
    });

    const token = generateToken(newUser);
    const { passwordHash, ...safeUser } = newUser;

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: safeUser
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// 2. LOGIN - Can login using ANY ONE: Mobile Number OR Email ID
authRouter.post('/login', (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Please enter your Email ID or Mobile Number' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = storage.getUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ error: 'No account found with this Email ID or Mobile Number' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = generateToken(user);
    const { passwordHash, ...safeUser } = user;

    return res.json({
      message: 'Login successful',
      token,
      user: safeUser,
      loginMethod: identifier.includes('@') ? 'email' : 'phone'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// 3. GET CURRENT USER
authRouter.get('/me', authenticateToken, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  return res.json({ user: safeUser });
});

// 4. GET DEMO ACCOUNTS FOR INSTANT 1-CLICK TESTING
authRouter.get('/demo-users', (req, res) => {
  const demoAccounts = storage.data.users.slice(0, 3).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.displayPhone || u.phone,
    avatar: u.avatar,
    title: u.title,
    password: 'password123'
  }));
  return res.json({ demoAccounts });
});

// 5. UPDATE PROFILE
authRouter.patch('/profile', authenticateToken, (req, res) => {
  try {
    const { statusMessage, title, name, avatar } = req.body;
    const updated = storage.updateUser(req.user.id, { statusMessage, title, name, avatar });
    return res.json({ user: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});
