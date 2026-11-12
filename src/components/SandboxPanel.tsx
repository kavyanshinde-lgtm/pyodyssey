import type { CSSProperties } from 'react';
import { SANDBOX_EXAMPLES, type SandboxExample } from '../data/sandbox';
import type { SaveData } from '../storage/save';
import { Icon } from './Icons';

interface SandboxPanelProps {
  save: SaveData;
  code: string;
  stdin: string;
  activeExample: string | null;
  onLoadExample: (example: SandboxExample) => void;
  onStdinChange: (value: string) => void;
  onClear: () => void;
  onRun: () => void;
  onOpenSave: () => void;
  lines: number;
}

export function SandboxPanel({
  save,
  code,
  stdin,
  activeExample,
  onLoadExample,
  onStdinChange,
  onClear,
  onRun,
  onOpenSave,
  lines,
}: SandboxPanelProps) {
  return (
    <aside className="sandbox-panel">
      <div className="sandbox-hero">
        <div className="sandbox-orb">
          <span className="sandbox-orb-ring ring-1" />
          <span className="sandbox-orb-ring ring-2" />
          <span className="sandbox-orb-core">∞</span>
          <span className="sandbox-orb-spark s1">✦</span>
          <span className="sandbox-orb-spark s2">✦</span>
        </div>
        <span className="sandbox-kicker">NO LEVELS · NO RULES · REAL PYTHON</span>
        <h2>Sandbox Lab</h2>
        <p>
          The stage is yours. Invent a robot, break a loop, summon a generator. Every line still runs in the local
          Python core.
        </p>
        <div className="sandbox-stats">
          <span><strong>{lines}</strong><small>LINES</small></span>
          <span><strong>{save.totalRuns}</strong><small>RUNS</small></span>
          <span><strong>∞</strong><small>POSSIBILITIES</small></span>
        </div>
      </div>

      <div className="sandbox-rules">
        <span className="sandbox-block-title"><Icon name="info" size={13} /> THE ONLY RULES</span>
        <ul>
          <li><span>01</span> Python 3.12 in your browser</li>
          <li><span>02</span> 2.8s execution watchdog</li>
          <li><span>03</span> Network modules disabled</li>
        </ul>
      </div>

      <div className="sandbox-input">
        <div className="sandbox-block-head">
          <span className="sandbox-block-title"><Icon name="terminal" size={13} /> STDIN PIPE</span>
          <span className="sandbox-input-hint">one value per line</span>
        </div>
        <textarea
          value={stdin}
          onChange={(event) => onStdinChange(event.target.value)}
          placeholder={'Nova\n42'}
          spellCheck={false}
          aria-label="Sandbox stdin values, one per line"
        />
        <span className="stdin-note">
          {stdin.trim() ? `${stdin.trim().split('\n').length} value(s) queued` : 'empty pipe — input() gets ""'}
        </span>
      </div>

      <div className="sandbox-library">
        <div className="sandbox-block-head">
          <span className="sandbox-block-title"><Icon name="sparkles" size={13} /> EXPERIMENT DECK</span>
          <span className="sandbox-input-hint">{SANDBOX_EXAMPLES.length} SPELLS</span>
        </div>
        <div className="sandbox-examples">
          {SANDBOX_EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              className={`sandbox-example ${activeExample === example.id ? 'active' : ''}`}
              style={{ '--example-color': example.color } as CSSProperties}
              onClick={() => onLoadExample(example)}
            >
              <span className="example-icon">{example.icon}</span>
              <span className="example-copy">
                <strong>{example.title}</strong>
                <small>{example.subtitle}</small>
              </span>
              <Icon name="chevron-right" size={13} />
            </button>
          ))}
        </div>
      </div>

      <div className="sandbox-actions">
        <button type="button" className="sandbox-run" onClick={onRun} disabled={!code.trim()}>
          <Icon name="play" size={15} /> RUN SANDBOX
        </button>
        <button type="button" className="sandbox-clear" onClick={onClear}>
          <Icon name="reset" size={14} /> CLEAR
        </button>
      </div>

      <div className="sandbox-footer">
        <div className="sandbox-footer-links">
          <button type="button" onClick={onOpenSave}><Icon name="save" size={12} /> SAVE / EXPORT</button>
        </div>
      </div>
    </aside>
  );
}
