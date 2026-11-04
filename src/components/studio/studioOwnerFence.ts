import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Transaction,
  type UpdateData,
} from 'firebase/firestore';
import { createInitialJourney } from '../../firstDollarJourney';

export const STUDIO_JOURNEY_UNAVAILABLE =
  'Your Today journey has an unsupported format. This change was not saved. Copy any draft before leaving, then contact support to repair your journey without losing progress.';
const steps = ['direction', 'person', 'small_offer'];
const keys = [
  'uid',
  'version',
  'currentStep',
  'status',
  'answers',
  'completedSteps',
  'createdAt',
  'updatedAt',
];

// Match the journey rules before writing; never repair or replace a legacy record here.
function isValidJourney(value: Record<string, unknown>, uid: string): boolean {
  const answers = value.answers;
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key)) &&
    value.uid === uid &&
    value.version === 1 &&
    typeof value.currentStep === 'string' &&
    steps.includes(value.currentStep) &&
    typeof value.status === 'string' &&
    ['not_started', 'in_progress', 'completed'].includes(value.status) &&
    !!answers &&
    typeof answers === 'object' &&
    !Array.isArray(answers) &&
    Object.entries(answers).every(
      ([key, answer]) => steps.includes(key) && typeof answer === 'string' && answer.length <= 1000,
    ) &&
    Array.isArray(value.completedSteps) &&
    value.completedSteps.length <= 3 &&
    value.completedSteps.every((step) => typeof step === 'string' && steps.includes(step)) &&
    value.createdAt instanceof Timestamp &&
    value.updatedAt instanceof Timestamp
  );
}

/** Prepare before any writes; stage the returned authorization write alongside the project. */
export async function prepareStudioOwnerFence(
  tx: Transaction,
  db: Firestore,
  uid: string,
  isCurrent: () => boolean = () => true,
): Promise<() => void> {
  if (!uid || !isCurrent()) throw new Error('Account changed');
  const ref = doc(db, 'first_dollar_journeys', uid);
  let snapshot;
  try {
    snapshot = await tx.get(ref);
  } catch (error) {
    if (!isCurrent()) throw new Error('Account changed');
    throw error;
  }
  if (!isCurrent()) throw new Error('Account changed');
  if (!snapshot.exists()) {
    // Match ensureFirstDollarJourney and the exact owner-only create rules. The
    // missing read participates in this transaction, so a concurrent Today write
    // retries rather than being overwritten. Never infer completion from a save.
    return () => {
      if (!isCurrent()) throw new Error('Account changed');
      tx.set(ref, {
        ...createInitialJourney(uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    };
  }
  if (!isValidJourney(snapshot.data(), uid)) throw new Error(STUDIO_JOURNEY_UNAVAILABLE);
  const updatedAt = snapshot.data().updatedAt;
  return () => {
    if (!isCurrent()) throw new Error('Account changed');
    // Rules require journey ownership even for an update with unchanged data.
    // Reusing its timestamp keeps Today’s progress timestamp semantically intact.
    tx.update(ref, { updatedAt });
  };
}

// Partial project updates/deletes need this companion because /projects permits
// admin updates/deletes; its create rule already requires the payload's UID.
async function mutateOwnedContentProject(
  db: Firestore,
  ref: DocumentReference,
  uid: string,
  isCurrent: () => boolean,
  write: (tx: Transaction) => void,
): Promise<void> {
  if (!uid || !isCurrent()) throw new Error('Account changed');
  await runTransaction(db, async (tx) => {
    if (!isCurrent()) throw new Error('Account changed');
    const snapshot = await tx.get(ref);
    if (!isCurrent()) throw new Error('Account changed');
    if (
      !snapshot.exists() ||
      snapshot.data().userId !== uid ||
      snapshot.data().type !== 'content'
    ) {
      throw new Error('This project is no longer available. Refresh and try again.');
    }
    const stageFence = await prepareStudioOwnerFence(tx, db, uid, isCurrent);
    stageFence();
    write(tx);
  });
}

export function updateOwnedContentProject(
  db: Firestore,
  ref: DocumentReference,
  uid: string,
  changes: UpdateData<DocumentData>,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  return mutateOwnedContentProject(db, ref, uid, isCurrent, (tx) => {
    tx.update(ref, changes);
  });
}

export function deleteOwnedContentProject(
  db: Firestore,
  ref: DocumentReference,
  uid: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  return mutateOwnedContentProject(db, ref, uid, isCurrent, (tx) => {
    tx.delete(ref);
  });
}
