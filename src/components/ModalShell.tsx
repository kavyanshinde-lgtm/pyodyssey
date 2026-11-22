import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icons';

interface ModalShellProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}

export function ModalShell({
  eyebrow,
  title,
  subtitle,
  onClose,
  children,
  className = '',
  headerExtra,
}: ModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog?.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog?.removeEventListener('keydown', handleKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        className={`modal-shell ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <span className="modal-corner corner-tl" />
        <span className="modal-corner corner-tr" />
        <span className="modal-corner corner-bl" />
        <span className="modal-corner corner-br" />
        <header className="modal-header">
          <div>
            <span className="modal-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="modal-header-actions">
            {headerExtra}
          <button type="button" className="modal-close" data-testid="modal-close-button" onClick={onClose} aria-label="Close">
              <Icon name="close" size={20} />
            </button>
          </div>
        </header>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}
