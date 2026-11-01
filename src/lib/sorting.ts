/**
 * Sorts items based on:
 * 1. Starred items first (sorted by starredAt ascending - first starred first)
 * 2. Non-starred items next (sorted by sortOrder ascending)
 * 3. Fallback to alphabetical sorting via textSelector
 */
export function sortByStarAndOrder<T extends { starred?: boolean; starredAt?: number; sortOrder?: number | null }>(
  items: T[],
  textSelector: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const aStarred = Boolean(a.starred);
    const bStarred = Boolean(b.starred);
    
    // Starred vs Non-starred
    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;
    
    // Both Starred
    if (aStarred && bStarred) {
      const aTime = a.starredAt || 0;
      const bTime = b.starredAt || 0;
      if (aTime !== bTime) return aTime - bTime;
    }
    
    // Both Non-starred
    if (!aStarred && !bStarred) {
      const aOrder = (a.sortOrder !== undefined && a.sortOrder !== null) ? a.sortOrder : Infinity;
      const bOrder = (b.sortOrder !== undefined && b.sortOrder !== null) ? b.sortOrder : Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
    }
    
    // Fallback to text
    return textSelector(a).localeCompare(textSelector(b));
  });
}

// Alias for backwards compatibility
export const sortByStarAndText = sortByStarAndOrder;
