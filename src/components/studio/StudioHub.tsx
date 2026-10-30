import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, type DocumentReference } from 'firebase/firestore';
import { Plus, ArrowRight } from '@phosphor-icons/react';
import { db } from '../../firebase';
import ContentIdeaGenerator from '../ContentIdeaGenerator';
import ViralTemplatesLibrary from '../ViralTemplatesLibrary';
import { contentProjects, getPipelineColumn, isScheduleManaged, makeProjectDraft, type PipelineColumn, type StarterKind, type StudioStage } from './studioHubHelpers';
import { createProjectIfAbsent, updateStudioStage } from './studioHubPersistence';

type Props = {
  user: any;
  brand: any;
  projects: any[];
  isProjectsLoading: boolean;
  projectsLoadError: boolean;
  onOpenProject: (id: string) => void;
  selectedIdea?: any;
  onClearSelectedIdea?: () => void;
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
    onClearSelectedIdea={() => { if (mounted.current && boundary.current.generation === generation) props.onClearSelectedIdea?.(); }}
  />;
}

export function StudioHubContent({ user, brand, projects, isProjectsLoading, projectsLoadError, onOpenProject, selectedIdea, onClearSelectedIdea, isCurrentOwner }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [mode, setMode] = useState<StarterKind>('blank');
  const [visited, setVisited] = useState<StarterKind[]>(['blank']);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [retrySeed, setRetrySeed] = useState<{ seed: any; kind: StarterKind; handoff: boolean } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const createLock = useRef(false);
  const pendingProject = useRef<DocumentReference | null>(null);
  const pendingOwner = useRef<string | null>(null);
  const openedSaved = useRef(false);
  const statusLocks = useRef(new Set<string>());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const selectedIdeaRef = useRef(selectedIdea);
  useEffect(() => { selectedIdeaRef.current = selectedIdea; }, [selectedIdea]);

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
      setMode('blank'); setCreateError(''); setRetrySeed(null); setSavedId(null);
      setVisited(['blank']); pendingProject.current = null; pendingOwner.current = null; openedSaved.current = false;
    }
    setShowNew(true);
  };

  const closeNew = () => {
    if (createLock.current) return;
    setShowNew(false);
  };


  const createProject = async (seed: any = {}, kind: StarterKind = 'blank', handoff = false) => {
    if (createLock.current || savedId) return;
    if (!user?.uid) {
      setCreateError('Please sign in before creating a project.');
      return;
    }
    if (pendingOwner.current && pendingOwner.current !== user.uid) {
      setCreateError('Sign in to the original account to retry this project, or start over.');
      return;
    }
    let draft: ReturnType<typeof makeProjectDraft>;
    try { draft = makeProjectDraft(user.uid, seed, kind); }
    catch (error) { setCreateError(error instanceof Error ? error.message : 'Unsupported template.'); return; }
    createLock.current = true;
    setSaving(true);
    setCreateError('');
    setRetrySeed({ seed, kind, handoff });
    let id: string;
    try {
      // This ID and seed survive dialog close, but not a component remount or reload.
      const ref = pendingProject.current ?? doc(collection(db, 'projects'));
      pendingProject.current = ref;
      pendingOwner.current = user.uid;
      await createProjectIfAbsent(db, ref, draft, isCurrentOwner);
      id = ref.id;
      setSavedId(id);
    } catch (error) {
      console.error('Could not create project:', error);
      setCreateError('Your project could not be saved. Check your connection and try again.');
      createLock.current = false;
      setSaving(false);
      return;
    }
    if (handoff && selectedIdeaRef.current === seed) {
      try { onClearSelectedIdea?.(); }
      catch (error) { console.error('Project saved but selected idea could not be cleared:', error); }
    }
    try {
      onOpenProject(id);
      openedSaved.current = true;
      setShowNew(false);
    } catch (error) {
      console.error('Could not open saved project:', error);
      setCreateError('Your project was saved, but could not be opened. Use Open saved project to try again.');
    } finally {
      createLock.current = false;
      setSaving(false);
    }
  };

  const changeStatus = async (project: any, stage: StudioStage) => {
    if (statusLocks.current.has(project.id) || !user?.uid || project.userId !== user.uid) return;
    statusLocks.current.add(project.id);
    setUpdating((current) => ({ ...current, [project.id]: true }));
    setStatusErrors((current) => ({ ...current, [project.id]: '' }));
    try {
      await updateStudioStage(db, doc(db, 'projects', project.id), user.uid, stage, isCurrentOwner);
    } catch (error) {
      console.error('Could not update project status:', error);
      setStatusErrors((current) => ({ ...current, [project.id]: error instanceof Error && !('code' in error) ? error.message : 'Stage could not be saved. Check your connection and try again.' }));
    } finally {
      statusLocks.current.delete(project.id);
      setUpdating((current) => ({ ...current, [project.id]: false }));
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
          <div role="group" aria-label="Project starting point" className="mb-6 flex flex-wrap gap-2">{([['blank', 'Blank'], ['idea', 'AI ideas'], ['template', 'Templates']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} disabled={saving || !!savedId || (!!retrySeed && !!createError)} onClick={() => { setMode(id); setVisited((current) => current.includes(id) ? current : [...current, id]); }} className={`${button} border border-[var(--separator)] disabled:opacity-50 ${mode === id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)]'}`}>{label}</button>)}</div>
          {createError && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-500">{createError}</p>}
          {saving && <p role="status" className="mb-4 text-sm">Saving your project...</p>}
          {savedId ? <button type="button" onClick={() => {
            try { onOpenProject(savedId); openedSaved.current = true; setShowNew(false); }
            catch (error) { console.error('Could not open saved project:', error); setCreateError('Your project was saved, but could not be opened. Use Open saved project to try again.'); }
          }} className={`${button} bg-[var(--accent)] text-white`}>Open saved project</button> : <>
            {retrySeed && createError && <div className="mb-4 flex flex-wrap items-center gap-3"><button type="button" disabled={saving} onClick={() => void createProject(retrySeed.seed, retrySeed.kind, retrySeed.handoff)} className={`${button} border border-[var(--separator)] disabled:opacity-50`}>Retry saving selected project</button><button type="button" disabled={saving} onClick={() => { pendingProject.current = null; pendingOwner.current = null; setRetrySeed(null); setCreateError(''); }} className={`${button} border border-[var(--separator)] disabled:opacity-50`}>Start over</button><p className="text-xs text-[var(--label-secondary)]">Retry is available only while this Studio view remains open. Reloading, leaving Studio, or starting over may create another project if the previous save succeeded despite the error.</p></div>}
            <div inert={saving || (!!retrySeed && !!createError)}>
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
