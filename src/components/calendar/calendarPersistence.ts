import {
  runTransaction,
  serverTimestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { prepareStudioOwnerFence } from '../studio/studioOwnerFence';

type Schedule = { scheduledDate?: any; autoPublish?: boolean; publishTime?: string | null };

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
) {
  const snapshot = await tx.get(ref);
  if (!snapshot.exists()) throw new Error('This project no longer exists.');
  const project = snapshot.data();
  if (project.userId !== userId || project.type !== 'content')
    throw new Error('This project is no longer available.');
  if (!sameSchedule(project, expected))
    throw new Error('Scheduling changed since this item was opened. Refresh and try again.');
  return project;
}

export async function scheduleProject(
  db: Firestore,
  ref: DocumentReference,
  userId: string,
  expected: Schedule & { status?: string },
  schedule: { scheduledDate: Date; publishTime: string; autoPublish: boolean },
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const project = await readProject(tx, ref, userId, expected);
    const status = typeof project.status === 'string' ? project.status.trim().toLowerCase() : '';
    const expectedStatus =
      typeof expected.status === 'string' ? expected.status.trim().toLowerCase() : '';
    if (status === 'published' || project.published === true)
      throw new Error('Published content cannot be scheduled.');
    if (status !== expectedStatus)
      throw new Error('Scheduling changed since this item was opened. Refresh and try again.');
    const stageFence = await prepareStudioOwnerFence(tx, db, userId);
    stageFence();
    tx.update(ref, {
      ...schedule,
      status: schedule.autoPublish ? 'Scheduled' : 'Draft',
      updatedAt: serverTimestamp(),
    });
  });
}

// Preserve current publication state and retain publishTime as the next scheduling default.
export async function unscheduleProject(
  db: Firestore,
  ref: DocumentReference,
  userId: string,
  expected: Schedule,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const project = await readProject(tx, ref, userId, expected);
    const status = typeof project.status === 'string' ? project.status.trim().toLowerCase() : '';
    const stageFence = await prepareStudioOwnerFence(tx, db, userId);
    stageFence();
    tx.update(ref, {
      scheduledDate: null,
      autoPublish: false,
      ...(project.published === true || status === 'published'
        ? project.status !== 'Published'
          ? { status: 'Published' }
          : {}
        : status === 'scheduled'
          ? { status: 'Draft' }
          : {}),
      updatedAt: serverTimestamp(),
    });
  });
}
