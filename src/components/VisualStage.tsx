import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { Lesson } from '../data/curriculum';
import type { SerializedValue, TraceFrame } from '../engine/types';
import type { CodeSignals } from '../engine/linter';
import { audio } from '../audio/synth';
import { Icon } from './Icons';

export type PlaybackState = 'idle' | 'running' | 'playing' | 'paused' | 'error' | 'success';

interface VisualStageProps {
  lesson: Lesson;
  code: string;
  frames: TraceFrame[];
  frameIndex: number;
  playback: PlaybackState;
  speed: number;
  signals: CodeSignals;
  mode: 'lesson' | 'sandbox';
  onTogglePlay: () => void;
  onStepFrame: () => void;
  onScrub: (index: number) => void;
  onSpeedChange: (speed: number) => void;
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    int: 'INT',
    float: 'FLOAT',
    str: 'STR',
    bool: 'BOOL',
    NoneType: 'NONE',
    list: 'LIST',
    tuple: 'TUPLE',
    dict: 'DICT',
    set: 'SET',
    frozenset: 'FROZENSET',
    object: 'OBJECT',
    class: 'CLASS',
    function: 'FN',
    bytes: 'BYTES',
  };
  return labels[type] ?? type.toUpperCase().slice(0, 9);
}

function displayValue(value: SerializedValue, max = 20): string {
  if (value.type === 'str') {
    const raw = value.repr;
    const quote = raw[0];
    if ((quote === '"' || quote === "'") && raw.endsWith(quote)) {
      const inner = raw.slice(1, -1);
      return inner.length > max ? `${inner.slice(0, max)}…` : inner;
    }
  }
  if (value.type === 'NoneType') return 'None';
  if (value.repr.length > max) return `${value.repr.slice(0, max)}…`;
  return value.repr;
}

function shortName(value: SerializedValue): string {
  if (value.type === 'object') return value.className ?? 'object';
  return typeLabel(value.type);
}

function safeEntries(frame: TraceFrame | null): Array<[string, SerializedValue]> {
  if (!frame) return [];
  return Object.entries(frame.locals).filter(([key]) => !key.startsWith('__'));
}

const PRIMITIVE_TYPES = new Set(['int', 'float', 'str', 'bool', 'NoneType', 'bytes', 'complex']);

interface StageCrateProps {
  name: string;
  value: SerializedValue;
  index: number;
}

function StageCrate({ name, value, index }: StageCrateProps) {
  const label = typeLabel(value.type);
  return (
    <div
      className={`stage-crate crate-${value.type} ${value.type === 'bool' && value.repr === 'True' ? 'is-on' : ''}`}
      style={{ '--i': index } as CSSProperties}
      title={`${name} = ${value.repr}`}
    >
      <span className="crate-hook" aria-hidden="true" />
      <div className="crate-top">
        <span>{label}</span>
        <span className="crate-name">{name}</span>
      </div>
      <div className="crate-body">
        {value.type === 'str' ? (
          <span className="string-scroll">
            <span className="scroll-edge left" />
            <span className="scroll-text">“{displayValue(value, 18)}”</span>
            <span className="scroll-edge right" />
          </span>
        ) : value.type === 'bool' ? (
          <span className="boolean-switch">
            <span className="switch-track">
              <span className="switch-knob">{value.repr === 'True' ? 'I' : 'O'}</span>
            </span>
            <span className="switch-label">{value.repr === 'True' ? 'ON' : 'OFF'}</span>
          </span>
        ) : value.type === 'int' || value.type === 'float' || value.type === 'complex' ? (
          <span className="number-weight">
            <span className="weight-value">{displayValue(value, 12)}</span>
            <span className="weight-unit">{value.type === 'int' ? 'kg' : 'µg'}</span>
            <span className="weight-rivets">
              <i />
              <i />
              <i />
              <i />
            </span>
          </span>
        ) : (
          <span className="crate-generic">{displayValue(value, 24)}</span>
        )}
      </div>
      <span className="crate-glow" aria-hidden="true" />
    </div>
  );
}

function PrimitiveRow({ entries }: { entries: Array<[string, SerializedValue]> }) {
  const primitives = entries.filter(([, value]) => PRIMITIVE_TYPES.has(value.type)).slice(0, 4);
  const extra = Math.max(0, entries.filter(([, value]) => PRIMITIVE_TYPES.has(value.type)).length - 4);
  if (primitives.length === 0) return null;
  return (
    <div className="primitive-rig">
      <div className="crane-mast" aria-hidden="true">
        <span className="crane-beam" />
        <span className="crane-cable" />
        <span className="crane-light" />
        <span className="crane-tag">CRANE 07</span>
      </div>
      <div className="primitive-row">
        {primitives.map(([name, value], index) => (
          <StageCrate key={`${name}-${value.repr}-${index}`} name={name} value={value} index={index} />
        ))}
        {extra > 0 ? <div className="crate-more">+{extra} more</div> : null}
      </div>
    </div>
  );
}

function TrainScene({ name, value }: { name: string; value: SerializedValue }) {
  const items = value.items ?? [];
  const previous = useRef<{ length: number; items: SerializedValue[] }>({
    length: value.length ?? items.length,
    items,
  });
  const [event, setEvent] = useState<{ kind: 'append' | 'pop'; index: number; item?: SerializedValue } | null>(null);

  useEffect(() => {
    const previousState = previous.current;
    const currentLength = value.length ?? items.length;
    if (currentLength > previousState.length) {
      setEvent({ kind: 'append', index: currentLength - 1 });
    } else if (currentLength < previousState.length) {
      const removed = previousState.items[previousState.items.length - 1];
      setEvent({ kind: 'pop', index: currentLength, item: removed });
    }
    previous.current = { length: currentLength, items };
    const timer = window.setTimeout(() => setEvent(null), 1300);
    return () => window.clearTimeout(timer);
  }, [value.length, value.repr, items]);

  return (
    <div className="train-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot cyan" />
        LIST CARGO
        <strong>{name}</strong>
        <span className="machine-meta">len={value.length ?? items.length}</span>
      </div>
      <div className="train-track">
        <div className="train-loco">
          <div className="loco-cab">
            <span className="loco-window" />
            <span className="loco-stack" />
          </div>
          <div className="loco-body">
            <span className="loco-stripe" />
            <span className="loco-wheel" />
            <span className="loco-wheel second" />
          </div>
        </div>
        <div className="train-cars">
          {items.length === 0 ? (
            <div className="empty-car">empty train — append something</div>
          ) : (
            items.slice(0, 7).map((item, index) => (
              <div
                key={`${index}-${item.repr}`}
                className={`train-car ${event?.kind === 'append' && index === event.index ? 'is-coupling' : ''}`}
                style={{ '--i': index } as CSSProperties}
              >
                <span className="car-index">[{index}]</span>
                <span className="car-value">{displayValue(item, 14)}</span>
                <span className="car-coupling" />
                <span className="car-wheel left" />
                <span className="car-wheel right" />
                {event?.kind === 'append' && index === event.index ? (
                  <span className="weld-sparks" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
              </div>
            ))
          )}
          {(value.length ?? items.length) > 7 ? <span className="train-overflow">+{(value.length ?? 0) - 7}</span> : null}
        </div>
        {event?.kind === 'pop' ? (
          <div className="pop-projectile">
            <span>POP!</span>
            <strong>{event.item ? displayValue(event.item, 10) : 'item'}</strong>
          </div>
        ) : null}
      </div>
      <div className="train-rail" />
      <div className="train-caption">
        <span>.append()</span> couples a car · <span>.pop()</span> launches it
      </div>
    </div>
  );
}

function TupleGlass({ name, value }: { name: string; value: SerializedValue }) {
  const items = value.items ?? [];
  return (
    <div className="tuple-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot blue" />
        TUPLE RELIC
        <strong>{name}</strong>
        <span className="machine-meta">immutable</span>
      </div>
      <div className="glass-case">
        <div className="glass-shine" />
        <div className="glass-lock">
          <Icon name="lock" size={15} /> FROZEN
        </div>
        <div className="glass-items">
          {items.map((item, index) => (
            <span key={index} className="glass-chip">
              <em>[{index}]</em>
              {displayValue(item, 12)}
            </span>
          ))}
        </div>
        <span className="frost frost-a" />
        <span className="frost frost-b" />
        <span className="glass-crack" />
      </div>
      <div className="glass-caption">Unbreakable blue glass. You can read it, never rewrite it.</div>
    </div>
  );
}

function VendingMachine({ name, value, frameIndex }: { name: string; value: SerializedValue; frameIndex: number }) {
  const entries = value.entries ?? [];
  const [active, setActive] = useState(0);
  const [beam, setBeam] = useState(0);

  useEffect(() => {
    if (entries.length === 0) return;
    setActive((current) => (current + 1) % entries.length);
    setBeam((current) => current + 1);
  }, [frameIndex, entries.length]);

  return (
    <div className="vending-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot pink" />
        DICT VENDING
        <strong>{name}</strong>
        <span className="machine-meta">keys={value.length ?? entries.length}</span>
      </div>
      <div className="vending-machine">
        <div className="vending-top">
          <span className="vending-logo">NOVA·SNAX</span>
          <span className="vending-light" />
        </div>
        <div className="vending-body">
          <div className="vending-keypad">
            <span className="keypad-label">SELECT KEY</span>
            {entries.slice(0, 4).map((entry, index) => (
              <button
                key={`${index}-${entry.key.repr}`}
                type="button"
                className={`vending-key ${active === index ? 'is-active' : ''}`}
                onClick={() => {
                  setActive(index);
                  setBeam((current) => current + 1);
                  audio.pop();
                }}
              >
                {displayValue(entry.key, 10)}
              </button>
            ))}
            {entries.length === 0 ? <span className="keypad-empty">EMPTY</span> : null}
            <span className="keypad-slot" />
          </div>
          <div className="vending-window">
            <span className="window-scanline" />
            <div className="vending-values">
              {entries.map((entry, index) => (
                <div key={`${index}-${entry.value.repr}`} className={`vend-row ${active === index ? 'is-active' : ''}`}>
                  <span className="vend-key">{displayValue(entry.key, 9)}</span>
                  <span className="vend-arrow">→</span>
                  <span className="vend-value">{displayValue(entry.value, 14)}</span>
                </div>
              ))}
            </div>
            <span className={`vending-laser laser-${active}`} key={`beam-${beam}-${active}`} aria-hidden="true" />
          </div>
        </div>
        <div className="vending-dispenser">
          <span className="dispenser-lip" />
          <span className="dispenser-glow" />
          {entries[active] ? <span className="dispensed-item">{displayValue(entries[active].value, 12)}</span> : null}
        </div>
      </div>
      <div className="vending-caption">type a key · laser dispenses the value</div>
    </div>
  );
}

function SetScene({ name, value }: { name: string; value: SerializedValue }) {
  const items = value.items ?? [];
  const colors = ['#00F5D4', '#FF2A85', '#FEE440', '#5EFF8F', '#9D4EDD', '#4CC9F0'];
  return (
    <div className="set-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot green" />
        HASH BAG
        <strong>{name}</strong>
        <span className="machine-meta">unique={value.length ?? items.length}</span>
      </div>
      <div className="set-orbit">
        <span className="set-ring ring-one" />
        <span className="set-ring ring-two" />
        <span className="set-core">
          <small>UNIQUE</small>
          <strong>{value.length ?? items.length}</strong>
        </span>
        {items.slice(0, 8).map((item, index) => {
          const angle = (index / Math.max(1, items.length)) * Math.PI * 2 - Math.PI / 2;
          const radius = 104;
          return (
            <span
              key={`${index}-${item.repr}`}
              className="set-orb"
              style={
                {
                  '--x': `${Math.cos(angle) * radius}px`,
                  '--y': `${Math.sin(angle) * radius * 0.58}px`,
                  '--orb-color': colors[index % colors.length],
                  '--i': index,
                } as CSSProperties
              }
            >
              {displayValue(item, 8)}
            </span>
          );
        })}
      </div>
      <div className="glass-caption">One badge per hash. Duplicates bounce out.</div>
    </div>
  );
}

function LogicScene({
  entries,
  source,
}: {
  entries: Array<[string, SerializedValue]>;
  source: string;
}) {
  const booleans = entries.filter(([, value]) => value.type === 'bool').slice(0, 3);
  const hasAnd = /\band\b/.test(source);
  const hasOr = /\bor\b/.test(source);
  const hasNot = /\bnot\b/.test(source);
  return (
    <div className="logic-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot yellow" />
        DECISION CORE
        <strong>if · and · or · not</strong>
        <span className="machine-meta">live</span>
      </div>
      <div className="logic-board">
        <div className="logic-switches">
          {booleans.length === 0 ? (
            <div className="logic-empty">
              <span className="logic-empty-light" />
              no booleans yet
            </div>
          ) : (
            booleans.map(([name, value], index) => {
              const on = value.repr === 'True';
              return (
                <div key={name} className={`logic-switch ${on ? 'is-on' : ''}`} style={{ '--i': index } as CSSProperties}>
                  <span className="logic-switch-name">{name}</span>
                  <span className="logic-toggle">
                    <span className="logic-toggle-track">
                      <span className="logic-toggle-knob" />
                    </span>
                  </span>
                  <span className="logic-switch-value">{on ? 'TRUE' : 'FALSE'}</span>
                </div>
              );
            })
          )}
        </div>
        <svg className="logic-wires" viewBox="0 0 340 150" aria-hidden="true">
          <path d="M20 35 C110 35 110 75 170 75" className={hasAnd ? 'wire active' : 'wire'} />
          <path d="M20 115 C110 115 110 75 170 75" className={hasOr ? 'wire active' : 'wire'} />
          <path d="M320 35 C260 35 260 75 210 75" className={hasNot ? 'wire active not-wire' : 'wire'} />
          <circle cx="170" cy="75" r="28" className="gate-core" />
          <text x="170" y="81" textAnchor="middle" className="gate-text">
            {hasAnd ? 'AND' : hasOr ? 'OR' : hasNot ? 'NOT' : 'IF'}
          </text>
          <circle cx="320" cy="35" r="8" className="gate-node" />
          <circle cx="20" cy="35" r="6" className="gate-node" />
          <circle cx="20" cy="115" r="6" className="gate-node" />
        </svg>
        <div className="logic-verdict">
          <span className="verdict-label">ROUTE</span>
          <span className="verdict-value">{source.match(/print\s*\(\s*["']([^"']+)/)?.[1] ?? 'AWAITING'}</span>
        </div>
      </div>
    </div>
  );
}

function InputScene({ entries }: { entries: Array<[string, SerializedValue]> }) {
  const caught = entries.find(([, value]) => value.type === 'str');
  return (
    <div className="input-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot yellow" />
        LISTENING TUBE
        <strong>input()</strong>
        <span className="machine-meta">stdin → str</span>
      </div>
      <div className="input-rig">
        <div className="input-wave wave-a" />
        <div className="input-wave wave-b" />
        <div className="input-horn">
          <span className="horn-mouth" />
          <span className="horn-body" />
          <span className="horn-glow" />
        </div>
        <div className="input-pipe">
          <span className="pipe-dash" />
          <span className="pipe-dash second" />
          <span className="pipe-dash third" />
        </div>
        <div className="input-capture">
          <span className="capture-label">CAUGHT VALUE</span>
          <strong>{caught ? displayValue(caught[1], 18) : '…'}</strong>
          <span className="capture-name">{caught?.[0] ?? 'waiting'}</span>
        </div>
      </div>
      <div className="glass-caption">The tube catches text. Numbers need int() or float().</div>
    </div>
  );
}

function LoopScene({
  signal,
  entries,
  frameIndex,
  source,
  listValue,
}: {
  signal: CodeSignals;
  entries: Array<[string, SerializedValue]>;
  frameIndex: number;
  source: string;
  listValue?: SerializedValue;
}) {
  const loopVar = signal.forVariable;
  const current = loopVar ? entries.find(([key]) => key === loopVar)?.[1] : undefined;
  const currentDisplay = current ? displayValue(current, 4) : String(frameIndex % 5);
  const items = listValue?.items?.slice(0, 6) ?? [0, 1, 2, 3, 4].map((number) => ({
    type: 'int',
    repr: String(number),
    items: [],
  }));
  const activeIndex = current && /^\d+$/.test(current.repr)
    ? Number(current.repr) % Math.max(1, items.length)
    : frameIndex % Math.max(1, items.length);
  const armPosition = 12 + activeIndex * (76 / Math.max(1, items.length));

  return (
    <div className="loop-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot green" />
        LOOP FACTORY
        <strong>{signal.hasWhile ? 'while' : 'for'}</strong>
        <span className="machine-meta">cycle {frameIndex + 1}</span>
      </div>
      <div className="loop-rig">
        <div className="robot-arm" style={{ left: `${armPosition}%` }}>
          <span className="arm-mount" />
          <span className="arm-upper" />
          <span className="arm-joint" />
          <span className="arm-forearm" />
          <span className="arm-claw">
            <i />
            <i />
          </span>
          <span className="arm-scan" />
        </div>
        <div className="loop-belt-set">
          <div className="loop-belt">
            <span className="belt-surface" />
            {items.map((item, index) => (
              <span
                key={`${index}-${item.repr}`}
                className={`belt-item ${activeIndex === index ? 'is-active' : ''}`}
                style={{ '--i': index } as CSSProperties}
              >
                {displayValue(item, 6)}
              </span>
            ))}
          </div>
          <div className="belt-gears">
            <span className="gear gear-a" />
            <span className="gear gear-b" />
          </div>
        </div>
        <div className="loop-readout">
          <span className="readout-label">{signal.hasWhile ? 'WHILE CHECK' : 'NEXT ITEM'}</span>
          <strong key={`${frameIndex}-${currentDisplay}`}>{currentDisplay}</strong>
          <span className="readout-sub">{loopVar ? `${loopVar} = …` : 'iteration'}</span>
        </div>
        {source.includes('break') ? <span className="loop-brake">BRAKE ARMED</span> : null}
      </div>
      <div className="train-caption">
        <span>for</span> → pick → process → next · active line highlighted
      </div>
    </div>
  );
}

function FactoryScene({
  entries,
  signal,
  frame,
  frameIndex,
}: {
  entries: Array<[string, SerializedValue]>;
  signal: CodeSignals;
  frame: TraceFrame | null;
  frameIndex: number;
}) {
  const stack = frame?.stack ?? ['<module>'];
  const userFrames = stack.filter((name) => name !== '<module>');
  const recursive = userFrames.length > 1;
  const output = entries.find(([name]) => name === 'result' || name === 'answer' || name === 'output')?.[1];
  const params = entries.filter(([, value]) => PRIMITIVE_TYPES.has(value.type)).slice(0, 3);

  return (
    <div className="factory-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot blue" />
        FUNCTION FOUNDRY
        <strong>{recursive ? 'CALL STACK TOWER' : 'FACTORY MACHINE'}</strong>
        <span className="machine-meta">depth {Math.max(1, userFrames.length)}</span>
      </div>
      <div className="factory-rig">
        {recursive ? (
          <div className="call-stack-tower">
            {userFrames.slice(0, 5).map((name, index) => (
              <div
                key={`${name}-${index}`}
                className={`stack-machine ${index === 0 ? 'is-current' : ''}`}
                style={{ '--depth': index } as CSSProperties}
              >
                <span className="stack-funnel" />
                <span className="stack-label">
                  {name}()<em>frame {index + 1}</em>
                </span>
                <span className="stack-body">
                  <span className="stack-gear" />
                  <span className="stack-gear small" />
                </span>
              </div>
            ))}
            <div className="stack-base">
              <span>BASE CASE</span>
              <span className="stack-arrow">↑ returns unwind ↑</span>
            </div>
          </div>
        ) : (
          <div className="factory-machine">
            <div className="factory-funnel">
              <span className="funnel-lip" />
              {params.map(([name, value], index) => (
                <span key={name} className="funnel-drop" style={{ '--i': index } as CSSProperties}>
                  {name}={displayValue(value, 7)}
                </span>
              ))}
            </div>
            <div className="factory-body">
              <div className="factory-pipe" />
              <div className="factory-gears">
                <span className="big-gear gear-a" />
                <span className="big-gear gear-b" />
                <span className="big-gear gear-c" />
              </div>
              <span className="factory-screen">
                <small>PROCESSING</small>
                <strong key={frameIndex}>{signal.functionNames[0] ?? 'machine'}()</strong>
              </span>
              <span className="factory-rivets">
                <i />
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="factory-chute">
              <span className="chute-mouth" />
              <span className="chute-package">
                {output ? displayValue(output, 10) : 'return'}
              </span>
            </div>
          </div>
        )}
        <div className="factory-console">
          <div className="console-line">
            <span>INPUT</span>
            <strong>{params.length ? params.map(([name]) => name).join(', ') : '—'}</strong>
          </div>
          <div className="console-line">
            <span>RETURN</span>
            <strong>{output ? displayValue(output, 14) : '—'}</strong>
          </div>
          <div className="console-line">
            <span>STACK</span>
            <strong>{userFrames.length ? userFrames.join(' → ') : 'idle'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Robot({
  value,
  name,
  index,
}: {
  value: SerializedValue;
  name: string;
  index: number;
}) {
  const attrs = Object.entries(value.attrs ?? {});
  const hpEntry = attrs.find(([key]) => ['hp', 'health', 'power', 'energy'].includes(key));
  const hpValue = hpEntry && /^\d+$/.test(hpEntry[1].repr) ? Number(hpEntry[1].repr) : 100;
  const percent = Math.max(4, Math.min(100, hpValue));
  return (
    <div className={`hologram-robot robot-${index % 3}`} style={{ '--i': index } as CSSProperties}>
      <span className="robot-beam" />
      <div className="robot-head">
        <span className="robot-antenna" />
        <span className="robot-eye left" />
        <span className="robot-eye right" />
        <span className="robot-mouth" />
      </div>
      <div className="robot-body">
        <span className="robot-core" />
        <span className="robot-panel left" />
        <span className="robot-panel right" />
        <div className="robot-hp">
          <span className="robot-hp-label">
            {hpEntry?.[0] ?? 'hp'} {hpValue}
          </span>
          <span className="robot-hp-track">
            <span style={{ width: `${percent}%` }} />
          </span>
        </div>
      </div>
      <span className="robot-arm left" />
      <span className="robot-arm right" />
      <span className="robot-leg left" />
      <span className="robot-leg right" />
      <div className="robot-nameplate">
        <strong>{name}</strong>
        <small>{value.className ?? 'object'}</small>
      </div>
      <div className="robot-attrs">
        {attrs.slice(0, 3).map(([key, attr]) => (
          <span key={key}>
            {key}: {displayValue(attr, 7)}
          </span>
        ))}
      </div>
    </div>
  );
}

function OopScene({
  entries,
  signals,
}: {
  entries: Array<[string, SerializedValue]>;
  signals: CodeSignals;
}) {
  const objects = entries.filter(([, value]) => value.type === 'object').slice(0, 3);
  const className = signals.classNames[0] ?? objects[0]?.[1].className ?? 'Blueprint';
  const methods = Array.from(
    new Set(
      Array.from(
        // The source is not passed here; show the important known dunders inferred from values.
        new Set(['__init__', ...(signals.hasReturn ? ['action'] : []), ...(signals.hasClass ? ['speak', '__str__'] : [])]),
      ),
    ),
  ).slice(0, 4);
  return (
    <div className="oop-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot blue" />
        HOLOGRAM BAY
        <strong>{className}</strong>
        <span className="machine-meta">{objects.length} instance{objects.length === 1 ? '' : 's'}</span>
      </div>
      <div className="oop-rig">
        <div className="blueprint-hologram">
          <span className="blueprint-scan" />
          <span className="blueprint-grid" />
          <div className="blueprint-head">
            <span>CLASS BLUEPRINT</span>
            <strong>{className}</strong>
          </div>
          <div className="blueprint-wire">
            <span className="wire-head" />
            <span className="wire-body" />
            <span className="wire-arm left" />
            <span className="wire-arm right" />
            <span className="wire-leg left" />
            <span className="wire-leg right" />
          </div>
          <div className="blueprint-attrs">
            <span>.self</span>
            {methods.map((method) => (
              <span key={method}>{method}()</span>
            ))}
          </div>
        </div>
        <div className="printer-beam" aria-hidden="true">
          <span />
        </div>
        <div className="robots-bay">
          {objects.length === 0 ? (
            <div className="robot-placeholder">
              <span className="printer-plate" />
              <span className="placeholder-ring" />
              <Icon name="cpu" size={32} />
              <p>instantiate a class to print a robot</p>
            </div>
          ) : (
            objects.map(([name, value], index) => (
              <Robot key={`${name}-${value.repr}`} value={value} name={name} index={index} />
            ))
          )}
        </div>
      </div>
      <div className="glass-caption">A class is a hologram. An object is the robot stamped from it.</div>
    </div>
  );
}

function ComprehensionScene({
  entries,
  frameIndex,
}: {
  entries: Array<[string, SerializedValue]>;
  frameIndex: number;
}) {
  const list = entries.find(([, value]) => value.type === 'list')?.[1];
  const items = list?.items ?? [];
  return (
    <div className="comp-scene machine-card">
      <div className="machine-tag">
        <span className="machine-dot purple" />
        SPELL CIRCUIT
        <strong>comprehension</strong>
        <span className="machine-meta">{list ? `len=${list.length ?? items.length}` : 'idle'}</span>
      </div>
      <div className="comp-rig">
        <div className="comp-circle">
          <span className="comp-ring outer" />
          <span className="comp-ring inner" />
          <span className="comp-rune rune-a">for</span>
          <span className="comp-rune rune-b">if</span>
          <span className="comp-rune rune-c">in</span>
          <span className="comp-core">
            <Icon name="sparkles" size={28} />
            <small>ONE BREATH</small>
          </span>
          {items.slice(0, 6).map((item, index) => {
            const angle = (index / Math.max(1, items.slice(0, 6).length)) * Math.PI * 2 + frameIndex * 0.08;
            return (
              <span
                key={`${index}-${item.repr}`}
                className="comp-chip"
                style={
                  {
                    '--x': `${Math.cos(angle) * 108}px`,
                    '--y': `${Math.sin(angle) * 66}px`,
                    '--i': index,
                  } as CSSProperties
                }
              >
                {displayValue(item, 7)}
              </span>
            );
          })}
        </div>
        <div className="comp-flow">
          <span className="flow-step">
            <small>INPUT</small>
            <strong>{items.length ? 'iterable' : 'range()'}</strong>
          </span>
          <span className="flow-arrow">→</span>
          <span className="flow-step hot">
            <small>TRANSFORM</small>
            <strong>expression</strong>
          </span>
          <span className="flow-arrow">→</span>
          <span className="flow-step">
            <small>OUTPUT</small>
            <strong>{list ? displayValue(list, 18) : 'new list'}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

function CrystalPreview({
  lesson,
  signals,
  running,
}: {
  lesson: Lesson;
  signals: CodeSignals;
  running: boolean;
}) {
  return (
    <div className="preview-scene">
      <div className="preview-portal">
        <span className="portal-ring ring-a" />
        <span className="portal-ring ring-b" />
        <span className="portal-ring ring-c" />
        <span className="portal-core">
          <span className="portal-icon">{running ? '◌' : lesson.icon}</span>
        </span>
        <span className="portal-orbit orbit-a">RUN</span>
        <span className="portal-orbit orbit-b">STEP</span>
        <span className="portal-orbit orbit-c">THINK</span>
        <span className="preview-particle p1" />
        <span className="preview-particle p2" />
        <span className="preview-particle p3" />
      </div>
      <div className="preview-copy">
        <span className="preview-kicker">{running ? 'COMPILING BYTECODE' : 'STAGE AWAITING CODE'}</span>
        <h3>{running ? 'Waking the machine...' : lesson.title}</h3>
        <p>
          {running
            ? 'The WebAssembly Python core is executing your spell. The stage will animate every line.'
            : signals.hasClass
              ? 'Press RUN to stamp the blueprint into a living robot.'
              : signals.hasLoop
                ? 'Press RUN to spin up the conveyor and watch every cycle.'
                : 'Press RUN to drop crates, unroll scrolls, and bring the machine alive.'}
        </p>
        <div className="preview-chips">
          <span>
            <Icon name="play" size={12} /> RUN
          </span>
          <span>
            <Icon name="step" size={12} /> STEP
          </span>
          <span>
            <Icon name="eye" size={12} /> EVERY LINE
          </span>
        </div>
      </div>
    </div>
  );
}

function SceneRouter({
  lesson,
  entries,
  frame,
  frameIndex,
  signals,
  source,
}: {
  lesson: Lesson;
  entries: Array<[string, SerializedValue]>;
  frame: TraceFrame | null;
  frameIndex: number;
  signals: CodeSignals;
  source: string;
}) {
  const lists = entries.filter(([, value]) => value.type === 'list');
  const dicts = entries.filter(([, value]) => value.type === 'dict');
  const tuples = entries.filter(([, value]) => value.type === 'tuple');
  const sets = entries.filter(([, value]) => value.type === 'set' || value.type === 'frozenset');
  const objects = entries.filter(([, value]) => value.type === 'object');
  const booleans = entries.filter(([, value]) => value.type === 'bool');

  const cards: ReactNode[] = [];
  const primaryList = lists[0];
  const primaryDict = dicts[0];
  const primaryTuple = tuples[0];
  const primarySet = sets[0];

  if (objects.length > 0 || lesson.scene === 'oop' || signals.hasClass) {
    cards.push(<OopScene key="oop" entries={entries} signals={signals} />);
  }
  if (lesson.scene === 'recursion' || (signals.hasFunction && (frame?.stack.length ?? 0) > 2)) {
    cards.push(
      <FactoryScene
        key="factory"
        entries={entries}
        signal={signals}
        frame={frame}
        frameIndex={frameIndex}
      />,
    );
  } else if (signals.hasFunction && lesson.scene !== 'oop') {
    cards.push(
      <FactoryScene
        key="factory"
        entries={entries}
        signal={signals}
        frame={frame}
        frameIndex={frameIndex}
      />,
    );
  }
  if (signals.hasLoop && (lists.length > 0 || lesson.scene === 'loops')) {
    cards.push(
      <LoopScene
        key="loop"
        signal={signals}
        entries={entries}
        frameIndex={frameIndex}
        source={source}
        listValue={primaryList?.[1]}
      />,
    );
  }
  if (primaryList && lesson.scene !== 'loops' && lesson.scene !== 'oop') {
    cards.push(<TrainScene key="train" name={primaryList[0]} value={primaryList[1]} />);
  }
  if (primaryDict) {
    cards.push(<VendingMachine key="vending" name={primaryDict[0]} value={primaryDict[1]} frameIndex={frameIndex} />);
  }
  if (primaryTuple) {
    cards.push(<TupleGlass key="tuple" name={primaryTuple[0]} value={primaryTuple[1]} />);
  }
  if (primarySet) {
    cards.push(<SetScene key="set" name={primarySet[0]} value={primarySet[1]} />);
  }
  if (lesson.scene === 'logic' || (booleans.length > 0 && cards.length === 0)) {
    cards.push(<LogicScene key="logic" entries={entries} source={source} />);
  }
  if (lesson.scene === 'input' || (signals.hasInput && cards.length === 0)) {
    cards.push(<InputScene key="input" entries={entries} />);
  }
  if (lesson.scene === 'comprehension' || signals.hasComprehension) {
    cards.push(<ComprehensionScene key="comp" entries={entries} frameIndex={frameIndex} />);
  }

  if (cards.length === 0) {
    if (lesson.scene === 'dicts' && !primaryDict) {
      cards.push(
        <div className="ghost-machine" key="ghost-dict">
          <Icon name="shop" size={36} />
          <span>Vending machine awaiting a dictionary</span>
        </div>,
      );
    } else if (lesson.scene === 'lists' && !primaryList) {
      cards.push(
        <div className="ghost-machine" key="ghost-list">
          <Icon name="layers" size={36} />
          <span>The cargo train has no cars yet</span>
        </div>,
      );
    } else {
      cards.push(
        <div className="ghost-machine" key="ghost-default">
          <Icon name="cpu" size={36} />
          <span>The stage is listening for variables...</span>
        </div>,
      );
    }
  }

  return <div className={`machine-grid ${cards.length === 1 ? 'single' : ''}`}>{cards.slice(0, 3)}</div>;
}

export function VisualStage({
  lesson,
  code,
  frames,
  frameIndex,
  playback,
  speed,
  signals,
  mode,
  onTogglePlay,
  onStepFrame,
  onScrub,
  onSpeedChange,
}: VisualStageProps) {
  const currentFrame = frames.length
    ? frames[Math.max(0, Math.min(frameIndex, frames.length - 1))]
    : null;
  const entries = useMemo(() => safeEntries(currentFrame), [currentFrame]);
  const sourceLines = code.split('\n');
  const activeLine = currentFrame?.line ?? 0;
  const activeSource = sourceLines[activeLine - 1]?.trim() ?? '';
  const isRunning = playback === 'running';
  const isPlaying = playback === 'playing';
  const isIdle = frames.length === 0;
  const statusLabel =
    playback === 'running'
      ? 'EXECUTING'
      : playback === 'playing'
        ? 'LIVE'
        : playback === 'paused'
          ? 'PAUSED'
          : playback === 'error'
            ? 'FAULT'
            : playback === 'success'
              ? 'CLEAR'
              : 'STANDBY';
  const maxFrame = Math.max(0, frames.length - 1);
  const localCount = entries.length;

  return (
    <section className={`visual-stage ${lesson.isTrial ? 'trial-stage' : ''} playback-${playback}`}>
      <div className="stage-topbar">
        <div className="stage-title">
          <span className="stage-reticle">
            <span />
          </span>
          <div>
            <span className="stage-eyebrow">
              {mode === 'sandbox' ? 'SANDBOX LAB' : `REALM ${lesson.realmId} · ${lesson.chip}`}
            </span>
            <strong>LIVE MACHINE BAY</strong>
          </div>
        </div>
        <div className="stage-status">
          <span className={`live-led ${playback}`} />
          <span>{statusLabel}</span>
          <span className="stage-divider" />
          <span>{frames.length ? `LN ${activeLine} / FRAME ${frameIndex + 1}:${frames.length}` : 'NO TRACE'}</span>
        </div>
      </div>

      <div className="stage-viewport">
        <div className="stage-grid-floor" aria-hidden="true" />
        <div className="stage-backdrop" aria-hidden="true">
          <span className="backdrop-orb orb-a" />
          <span className="backdrop-orb orb-b" />
          <span className="backdrop-grid" />
          <span className="backdrop-scan" />
        </div>

        <div className="stage-zone-label zone-top">VARIABLE BAY</div>
        <div className="stage-zone-label zone-core">MACHINE CORE</div>

        {isIdle && !isRunning ? (
              <CrystalPreview lesson={lesson} signals={signals} running={false} />
            ) : isRunning ? (
              <CrystalPreview lesson={lesson} signals={signals} running />
            ) : (
              <>
                <PrimitiveRow entries={entries} />
                <SceneRouter
                  lesson={lesson}
                  entries={entries}
                  frame={currentFrame}
                  frameIndex={frameIndex}
                  signals={signals}
                  source={code}
                />
              </>
            )}

        {isRunning ? (
          <div className="stage-boot-overlay" aria-hidden="true">
            <div className="boot-scanner">
              <span className="scanner-line" />
              <span className="scanner-ring" />
            </div>
            <span className="boot-message">PYTHON CORE · EXECUTING</span>
            <div className="boot-bar">
              <span />
            </div>
          </div>
        ) : null}

        <div className="stage-hud-left">
          <span className="hud-chip">
            <Icon name="cpu" size={12} /> {localCount} LIVE VAR{localCount === 1 ? '' : 'S'}
          </span>
          <span className="hud-chip">
            <Icon name="bolt" size={12} /> {frames.length ? `${currentFrame?.stack.length ?? 1} FRAME` : '60 FPS CSS'}
          </span>
        </div>
        <div className="stage-hud-right">
          {currentFrame?.stack.length ? (
            <span className="hud-stack">
              {currentFrame.stack.slice(0, 3).map((name, index) => (
                <span key={`${name}-${index}`}>{name}()</span>
              ))}
              {currentFrame.stack.length > 3 ? <span>+{currentFrame.stack.length - 3}</span> : null}
            </span>
          ) : null}
        </div>

        {activeSource ? (
          <div className="stage-source-caption">
            <span className="caption-line">L{activeLine}</span>
            <code>{activeSource}</code>
            <span className="caption-cursor">█</span>
          </div>
        ) : null}
      </div>

      <div className="stage-transport">
        <button
          type="button"
          className="transport-button primary"
          onClick={onTogglePlay}
          disabled={frames.length === 0 || playback === 'running'}
          aria-label={isPlaying ? 'Pause trace' : 'Play trace'}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={14} />
        </button>
        <button
          type="button"
          className="transport-button"
          onClick={onStepFrame}
          disabled={frames.length === 0 || playback === 'running'}
          aria-label="Step one trace frame"
        >
          <Icon name="step" size={14} />
        </button>
        <div className="transport-scrub">
          <input
            type="range"
            min={0}
            max={maxFrame}
            value={Math.min(frameIndex, maxFrame)}
            onChange={(event) => onScrub(Number(event.target.value))}
            disabled={frames.length === 0 || playback === 'running'}
            aria-label="Trace frame scrubber"
          />
          <span className="scrub-fill" style={{ width: `${maxFrame === 0 ? 0 : (Math.min(frameIndex, maxFrame) / maxFrame) * 100}%` }} />
        </div>
        <span className="transport-frame">
          {frames.length ? `${String(Math.min(frameIndex + 1, frames.length)).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}` : '00 / 00'}
        </span>
        <button
          type="button"
          className="transport-speed"
          onClick={() => onSpeedChange(speed >= 2 ? 0.5 : speed >= 1 ? 1.5 : speed >= 0.5 ? 2 : 1)}
          aria-label="Change playback speed"
        >
          {speed}×
        </button>
      </div>
    </section>
  );
}
