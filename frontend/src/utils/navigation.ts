import { NAVIGATION_ITEMS } from '../constants/navigation';
import type { NavGroup, NavLeaf, NavSection } from '../constants/navigation';

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
 * Evaluates if a domain navigation section is active (at least one item inside is active).
 */
export const isNavigationSectionActive = (currentPath: string, section: NavSection): boolean => {
  return section.items.some((entry) => {
    if (entry.kind === 'leaf') {
      return isPathActive(currentPath, entry.leaf.to);
    }
    return isNavigationGroupActive(currentPath, entry.group);
  });
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
      const groupLeaf: NavLeaf = {
        moduleKey: entry.group.id as any,
        label: entry.group.label,
        to: entry.group.to,
        icon: entry.group.icon,
      };
      checkMatch(groupLeaf);

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
