import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

export type MissionId = 'choose_first_idea' | 'revise_first_draft' | 'review_first_draft';

export interface CreatorJourney {
  activeMission: MissionId;
  activeProjectId: string | null;
  skippedIdeas: string[];
  history: { mission: MissionId; outcome: 'completed' | 'skipped'; at: string; projectId?: string; detail?: string }[];
  updatedAt: string;
}

type JourneyEvent =
  | { type: 'initialize' }
  | { type: 'skip_idea'; title: string }
  | { type: 'start_draft'; projectId: string }
  | { type: 'save_draft'; projectId: string };

// Transactional updates prevent a skipped idea or mission completion from overwriting
// another tab's more recent journey state. Project records remain the source of truth.
export async function recordJourneyEvent(userId: string, event: JourneyEvent): Promise<void> {
  const ref = doc(db, 'preferences', userId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.data()?.creatorJourney as CreatorJourney | undefined;
    const now = new Date().toISOString();
    const next: CreatorJourney = {
      activeMission: current?.activeMission || 'choose_first_idea',
      activeProjectId: current?.activeProjectId || null,
      skippedIdeas: current?.skippedIdeas || [],
      history: current?.history || [],
      updatedAt: now
    };

    if (event.type === 'skip_idea' && !next.skippedIdeas.includes(event.title)) {
      next.skippedIdeas = [...next.skippedIdeas, event.title];
      next.history.push({ mission: 'choose_first_idea', outcome: 'skipped', detail: event.title, at: now });
    }
    if (event.type === 'start_draft' && next.activeProjectId !== event.projectId) {
      next.activeMission = 'revise_first_draft';
      next.activeProjectId = event.projectId;
      next.history.push({ mission: 'choose_first_idea', outcome: 'completed', projectId: event.projectId, at: now });
    }
    if (event.type === 'save_draft' && next.activeMission !== 'review_first_draft') {
      next.activeMission = 'review_first_draft';
      next.activeProjectId = event.projectId;
      next.history.push({ mission: 'revise_first_draft', outcome: 'completed', projectId: event.projectId, at: now });
    }
    transaction.set(ref, { creatorJourney: next }, { merge: true });
  });
}
