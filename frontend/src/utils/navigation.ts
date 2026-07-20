import { NAVIGATION_ITEMS } from '../constants/navigation';
import type { NavGroup, NavLeaf } from '../constants/navigation';

/**
 * Normalizes a path by removing query parameters, hash fragments,
 * and trailing slashes (except for the root path).
 */
export const normalizePath = (path: string): string => {
  let p = path.split('?')[0].split('#')[0];
  if (p.endsWith('/') && p.length > 1) {
    p = p.slice(0, -1);
  }
  return p;
};

/**
 * Route-boundary-safe matching to check if a target path is active.
 * - Root path '/' matches only exactly.
 * - Sub-routes use word boundary checks (preventing false matches like /clients matching /clients-archive).
 */
export const isPathActive = (currentPath: string, targetPath: string): boolean => {
  const current = normalizePath(currentPath);
  const target = normalizePath(targetPath);

  if (target === '/') {
    return current === '/';
  }
  return current === target || current.startsWith(target + '/');
};

/**
 * Evaluates if a navigation parent group is active (at least one child is active).
 */
export const isNavigationGroupActive = (currentPath: string, group: NavGroup): boolean => {
  return group.children.some((child) => isPathActive(currentPath, child.to));
};

/**
 * Scans the centralized navigation configuration to return the longest specific match.
 * Precludes any permissions checking to remain domain-neutral and pure.
 */
export const findBestNavigationMatch = (currentPath: string): NavLeaf | null => {
  const current = normalizePath(currentPath);
  let bestMatch: NavLeaf | null = null;

  const checkMatch = (leaf: NavLeaf) => {
    const target = normalizePath(leaf.to);
    if (current === target || current.startsWith(target + '/')) {
      if (!bestMatch || target.length > normalizePath(bestMatch.to).length) {
        bestMatch = leaf;
      }
    }
  };

  NAVIGATION_ITEMS.forEach((entry) => {
    if (entry.kind === 'leaf') {
      checkMatch(entry.leaf);
    } else if (entry.kind === 'group') {
      // Check the group's direct path if relevant (e.g. /vehicules)
      const groupLeaf: NavLeaf = {
        moduleKey: entry.group.id,
        label: entry.group.label,
        to: entry.group.to,
        icon: entry.group.icon,
      };
      checkMatch(groupLeaf);

      // Check all children recursively
      entry.group.children.forEach(checkMatch);
    }
  });

  return bestMatch;
};

/**
 * Computes page headings based on matched navigation label.
 * Returns null if no match is found, letting the caller handle the fallback.
 */
export const getNavigationTitle = (currentPath: string): string | null => {
  const match = findBestNavigationMatch(currentPath);
  return match ? match.label : null;
};
