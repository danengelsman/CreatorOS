import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  createInitialJourney,
  transitionJourney,
  type FirstDollarJourney,
  type JourneyAction,
} from '../firstDollarJourney';

const journeyRef = (uid: string) => doc(db, 'first_dollar_journeys', uid);

function parseJourney(uid: string, value: unknown): FirstDollarJourney {
  const data = value as FirstDollarJourney | undefined;
  if (
    !data ||
    data.uid !== uid ||
    data.version !== 1 ||
    !['direction', 'person', 'small_offer'].includes(data.currentStep) ||
    !['not_started', 'in_progress', 'completed'].includes(data.status) ||
    !data.answers ||
    !Array.isArray(data.completedSteps)
  ) {
    throw new Error('Your journey could not be read. No progress has been changed.');
  }
  return data;
}

/** Existing users without a record start at step one; never infer completion from brand or analytics. */
export async function ensureFirstDollarJourney(uid: string): Promise<FirstDollarJourney> {
  return runTransaction(db, async (transaction) => {
    const ref = journeyRef(uid);
    const snap = await transaction.get(ref);
    if (snap.exists()) return parseJourney(uid, snap.data());
    const initial = createInitialJourney(uid);
    transaction.set(ref, {
      ...initial,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return initial;
  });
}

/** Read then write atomically so another tab cannot silently overwrite an answer or completion. */
export async function updateFirstDollarJourney(
  uid: string,
  action: JourneyAction,
): Promise<FirstDollarJourney> {
  return runTransaction(db, async (transaction) => {
    const ref = journeyRef(uid);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Journey not found. Reload Today and try again.');
    const current = parseJourney(uid, snap.data());
    const next = transitionJourney(current, action);
    if (next !== current) transaction.update(ref, { ...next, updatedAt: serverTimestamp() });
    return next;
  });
}

export function watchFirstDollarJourney(
  uid: string,
  onChange: (journey: FirstDollarJourney) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    journeyRef(uid),
    { includeMetadataChanges: true },
    (snap) => {
      // Do not show a completion from a local, unacknowledged write.
      if (snap.metadata.hasPendingWrites || snap.metadata.fromCache) return;
      if (snap.exists()) {
        try {
          onChange(parseJourney(uid, snap.data()));
        } catch (error) {
          onError(error as Error);
        }
      }
    },
    onError,
  );
}
