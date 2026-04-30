export function getNextIdByDirection(ids: number[], currentId: number, direction: 1 | -1): number {
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex === -1) return currentId;

  const nextIndex = Math.max(0, Math.min(ids.length - 1, currentIndex + direction));
  return ids[nextIndex] ?? currentId;
}
