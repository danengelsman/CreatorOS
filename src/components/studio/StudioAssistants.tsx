import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Sparkle, VideoCamera, X } from '@phosphor-icons/react';
import VideoAnalyzer from '../VideoAnalyzer';
import PerfectPromptCopilot from '../PerfectPromptCopilot';
import './StudioAssistants.css';

type Assistant = 'analyzer' | 'copilot';

type StudioAssistantsProps = {
  user: any;
  /** Opens the selected assistant on the initial mount, e.g. for a legacy deep link. */
  initialAssistant?: Assistant;
};

/** Mount once in a Studio screen, placing the inline trigger group in its header. */
export default function StudioAssistants({ user, initialAssistant }: StudioAssistantsProps) {
  const [active, setActive] = useState<Assistant | null>(initialAssistant ?? null);
  const [visited, setVisited] = useState<Assistant[]>(initialAssistant ? [initialAssistant] : []);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const hintId = useId();

  function select(assistant: Assistant) {
    if (!dialogRef.current?.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    setVisited((previous) => previous.includes(assistant) ? previous : [...previous, assistant]);
    setActive(assistant);
  }

  // These unmodified keys only work while an assistant button itself has focus.
  // They never intercept typing, browser shortcuts, or keys elsewhere in Studio.
  function onAssistantKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
        !(event.target instanceof HTMLButtonElement)) return;
    const assistant = event.key.toLowerCase() === 'v' ? 'analyzer' : event.key.toLowerCase() === 'p' ? 'copilot' : null;
    if (assistant) {
      event.preventDefault();
      select(assistant);
    }
  }

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !active || dialog.open) return;
    if (!returnFocusRef.current && document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = document.activeElement;
    }
    dialog.showModal();
    closeRef.current?.focus();
  }, [active]);

  function onClose() {
    setActive(null);
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected) target.focus();
  }

  return (
    <>
      <div className="inline-flex flex-wrap items-center gap-2" role="group" aria-label="Studio assistant shortcuts" onKeyDown={onAssistantKeyDown}>
        <button type="button" aria-haspopup="dialog" aria-keyshortcuts="V" aria-describedby={hintId} onClick={() => select('analyzer')}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--separator)] px-3 py-2 text-sm font-semibold text-[var(--label-primary)] hover:bg-[var(--bg-tertiary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
          <VideoCamera size={18} aria-hidden="true" /> Video Analyzer
        </button>
        <button type="button" aria-haspopup="dialog" aria-keyshortcuts="P" aria-describedby={hintId} onClick={() => select('copilot')}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--separator)] px-3 py-2 text-sm font-semibold text-[var(--label-primary)] hover:bg-[var(--bg-tertiary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
          <Sparkle size={18} aria-hidden="true" /> Co-Pilot
        </button>
      </div>
      <span id={hintId} className="sr-only">When an assistant button is focused, press V for Video Analyzer or P for Co-Pilot.</span>

      <dialog ref={dialogRef} aria-labelledby={titleId} onClose={onClose}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            dialogRef.current?.close();
          }
        }}
        className="studio-assistants-drawer fixed inset-y-0 right-0 left-auto m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 bg-[var(--bg-primary)] p-0 text-[var(--label-primary)] shadow-2xl backdrop:bg-black/60 sm:w-[min(48rem,100vw)] open:flex open:flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--separator)] px-4 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">Studio assistants</h2>
            <p className="text-xs text-[var(--label-secondary)]">Focus an assistant button, then press V or P. Press Esc to close.</p>
          </div>
          <button ref={closeRef} type="button" aria-label="Close assistants" onClick={() => dialogRef.current?.close()}
            className="rounded-full p-2 text-[var(--label-secondary)] hover:bg-[var(--bg-tertiary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex shrink-0 gap-2 border-b border-[var(--separator)] px-4 py-3 sm:px-6" onKeyDown={onAssistantKeyDown}>
          {(['analyzer', 'copilot'] as const).map((assistant) => (
            <button key={assistant} type="button" aria-pressed={active === assistant} aria-keyshortcuts={assistant === 'analyzer' ? 'V' : 'P'}
              onClick={() => select(assistant)}
              className={`rounded-full px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${active === assistant ? 'bg-[var(--accent)] text-black' : 'text-[var(--label-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              {assistant === 'analyzer' ? 'Video Analyzer' : 'Perfect Prompt'}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6">
          {visited.includes('analyzer') && <div hidden={active !== 'analyzer'}><VideoAnalyzer /></div>}
          {visited.includes('copilot') && <div hidden={active !== 'copilot'}><PerfectPromptCopilot user={user} /></div>}
        </div>
      </dialog>
    </>
  );
}
