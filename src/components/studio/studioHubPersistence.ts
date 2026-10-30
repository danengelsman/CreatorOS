import { runTransaction, serverTimestamp, type DocumentReference, type Firestore } from 'firebase/firestore';
import { isPublished, isScheduleManaged, type StudioStage } from './studioHubHelpers';

type ProjectDraft = { userId: string; type: 'content'; [key: string]: unknown };

export async function createProjectIfAbsent(db: Firestore, ref: DocumentReference, draft: ProjectDraft, operationId: string, isCurrent: () => boolean = () => true): Promise<void> {
  if (!isCurrent()) throw new Error('Account changed');
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!isCurrent()) throw new Error('Account changed');
    if (snapshot.exists()) {
      const existing = snapshot.data();
      if (existing.userId !== draft.userId || existing.type !== 'content' || existing.studioCreateId !== operationId) {
        throw new Error('The saved project does not match this creation attempt.');
      }
      return;
    }
    // A staged or dispatched commit cannot be recalled after an account switch.
    // The captured reference and draft remain A's; the shared SDK may obtain the
    // current account's credentials at RPC time, so this is not credential fencing.
    tx.set(ref, { ...draft, studioCreateId: operationId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

export async function updateStudioStage(db: Firestore, ref: DocumentReference, userId: string, stage: StudioStage, isCurrent: () => boolean = () => true): Promise<void> {
  if (!isCurrent()) throw new Error('Account changed');
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!isCurrent()) throw new Error('Account changed');
    if (!snapshot.exists()) throw new Error('This project no longer exists. Refresh and try again.');
    const project = snapshot.data();
    if (project.userId !== userId || project.type !== 'content') throw new Error('This project is no longer available. Refresh and try again.');
    if (isPublished(project)) {
      throw new Error('Published projects are managed outside Studio workflow.');
    }
    if (isScheduleManaged(project)) throw new Error('This project is scheduled or has auto-publish enabled. Manage it in Calendar.');
    tx.update(ref, { studioStage: stage, updatedAt: serverTimestamp() });
  });
}
