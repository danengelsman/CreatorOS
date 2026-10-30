import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore, selectBrand, isWorkspaceTokenCurrent } from '@/store/workspaceStore';
import StudioCanvas from '@/components/studio/StudioCanvas';

export const Route = createFileRoute('/_auth/studio/$projectId')({
  component: StudioProject,
});

type ProjectResult =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error' }
  | { kind: 'ready'; project: any; generation: number };

function StudioProject() {
  const { projectId } = Route.useParams();
  const { inspector } = Route.useSearch();
  const { user, workspaceToken } = useAuth();
  const token = workspaceToken?.uid === user?.uid ? workspaceToken : null;
  const brand = useWorkspaceStore((state) => selectBrand(state, token));
  const navigate = useNavigate();
  const [result, setResult] = useState<ProjectResult>({ kind: 'loading' });

  useEffect(() => {
    setResult({ kind: 'loading' });
    if (!user?.uid || !token || !projectId || projectId.includes('/')) {
      setResult({ kind: 'missing' });
      return;
    }
    let active = true;
    const isCurrent = () => active && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token);
    const unsubscribe = onSnapshot(
      doc(db, 'projects', projectId),
      (snapshot) => {
        if (!isCurrent()) return;
        if (!snapshot.exists()) {
          setResult({ kind: 'missing' });
          return;
        }
        const project: Record<string, any> = { ...snapshot.data(), id: snapshot.id };
        if (project.userId !== user.uid || project.type !== 'content') {
          setResult({ kind: 'missing' });
          return;
        }
        setResult({ kind: 'ready', project, generation: token.generation });
      },
      (error) => {
        if (!isCurrent()) return;
        console.error('Project could not be loaded:', error);
        setResult({ kind: 'error' });
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [projectId, user?.uid, token?.uid, token?.generation]);

  if (
    result.kind === 'loading' ||
    (result.kind === 'ready' && (result.project.id !== projectId || result.project.userId !== user?.uid || result.generation !== token?.generation))
  )
    return <p role="status">Loading project…</p>;
  if (result.kind !== 'ready') {
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
        <Link to="/studio" className="text-[var(--accent)] underline">Back to Studio</Link>
      </div>
    );
  }
  return (
    <StudioCanvas
      key={`${token?.generation}:${projectId}`}
      user={user}
      project={result.project}
      brand={brand}
      isCurrentOwner={() => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)}
      initialInspector={inspector}
      onBack={() => navigate({ to: '/studio' })}
    />
  );
}
