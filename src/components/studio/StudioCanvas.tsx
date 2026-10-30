import React, { useCallback, useRef } from 'react';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import ContentStudio from '../ContentStudio';

export interface StudioCanvasProps {
  user: any;
  brand: any;
  project: any;
  onBack: () => void;
  initialInspector?: 'retention' | 'planner' | 'repurpose';
  isCurrentOwner?: () => boolean;
}

// The route resolves projects; remount only when the owner or project changes.
export default function StudioCanvas({ user, brand, project, onBack, initialInspector, isCurrentOwner }: StudioCanvasProps) {
  const state = useRef({ dirty: false, saving: false, storageError: false });
  const bypass = useRef(false);
  const navigate = useNavigate();
  const key = `${user?.uid || ''}:${project?.id || ''}`;
  const shouldBlock = useCallback(() => {
    if (bypass.current) { bypass.current = false; return false; }
    if (state.current.saving) {
      window.alert('Please wait for the project save to finish before leaving.');
      return true;
    }
    if (!state.current.dirty) return false;
    const warning = state.current.storageError
      ? 'Draft recovery is unavailable. Your unsaved changes will be lost. Leave this project?'
      : 'You have unsaved changes. Leave this project?';
    return !window.confirm(warning);
  }, []);
  const beforeUnload = useCallback(() => state.current.dirty || state.current.saving, []);
  useBlocker({ shouldBlockFn: shouldBlock, enableBeforeUnload: beforeUnload });
  const leave = (action: () => void) => {
    if (shouldBlock()) return;
    bypass.current = true;
    action();
    // onBack may change local state instead of navigating through the router.
    setTimeout(() => { bypass.current = false; }, 0);
  };

  return (
    <section aria-label="Project canvas" className="space-y-4">
      <header className="flex items-center gap-4">
        <button type="button" onClick={() => leave(onBack)} className="ios-button ios-button-tinted">
          Back to projects
        </button>
        <h1 className="text-xl font-semibold text-[var(--label-primary)]">Project canvas</h1>
      </header>
      {!user?.uid || !project?.id || project.userId !== user.uid || project.type !== 'content' ? (
        <p role="alert">This content project is not available for this account.</p>
      ) : (
        <ContentStudio
          key={key}
          user={user}
          isCurrentOwner={isCurrentOwner}
          brand={brand}
          selectedProject={project}
          canvasMode
          initialInspector={initialInspector}
          onDirtyChange={(value) => { state.current = value; }}
          setActiveTab={(tab) => {
            if (tab === 'brand' || tab === 'profile') navigate({ to: `/${tab}` as any });
            else leave(onBack);
          }}
        />
      )}
    </section>
  );
}