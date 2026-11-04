export interface StudioDraft {
  title: string;
  body: string;
  platform: string;
}

export function projectDraft(project: any): StudioDraft {
  return {
    title: project.data?.title ?? project.name ?? '',
    body: project.data?.body || '',
    platform: project.data?.platform || 'youtube',
  };
}

export function sameDraft(a: StudioDraft, b: StudioDraft): boolean {
  return a.title === b.title && a.body === b.body && a.platform === b.platform;
}

export interface StudioBaseline extends StudioDraft {
  // Undefined means a legacy recovery record without a known project name.
  name?: string | null;
}

export function projectBaseline(project: any): StudioBaseline {
  return { ...projectDraft(project), name: typeof project.name === 'string' ? project.name : null };
}

export function savedBaseline(draft: StudioDraft): StudioBaseline {
  return { ...draft, name: draft.title || 'Untitled Content' };
}

export function sameBaseline(a: StudioBaseline, b: StudioBaseline): boolean {
  return a.name !== undefined && b.name !== undefined && a.name === b.name && sameDraft(a, b);
}

// A project value carries no write identity or reliable ordering, and may even
// be a local Firestore cache snapshot. Never prune this history based on props.
// Old records may already have lost a prefix, so retain even a single pending
// write until the user explicitly discards the draft. A later successful save
// does not prove an earlier ambiguous request cannot still be observed.
export function recoveryPendingWrites(saved: any): StudioDraft[] {
  const isDraft = (value: any): value is StudioDraft =>
    value && ['title', 'body', 'platform'].every((key) => typeof value[key] === 'string');
  if (Array.isArray(saved.pendingWrites)) {
    // An unreadable entry is still evidence of an unresolved write.
    return saved.pendingWrites.map((value: unknown) => (isDraft(value) ? value : saved.draft));
  }
  if (saved.pending != null) return [isDraft(saved.pending) ? saved.pending : saved.draft];
  return [];
}

export function trustedServerSnapshot(snapshot: any): boolean {
  return snapshot?.metadata?.fromCache === false && snapshot?.metadata?.hasPendingWrites === false;
}

// Never truncate old records: stop new attempts before they can grow recovery
// history indefinitely. The current draft remains independently recoverable.
export function canAddRecoveryWrite(pending: StudioDraft[], next: StudioDraft): boolean {
  return pending.length < 10 && JSON.stringify([...pending, next]).length <= 512 * 1024;
}

export function studioUpdate(draft: StudioDraft, score?: number): Record<string, unknown> {
  return {
    name: draft.title || 'Untitled Content',
    'data.title': draft.title,
    'data.body': draft.body,
    'data.platform': draft.platform,
    ...(score === undefined ? {} : { 'data.score': score }),
  };
}
