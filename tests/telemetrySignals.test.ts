// F5.5 Telemetry service — Experience Blueprint signal computation.
// Pure functions, no Firestore writes, no provider calls, no side effects.
import { describe, expect, it } from 'vitest';
import {
  computeMomentumBar,
  computeOneLever,
  computeSignals,
  type Project,
} from '../src/services/telemetry';

const brand = { niche: 'productivity', brandCompleted: true };

function proj(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Untitled',
    type: 'content',
    status: 'draft',
    data: { title: 'Untitled', body: '', platform: 'youtube', score: 0 },
    userId: 'user-1',
    studioStage: 'draft',
    createdAt: new Date('2026-11-01'),
    updatedAt: new Date('2026-11-01'),
    ...overrides,
  };
}

describe('computeOneLever edge cases', () => {
  it('returns an onboarding lever when there are no projects', () => {
    const result = computeOneLever([], brand);
    expect(result.lever).toBe('Create your first project');
    expect(result.action).toBe('create-first-project');
    expect(result.impact).toBe('Foundation');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('treats an all-drafts backlog as a publish lever', () => {
    const projects = [
      proj({ id: 'a', data: { title: 'Draft A', score: 0 }, status: 'draft' }),
      proj({ id: 'b', data: { title: 'Draft B', score: 10 }, status: 'draft' }),
    ];
    const result = computeOneLever(projects, brand);
    expect(result.action).toBe('publish');
    expect(result.impact).toBe('Reach');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('prioritizes a low-scoring project over drafts', () => {
    const projects = [
      proj({ id: 'a', data: { title: 'Draft A', score: 0 }, status: 'draft' }),
      proj({ id: 'b', data: { title: 'Low scorer', score: 20 }, status: 'published' }),
    ];
    const result = computeOneLever(projects, brand);
    expect(result.action).toBe('improve-retention');
    expect(result.lever).toContain('Low scorer');
  });

  it('recommends repurposing the best performer for a mixed staged/published set', () => {
    const projects = [
      proj({ id: 'a', data: { title: 'Draft A', score: 90 }, status: 'draft' }),
      proj({ id: 'b', data: { title: 'Published B', score: 80 }, status: 'published' }),
      proj({ id: 'c', data: { title: 'Published C', score: 50 }, status: 'published' }),
    ];
    const result = computeOneLever(projects, brand);
    expect(result.action).toBe('repurpose');
    expect(result.lever).toContain('Draft A');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('ignores brand when picking the lever', () => {
    const projects = [proj({ id: 'a', data: { title: 'X', score: 90 }, status: 'published' })];
    const result = computeOneLever(projects, {});
    expect(result.action).toBe('repurpose');
  });
});

describe('computeMomentumBar bounds', () => {
  it('returns 0 with no projects', () => {
    expect(computeMomentumBar([], [])).toBe(0);
  });

  it('clamps to 100 even with many high-scoring published projects', () => {
    const projects = Array.from({ length: 50 }, (_, i) =>
      proj({ id: `p${i}`, data: { title: `P${i}`, score: 100 }, status: 'published' }),
    );
    expect(
      computeMomentumBar(
        projects,
        Array.from({ length: 20 }, (_, i) => `act-${i}`),
      ),
    ).toBe(100);
  });

  it('stays within 0-100 for arbitrary inputs', () => {
    const cases: [Project[], any[]][] = [
      [[], []],
      [[proj()], []],
      [[proj({ status: 'published', data: { score: 100 } })], ['a']],
      [
        Array.from({ length: 100 }, (_, i) =>
          proj({ id: `p${i}`, data: { score: 100 }, status: 'published' }),
        ),
        Array.from({ length: 1000 }, (_, i) => `act-${i}`),
      ],
    ];
    for (const [projects, activity] of cases) {
      const value = computeMomentumBar(projects, activity);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('increases with published count and recent activity', () => {
    const base = computeMomentumBar([proj({ status: 'published', data: { score: 50 } })], []);
    const withActivity = computeMomentumBar(
      [proj({ status: 'published', data: { score: 50 } })],
      ['a', 'b'],
    );
    expect(withActivity).toBeGreaterThan(base);
  });
});

describe('computeSignals priority ordering', () => {
  it('sorts signals high -> medium -> low', () => {
    const projects = [
      proj({ id: 'a', data: { title: 'Low scorer', score: 20 }, status: 'published' }), // retention (high)
      proj({ id: 'b', data: { title: 'Draft B', score: 0 }, status: 'draft' }), // publish (medium)
      proj({ id: 'c', data: { title: 'Best', score: 90 }, status: 'published' }), // repurpose (low)
    ];
    const { signals } = computeSignals(projects, brand);
    const priorities = signals.map((s) => s.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => rank(a) - rank(b)));
    expect(priorities[0]).toBe('high');
    expect(priorities[priorities.length - 1]).toBe('low');
  });

  it('returns oneLever, momentumBar and signals', () => {
    const projects = [proj({ status: 'published', data: { score: 80 } })];
    const result = computeSignals(projects, brand);
    expect(result.oneLever).toHaveProperty('lever');
    expect(result.oneLever).toHaveProperty('action');
    expect(result.oneLever).toHaveProperty('impact');
    expect(result.oneLever).toHaveProperty('confidence');
    expect(typeof result.momentumBar).toBe('number');
    expect(Array.isArray(result.signals)).toBe(true);
    expect(result.signals.every((s) => s.actionable === true)).toBe(true);
  });

  it('produces an onboarding signal with no projects', () => {
    const { signals, oneLever } = computeSignals([], brand);
    expect(oneLever.action).toBe('create-first-project');
    expect(signals.some((s) => s.type === 'onboarding')).toBe(true);
  });
});

describe('real Studio casing and missing scores', () => {
  it('treats capitalized Draft statuses as drafts for the publish lever', () => {
    const projects = [
      proj({ id: 'a', data: { title: 'Draft A', score: 0 }, status: 'Draft' }),
      proj({ id: 'b', data: { title: 'Draft B', score: 10 }, status: 'Draft' }),
    ];
    const result = computeOneLever(projects, brand);
    expect(result.action).toBe('publish');
    expect(result.lever).toContain('Draft A');
  });

  it('treats capitalized Published statuses as shipped for retention', () => {
    const projects = [
      proj({ id: 'a', data: { title: 'Draft A', score: 0 }, status: 'Draft' }),
      proj({ id: 'b', data: { title: 'Low scorer', score: 20 }, status: 'Published' }),
    ];
    const result = computeOneLever(projects, brand);
    expect(result.action).toBe('improve-retention');
    expect(result.lever).toContain('Low scorer');
  });

  it('does not flag an unscored published project as a retention problem', () => {
    const projects = [proj({ id: 'a', data: { title: 'Unscored' }, status: 'Published' })];
    const result = computeOneLever(projects, brand);
    expect(result.action).toBe('repurpose');
    expect(result.lever).toContain('Unscored');
  });

  it('counts capitalized Published projects in the momentum bonus', () => {
    const draftBar = computeMomentumBar([proj({ status: 'Draft', data: { score: 50 } })], []);
    const publishedBar = computeMomentumBar(
      [proj({ status: 'Published', data: { score: 50 } })],
      [],
    );
    expect(publishedBar).toBe(draftBar + 2);
  });

  it('emits publish signals for Draft projects and no retention signal for unscored work', () => {
    const projects = [
      proj({ id: 'a', data: { title: 'Unscored' }, status: 'Published' }),
      proj({ id: 'b', data: { title: 'Draft B', score: 90 }, status: 'Draft' }),
    ];
    const { signals } = computeSignals(projects, brand);
    expect(signals.some((s) => s.type === 'retention')).toBe(false);
    expect(signals.some((s) => s.type === 'publish' && s.id === 'publish-b')).toBe(true);
  });
});

function rank(priority: 'high' | 'medium' | 'low'): number {
  return { high: 0, medium: 1, low: 2 }[priority];
}
