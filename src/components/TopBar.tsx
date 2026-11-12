import { useState, useRef, useEffect } from 'react';
import { TOTAL_LESSONS } from '../data/curriculum';
import type { SaveData } from '../storage/save';
import type { ThemeId } from '../data/shop';
import type { BrainMode } from './CurriculumPanel';
import { Icon } from './Icons';

interface TopBarProps {
  save: SaveData;
  mode: 'lesson' | 'sandbox' | 'review';
  completed: number;
  dueCount?: number;
  brainMode?: BrainMode;
  onBrainMode?: (mode: BrainMode) => void;
  onMode: (mode: 'lesson' | 'sandbox' | 'review') => void;
  onOpenSave: () => void;
  onToggleSound: () => void;
  onToggleSidebar: () => void;
  onSelectTheme?: (themeId: ThemeId) => void;
  offlineReady?: boolean;
}

export function TopBar({
  save,
  mode,
  completed,
  dueCount = 0,
  brainMode = 'toybox',
  onBrainMode,
  onMode,
  onOpenSave,
  onToggleSound,
  onToggleSidebar,
  onSelectTheme,
  offlineReady = false,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          id="curriculum-toggle-btn"
          type="button"
          className="btn btn-outlined"
          onClick={onToggleSidebar}
          aria-label="Toggle curriculum drawer"
          title="Toggle curriculum"
        >
          <Icon name="menu" size={14} />
          <span>Curriculum</span>
        </button>

        <span className="topbar-brand">
          PyOdyssey
        </span>
      </div>

      <div className="topbar-right">
        {/* Progress bar (160px x 4px) and plain text */}
        <div className="topbar-progress-wrap" title={`${completed} of ${TOTAL_LESSONS} lessons completed`}>
          <div className="topbar-progress-bar">
            <div
              className="topbar-progress-fill"
              style={{ width: `${Math.round((completed / TOTAL_LESSONS) * 100)}%` }}
            />
          </div>
          <span className="topbar-progress-label">
            {completed} of {TOTAL_LESSONS} done
          </span>
        </div>

        {/* Amber streak dot + text */}
        <div className="topbar-streak" title="Daily streak">
          <span className="streak-dot" />
          <span>{save.streak} day streak</span>
        </div>

        {/* Quiet offline ready indicator */}
        {offlineReady ? (
          <div className="topbar-offline-pill" title="PyOdyssey is cached and ready to use offline">
            <span className="offline-dot" />
            <span>Ready offline</span>
          </div>
        ) : null}

        {/* Quiet "More" menu dropdown */}
        <div ref={menuRef} className="more-menu-container">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <span>More ▾</span>
          </button>

          {menuOpen ? (
            <div className="menu-dropdown" role="menu">
              {/* Explanation depth: Simple / Detailed */}
              {onBrainMode && (
                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onBrainMode(brainMode === 'toybox' ? 'hood' : 'toybox');
                  }}
                >
                  <span>
                    Explanation depth: {brainMode === 'toybox' ? 'Simple' : 'Detailed'}
                  </span>
                </button>
              )}

              {/* Mode switch: Campaign, Review, Sandbox */}
              <button
                type="button"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onMode(mode === 'lesson' ? 'review' : 'lesson');
                }}
              >
                <span>
                  {mode === 'review' ? 'Return to campaign' : `Review due (${dueCount})`}
                </span>
              </button>

              <button
                type="button"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onMode(mode === 'sandbox' ? 'lesson' : 'sandbox');
                }}
              >
                <span>
                  {mode === 'sandbox' ? 'Return to campaign' : 'Sandbox playground'}
                </span>
              </button>

              <div className="menu-divider" />

              {/* Save & Export */}
              <button
                type="button"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSave();
                }}
              >
                <span>Save and export</span>
              </button>

              {/* Sound */}
              <button
                type="button"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleSound();
                }}
              >
                <span>{save.muted ? 'Unmute sound' : 'Mute sound'}</span>
              </button>

              {/* Theme toggle */}
              {onSelectTheme ? (
                <>
                  <div className="menu-divider" />
                  <button
                    type="button"
                    className="menu-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onSelectTheme(save.theme === 'light' ? 'dark' : 'light');
                    }}
                  >
                    <span>{save.theme === 'light' ? 'Dark theme' : 'Light theme'}</span>
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
