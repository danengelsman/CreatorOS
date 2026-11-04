import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore, selectBrand, isWorkspaceTokenCurrent } from '@/store/workspaceStore';
import StudioCanvas from '@/components/studio/StudioCanvas';
import UnavailableDraftRecovery from '@/components/studio/UnavailableDraftRecovery';
import LegacyDraftWarning from '@/components/studio/LegacyDraftWarning';

export const Route = createFileRoute('/_auth/studio/$projectId')({
  component: StudioProject,
});

type ProjectResult = {
  scope: string;
  kind: 'loading' | 'missing' | 'error' | 'ready';
  project?: any;
};

function StudioProject() {
  const { projectId } = Route.useParams();
  const { inspector } = Route.useSearch();
  const { user, workspaceToken } = useAuth();
  const candidateToken = workspaceToken?.uid === user?.uid ? workspaceToken : null;
  const current = useWorkspaceStore((state) => isWorkspaceTokenCurrent(state, candidateToken));
  const token = current ? candidateToken : null;
  const brand = useWorkspaceStore((state) => selectBrand(state, token));
  const navigate = useNavigate();
  const scope = JSON.stringify([user?.uid, token?.generation, projectId]);
  const accessRef = useRef({ scope, writable: false });
  if (accessRef.current.scope !== scope) accessRef.current = { scope, writable: false };
  const access = accessRef.current;
  const [result, setResult] = useState<ProjectResult>({ scope, kind: 'loading' });

  useEffect(() => {
    setResult({ scope, kind: 'loading' });
    if (!user?.uid || !token || !projectId || projectId.includes('/')) {
      setResult({ scope, kind: 'missing' });
      return;
    }
    let active = true;
    let unavailable = false;
    const isCurrent = () => active && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token);
    const fail = (kind: 'missing' | 'error') => {
      unavailable = true;
      access.writable = false;
      setResult((previous) => ({
        scope,
        kind,
        project: previous.scope === scope ? previous.project : undefined,
      }));
    };
    const unsubscribe = onSnapshot(
      doc(db, 'projects', projectId),
      (snapshot) => {
        if (!isCurrent() || unavailable) return;
        if (!snapshot.exists()) {
          fail('missing');
          return;
        }
        const project: Record<string, any> = { ...snapshot.data(), id: snapshot.id };
        if (project.userId !== user.uid || project.type !== 'content') {
          fail('missing');
          return;
        }
        access.writable = true;
        setResult({ scope, kind: 'ready', project });
      },
      (error) => {
        if (!isCurrent() || unavailable) return;
        console.error('Project could not be loaded:', error);
        fail('error');
      },
    );
    return () => {
      active = false;
      access.writable = false;
      unsubscribe();
    };
  }, [scope, projectId, user?.uid, token?.uid, token?.generation]);

  if (result.scope !== scope || result.kind === 'loading')
    return <p role="status">Loading project…</p>;
  if (!result.project) {
    return (
      <div className="space-y-4 py-8">
        <h1 className="text-2xl font-semibold">
          {result.kind === 'missing' ? 'Project not found' : 'Unable to load project'}
        </h1>
        <p className="text-[var(--label-secondary)]">
          {result.kind === 'missing'
            ? 'This project may no longer exist or may not be available to this account.'
            : 'Check your connection and try again.'}
        </p>
        {token && user?.uid && projectId && !projectId.includes('/') && (
          <>
            <LegacyDraftWarning userId={user.uid} projectId={projectId} />
            <UnavailableDraftRecovery key={scope} userId={user.uid} projectId={projectId} />
          </>
        )}
        <Link to="/studio" className="text-[var(--accent)] underline">
          Back to Studio
        </Link>
      </div>
    );
  }
  return (
    <StudioCanvas
      key={scope}
      user={user}
      project={result.project}
      brand={brand}
      isCurrentOwner={() => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)}
      canWriteProject={() =>
        access.writable && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)
      }
      unavailable={result.kind === 'missing' || result.kind === 'error' ? result.kind : undefined}
      initialInspector={inspector}
      onBack={() => navigate({ to: '/studio' })}
    />
  );
}
