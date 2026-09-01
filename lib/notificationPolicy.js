export function shouldNotifyOwner(ownerId, actorId) {
  return Number.isInteger(Number(ownerId)) && Number(ownerId) > 0 && Number(ownerId) !== Number(actorId);
}
