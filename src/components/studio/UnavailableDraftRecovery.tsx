import { useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { readRecoveryDraft } from './studioMemoryRecovery';

// This is local recovery only, not a representation of a readable remote project.
export default function UnavailableDraftRecovery({ userId, projectId }: { userId: string; projectId: string }) {
  const [recovery] = useState(() => readRecoveryDraft(userId, projectId));
  const draft = recovery?.draft;
  const [copyStatus, setCopyStatus] = useState('');
  useBlocker({
    shouldBlockFn: () => !!draft && !window.confirm('You have a recovered local draft. Copy it before leaving. Leave this project?'),
    enableBeforeUnload: () => !!draft,
  });
  if (!draft) return null;
  const text = `Title: ${draft.title}\nPlatform: ${draft.platform}\n\n${draft.body}`;
  return <section aria-label="Local draft recovery" className="space-y-3">
    <h2 className="text-xl font-semibold">Local draft recovery</h2>
    <p>This draft was kept in this browser tab. The project cannot be saved here. Copy it before leaving.</p>
    {recovery?.memoryOnly && <p role="alert">Browser storage was unavailable. This draft is only in memory and will be lost on reload or closing this tab.</p>}
    <textarea aria-label="Recovered draft" readOnly value={text} rows={10} className="w-full" />
    <button type="button" className="ios-button ios-button-tinted" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setCopyStatus('Draft copied.'); }
      catch { setCopyStatus('Copy unavailable. Select and copy the recovered draft above.'); }
    }}>Copy recovered draft</button>
    <p role="status">{copyStatus}</p>
  </section>;
}
