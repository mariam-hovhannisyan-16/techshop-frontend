import type { IconName } from '../components/icon/icon';

export const CATEGORY_KEYWORDS: Record<string, string[]> = {

  phones: ['iphone', 'galaxy', 'հեռախոս'],
  laptops: ['laptop', 'notebook', 'macbook', 'computer', 'desktop', 'համակարգիչ', 'նոութբուք'],
  audio: ['headphone', 'earbud', 'ականջակալ'],
  tv: ['tv', 'television', 'հեռուստացույց'],
  amplifiers: ['amplifier', 'speaker', 'receiver', 'ուժեղացուցիչ', 'բարձրախոս'],
  camera: ['camera', 'gopro', 'video', 'ֆոտո', 'վիդեո'],
  tablets: ['tablet', 'ipad', 'պլանշետ'],
  monitors: ['monitor', 'display', 'մոնիտոր'],
  games: ['game', 'console', 'playstation', 'xbox', 'խաղ'],
  accessories: ['accessory', 'case', 'cable', 'charger', 'keyboard', 'mouse', 'աքսեսուար']
};

export interface CategorizableProduct {
  name: string;
  description: string;
  category?: string;
}

export const CATEGORY_TAB_TO_BACKEND: Record<string, string> = {
  phones: 'Phones',
  laptops: 'Laptops',
  audio: 'Audio',
  tv: 'TVs',
  camera: 'Cameras',
  tablets: 'Tablets',
  monitors: 'Monitors',
  games: 'Gaming',
  accessories: 'Accessories'
};

const BACKEND_CATEGORY_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TAB_TO_BACKEND).map(([tab, backend]) => [backend.toLowerCase(), tab])
);

export function matchesCategory(product: CategorizableProduct, category: string): boolean {
  if (category === 'all') return true;

  if (product.category) {

    const productCategory = product.category.toLowerCase();
    const backendCategory = CATEGORY_TAB_TO_BACKEND[category];
    return productCategory === category.toLowerCase()
      || (!!backendCategory && productCategory === backendCategory.toLowerCase());
  }

  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  const haystack = `${product.name} ${product.description}`.toLowerCase();
  return keywords.some(keyword => haystack.includes(keyword));
}

export function inferCategory(product: CategorizableProduct): string | null {
  if (product.category) {
    const tab = BACKEND_CATEGORY_TO_TAB[product.category.toLowerCase()];
    if (tab) return tab;
  }

  for (const category of Object.keys(CATEGORY_KEYWORDS)) {
    if (matchesCategory(product, category)) return category;
  }
  return null;
}

export interface CategoryNavItem {
  id: string;
  labelKey: string;
  icon: IconName;
}

export const CATEGORY_NAV_ITEMS: CategoryNavItem[] = [
  { id: 'all', labelKey: 'ALL_PRODUCTS', icon: 'grid' },
  { id: 'laptops', labelKey: 'LAPTOPS', icon: 'laptop' },
  { id: 'phones', labelKey: 'PHONES', icon: 'smartphone' },
  { id: 'monitors', labelKey: 'MONITORS', icon: 'monitor' },
  { id: 'tv', labelKey: 'TV', icon: 'monitor' },
  { id: 'audio', labelKey: 'AUDIO', icon: 'headphones' },
  { id: 'games', labelKey: 'GAMES', icon: 'gamepad' },
  { id: 'tablets', labelKey: 'TABLETS', icon: 'tablet' },
  { id: 'camera', labelKey: 'CAMERA', icon: 'eye' },
  { id: 'accessories', labelKey: 'ACCESSORIES', icon: 'plug' }
];
