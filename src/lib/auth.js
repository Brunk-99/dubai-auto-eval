// User Authentication with 4 identities
const STORAGE_KEY = 'dubai-auto-current-user';

export const ROLES = {
  ADMIN: 'admin',
  MECHANIC: 'mechanic',
};

// User definitions
export const USERS = [
  { id: 'moe', name: 'Moe', role: ROLES.ADMIN },
  { id: 'moka', name: 'Moka', role: ROLES.ADMIN },
  { id: 'kalle', name: 'Kalle', role: ROLES.MECHANIC },
  { id: 'cago', name: 'Cago', role: ROLES.MECHANIC },
];

// Get code for a user from env
function getCodeForUser(userId) {
  const codes = {
    moe: import.meta.env.VITE_CODE_MOE || 'moe123',
    moka: import.meta.env.VITE_CODE_MOKA || 'moka123',
    kalle: import.meta.env.VITE_CODE_KALLE || 'kalle123',
    cago: import.meta.env.VITE_CODE_CAGO || 'cago123',
  };
  return codes[userId] || null;
}

// Check if user + code combination is valid
export function authenticateUser(userId, code) {
  const user = USERS.find(u => u.id === userId);
  if (!user) return null;

  const correctCode = getCodeForUser(userId);
  if (code === correctCode) {
    return { ...user };
  }
  return null;
}

// Save current user to localStorage
export function saveCurrentUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Get current user from localStorage
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to get current user:', e);
  }
  return null;
}

// Clear current user (logout)
export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY);
}

// Check if user is authenticated
export function isAuthenticated() {
  return getCurrentUser() !== null;
}

// Check if current user is admin
export function isAdmin() {
  const user = getCurrentUser();
  return user?.role === ROLES.ADMIN;
}

// Check if current user is mechanic
export function isMechanic() {
  const user = getCurrentUser();
  return user?.role === ROLES.MECHANIC;
}

// Legacy compatibility - isOwner maps to isAdmin
export function isOwner() {
  return isAdmin();
}

// Legacy compatibility - getRole
export function getRole() {
  const user = getCurrentUser();
  return user?.role || null;
}

// Legacy compatibility - clearRole
export function clearRole() {
  clearCurrentUser();
}
