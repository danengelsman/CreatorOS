import React, { useEffect, useRef, useState } from 'react';
import { doc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { PUBLISH_UNAVAILABLE_MESSAGE } from '../../lib/publishing';
import { isPublished } from '../studio/studioHubHelpers';
import { correctRecordedPublication } from './calendarPersistence';

// These are saved claims, not evidence of a provider action. Never migrate on read.
export default function PublicationNotice({
  project,
  user,
  onChanged,
  isCurrentOwner = () => true,
}: {
  project: any;
  user: any;
  onChanged?: () => void;
  isCurrentOwner?: () => boolean;
}) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [corrected, setCorrected] = useState(false);
  const lock = useRef(false);
  const lifecycle = useRef({ uid: user?.uid, id: project.id, generation: 0, mounted: true });
  if (lifecycle.current.uid !== user?.uid || lifecycle.current.id !== project.id) {
    lifecycle.current = {
      uid: user?.uid,
      id: project.id,
      generation: lifecycle.current.generation + 1,
      mounted: true,
    };
  }
  useEffect(() => {
    lifecycle.current.mounted = true;
    return () => {
      lifecycle.current.mounted = false;
      lifecycle.current.generation++;
    };
  }, []);
  useEffect(() => {
    setError('');
    setCorrected(false);
  }, [user?.uid, project.id, project.status, project.published]);

  const correct = async () => {
    if (lock.current || !user?.uid || project.userId !== user.uid) return;
    const generation = lifecycle.current.generation;
    const isCurrent = () =>
      lifecycle.current.mounted &&
      lifecycle.current.generation === generation &&
      auth.currentUser?.uid === user.uid &&
      isCurrentOwner();
    if (!isCurrent()) return;
    const changes = [
      typeof project.status === 'string' && project.status.trim().toLowerCase() === 'published'
        ? 'change the recorded Published status to Draft'
        : 'keep the current status',
      project.published === true ? 'clear the recorded published flag' : 'keep other flags',
    ];
    if (
      !window.confirm(
        `Correct this record: ${changes.join(' and ')}? This does not publish, delete, or verify a destination post. Content, planned date and saved auto-publish flag stay unchanged.`,
      )
    )
      return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await correctRecordedPublication(
        db,
        doc(db, 'projects', project.id),
        user.uid,
        project,
        isCurrent,
      );
      if (!isCurrent()) return;
      setCorrected(true);
      onChanged?.();
    } catch (err) {
      if (isCurrent())
        setError(
          err instanceof Error && !('code' in err)
            ? err.message
            : 'The correction could not be confirmed. Refresh and check the recorded status before retrying.',
        );
    } finally {
      lock.current = false;
      if (isCurrent()) setSaving(false);
    }
  };

  if (!user?.uid || project.userId !== user.uid) return null;
  return (
    <section className="space-y-2 rounded-xl border border-[var(--separator)] p-3 text-xs text-[var(--label-secondary)]">
      <p>{PUBLISH_UNAVAILABLE_MESSAGE}</p>
      {isPublished(project) && !corrected && (
        <>
          <p>
            Recorded Published — destination publication is not verified by CreatorOS. Check the
            destination platform; this record alone does not establish whether a post went live.
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void correct()}
            className="rounded-lg border border-[var(--separator)] px-3 py-2 font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving correction...' : 'Correct recorded publication'}
          </button>
        </>
      )}
      {project.autoPublish && (
        <p>
          Saved auto-publish flag — CreatorOS does not run automatic posting. The historical flag is
          retained until you explicitly clear scheduling.
        </p>
      )}
      {corrected && (
        <p role="status">Recorded publication corrected. No destination post was changed.</p>
      )}
      {error && (
        <p role="alert" className="text-red-500">
          {error}
        </p>
      )}
    </section>
  );
}
