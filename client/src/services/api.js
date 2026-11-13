const DEFAULT_SERVER_URL = 'https://api.gaurishankartemple.com';
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

export function getServerUrl() {
  const saved = localStorage.getItem('nexcall_server_url');
  if (saved) return saved;
  return DEFAULT_SERVER_URL;
}

export function setServerUrl(url) {
  if (url) {
    localStorage.setItem('nexcall_server_url', url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('nexcall_server_url');
  }
}

const getApiBase = () => {
  const server = getServerUrl();
  return server ? `${server}/api` : '/api';
};

function getHeaders() {
  const token = localStorage.getItem('nexcall_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Register with mobile number and email ID
  async register(data) {
    const res = await fetch(`${getApiBase()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  },

  // Login using ANY ONE: mobile number OR email ID
  async login(identifier, password) {
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    return json;
  },

  // Get current session
  async getMe() {
    const res = await fetch(`${getApiBase()}/auth/me`, {
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get current user');
    return json.user;
  },

  async getIceServers() {
    try {
      const res = await fetch(`${getApiBase()}/rtc-config`, {
        headers: getHeaders()
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to get WebRTC configuration');
      if (!Array.isArray(json.iceServers) || json.iceServers.length === 0) {
        throw new Error('The server returned no WebRTC ICE servers');
      }
      return json.iceServers;
    } catch (error) {
      console.warn('Using STUN-only WebRTC configuration:', error);
      return DEFAULT_ICE_SERVERS;
    }
  },

  // Get demo accounts for instant testing
  async getDemoAccounts() {
    const res = await fetch(`${getApiBase()}/auth/demo-users`);
    const json = await res.json();
    return json.demoAccounts || [];
  },

  // Get user directory / contacts
  async getUsers() {
    const res = await fetch(`${getApiBase()}/users`, {
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get users');
    return json.users;
  },

  // Get call history
  async getCallHistory() {
    const res = await fetch(`${getApiBase()}/calls/history`, {
      headers: getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get call history');
    return json.history;
  },

  // Update profile
  async updateProfile(updates) {
    const res = await fetch(`${getApiBase()}/auth/profile`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update profile');
    return json.user;
  }
};

