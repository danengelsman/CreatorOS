// Phase 0 domain contract only. IDs are assigned by callers, and no entity here is
// persisted or integrated with the existing `projects` / browser-local `videos` flows.
// A project ID is not authorization: callers remain responsible for owner scope at I/O.
type VideoId<Kind extends string> = string & { readonly __videoIdKind: Kind };
export type ProjectId = VideoId<'project'>;
export type ScriptRevisionId = VideoId<'script-revision'>;
export type ShotPlanId = VideoId<'shot-plan'>;
export type ShotId = VideoId<'shot'>;
export type ReferenceId = VideoId<'reference'>;
export type AssetId = VideoId<'asset'>;
export type GenerationJobId = VideoId<'generation-job'>;
export type TakeId = VideoId<'take'>;
export type SelectedCutId = VideoId<'selected-cut'>;
export type ExportId = VideoId<'export'>;
export type PublicationId = VideoId<'publication'>;
export type OutcomeId = VideoId<'outcome'>;

interface OwnedProject {
  readonly userId: string;
  readonly projectId: ProjectId;
}

export interface VideoProject {
  readonly id: ProjectId;
  readonly userId: string;
  readonly title: string;
  readonly output: {
    readonly format: 'video' | 'short';
    readonly aspectRatio: string;
    readonly language: string;
  };
}

export interface ScriptSnapshot {
  readonly title: string;
  readonly body: string;
  readonly platform: string;
}

export interface RevisionIdentity extends OwnedProject {
  readonly id: ScriptRevisionId;
  readonly snapshot: ScriptSnapshot;
}

export interface ScriptRevision extends RevisionIdentity {
  readonly createdAt: string;
}

interface DerivedFromRevision extends OwnedProject {
  readonly sourceRevision: RevisionIdentity;
}

export interface ShotPlan extends DerivedFromRevision {
  readonly id: ShotPlanId;
  readonly status: 'draft' | 'approved';
}

export interface Shot extends DerivedFromRevision {
  readonly id: ShotId;
  readonly shotPlanId: ShotPlanId;
  readonly order: number;
  readonly beat: string;
  readonly visualPrompt: string;
  readonly voiceLine?: string;
  readonly durationMs?: number;
}

type ScopedToProject = OwnedProject & {
  readonly scope: 'project';
  readonly shotId?: never;
  readonly sourceRevision?: never;
};
type ScopedToShot = DerivedFromRevision & {
  readonly scope: 'shot';
  readonly shotId: ShotId;
};

export type Asset = (ScopedToProject | ScopedToShot) & {
  readonly id: AssetId;
  readonly mediaType: 'image' | 'video' | 'audio' | 'document';
  // Browser-local bytes are not available across devices or after local storage loss.
  readonly storage:
    { readonly kind: 'pending' } | { readonly kind: 'browser_local'; readonly key: string };
  readonly rights: 'unknown' | 'declared_cleared';
  readonly sourceJobId?: GenerationJobId;
};

export type Reference = (ScopedToProject | ScopedToShot) & {
  readonly id: ReferenceId;
  readonly assetId: AssetId;
  readonly role: 'character' | 'setting' | 'product' | 'brand' | 'style';
};

export interface EstimatedCost {
  readonly kind: 'estimate';
  readonly minorUnits: number;
  readonly currency: string;
  readonly basis: 'application_estimate' | 'provider_quote';
}

export interface ObservedCost {
  readonly kind: 'observed';
  readonly minorUnits: number;
  readonly currency: string;
  readonly basis: 'provider_usage' | 'invoice';
  readonly observedAt: string;
}

export type GenerationStatus =
  | { readonly source: 'local'; readonly phase: 'draft' | 'submitted' | 'unknown' }
  | {
      readonly source: 'provider';
      readonly phase: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
      readonly observedAt: string;
    };

export interface GenerationJob extends DerivedFromRevision {
  readonly id: GenerationJobId;
  readonly shotId: ShotId;
  readonly referenceIds?: readonly ReferenceId[];
  readonly providerId?: string;
  readonly modelId?: string;
  readonly providerOperationId?: string;
  readonly status: GenerationStatus;
  readonly estimatedCost?: EstimatedCost;
  readonly observedCost?: ObservedCost;
}

export interface Take extends DerivedFromRevision {
  readonly id: TakeId;
  readonly shotId: ShotId;
  readonly jobId: GenerationJobId;
  readonly assetId: AssetId;
  readonly review: 'unreviewed' | 'approved' | 'rejected';
}

export interface SelectedCut extends DerivedFromRevision {
  readonly id: SelectedCutId;
  readonly shotPlanId: ShotPlanId;
  readonly shots: readonly { readonly shotId: ShotId; readonly takeId: TakeId }[];
}

export type ExportState =
  { readonly kind: 'draft' } | { readonly kind: 'ready'; readonly assetId: AssetId };

export interface Export extends DerivedFromRevision {
  readonly id: ExportId;
  readonly selectedCutId: SelectedCutId;
  readonly state: ExportState;
}

export interface PublicationVerification {
  readonly source: 'platform';
  readonly platform: string;
  readonly receiptId: string;
  readonly observedAt: string;
}

export type Publication = DerivedFromRevision & {
  readonly id: PublicationId;
  readonly exportId: ExportId;
} & (
    | { readonly status: 'draft' | 'submitted'; readonly verification?: never }
    | { readonly status: 'verified'; readonly verification: PublicationVerification }
  );

export interface Outcome extends DerivedFromRevision {
  readonly id: OutcomeId;
  readonly publicationId: PublicationId;
  readonly publicationVerification: PublicationVerification;
  readonly metric: string;
  readonly value: number;
  readonly observedAt: string;
  readonly source: 'platform';
}

export type RevisionArtifact =
  | ShotPlan
  | Shot
  | Reference
  | Asset
  | GenerationJob
  | Take
  | SelectedCut
  | Export
  | Publication
  | Outcome;

export type RevisionFreshness = 'current' | 'stale' | 'unbound' | 'foreign' | 'invalid';

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function identityOf(value: RevisionIdentity | null | undefined): RevisionIdentity | null {
  if (
    !value ||
    !nonblank(value.userId) ||
    !nonblank(value.projectId) ||
    !nonblank(value.id) ||
    !value.snapshot ||
    typeof value.snapshot.title !== 'string' ||
    typeof value.snapshot.body !== 'string' ||
    typeof value.snapshot.platform !== 'string'
  ) {
    return null;
  }
  return {
    userId: value.userId,
    projectId: value.projectId,
    id: value.id,
    snapshot: {
      title: value.snapshot.title,
      body: value.snapshot.body,
      platform: value.snapshot.platform,
    },
  };
}

/** Copies an exact editor snapshot; callers assign a new ID for every committed edit. */
export function revisionIdentity(
  revision: ScriptRevision | null | undefined,
): RevisionIdentity | null {
  return identityOf(revision);
}

function sameSnapshot(a: ScriptSnapshot, b: ScriptSnapshot): boolean {
  return a.title === b.title && a.body === b.body && a.platform === b.platform;
}

/** Never upgrades foreign, malformed, or reused-ID output to current. */
export function revisionFreshness(
  activeRevision: ScriptRevision | null | undefined,
  artifact: RevisionArtifact | null | undefined,
): RevisionFreshness {
  const active = revisionIdentity(activeRevision);
  if (!active || !artifact || !nonblank(artifact.userId) || !nonblank(artifact.projectId)) {
    return 'invalid';
  }
  if ('scope' in artifact && artifact.scope !== 'project' && artifact.scope !== 'shot') {
    return 'invalid';
  }
  if ('scope' in artifact && artifact.scope === 'project') {
    if ('sourceRevision' in artifact) return 'invalid';
    return artifact.userId === active.userId && artifact.projectId === active.projectId
      ? 'unbound'
      : 'foreign';
  }
  if (!('sourceRevision' in artifact)) return 'invalid';
  const source = identityOf(artifact.sourceRevision);
  if (!source || source.userId !== artifact.userId || source.projectId !== artifact.projectId) {
    return 'invalid';
  }
  if (source.userId !== active.userId || source.projectId !== active.projectId) return 'foreign';
  if (source.id !== active.id) return 'stale';
  return sameSnapshot(source.snapshot, active.snapshot) ? 'current' : 'invalid';
}

/** Labels each artifact without pruning, changing, or reordering earlier work. */
export function assessRevisionArtifacts<T extends RevisionArtifact>(
  activeRevision: ScriptRevision | null | undefined,
  artifacts: readonly T[],
): { readonly artifact: T; readonly freshness: RevisionFreshness }[] {
  return artifacts.map((artifact) => ({
    artifact,
    freshness: revisionFreshness(activeRevision, artifact),
  }));
}
