import { useRef, useState } from 'react';
import {
  completedCount,
  downloadSave,
  exportSave,
  importSave,
  totalStars,
  type SaveData,
} from '../storage/save';
import { Icon } from './Icons';
import { ModalShell } from './ModalShell';

interface SaveModalProps {
  save: SaveData;
  onClose: () => void;
  onImport: (data: SaveData) => void;
  onReset: () => void;
}

export function SaveModal({ save, onClose, onImport, onReset }: SaveModalProps) {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const exportCode = exportSave(save);
  const stars = totalStars(save);
  const completed = completedCount(save);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setImportError('Clipboard blocked. Select the code and copy it manually.');
    }
  };

  const handleImport = () => {
    setImportError('');
    setImportSuccess('');
    try {
      const next = importSave(importText);
      onImport(next);
      setImportSuccess('Save loaded. Your odyssey continues exactly where you left it.');
      setImportText('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'That save code could not be read.');
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError('');
    setImportSuccess('');
    try {
      const text = await file.text();
      setImportText(text);
      const next = importSave(text);
      onImport(next);
      setImportSuccess(`Imported ${file.name}. Welcome back, traveler.`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'That file is not a PyOdyssey save.');
    }
  };

  const handleReset = () => {
    if (resetInput === 'RESET') {
      onReset();
    }
  };

  return (
    <ModalShell
      eyebrow={`Local archive · Version ${save.version}`}
      title="Save terminal"
      subtitle="Your progress lives in this browser. Carry it anywhere with a save code."
      onClose={onClose}
      className="save-modal"
    >
      <div className="save-summary">
        <div className="save-stat">
          <span className="save-stat-icon cyan"><Icon name="trophy" size={19} /></span>
          <span><strong>{completed}</strong><small>Nodes cleared</small></span>
        </div>
        <div className="save-stat">
          <span className="save-stat-icon yellow"><Icon name="star" size={19} filled /></span>
          <span><strong>{stars}</strong><small>Stars earned</small></span>
        </div>
        <div className="save-stat">
          <span className="save-stat-icon pink"><Icon name="bolt" size={19} /></span>
          <span><strong>{save.xp.toLocaleString()}</strong><small>Total XP</small></span>
        </div>
        <div className="save-stat">
          <span className="save-stat-icon green"><Icon name="flame" size={19} /></span>
          <span><strong>{save.streak}</strong><small>Day streak</small></span>
        </div>
        <div className="save-status">
          <span className="save-led" />
          <div>
            <strong>Auto-save on</strong>
            <small>Every click is persisted locally.</small>
          </div>
        </div>
      </div>

      {completed === 0 ? (
        <div className="save-firstrun-hint">
          <Icon name="info" size={15} />
          <span>Moving from another browser or device? Use Import save.</span>
        </div>
      ) : null}

      <div className="save-columns">
        <section className="save-card export-card">
          <div className="save-card-head">
            <span className="save-card-icon"><Icon name="download" size={18} /></span>
            <div>
              <h3>Export save code</h3>
              <p>Copy this string into a safe place, or download a file.</p>
            </div>
          </div>
          <textarea className="save-code" readOnly value={exportCode} aria-label="Export save code" />
          <div className="save-actions">
            <button type="button" className="save-primary" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={14} />
              {copied ? 'Copied!' : 'Copy code'}
            </button>
            <button type="button" className="save-secondary" onClick={() => downloadSave(save)}>
              <Icon name="download" size={14} /> Download .txt
            </button>
          </div>
        </section>

        <section className="save-card import-card">
          <div className="save-card-head">
            <span className="save-card-icon"><Icon name="upload" size={18} /></span>
            <div>
              <h3>Import save</h3>
              <p>Paste a save code or load a downloaded file. It replaces this browser save.</p>
            </div>
          </div>
          <textarea
            className="save-code import-code"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="Paste PYODYSSEY-4:... here"
            aria-label="Import save code"
          />
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            hidden
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <div className="save-actions">
            <button type="button" className="save-primary" onClick={handleImport} disabled={!importText.trim()}>
              <Icon name="upload" size={14} /> Load save
            </button>
            <button type="button" className="save-secondary" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={14} /> Choose file
            </button>
          </div>
          {importError ? <p className="save-error"><Icon name="bug" size={13} /> {importError}</p> : null}
          {importSuccess ? <p className="save-success"><Icon name="check" size={13} /> {importSuccess}</p> : null}
        </section>
      </div>

      <div className="save-danger">
        <div>
          <span className="danger-kicker"><Icon name="skull" size={13} /> Danger zone</span>
          <p>Wipe the local save and start the odyssey from Realm 1. This cannot be undone.</p>
        </div>
        {confirmReset ? (
          <div className="danger-confirm">
            <p className="danger-confirm-label">Type <strong>RESET</strong> to confirm:</p>
            <input
              type="text"
              className="danger-confirm-input"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="RESET"
              autoFocus
            />
            <div className="danger-confirm-actions">
              <button type="button" className="danger-cancel" onClick={() => { setConfirmReset(false); setResetInput(''); }}>Cancel</button>
              <button
                type="button"
                className="danger-confirm-button"
                onClick={handleReset}
                disabled={resetInput !== 'RESET'}
              >
                Wipe save
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="danger-button" onClick={() => setConfirmReset(true)}>
            <Icon name="reset" size={14} /> Reset save
          </button>
        )}
      </div>
    </ModalShell>
  );
}
