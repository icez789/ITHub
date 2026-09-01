export const USER_ROLES = Object.freeze(['user', 'teacher', 'admin', 'super_admin']);
export const ASSIGNABLE_ROLES = Object.freeze(['user', 'teacher', 'admin']);

export function isKnownRole(role) {
  return USER_ROLES.includes(role);
}

export function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin';
}

export function isContentModeratorRole(role) {
  return role === 'teacher' || isAdminRole(role);
}

export function isSuperAdminRole(role) {
  return role === 'super_admin';
}

export function roleLabel(role) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'ผู้ดูแล';
  if (role === 'teacher') return 'อาจารย์';
  return 'สมาชิกทั่วไป';
}
