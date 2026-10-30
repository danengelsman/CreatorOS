import { apiFetch, auth } from '../firebase';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  CheckCircle as CheckCircle2,
  DownloadSimple as Download,
  Sparkle as Sparkles,
  Lightbulb,
  X,
  Lightning,
  Cards,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { scoreContent } from '../services/gemini';
import { cn } from '../lib/utils';
import { db, serverTimestamp } from '../firebase';
import {
  doc,
  collection,
  addDoc,
  getDocs,
  getDocFromServer,
  query,
  where,
  orderBy,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import VideoStudio from './VideoStudio';
import CalendarView from './CalendarView';
import CustomVideoPlayer from './CustomVideoPlayer';
import ScenePlanner from './ScenePlanner';
import RetentionHookLab from './RetentionHookLab';
import ContentRepurposer from './ContentRepurposer';
import { canAddRecoveryWrite, projectBaseline, savedBaseline, sameBaseline, sameDraft, studioUpdate, trustedServerSnapshot, type StudioBaseline, type StudioDraft } from './studio/studioDraft';
import { claimRecovery, ownsRecovery, persistRecovery, readRecovery, releaseRecovery } from './studio/studioMemoryRecovery';
import localforage from 'localforage';
import Confetti from './Confetti';
import ContentEditorView from './ContentEditorView';
import AIToolPanel from './AIToolPanel';
import ContentIdeaGenerator from './ContentIdeaGenerator';
import ViralTemplatesLibrary from './ViralTemplatesLibrary';
import { recordJourneyEvent } from '../services/creatorJourney';
import { getFriendlyError } from '../lib/friendlyError';
import { templatePlatform } from './studio/studioHubHelpers';

export default function Create({
  brand,
  setActiveTab,
  user,
  selectedIdea,
  setSelectedIdea,
  selectedProject,
  canvasMode = false,
  initialInspector = 'retention',
  onDirtyChange,
  isCurrentOwner,
  canWriteProject,
  projectUnavailable = false,
}: {
  brand: any;
  setActiveTab: (tab: string) => void;
  user: any;
  selectedIdea?: any;
  setSelectedIdea?: any;
  selectedProject?: any;
  canvasMode?: boolean;
  initialInspector?: 'retention' | 'planner' | 'repurpose';
  onDirtyChange?: (state: { dirty: boolean; saving: boolean; storageError: boolean }) => void;
  isCurrentOwner?: () => boolean;
  canWriteProject?: () => boolean;
  projectUnavailable?: boolean;
}) {
  const [studioTab, setStudioTab] = useState<
    'editor' | 'ideas' | 'templates' | 'retention' | 'planner' | 'calendar'
  >('editor');
  const recoveryUid: string = user?.uid || '';
  const recoveryProject: string = selectedProject?.id || '';
  const recoveryLease = useRef({});

  const storageKey = canvasMode && recoveryUid && recoveryProject ? `studio-draft:${recoveryUid}:${recoveryProject}` : '';
  const [initial] = useState(() => {
    const baseline: StudioBaseline = selectedProject
      ? projectBaseline(selectedProject)
      : { title: '', body: '', platform: 'youtube', name: null };
    const recovery = storageKey ? readRecovery(recoveryUid, recoveryProject) : undefined;
    if (recovery?.record) return { draft: recovery.record.draft, baseline: recovery.record.baseline, pending: recovery.record.pendingWrites, memoryOnly: recovery.memoryOnly };
    return { draft: baseline, baseline, pending: [] as StudioDraft[], memoryOnly: !!recovery?.memoryOnly };
  });
  const [baseline, setBaseline] = useState<StudioBaseline>(initial.baseline);
  const [title, setTitle] = useState(canvasMode ? initial.draft.title : '');
  const [body, setBody] = useState(canvasMode ? initial.draft.body : '');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspector, setInspector] = useState<'retention' | 'planner' | 'repurpose'>(initialInspector);
  const [storageError, setStorageError] = useState(initial.memoryOnly);
  const [verificationError, setVerificationError] = useState(false);
  const [conflict, setConflict] = useState(canvasMode && initial.baseline.name === undefined);
  const [saveError, setSaveError] = useState(
    canvasMode && initial.baseline.name === undefined
      ? 'This recovered draft is from an older version, so its original project name is unknown. Copy your draft before loading the latest project.'
      : '',
  );
  // Delivery identity is distinct from the server-verified baseline. Repeated stale
  // props must not initiate reads, but a later different delivery must still do so.
  const projectSignature = JSON.stringify([selectedProject?.id, selectedProject?.userId, projectBaseline(selectedProject || {})]);
  const deliveredSignature = useRef(projectSignature);
  const currentSignature = useRef(projectSignature);
  currentSignature.current = projectSignature;
  const deferredProject = useRef<StudioBaseline | null>(
    selectedProject && !sameBaseline(initial.baseline, projectBaseline(selectedProject))
      ? projectBaseline(selectedProject) : null,
  );
  const currentProject = useRef(selectedProject);
  currentProject.current = selectedProject;
  const pendingSave = useRef<StudioDraft[]>(initial.pending);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    selectedProject?.id || null,
  );
  const [videoHistory, setVideoHistory] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [activePreviewVideo, setActivePreviewVideo] = useState<any>(null);
  const [platform, setPlatform] = useState(canvasMode ? initial.draft.platform : 'youtube');
  const [isScoring, setIsScoring] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const saveGeneration = useRef(0);
  const [isPolishing, setIsPolishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const draft = { title, body, platform };
  const dirty = canvasMode && (!sameDraft(draft, baseline) || pendingSave.current.length > 0 || baseline.name === undefined);
  const latestBody = useRef(body);
  latestBody.current = body;
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  useEffect(() => {
    if (projectUnavailable) setStudioTab('editor');
  }, [projectUnavailable]);
  useEffect(() => {
    if (!canvasMode || !selectedProject || (canWriteProject && !canWriteProject())) return;
    if (deliveredSignature.current !== projectSignature) {
      deliveredSignature.current = projectSignature;
      deferredProject.current = projectBaseline(selectedProject);
    }
    const incoming = deferredProject.current;
    if (!incoming || dirty || isSaving) return;
    // Props have no Firestore metadata or version and may be delayed. Read the
    // server after the event, then guard against intervening edits and saves.
    let cancelled = false;
    const signatureAtRead = projectSignature;
    const draftAtRead = latestDraft.current;
    const generationAtRead = saveGeneration.current;
    getDocFromServer(doc(db, 'projects', selectedProject.id)).then((snapshot) => {
      if (cancelled || (canWriteProject && !canWriteProject()) || savingRef.current || saveGeneration.current !== generationAtRead ||
          currentSignature.current !== signatureAtRead || !sameDraft(draftAtRead, latestDraft.current)) return;
      if (!trustedServerSnapshot(snapshot) || !snapshot.exists() || snapshot.data().userId !== user?.uid) {
        setVerificationError(true);
        return;
      }
      const latest = projectBaseline(snapshot.data());
      setVerificationError(false);
      deferredProject.current = null;
      setTitle(latest.title);
      setBody(latest.body);
      setPlatform(latest.platform);
      setBaseline(latest);
      setConflict(false);
    }).catch((error) => {
      console.warn('Could not verify project update; current draft was kept:', error);
      if (!cancelled) setVerificationError(true);
    });
    return () => { cancelled = true; };
  }, [canvasMode, projectSignature, dirty, isSaving, user?.uid]);
  useLayoutEffect(() => {
    if (!storageKey) return;
    const lease = recoveryLease.current;
    claimRecovery(recoveryUid, recoveryProject, lease);
    return () => releaseRecovery(recoveryUid, recoveryProject, lease);
  }, [storageKey, recoveryUid, recoveryProject]);
  useLayoutEffect(() => {
    if (!storageKey) {
      onDirtyChange?.({ dirty, saving: isSaving, storageError: false });
      return;
    }
    if ((isCurrentOwner && !isCurrentOwner()) || !ownsRecovery(recoveryUid, recoveryProject, recoveryLease.current)) return;
    const unavailable = persistRecovery(recoveryUid, recoveryProject, recoveryLease.current,
      dirty ? { draft: { title, body, platform }, baseline, pending: pendingSave.current[0] || null, pendingWrites: pendingSave.current } : null);
    setStorageError(unavailable);
    onDirtyChange?.({ dirty, saving: isSaving, storageError: unavailable });
  }, [storageKey, dirty, title, body, platform, baseline, isSaving]);

  const openStudioTab = (tab: any) => {
    if (canvasMode && (tab === 'retention' || tab === 'planner')) {
      setInspector(tab);
      setInspectorOpen(true);
      setStudioTab('editor');
    } else setStudioTab(tab);
  };

  const loadVideoHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'videos'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
      );
      const snapshot = await getDocs(q);
      const docs = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          let url = data.url;
          if (url && url.startsWith('local:')) {
            try {
              const blob = await localforage.getItem<Blob>(url);
              if (blob) {
                url = URL.createObjectURL(blob);
              }
            } catch (e) {
              console.error('Failed to load local video blob', e);
            }
          }
          return { id: doc.id, ...data, url };
        }),
      );
      setVideoHistory(docs);
    } catch (error) {
      console.error('Failed to load video history', error);
    }
  };

  const loadExistingProjects = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs
        .filter((doc) => doc.data().type === 'content')
        .map((doc) => ({ id: doc.id, ...doc.data() }));
      setAllProjects(docs);
    } catch (error) {
      console.error('Failed to load existing projects', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadVideoHistory();
      loadExistingProjects();
    }
  }, [user]);

  const handleDownloadVideo = async (url: string, title: string) => {
    try {
      let blob: Blob;
      if (url.startsWith('local:')) {
        const localBlob = await localforage.getItem<Blob>(url);
        if (!localBlob) throw new Error('Local video not found');
        blob = localBlob;
      } else {
        // /api/video-download URLs are same-origin API routes — use the unified
        // authenticated client (F1.7); local blobs were handled above.
        const owner = { uid: user?.uid || '', isCurrent: () => !!user?.uid && auth.currentUser?.uid === user.uid && (isCurrentOwner?.() ?? false) };
        const response = await apiFetch(url, {}, owner);
        if (!response.ok) throw new Error('Video not found');
        blob = await response.blob();
      }

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      showToast('This video has expired and is no longer available to download.');
    }
  };

  useEffect(() => {
    if (canvasMode || !selectedProject?.id || selectedProject.userId !== user?.uid) return;
    setActiveProjectId(selectedProject.id);
    setTitle(selectedProject.data?.title || selectedProject.name || '');
    setBody(selectedProject.data?.body || '');
    setPlatform(selectedProject.data?.platform || 'youtube');
    setStudioTab('editor');
  }, [selectedProject?.id, user?.uid]);

  useEffect(() => {
    if (selectedIdea) {
      setActiveProjectId(null);
      setTitle(selectedIdea.hook || selectedIdea.title || '');
      setBody(selectedIdea.description || '');
      if (setSelectedIdea) {
        setSelectedIdea(null);
      }
    }
  }, [selectedIdea, setSelectedIdea]);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleScore = async () => {
    if (!body) return;
    if (!brand) {
      showToast('Set up your brand to score your draft.');
      return;
    }
    setIsScoring(true);
    setScoreData(null); // Clear previous score while loading
    try {
      const owner = { uid: user?.uid || '', isCurrent: () => !!user?.uid && auth.currentUser?.uid === user.uid && (isCurrentOwner?.() ?? false) };
      const result = await scoreContent(body, `${brand?.personality || ''} - ${brand?.tagline || ''}`, owner);
      setScoreData(result);
    } catch (error) {
      console.error(error);
      showToast(getFriendlyError(error));
    } finally {
      setIsScoring(false);
    }
  };

  const handlePublish = async () => {
    if (!user || (isCurrentOwner && !isCurrentOwner()) || (canvasMode && canWriteProject && !canWriteProject()) || (!body && !canvasMode) || (canvasMode && !selectedProject?.id)) return;
    if (canvasMode && !canAddRecoveryWrite(pendingSave.current, { title, body, platform })) {
      setSaveError(pendingSave.current.length
        ? 'Recovery history is full. Your current draft remains in the editor. Copy it, then discard local recovery and load the project before saving again.'
        : 'This draft is too large for safe recovery. Copy it and shorten it before saving.');
      return;
    }
    savingRef.current = true;
    saveGeneration.current++;
    setIsSaving(true);
    if (canvasMode) onDirtyChange?.({ dirty, saving: true, storageError });
    setSaveError('');
    const previousPending = pendingSave.current;
    let transactionSaved = false;
    let transactionConflict = false;
    try {
      const firstDraftRevision =
        activeProjectId === selectedProject?.id &&
        selectedProject?.journeyStep === 'first_content' &&
        body.trim() !== (selectedProject.starterBody || selectedProject.data?.body || '').trim();
      const savedDraft = { title, body, platform };
      const changes = {
        ...studioUpdate(savedDraft, scoreData?.score),
        updatedAt: serverTimestamp(),
        ...(firstDraftRevision ? { journeyDraftSavedAt: serverTimestamp() } : {}),
      };
      if (activeProjectId) {
        const ref = doc(db, 'projects', activeProjectId);
        if (canvasMode) {
          // Record every unresolved write before starting it; an earlier result may
          // be observed while a retry is still in flight or after a reload.
          pendingSave.current = [...previousPending, savedDraft];
          if ((!isCurrentOwner || isCurrentOwner()) && ownsRecovery(recoveryUid, recoveryProject, recoveryLease.current) &&
            persistRecovery(recoveryUid, recoveryProject, recoveryLease.current, { draft: savedDraft, baseline, pending: pendingSave.current[0], pendingWrites: pendingSave.current })) {
            setStorageError(true);
            onDirtyChange?.({ dirty, saving: true, storageError: true });
          }
          await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(ref);
            if (isCurrentOwner && !isCurrentOwner()) throw new Error('Account changed');
            if (canWriteProject && !canWriteProject()) throw new Error('Project unavailable');
            if (
              !snapshot.exists() ||
              snapshot.data().userId !== user.uid ||
              snapshot.data().type !== 'content' ||
              !sameBaseline(projectBaseline(snapshot.data()), baseline)
            ) {
              throw new Error('studio-conflict');
            }
            transaction.update(ref, changes);
          });
          if (isCurrentOwner && !isCurrentOwner()) throw new Error('Account changed');
          if (canWriteProject && !canWriteProject()) throw new Error('Project unavailable');
          const written = savedBaseline(savedDraft);
          // Snapshots received before the transaction completed may be stale. Verify
          // them against the server before reconciling, and don't outrun newer props.
          const projectAtRead = currentProject.current;
          deliveredSignature.current = currentSignature.current;
          deferredProject.current = null;
          try {
            const latest = await getDocFromServer(ref);
            if (currentProject.current === projectAtRead && trustedServerSnapshot(latest) && latest.exists() && latest.data().userId === user.uid) {
              const remote = projectBaseline(latest.data());
              deferredProject.current = sameBaseline(remote, written) ? null : remote;
            }
          } catch (error) {
            // The write succeeded. Keep local text rather than apply an unverified snapshot.
            console.warn('Saved, but could not refresh project:', error);
          }
          if (canWriteProject && !canWriteProject()) throw new Error('Project unavailable');
          transactionSaved = true;
          setBaseline(written);
          setVerificationError(false);
          setConflict(false);
        } else await updateDoc(ref, changes);
        if (firstDraftRevision && (!canWriteProject || canWriteProject())) {
          try {
            await recordJourneyEvent(user.uid, { type: 'save_draft', projectId: activeProjectId });
          } catch (err) {
            console.warn('Draft saved; mission history will recover from the project:', err);
          }
        }
      } else if (!canvasMode) {
        const projectRef = await addDoc(collection(db, 'projects'), {
          name: title || 'Untitled Content',
          data: { title, body, platform, score: scoreData?.score || 0 },
          updatedAt: serverTimestamp(),
          userId: user.uid,
          type: 'content',
          status: 'Draft',
          createdAt: serverTimestamp(),
        });
        setActiveProjectId(projectRef.id);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (allProjects.length === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      loadExistingProjects();
    } catch (error) {
      console.error(error);
      if (canvasMode && error instanceof Error && error.message === 'studio-conflict') {
        transactionConflict = true;
        setConflict(true);
        setSaveError('Project changed elsewhere. Your draft was not saved; copy it before reopening.');
        showToast('Project changed elsewhere. Your draft was not overwritten.');
      } else {
        setSaveError('Could not save your draft. Please try again.');
        showToast(getFriendlyError(error));
      }
    } finally {
      if (transactionSaved && previousPending.length === 0) pendingSave.current = [];
      else if (transactionConflict) pendingSave.current = previousPending;
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  if (!brand && !canvasMode) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 max-w-sm mx-auto">
        <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-[22px] flex items-center justify-center ios-elevated">
          <Sparkles className="w-10 h-10 text-[var(--label-tertiary)]" strokeWidth={1.5} />
        </div>
        <div className="space-y-4">
          <h2 className="font-serif text-[28px] font-semibold tracking-[-0.015em]">
            Identity Required
          </h2>
          <p className="text-[var(--label-secondary)] text-[17px] font-medium leading-tight">
            Architect your brand identity before crafting world-class content with AI scoring.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('brand')}
          className="ios-button ios-button-filled w-full"
        >
          Build Brand Identity
        </button>
      </div>
    );
  }

  const handleFormat = async (targetPlatformId: string, label: string, isPro?: boolean) => {
    if (isPro) {
      showToast(`Upgrade to Pro to unlock formatting for ${label}`);
      return;
    }
    setPlatform(targetPlatformId);
    if (!body) return;
    setIsPolishing(true);
    showToast(`Formatting for ${label}...`);
    try {
      const owner = { uid: user?.uid || '', isCurrent: () => !!user?.uid && auth.currentUser?.uid === user.uid && (isCurrentOwner?.() ?? false) };
      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          contents: `Rewrite the following content to be formatted specifically for ${label}. Adapt the tone, length, and style appropriately. Keep it high quality.\n\nContent:\n${body}`,
        }),
      }, owner);
      if (!response.ok) throw new Error('Format failed');
      const data = await response.json();
      if (canvasMode && latestBody.current !== body) {
        showToast('Your draft changed while formatting. The newer text was kept.');
      } else if (typeof data.text !== 'string' || !data.text.trim()) {
        showToast('No replacement text was returned. Your draft was kept.');
      } else {
        setBody(data.text);
        showToast(`Formatted for ${label}`);
      }
    } catch (error) {
      console.error('Format error:', error);
      showToast('Failed to format content');
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {canvasMode && !brand && (
        <div className="text-sm text-[var(--label-secondary)]">
          You can write and save now. Set up your brand to use brand-dependent AI tools such as scoring.{' '}
          <button type="button" className="underline" onClick={() => setActiveTab('brand')}>Set up brand</button>
        </div>
      )}
      {canvasMode && (
        <div role="status" className="text-sm text-[var(--label-secondary)]">
          {dirty ? (storageError ? 'Unsaved changes.' : 'Unsaved changes — draft kept in this browser tab.') : 'No unsaved changes.'}
          {storageError && (dirty
            ? ' Browser draft recovery is unavailable. This draft is in memory only and will be lost on reload or closing this tab; copy it now.'
            : ' Browser storage could not be cleared. An older local draft may reappear after reloading this tab.') }
          {verificationError && ' Could not verify the latest project update. Current editor content was kept.'}
          {conflict && (baseline.name === undefined
            ? ' This older local draft remains in the editor; its original project name could not be verified.'
            : ' This project changed elsewhere. Your local draft remains in the editor; copy it before reopening the project.')}
        </div>
      )}
      {canvasMode && projectUnavailable && <div className="space-y-2">
        <button type="button" className="ios-button ios-button-tinted" onClick={async () => {
          try {
            await navigator.clipboard.writeText(`Title: ${title}\nPlatform: ${platform}\n\n${body}`);
            setCopyStatus('Draft copied.');
          } catch {
            setCopyStatus('Copy unavailable. Select and copy the title and script from the editor.');
            setStudioTab('editor');
          }
        }}>Copy draft</button>
        <p role="status">{copyStatus}</p>
      </div>}
      {canvasMode && (saveError || storageError || pendingSave.current.length > 0) && (
        <div role="alert" className="space-y-2">
          {storageError && <p>{dirty ? 'The latest draft could not be stored for browser recovery. It remains in the editor; copy it before leaving.' : 'Browser draft recovery is unavailable.'}</p>}
          {saveError && <p>{saveError}</p>}
          {pendingSave.current.length > 0 && <p>An earlier save has an unknown outcome. Your current draft remains in the editor. Copy it before explicitly discarding local recovery and loading the project.</p>}
          {(conflict || pendingSave.current.length > 0) && (
            <button
              type="button"
              className="ios-button ios-button-tinted"
              disabled={isSaving || projectUnavailable}
              onClick={async () => {
                if (!window.confirm('Discard your local draft and load the latest project?')) return;
                const before = latestDraft.current;
                const projectAtRead = currentProject.current;
                savingRef.current = true;
                saveGeneration.current++;
                setIsSaving(true);
                try {
                  const snapshot = await getDocFromServer(doc(db, 'projects', selectedProject.id));
                  if (canWriteProject && !canWriteProject()) throw new Error('unavailable');
                  if (!trustedServerSnapshot(snapshot) || !snapshot.exists() || snapshot.data().userId !== user.uid) throw new Error('unavailable');
                  if (!sameDraft(before, latestDraft.current)) {
                    showToast('Your draft changed while loading. The newer draft was kept.');
                    return;
                  }
                  if (currentProject.current !== projectAtRead) {
                    setSaveError('The project changed while loading. Your draft was kept; try loading the project again.');
                    return;
                  }
                  const latest = projectBaseline(snapshot.data());
                  deliveredSignature.current = currentSignature.current;
                  deferredProject.current = null;
                  pendingSave.current = [];
                  setTitle(latest.title);
                  setBody(latest.body);
                  setPlatform(latest.platform);
                  setBaseline(latest);
                  setVerificationError(false);
                  setConflict(false);
                  setSaveError('');
                } catch (error) {
                  console.error('Could not reload project', error);
                  setSaveError('Could not load the latest project. Your draft was kept.');
                } finally {
                  savingRef.current = false;
                  setIsSaving(false);
                }
              }}
            >
              Discard local draft and load project
            </button>
          )}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center px-1 pt-4 pb-4 gap-4">
        <div className="flex bg-[var(--bg-secondary)]/50 p-1.5 rounded-[24px] w-full max-w-[850px] shadow-inner border border-[var(--separator)]/30 backdrop-blur-md overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStudioTab('editor')}
            className={cn(
              'shrink-0 whitespace-nowrap px-6 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform',
              studioTab === 'editor'
                ? 'bg-[var(--accent)] text-white shadow-lg scale-[1.02]'
                : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]',
            )}
          >
            Editor
          </button>
          <button
            onClick={() => setStudioTab('ideas')}
            className={cn(
              'shrink-0 whitespace-nowrap px-4 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform flex items-center justify-center gap-1',
              studioTab === 'ideas'
                ? 'bg-[var(--accent)] text-white shadow-lg scale-[1.02]'
                : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]',
            )}
          >
            <Lightbulb
              size={15}
              weight="fill"
              className={studioTab === 'ideas' ? 'text-amber-200' : 'text-amber-400'}
            />
            <span>AI Ideas</span>
          </button>
          <button
            onClick={() => setStudioTab('templates')}
            className={cn(
              'shrink-0 whitespace-nowrap px-4 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform flex items-center justify-center gap-1',
              studioTab === 'templates'
                ? 'bg-[var(--accent)] text-white shadow-lg scale-[1.02]'
                : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]',
            )}
          >
            <Cards
              size={15}
              weight="fill"
              className={studioTab === 'templates' ? 'text-blue-200' : 'text-blue-400'}
            />
            <span>Templates</span>
          </button>
          <button
            onClick={() => openStudioTab('retention')}
            className={cn(
              'shrink-0 whitespace-nowrap px-4 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform flex items-center justify-center gap-1',
              studioTab === 'retention'
                ? 'bg-[var(--accent)] text-white shadow-lg scale-[1.02]'
                : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]',
            )}
          >
            <Lightning
              size={15}
              weight="fill"
              className={studioTab === 'retention' ? 'text-amber-200' : 'text-amber-400'}
            />
            <span>Retention Lab</span>
          </button>
          <button
            onClick={() => openStudioTab('planner')}
            className={cn(
              'shrink-0 whitespace-nowrap px-4 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform flex items-center justify-center gap-1',
              studioTab === 'planner'
                ? 'bg-[var(--accent)] text-white shadow-lg scale-[1.02]'
                : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]',
            )}
          >
            <span>Scene Planner</span>
          </button>
          {!canvasMode && <button
            onClick={() => setStudioTab('calendar')}
            className={cn(
              'shrink-0 whitespace-nowrap px-6 py-2 rounded-[18px] text-[14px] font-bold transition-all duration-300 transform',
              studioTab === 'calendar'
                ? 'bg-[var(--accent)] text-white shadow-lg scale-[1.02]'
                : 'text-[var(--label-secondary)] hover:text-[var(--label-primary)] hover:bg-[var(--bg-secondary)]',
            )}
          >
            Calendar
          </button>}
        </div>
      </div>

      {studioTab === 'calendar' ? (
        <CalendarView user={user} setActiveTab={setActiveTab} />
      ) : studioTab === 'ideas' ? (
        <ContentIdeaGenerator
          brand={brand}
          onSelectIdea={(idea) => {
            if (
              canvasMode &&
              (title || body) &&
              !window.confirm(
                'Replace the current project draft with this idea? This cannot be undone.',
              )
            )
              return;
            setTitle(idea.title);
            setBody(`Hook: ${idea.hook}\n\nConcept: ${idea.description}`);
            setStudioTab('editor');
          }}
        />
      ) : studioTab === 'templates' ? (
        <ViralTemplatesLibrary
          brand={brand}
          onSelectTemplate={(template) => {
            const nextPlatform = templatePlatform(template.platform);
            if (!nextPlatform) {
              showToast('This template’s platform is not supported in the editor. Choose a different template.');
              return;
            }
            if (
              canvasMode &&
              (title || body) &&
              !window.confirm(
                'Replace the current project draft with this template? This cannot be undone.',
              )
            )
              return;
            setTitle(template.title);
            setBody(`Hook: ${template.hook}\n\nScript: ${template.body}`);
            setPlatform(nextPlatform);
            setStudioTab('editor');
          }}
        />
      ) : studioTab === 'retention' ? (
        <RetentionHookLab
          initialText={body}
          showToast={showToast}
          brand={brand}
          onApplyHookToEditor={(newHook) => {
            setBody((prev) => (prev ? `${newHook}\n\n${prev}` : newHook));
            setStudioTab('editor');
          }}
          onSendToScenePlanner={() => setStudioTab('planner')}
        />
      ) : studioTab === 'planner' ? (
        <ScenePlanner
          initialScript={body}
          initialTitle={title}
          showToast={showToast}
          brand={brand}
        />
      ) : null}
      <div hidden={studioTab !== 'editor'}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div
            className={cn(
              'min-w-0 space-y-6',
              canvasMode ? (inspectorOpen ? 'lg:col-span-7' : 'lg:col-span-11') : 'lg:col-span-8',
            )}
          >
            <ContentEditorView
              title={title}
              setTitle={setTitle}
              body={body}
              setBody={setBody}
              platform={platform}
              setPlatform={setPlatform}
              brand={brand}
              showToast={showToast}
              setStudioTab={openStudioTab}
              isSaving={isSaving}
              saveDisabled={projectUnavailable}
              onPublish={handlePublish}
              isScoring={isScoring}
              onScore={handleScore}
              isPolishing={isPolishing}
              setIsPolishing={setIsPolishing}
              onFormat={handleFormat}
              canvasMode={canvasMode}
            />

            {/* Gemini Video Studio */}
            <VideoStudio
              body={body}
              title={title}
              platform={platform}
              brand={brand}
              showToast={showToast}
              user={user}
              isCurrentOwner={isCurrentOwner}
              onVideoSaved={loadVideoHistory}
            />

            {/* Create Settings / Tools */}

            <AIToolPanel
              brand={brand}
              allProjects={allProjects}
              body={body}
              setBody={setBody}
              setTitle={setTitle}
              showToast={showToast}
              setIsPolishing={setIsPolishing}
              isPolishing={isPolishing}
              platform={platform}
              onFormat={handleFormat}
              setActiveTab={setActiveTab}
              videoHistory={videoHistory}
              onSelectVideo={setActivePreviewVideo}
              isScoring={isScoring}
              scoreData={scoreData}
              canvasMode={canvasMode}
            />
          </div>
          {canvasMode && (
            <aside
              aria-label="Script inspector"
              className={cn('min-w-0', inspectorOpen ? 'lg:col-span-5' : 'lg:col-span-1')}
            >
              <button
                type="button"
                className="ios-button ios-button-tinted"
                aria-expanded={inspectorOpen}
                aria-controls="studio-inspector"
                onClick={() => setInspectorOpen((open) => !open)}
              >
                {inspectorOpen ? 'Collapse inspector' : 'Open inspector'}
              </button>
              <div id="studio-inspector" hidden={!inspectorOpen} className="space-y-4 mt-4">
                <div className="flex flex-wrap gap-2" aria-label="Inspector tools">
                  {(['retention', 'planner', 'repurpose'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={inspector === item}
                      onClick={() => setInspector(item)}
                      className={cn(
                        'ios-button',
                        inspector === item ? 'ios-button-filled' : 'ios-button-tinted',
                      )}
                    >
                      {item === 'retention'
                        ? 'Retention'
                        : item === 'planner'
                          ? 'Scene planner'
                          : 'Repurpose'}
                    </button>
                  ))}
                </div>
                <div hidden={inspector !== 'retention'}>
                  <RetentionHookLab
                    currentText={body}
                    brand={brand}
                    showToast={showToast}
                    onApplyHookToEditor={(hook) =>
                      setBody((prev) => (prev ? `${hook}\n\n${prev}` : hook))
                    }
                  />
                </div>
                <div hidden={inspector !== 'planner'}>
                  <ScenePlanner
                    currentScript={body}
                    currentTitle={title}
                    showToast={showToast}
                    brand={brand}
                  />
                </div>
                <div hidden={inspector !== 'repurpose'}>
                  <ContentRepurposer currentContent={body} />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {showConfetti && <Confetti count={150} />}

      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-[var(--system-green)] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <CheckCircle2 size={20} strokeWidth={1.5} />
              <span className="font-bold tracking-tight">Saved to CreatorOS</span>
            </div>
          </motion.div>
        )}
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-[var(--label-primary)] text-[var(--bg-primary)] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <span className="font-bold tracking-tight">{toastMessage}</span>
            </div>
          </motion.div>
        )}

        {activePreviewVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setActivePreviewVideo(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-[var(--bg-tertiary)] rounded-2xl overflow-hidden w-full max-w-md shadow-2xl border border-[var(--separator)]/50 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[var(--separator)]/65 flex items-center justify-between bg-[var(--bg-secondary)]/40 backdrop-blur">
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-[17px] font-semibold tracking-tight text-[var(--label-primary)] truncate">
                    {activePreviewVideo.title}
                  </h3>
                  {activePreviewVideo.createdAt && (
                    <p className="text-[11px] text-[var(--label-tertiary)] font-medium">
                      Generated{' '}
                      {new Date(
                        activePreviewVideo.createdAt?.toDate?.() || Date.now(),
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setActivePreviewVideo(null)}
                  className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] transition-colors cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Video Player Segment */}
              <div className="aspect-[9/16] max-h-[50vh] bg-black flex items-center justify-center relative overflow-hidden">
                <CustomVideoPlayer videoUrl={activePreviewVideo.url} />
              </div>

              {/* Footer details */}
              {activePreviewVideo.prompt && (
                <div className="p-4 bg-[var(--bg-secondary)]/60 border-t border-[var(--separator)]/65 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--label-tertiary)] block">
                    Generation Prompt Vector
                  </span>
                  <p className="text-[12px] text-[var(--label-secondary)] leading-relaxed font-medium line-clamp-3 overflow-y-auto max-h-20 select-text">
                    {activePreviewVideo.prompt}
                  </p>
                </div>
              )}

              {/* Interactive buttons */}
              <div className="p-4 border-t border-[var(--separator)]/65 flex items-center justify-end gap-3 bg-[var(--bg-secondary)]/30">
                <button
                  onClick={() =>
                    handleDownloadVideo(activePreviewVideo.url, activePreviewVideo.title)
                  }
                  className="ios-button ios-button-tinted flex items-center gap-2 text-[13px] font-bold px-4 py-2 cursor-pointer"
                >
                  <Download size={15} weight="bold" />
                  Download Video
                </button>
                <button
                  onClick={() => setActivePreviewVideo(null)}
                  className="ios-button ios-button-filled text-[13px] font-bold cursor-pointer px-4 py-2"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
