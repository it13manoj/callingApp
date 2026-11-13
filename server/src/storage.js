import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function normalizePhone(phone) {
  if (!phone) return '';
  // Keep digits and leading plus sign
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

const defaultUsers = [
  {
    id: 'user_1',
    name: 'Sarah Connor',
    email: 'sarah@nexcall.com',
    phone: '+14155552671',
    displayPhone: '+1 (415) 555-2671',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    title: 'Product Designer',
    passwordHash: bcrypt.hashSync('password123', 10),
    statusMessage: 'Ready for video review 🚀',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user_2',
    name: 'Alex Miller',
    email: 'alex@nexcall.com',
    phone: '+16505558392',
    displayPhone: '+1 (650) 555-8392',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    title: 'Lead Architect',
    passwordHash: bcrypt.hashSync('password123', 10),
    statusMessage: 'In focus mode 🎧',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user_3',
    name: 'David Chen',
    email: 'david@nexcall.com',
    phone: '+919876543210',
    displayPhone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    title: 'Engineering Director',
    passwordHash: bcrypt.hashSync('password123', 10),
    statusMessage: 'Available for 1-to-1 catchups',
    createdAt: new Date().toISOString()
  }
];

class Storage {
  constructor() {
    this.data = {
      users: [],
      calls: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.data = {
          users: defaultUsers,
          calls: []
        };
        this.save();
      }
    } catch (err) {
      console.error('Error loading db.json:', err);
      this.data = { users: defaultUsers, calls: [] };
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  // Find user by ID
  getUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  // Find user by Email (case-insensitive)
  getUserByEmail(email) {
    if (!email) return null;
    const lower = email.trim().toLowerCase();
    return this.data.users.find(u => u.email.toLowerCase() === lower);
  }

  // Find user by Phone
  getUserByPhone(phone) {
    if (!phone) return null;
    const norm = normalizePhone(phone);
    return this.data.users.find(u => normalizePhone(u.phone) === norm);
  }

  // Find user by ANY ONE: Email OR Mobile Number!
  getUserByIdentifier(identifier) {
    if (!identifier) return null;
    const trimmed = identifier.trim();
    
    // Check if it looks like email
    if (trimmed.includes('@')) {
      return this.getUserByEmail(trimmed);
    }

    // Otherwise test phone first
    const byPhone = this.getUserByPhone(trimmed);
    if (byPhone) return byPhone;

    // Or test email without @ just in case
    const byEmail = this.getUserByEmail(trimmed);
    if (byEmail) return byEmail;

    // Direct match against raw fields
    return this.data.users.find(u => 
      u.email.toLowerCase() === trimmed.toLowerCase() || 
      normalizePhone(u.phone) === normalizePhone(trimmed)
    );
  }

  // Create new user (requires both mobile number and email)
  createUser({ name, email, phone, displayPhone, password, avatar, title }) {
    const normPhone = normalizePhone(phone);
    const normEmail = email.trim().toLowerCase();

    if (this.getUserByEmail(normEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    if (this.getUserByPhone(normPhone)) {
      throw new Error('An account with this mobile number already exists.');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      email: normEmail,
      phone: normPhone,
      displayPhone: displayPhone || phone,
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
      title: title || 'Member',
      passwordHash,
      statusMessage: 'Ready to connect',
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  // Get all users (excluding sensitive password hash)
  getAllUsers(excludeUserId = null) {
    return this.data.users
      .filter(u => u.id !== excludeUserId)
      .map(({ passwordHash, ...safeUser }) => safeUser);
  }

  // Update user profile
  updateUser(id, updates) {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;

    const current = this.data.users[userIndex];
    if (updates.statusMessage !== undefined) current.statusMessage = updates.statusMessage;
    if (updates.title !== undefined) current.title = updates.title;
    if (updates.name !== undefined) current.name = updates.name;
    if (updates.avatar !== undefined) current.avatar = updates.avatar;

    this.data.users[userIndex] = current;
    this.save();
    const { passwordHash, ...safeUser } = current;
    return safeUser;
  }

  // Log a completed or missed call
  addCallLog(call) {
    const logEntry = {
      id: `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      callerId: call.callerId,
      callerName: call.callerName,
      callerAvatar: call.callerAvatar,
      calleeId: call.calleeId,
      calleeName: call.calleeName,
      calleeAvatar: call.calleeAvatar,
      callType: call.callType || 'video', // 'video' | 'voice'
      status: call.status, // 'completed' | 'missed' | 'rejected'
      duration: call.duration || 0, // in seconds
      startedAt: call.startedAt || new Date().toISOString(),
      endedAt: new Date().toISOString()
    };

    this.data.calls.unshift(logEntry);
    // Keep last 100 calls
    if (this.data.calls.length > 100) {
      this.data.calls = this.data.calls.slice(0, 100);
    }
    this.save();
    return logEntry;
  }

  // Get call history for a user
  getUserCallHistory(userId) {
    return this.data.calls.filter(
      c => c.callerId === userId || c.calleeId === userId
    );
  }
}

export const storage = new Storage();
