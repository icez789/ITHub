export function notificationChannelName(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid user id');
  return `private-user-${id}`;
}
