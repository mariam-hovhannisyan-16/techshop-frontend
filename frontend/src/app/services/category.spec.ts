import { matchesCategory, inferCategory } from './category';

describe('category', () => {
  it('matches a product to a category by keyword', () => {
    expect(matchesCategory({ name: 'iPhone 15', description: 'Apple phone' }, 'phones')).toBe(true);
    expect(matchesCategory({ name: 'iPhone 15', description: 'Apple phone' }, 'laptops')).toBe(false);
  });

  it('treats "all" as matching everything', () => {
    expect(matchesCategory({ name: 'Anything', description: '' }, 'all')).toBe(true);
  });

  it('infers the first matching category', () => {
    expect(inferCategory({ name: 'iPhone 15', description: 'Apple phone' })).toBe('phones');
    expect(inferCategory({ name: 'Unrelated Widget', description: '' })).toBeNull();
  });
});
