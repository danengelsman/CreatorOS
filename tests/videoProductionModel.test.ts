import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  assessRevisionArtifacts,
  revisionFreshness,
  revisionIdentity,
  type Asset,
  type Export,
  type EstimatedCost,
  type GenerationJob,
  type GenerationStatus,
  type ObservedCost,
  type Outcome,
  type ProjectId,
  type Publication,
  type PublicationVerification,
  type Reference,
  type ScriptRevision,
  type ScriptRevisionId,
  type SelectedCut,
  type Shot,
  type ShotPlan,
  type Take,
  type VideoProject,
} from '../src/domain/video/videoProductionModel';

const projectId = 'project-1' as ProjectId;
const owner = { userId: 'creator-A', projectId };
const scriptId = 'script-1' as ScriptRevisionId;
const source: ScriptRevision = {
  ...owner,
  id: scriptId,
  createdAt: '2026-11-07T00:00:00Z',
  snapshot: { title: 'Pilot', body: 'First line', platform: 'youtube' },
};

function identity(revision: ScriptRevision) {
  const result = revisionIdentity(revision);
  if (!result) throw new Error('Test fixture must be a valid script revision');
  return result;
}

const plan: ShotPlan = {
  ...owner,
  id: 'plan-1' as ShotPlan['id'],
  sourceRevision: identity(source),
  status: 'draft',
};

const shot: Shot = {
  ...owner,
  id: 'shot-1' as Shot['id'],
  shotPlanId: plan.id,
  sourceRevision: plan.sourceRevision,
  order: 0,
  beat: 'Opening',
  visualPrompt: 'A quiet opening frame',
};

const asset: Asset = {
  ...owner,
  id: 'asset-1' as Asset['id'],
  scope: 'shot',
  shotId: shot.id,
  sourceRevision: plan.sourceRevision,
  mediaType: 'image',
  storage: { kind: 'pending' },
  rights: 'unknown',
};

const reference: Reference = {
  ...owner,
  id: 'ref-1' as Reference['id'],
  scope: 'shot',
  shotId: shot.id,
  sourceRevision: plan.sourceRevision,
  assetId: asset.id,
  role: 'setting',
};

const job: GenerationJob = {
  ...owner,
  id: 'job-1' as GenerationJob['id'],
  shotId: shot.id,
  sourceRevision: plan.sourceRevision,
  status: { source: 'local', phase: 'draft' },
  estimatedCost: {
    kind: 'estimate',
    minorUnits: 12,
    currency: 'USD',
    basis: 'application_estimate',
  },
};

const take: Take = {
  ...owner,
  id: 'take-1' as Take['id'],
  shotId: shot.id,
  jobId: job.id,
  assetId: asset.id,
  sourceRevision: plan.sourceRevision,
  review: 'unreviewed',
};

const cut: SelectedCut = {
  ...owner,
  id: 'cut-1' as SelectedCut['id'],
  sourceRevision: plan.sourceRevision,
  shotPlanId: plan.id,
  shots: [{ shotId: shot.id, takeId: take.id }],
};

const videoExport: Export = {
  ...owner,
  id: 'export-1' as Export['id'],
  sourceRevision: plan.sourceRevision,
  selectedCutId: cut.id,
  state: { kind: 'draft' },
};

const publication: Publication = {
  ...owner,
  id: 'publication-1' as Publication['id'],
  sourceRevision: plan.sourceRevision,
  exportId: videoExport.id,
  status: 'draft',
};

const verifiedPublication: Publication = {
  ...publication,
  status: 'verified',
  verification: {
    source: 'platform',
    platform: 'youtube',
    receiptId: 'post-123',
    observedAt: '2026-11-07T02:00:00Z',
  },
};

const outcome: Outcome = {
  ...owner,
  id: 'outcome-1' as Outcome['id'],
  sourceRevision: plan.sourceRevision,
  publicationId: verifiedPublication.id,
  publicationVerification: verifiedPublication.verification,
  metric: 'views',
  value: 10,
  observedAt: '2026-11-07T03:00:00Z',
  source: 'platform',
};

describe('video production contract', () => {
  it('links distinct owner-scoped stages without asserting persistence or playable output', () => {
    const project: VideoProject = {
      id: projectId,
      userId: owner.userId,
      title: 'Pilot',
      output: { format: 'video', aspectRatio: '16:9', language: 'en' },
    };
    expect(source.projectId).toBe(project.id);
    expect(plan.sourceRevision.id).toBe(source.id);
    expect(shot.shotPlanId).toBe(plan.id);
    expect(reference.assetId).toBe(asset.id);
    expect(job.shotId).toBe(shot.id);
    expect(take.jobId).toBe(job.id);
    expect(cut.shots[0].takeId).toBe(take.id);
    expect(videoExport.selectedCutId).toBe(cut.id);
    expect(publication.exportId).toBe(videoExport.id);
    expect(outcome.publicationId).toBe(verifiedPublication.id);
    expect(videoExport.state.kind).toBe('draft');
    expect(publication.status).toBe('draft');
  });

  it('copies exact script content into revision identity instead of depending on object references', () => {
    const mutable = { ...source, snapshot: { ...source.snapshot } };
    const before = identity(mutable);
    expect(identity({ ...mutable, snapshot: { ...mutable.snapshot } })).toEqual(before);
    mutable.snapshot.body = 'Second line';
    expect(before.snapshot.body).toBe('First line');
    expect(before.snapshot).not.toBe(mutable.snapshot);
    expect(revisionFreshness(source, plan)).toBe('current');
  });

  it('keeps prior downstream work and labels it stale after a script edit', () => {
    const edited: ScriptRevision = {
      ...source,
      id: 'script-2' as ScriptRevisionId,
      snapshot: { ...source.snapshot, body: 'A stronger opening' },
    };
    const artifacts = [
      plan,
      shot,
      reference,
      asset,
      job,
      take,
      cut,
      videoExport,
      publication,
      outcome,
    ];
    const assessed = assessRevisionArtifacts(edited, artifacts);
    expect(assessed).toHaveLength(artifacts.length);
    expect(assessed.map(({ freshness }) => freshness)).toEqual(artifacts.map(() => 'stale'));
    assessed.forEach(({ artifact }, index) => expect(artifact).toBe(artifacts[index]));
    expect(artifacts[0]).toEqual(plan);
    expect(assessRevisionArtifacts(source, artifacts).map(({ freshness }) => freshness)).toEqual(
      artifacts.map(() => 'current'),
    );
  });

  it('treats a new revision ID with identical text as a different revision', () => {
    const reissued = { ...source, id: 'script-3' as ScriptRevisionId };
    expect(revisionFreshness(reissued, plan)).toBe('stale');
  });

  it('rejects a reused revision ID with changed content instead of claiming current', () => {
    const altered = { ...source, snapshot: { ...source.snapshot, title: 'Another title' } };
    expect(revisionFreshness(altered, plan)).toBe('invalid');
  });

  it('does not treat a different owner or project with a matching revision ID as current', () => {
    expect(revisionFreshness({ ...source, userId: 'creator-B' }, plan)).toBe('foreign');
    expect(revisionFreshness({ ...source, projectId: 'project-2' as ProjectId }, plan)).toBe(
      'foreign',
    );
    expect(revisionFreshness(source, { ...plan, userId: 'creator-B' })).toBe('invalid');
    expect(
      revisionFreshness(source, {
        ...plan,
        userId: 'creator-B',
        sourceRevision: { ...plan.sourceRevision, userId: 'creator-B' },
      }),
    ).toBe('foreign');
  });

  it('fails closed on missing, whitespace-only, or malformed revision identity', () => {
    expect(revisionIdentity(null)).toBeNull();
    expect(revisionIdentity({ ...source, id: ' ' as ScriptRevisionId })).toBeNull();
    expect(revisionIdentity({ ...source, userId: '' })).toBeNull();
    expect(revisionIdentity({ ...source, snapshot: null } as unknown as ScriptRevision)).toBeNull();
    expect(
      revisionFreshness(source, { ...plan, sourceRevision: null } as unknown as ShotPlan),
    ).toBe('invalid');
    expect(revisionFreshness(null, plan)).toBe('invalid');
    expect(
      revisionFreshness(source, {
        ...plan,
        sourceRevision: { ...plan.sourceRevision, id: '' as ScriptRevisionId },
      }),
    ).toBe('invalid');
    expect(
      revisionFreshness(source, {
        ...plan,
        sourceRevision: { ...plan.sourceRevision, projectId: 'project-2' as ProjectId },
      }),
    ).toBe('invalid');
  });

  it('keeps reusable project references separate from shot-revision-bound references', () => {
    const reusableAsset: Asset = {
      ...owner,
      id: 'asset-project' as Asset['id'],
      scope: 'project',
      mediaType: 'image',
      storage: { kind: 'pending' },
      rights: 'unknown',
    };
    const reusable: Reference = {
      ...owner,
      id: 'ref-project' as Reference['id'],
      scope: 'project',
      assetId: reusableAsset.id,
      role: 'brand',
    };
    expect(reusable.scope).toBe('project');
    expect(reference.scope).toBe('shot');
    expect('sourceRevision' in reusable).toBe(false);
    expect(revisionFreshness(source, reusable)).toBe('unbound');
    expect(revisionFreshness(source, reusableAsset)).toBe('unbound');
    expect(revisionFreshness({ ...source, id: 'script-4' as ScriptRevisionId }, reusable)).toBe(
      'unbound',
    );
    expect(revisionFreshness({ ...source, userId: 'creator-B' }, reusable)).toBe('foreign');
  });

  it('distinguishes local status, provider observations, estimated cost, and verified publication', () => {
    const observedJob: GenerationJob = {
      ...job,
      providerId: 'example-provider',
      modelId: 'example-model',
      providerOperationId: 'example-operation',
      status: { source: 'provider', phase: 'succeeded', observedAt: '2026-11-07T01:00:00Z' },
      observedCost: {
        kind: 'observed',
        minorUnits: 15,
        currency: 'USD',
        basis: 'provider_usage',
        observedAt: '2026-11-07T01:01:00Z',
      },
    };

    expect(job.status.source).toBe('local');
    expect(job.estimatedCost?.kind).toBe('estimate');
    expect(observedJob.observedCost?.kind).toBe('observed');
    expect(verifiedPublication.status).toBe('verified');
    // Compile-time checks: estimates, local statuses, drafts cannot claim observed success.
    expectTypeOf<EstimatedCost>().not.toMatchTypeOf<ObservedCost>();
    expectTypeOf<{ source: 'local'; phase: 'succeeded' }>().not.toMatchTypeOf<GenerationStatus>();
    expectTypeOf<{ status: 'verified' }>().not.toMatchTypeOf<Publication>();
    expectTypeOf<Extract<Publication, { status: 'verified' }>>().toMatchTypeOf<{
      verification: PublicationVerification;
    }>();
  });
});
