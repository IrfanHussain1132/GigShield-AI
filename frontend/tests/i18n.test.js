import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  globalThis.window = {
    localStorage: {
      getItem: () => 'en',
      setItem: () => {},
      removeItem: () => {},
    },
  };
});

describe('i18n translation behavior', () => {
  it('returns translated values and key fallback when missing', async () => {
    const { state } = await import('../src/store.js');
    const { t } = await import('../src/utils/i18n.js');

    state.language = 'te';
    expect(t('home')).toBe('హోమ్');
    expect(t('unknown_key_token')).toBe('unknown_key_token');

    state.language = 'en';
    expect(t('home')).toBe('Home');
  });
});
