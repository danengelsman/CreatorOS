import {
  runTransaction,
  serverTimestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { prepareStudioOwnerFence } from '../studio/studioOwnerFence';

type Schedule = {
  scheduledDate?: any;
  autoPublish?: boolean;
  publishTime?: string | null;
  status?: string;
  published?: boolean;
};

function sameSchedule(project: Schedule, expected: Schedule): boolean {
  const millis = (value: any) =>
    value == null
      ? null
      : typeof value.toDate === 'function'
        ? value.toDate().getTime()
        : value instanceof Date
          ? value.getTime()
          : NaN;
  return (
    millis(project.scheduledDate) === millis(expected.scheduledDate) &&
    !!project.autoPublish === !!expected.autoPublish &&
    (project.publishTime ?? null) === (expected.publishTime ?? null)
  );
}

async function readProject(
  tx: import('firebase/firestore').Transaction,
  ref: DocumentReference,
  userId: string,
  expected: Schedule,
  isCurrent: () => boolean,
) {
  if (!isCurrent()) throw new Error('Account changed');
  const snapshot = await tx.get(ref);
  if (!isCurrent()) throw new Error('Account changed');
  if (!snapshot.exists()) throw new Error('This project no longer exists.');
  const project = snapshot.data();
  if (project.userId !== userId || project.type !== 'content')
    throw new Error('This project is no longer available.');
  if (!sameSchedule(project, expected))
    throw new Error('Scheduling changed since this item was opened. Refresh and try again.');
  if (project.status !== expected.status || project.published !== expected.published)
    throw new Error('The recorded status changed. Refresh and try again.');
  return project;
}

export async function scheduleProject(
  db: Firestore,
  ref: DocumentReference,
  userId: string,
  expected: Schedule & { status?: string },
  schedule: { scheduledDate: Date; publishTime: string; autoPublish?: boolean },
  isCurrent: () => boolean = () => true,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const project = await readProject(tx, ref, userId, expected, isCurrent);
    const status = typeof project.status === 'string' ? project.status.trim().toLowerCase() : '';
    const expectedStatus =
      typeof expected.status === 'string' ? expected.status.trim().toLowerCase() : '';
    if (status === 'published' || project.published === true)
      throw new Error('Published content cannot be scheduled.');
    if (status !== expectedStatus)
      throw new Error('Scheduling changed since this item was opened. Refresh and try again.');
    const stageFence = await prepareStudioOwnerFence(tx, db, userId, isCurrent);
    stageFence();
    tx.update(ref, {
      scheduledDate: schedule.scheduledDate,
      publishTime: schedule.publishTime,
      updatedAt: serverTimestamp(),
    });
  });
}

// Call only after explicit confirmation: clears the saved flag and resets Scheduled to Draft,
// except contradictory published records. Never infer/canonicalize a Published status.
export async function unscheduleProject(
  db: Firestore,
  ref: DocumentReference,
  userId: string,
  expected: Schedule,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const project = await readProject(tx, ref, userId, expected, isCurrent);
    const status = typeof project.status === 'string' ? project.status.trim().toLowerCase() : '';
    const stageFence = await prepareStudioOwnerFence(tx, db, userId, isCurrent);
    stageFence();
    tx.update(ref, {
      scheduledDate: null,
      autoPublish: false,
      ...(status === 'scheduled' && project.published !== true ? { status: 'Draft' } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}

// User-confirmed correction of a recorded claim, not a provider verification.
export async function correctRecordedPublication(
  db: Firestore,
  ref: DocumentReference,
  userId: string,
  expected: Schedule & { status?: string; published?: boolean },
  isCurrent: () => boolean = () => true,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const project = await readProject(tx, ref, userId, expected, isCurrent);
    if (project.status !== expected.status || project.published !== expected.published)
      throw new Error('The recorded status changed. Refresh and try again.');
    const status = typeof project.status === 'string' ? project.status.trim().toLowerCase() : '';
    if (status !== 'published' && project.published !== true)
      throw new Error('This item is no longer marked published.');
    const stageFence = await prepareStudioOwnerFence(tx, db, userId, isCurrent);
    stageFence();
    tx.update(ref, {
      ...(status === 'published' ? { status: 'Draft' } : {}),
      ...(project.published === true ? { published: false } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}
