import React, { useEffect, useRef, useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { Plus, ArrowRight } from '@phosphor-icons/react';
import { db } from '../../firebase';
import ContentIdeaGenerator from '../ContentIdeaGenerator';
import ViralTemplatesLibrary from '../ViralTemplatesLibrary';
import { contentProjects, getPipelineColumn, isScheduleManaged, makeProjectDraft, type PipelineColumn, type StarterKind, type StudioStage } from './studioHubHelpers';
import { createProjectIfAbsent, updateStudioStage } from './studioHubPersistence';
import { clearPending, readPending, writePending, type PendingCreate } from './studioHubRecovery';
import type { selectSelectedIdeaReceipt } from '../../store/ownedWorkspaceStore';

type IdeaReceipt = NonNullable<ReturnType<typeof selectSelectedIdeaReceipt>>;
// Receipt objects are capabilities, not serializable identities. Keep them only
// for this page lifetime and associate them with the durable operation ID.
const handoffs = new Map<string, { operationId: string; seed: any; receipt: IdeaReceipt }>();

type Props = {
  user: any;
  brand: any;
  projects: any[];
  isProjectsLoading: boolean;
  projectsLoadError: boolean;
  onOpenProject: (id: string) => void;
  selectedIdea?: any;
  selectedIdeaReceipt?: IdeaReceipt | null;
  onClearSelectedIdea?: (seed: any, receipt: IdeaReceipt) => void;
  isCurrentOwner?: () => boolean;
};

const columns: { id: PipelineColumn; title: string; empty: string }[] = [
  { id: 'ideation', title: 'In Ideation', empty: 'Your ideas and drafts will appear here.' },
  { id: 'production', title: 'In Production', empty: 'Projects in progress, scheduled content, and ready projects appear here.' },
  { id: 'published', title: 'Published', empty: 'Published content appears here.' },
];
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2';
const button = `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${focus}`;

export default function StudioHub(props: Props) {
  const uid = props.user?.uid || null;
  // These inputs are not tagged with an owner. Quarantine references seen at
  // an account boundary until the parent supplies new values.
  const boundary = useRef({ uid, generation: 0, idea: props.selectedIdea, brand: props.brand, blockedIdeas: new Set<any>(), blockedBrands: new Set<any>() });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const state = boundary.current;
  if (state.uid !== uid) {
    if (state.idea) state.blockedIdeas.add(state.idea);
    if (state.brand) state.blockedBrands.add(state.brand);
    state.uid = uid;
    state.generation++;
  }
  state.idea = props.selectedIdea;
  state.brand = props.brand;
  if (!uid) return null;
  const generation = state.generation;
  return <StudioHubContent
    key={uid}
    {...props}
    projects={props.projects.filter((project) => project?.userId === uid)}
    selectedIdea={state.blockedIdeas.has(props.selectedIdea) ? null : props.selectedIdea}
    brand={state.blockedBrands.has(props.brand) ? null : props.brand}
    isCurrentOwner={() => mounted.current && boundary.current.generation === generation && (props.isCurrentOwner?.() ?? true)}
    onOpenProject={(id) => { if (mounted.current && boundary.current.generation === generation) props.onOpenProject(id); }}
    onClearSelectedIdea={(seed, receipt) => { if (mounted.current && boundary.current.generation === generation) props.onClearSelectedIdea?.(seed, receipt); }}
  />;
}

export function StudioHubContent({ user, brand, projects, isProjectsLoading, projectsLoadError, onOpenProject, selectedIdea, selectedIdeaReceipt, onClearSelectedIdea, isCurrentOwner }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [mode, setMode] = useState<StarterKind>('blank');
  const [visited, setVisited] = useState<StarterKind[]>(['blank']);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [recovery] = useState(() => {
    try { return { pending: readPending(user.uid), error: false }; }
    catch { return { pending: null, error: true }; }
  });
  const [pending, setPending] = useState<PendingCreate | null>(recovery.pending);
  const [storageBlocked, setStorageBlocked] = useState(recovery.error);

  const [savedId, setSavedId] = useState<string | null>(null);
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const createLock = useRef(false);
  const openedSaved = useRef(false);
  const statusLocks = useRef(new Set<string>());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);


  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (showNew && !dialog.open) dialog.showModal();
    if (!showNew && dialog.open) {
      dialog.close();
      newButtonRef.current?.focus();
    }
  }, [showNew]);

  const openNew = () => {
    if (savedId && openedSaved.current) {
      setMode('blank'); setCreateError(''); setSavedId(null);
      setVisited(['blank']); openedSaved.current = false;
    }
    setShowNew(true);
  };

  const closeNew = () => {
    if (createLock.current) return;
    setShowNew(false);
  };


  const createProject = async (seed: any = {}, kind: StarterKind = 'blank', handoff = false) => {
    if (createLock.current || savedId || storageBlocked || !(isCurrentOwner?.() ?? true)) return;
    if (!user?.uid) { setCreateError('Please sign in before creating a project.'); return; }
    if (pending && pending.owner !== user.uid) { setCreateError('Sign in to the original account to retry this project.'); return; }
    createLock.current = true;
    setSaving(true);
    setCreateError('');
    let operation: PendingCreate;
    try {
      // Re-read before generating an ID: a remounted instance may have a recovery record.
      const existing = readPending(user.uid);
      if (existing) {
        operation = existing;
      } else {
        const draft = makeProjectDraft(user.uid, seed, kind);
        const ref = doc(collection(db, 'projects'));
        operation = { version: 1, owner: user.uid, id: ref.id, operationId: crypto.randomUUID(), draft, kind };
        writePending(operation); // Must be durable and verified before any transaction starts.
        if (handoff && selectedIdeaReceipt) handoffs.set(operation.owner, { operationId: operation.operationId, seed, receipt: selectedIdeaReceipt });
        else handoffs.delete(operation.owner);
      }
      setPending(operation);
    } catch (error) {
      if (error instanceof Error && /not supported/i.test(error.message)) setCreateError(error.message);
      else {
        setStorageBlocked(true);
        setCreateError('Browser session storage is unavailable or its recovery record cannot be verified. Enable storage, then reload; no new save was dispatched.');
      }
      createLock.current = false;
      setSaving(false);
      return;
    }
    try {
      if (!(isCurrentOwner?.() ?? true)) return;
      await createProjectIfAbsent(db, doc(db, 'projects', operation.id), operation.draft, operation.operationId, isCurrentOwner);
      if (!(isCurrentOwner?.() ?? true)) return;
      setSavedId(operation.id);
      try { clearPending(operation); setPending(null); }
      catch { setStorageBlocked(true); setCreateError('Project saved, but its recovery record could not be cleared. Enable browser storage before creating another project.'); }
      const handoff = handoffs.get(operation.owner);
      if (handoff?.operationId === operation.operationId) {
        handoffs.delete(operation.owner);
        try { onClearSelectedIdea?.(handoff.seed, handoff.receipt); }
        catch (error) { console.error('Project saved but selected idea could not be cleared:', error); }
      }
      try {
        onOpenProject(operation.id);
        openedSaved.current = true;
        setShowNew(false);
      } catch (error) {
        console.error('Could not open saved project:', error);
        setCreateError('Your project was saved, but could not be opened. Use Open saved project to try again.');
      }
    } catch (error) {
      if (!(isCurrentOwner?.() ?? true)) return;
      console.error('Could not create project:', error);
      setCreateError('Your project could not be confirmed. Retry the same project; the previous save may still finish.');
    } finally {
      createLock.current = false;
      if (isCurrentOwner?.() ?? true) setSaving(false);
    }
  };

  const abandonPending = () => {
    if (!pending || !(isCurrentOwner?.() ?? true)) return;
    if (!window.confirm('The previous save may still finish. Starting over may create a duplicate project. Abandon this recovery and start over?')) return;
    try { clearPending(pending); setPending(null); setCreateError(''); if (handoffs.get(pending.owner)?.operationId === pending.operationId) handoffs.delete(pending.owner); }
    catch { setStorageBlocked(true); setCreateError('Browser storage is unavailable. Enable it and reload to recover this project.'); }
  };

  const changeStatus = async (project: any, stage: StudioStage) => {
    if (statusLocks.current.has(project.id) || !user?.uid || project.userId !== user.uid) return;
    statusLocks.current.add(project.id);
    setUpdating((current) => ({ ...current, [project.id]: true }));
    setStatusErrors((current) => ({ ...current, [project.id]: '' }));
    try {
      await updateStudioStage(db, doc(db, 'projects', project.id), user.uid, stage, isCurrentOwner);
    } catch (error) {
      if (!(isCurrentOwner?.() ?? true)) return;
      console.error('Could not update project status:', error);
      setStatusErrors((current) => ({ ...current, [project.id]: error instanceof Error && !('code' in error) ? error.message : 'Stage could not be saved. Check your connection and try again.' }));
    } finally {
      statusLocks.current.delete(project.id);
      if (isCurrentOwner?.() ?? true) setUpdating((current) => ({ ...current, [project.id]: false }));
    }
  };

  const visibleProjects = contentProjects(projects);
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 text-[var(--label-primary)] sm:px-6" aria-labelledby="studio-hub-title">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Your workspace</p>
          <h1 id="studio-hub-title" className="mt-2 font-serif text-3xl font-semibold">Studio</h1>
          <p className="mt-2 text-sm text-[var(--label-secondary)]">Move your content from first idea to published work.</p>
        </div>
        <button ref={newButtonRef} type="button" className={`${button} inline-flex items-center gap-2 bg-[var(--accent)] text-white`} onClick={openNew}>
          <Plus size={18} /> New project
        </button>
      </header>
      {selectedIdea && <div className="mb-5 rounded-2xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-4"><p className="text-sm font-semibold">Idea ready: {typeof selectedIdea.title === 'string' ? selectedIdea.title : 'Selected idea'}</p><button type="button" onClick={openNew} className={`${button} mt-3 border border-[var(--separator)]`}>Use this idea</button></div>}
      {isProjectsLoading ? <p role="status" className="py-8 text-sm text-[var(--label-secondary)]">Loading your projects...</p> : projectsLoadError ? <p role="alert" className="rounded-2xl border border-red-500/30 p-5 text-sm text-red-500">Projects could not be loaded. Please refresh and try again.</p> : (
        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => {
            const items = visibleProjects.filter((project) => getPipelineColumn(project) === column.id);
            return <section key={column.id} aria-labelledby={`pipeline-${column.id}`} className="min-w-0 rounded-2xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-4 flex items-center justify-between gap-2"><h2 id={`pipeline-${column.id}`} className="font-semibold">{column.title}</h2><span aria-label={`${items.length} projects`} className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs text-[var(--label-secondary)]">{items.length}</span></div>
              {items.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--separator)] p-4 text-sm leading-6 text-[var(--label-secondary)]">{column.empty}</p> : <ul className="space-y-3">{items.map((project) => (
                <li key={project.id} className="rounded-xl border border-[var(--separator)] bg-[var(--bg-primary)] p-4">
                  <button type="button" onClick={() => onOpenProject(project.id)} className={`flex w-full items-start justify-between gap-3 rounded-md text-left font-semibold hover:text-[var(--accent)] ${focus}`}><span className="break-words">{project.name || project.data?.title || 'Untitled Content'}</span><ArrowRight size={18} className="shrink-0" /></button>
                  <p className="mt-2 text-xs text-[var(--label-secondary)]">Status: {typeof project.status === 'string' && project.status.trim() ? project.status : 'Draft'}</p>
                  {project.studioStage === 'complete' && <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--label-secondary)]">Ready</span>}
                  {column.id === 'published' ? <p className="mt-3 text-xs text-[var(--label-secondary)]">Publication status is managed outside the Studio workflow.</p> : isScheduleManaged(project) ? <p className="mt-3 text-xs text-[var(--label-secondary)]">This project is scheduled or has auto-publish enabled. Manage it in Calendar before changing its stage here.</p> : <div className="mt-3 flex flex-wrap gap-2" aria-label={`Change stage for ${project.name || 'Untitled Content'}`}>
                    {project.studioStage !== 'ideation' && <button type="button" disabled={updating[project.id]} onClick={() => void changeStatus(project, 'ideation')} className={`${button} border border-[var(--separator)] disabled:opacity-50`}>Move to ideation</button>}
                    {project.studioStage !== 'production' && <button type="button" disabled={updating[project.id]} onClick={() => void changeStatus(project, 'production')} className={`${button} border border-[var(--separator)] disabled:opacity-50`}>Move to production</button>}
                    {project.studioStage !== 'complete' && <button type="button" disabled={updating[project.id]} onClick={() => void changeStatus(project, 'complete')} className={`${button} border border-[var(--separator)] disabled:opacity-50`}>Mark ready</button>}
                  </div>}
                  {updating[project.id] && <p role="status" className="mt-2 text-xs">Saving stage...</p>}
                  {statusErrors[project.id] && <p role="alert" className="mt-2 text-xs text-red-500">{statusErrors[project.id]}</p>}
                </li>
              ))}</ul>}
            </section>;
          })}
        </div>
      )}
      <p className="mt-5 text-xs text-[var(--label-secondary)]">Studio stages organize work only; marking a project ready does not publish content or change its publication status.</p>
      <dialog ref={dialogRef} aria-labelledby="new-project-title" onCancel={(event) => { event.preventDefault(); closeNew(); }} className="m-auto max-h-[90vh] w-[min(95vw,72rem)] overflow-y-auto rounded-3xl border border-[var(--separator)] bg-[var(--bg-primary)] text-[var(--label-primary)] shadow-2xl backdrop:bg-black/70">
        <div className="p-5 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4"><div><h2 id="new-project-title" className="font-serif text-2xl font-semibold">Start a project</h2><p className="mt-2 text-sm text-[var(--label-secondary)]">Choose a starting point. Your project is saved before it opens.</p></div><button autoFocus type="button" disabled={saving} onClick={closeNew} className={`${button} border border-[var(--separator)] disabled:opacity-50`}>Close</button></div>
          <div role="group" aria-label="Project starting point" className="mb-6 flex flex-wrap gap-2">{([['blank', 'Blank'], ['idea', 'AI ideas'], ['template', 'Templates']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} disabled={saving || !!savedId || !!pending || storageBlocked} onClick={() => { setMode(id); setVisited((current) => current.includes(id) ? current : [...current, id]); }} className={`${button} border border-[var(--separator)] disabled:opacity-50 ${mode === id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)]'}`}>{label}</button>)}</div>
          {createError && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-500">{createError}</p>}
          {storageBlocked && !createError && <p role="alert" className="mb-4 text-sm text-red-500">Browser session storage is unavailable or the recovery record is invalid. Enable storage and reload; do not clear it if you need to recover your project.</p>}
          {saving && <p role="status" className="mb-4 text-sm">Saving your project...</p>}
          {savedId ? <button type="button" onClick={() => {
            try { onOpenProject(savedId); openedSaved.current = true; setShowNew(false); }
            catch (error) { console.error('Could not open saved project:', error); setCreateError('Your project was saved, but could not be opened. Use Open saved project to try again.'); }
          }} className={`${button} bg-[var(--accent)] text-white`}>Open saved project</button> : <>
            {pending && <div className="mb-4 flex flex-wrap items-center gap-3"><p className="text-sm">A previous project save is unresolved. Retry the original project before creating another.</p><button type="button" disabled={saving || storageBlocked} onClick={() => void createProject()} className={`${button} border border-[var(--separator)] disabled:opacity-50`}>Retry saving selected project</button><button type="button" disabled={saving || storageBlocked} onClick={abandonPending} className={`${button} border border-[var(--separator)] disabled:opacity-50`}>Start over</button><p className="text-xs text-[var(--label-secondary)]">Starting over can create a duplicate if the previous save finishes. Recovery lasts for this browser tab.</p></div>}
            <div inert={saving || !!pending || storageBlocked}>
              {selectedIdea && <div className="mb-5 rounded-2xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-6"><h3 className="font-semibold">Selected idea: {typeof selectedIdea.title === 'string' ? selectedIdea.title : 'Untitled idea'}</h3>{typeof selectedIdea.hook === 'string' && <p className="mt-2 text-sm text-[var(--label-secondary)]">{selectedIdea.hook}</p>}{typeof selectedIdea.description === 'string' && <p className="mt-2 text-sm text-[var(--label-secondary)]">{selectedIdea.description}</p>}<button type="button" onClick={() => void createProject(selectedIdea, 'idea', true)} className={`${button} mt-4 bg-[var(--accent)] text-white`}>Create from selected idea</button></div>}
              <div hidden={mode !== 'blank'}><div className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-6"><h3 className="font-semibold">Start from scratch</h3><p className="mt-2 text-sm text-[var(--label-secondary)]">Create an empty draft and make it your own.</p><button type="button" onClick={() => void createProject()} className={`${button} mt-5 bg-[var(--accent)] text-white`}>Create blank project</button></div></div>
              {visited.includes('idea') && <div hidden={mode !== 'idea'}><ContentIdeaGenerator brand={brand} isCurrentOwner={isCurrentOwner} onSelectIdea={(idea) => void createProject(idea, 'idea')} /></div>}
              {visited.includes('template') && <div hidden={mode !== 'template'}><ViralTemplatesLibrary brand={brand} owner={{ uid: user?.uid || '', isCurrent: () => !!user?.uid && (isCurrentOwner?.() ?? false) }} onSelectTemplate={(template) => void createProject(template, 'template')} /></div>}
            </div>
          </>}
        </div>
      </dialog>
    </section>
  );
}
