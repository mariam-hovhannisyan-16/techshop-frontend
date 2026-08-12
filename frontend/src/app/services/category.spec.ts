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

  it('trusts the backend category field over keyword guessing', () => {
    const sonosAmp = { name: 'Sonos Amp', description: 'Ուժեղացուցիչ՝ խելացի ձայնային համակարգի համար', category: 'Audio' };
    expect(matchesCategory(sonosAmp, 'audio')).toBe(true);
    expect(matchesCategory(sonosAmp, 'amplifiers')).toBe(false);
    expect(inferCategory(sonosAmp)).toBe('audio');

    const iphone = { name: 'iPhone 17 Pro Max', description: 'Titanium design with the largest display in the lineup.', category: 'Phones' };
    expect(matchesCategory(iphone, 'monitors')).toBe(false);
    expect(matchesCategory(iphone, 'phones')).toBe(true);
    expect(inferCategory(iphone)).toBe('phones');
  });

  it('falls back to keyword matching when no backend category is present', () => {
    expect(matchesCategory({ name: 'Sonos Amp', description: 'Ուժեղացուցիչ' }, 'amplifiers')).toBe(true);
  });
});
