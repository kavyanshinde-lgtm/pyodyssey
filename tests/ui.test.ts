import { describe, expect, it } from 'vitest';
import { FEATURES } from '../src/config/features';
import { THEMES, THEME_BY_ID } from '../src/data/shop';
import { defaultSave, migrateSave } from '../src/storage/save';

describe('Phase 4 Simplified Focus UI & Accessibility', () => {
  it('gamification feature flag is disabled for study focus', () => {
    expect(FEATURES.GAMIFICATION).toBe(false);
  });

  it('provides plain dark and plain light themes with accessible high contrast vars', () => {
    const darkTheme = THEME_BY_ID.get('dark');
    expect(darkTheme).toBeDefined();
    expect(darkTheme?.name).toBe('Plain Dark');
    expect(darkTheme?.vars['--text']).toBe('#F4F1EC');
    expect(darkTheme?.vars['--bg']).toBe('#000000');
    expect(darkTheme?.vars['--line']).toBe('#3A2412');
    expect(darkTheme?.vars['--accent']).toBe('#FF7A1A');

    const lightTheme = THEME_BY_ID.get('light');
    expect(lightTheme).toBeDefined();
    expect(lightTheme?.name).toBe('Plain Light');
    expect(lightTheme?.vars['--text']).toBe('#1A1612');
    expect(lightTheme?.vars['--bg']).toBe('#FAF7F2');
    expect(lightTheme?.vars['--line']).toBe('#E6D9CB');
    expect(lightTheme?.vars['--accent']).toBe('#D9540A');
  });

  it('default save uses plain dark theme and includes both dark and light in unlockedThemes', () => {
    const save = defaultSave();
    expect(save.theme).toBe('dark');
    expect(save.unlockedThemes).toContain('dark');
    expect(save.unlockedThemes).toContain('light');
  });

  it('save migration maps unknown or missing theme to dark theme cleanly', () => {
    const raw = {
      version: 2,
      xp: 100,
      theme: 'nonexistent-theme',
    };
    const migrated = migrateSave(raw);
    expect(migrated.theme).toBe('dark');
    expect(migrated.unlockedThemes).toContain('dark');
    expect(migrated.unlockedThemes).toContain('light');
  });

  it('save migration cleanly imports legacy saves with bosses, coins, skins, and combo without crashing', () => {
    const legacy = {
      version: 3,
      xp: 450,
      coins: 900,
      streak: 5,
      theme: 'cyberpunk',
      pyroSkin: 'bubblegum',
      unlockedSkins: ['mint', 'bubblegum'],
      bestCombo: 24,
      hintTokens: 3,
      freezeTokens: 2,
      bosses: {
        'r1-boss': { hp: 0, defeated: true },
      },
      lessons: {
        'r1-1': { stars: 3, bestStars: 3, code: 'print("Hello")', completedAt: '2026-01-01T00:00:00Z' },
      },
      trials: {
        'r1-trial': { clearedRounds: [0, 1, 2], completed: true },
      },
    };

    const migrated = migrateSave(legacy);
    expect(migrated.xp).toBe(450);
    expect(migrated.streak).toBe(5);
    expect(migrated.theme).toBe('dark'); // Fallback from removed cyberpunk theme
    expect(migrated.lessons['r1-1']?.bestStars).toBe(3);
    expect(migrated.trials['r1-trial']?.completed).toBe(true);
    expect((migrated as Record<string, unknown>).bosses).toBeUndefined();
    expect((migrated as Record<string, unknown>).pyroSkin).toBeUndefined();
    expect((migrated as Record<string, unknown>).bestCombo).toBeUndefined();
  });
});
