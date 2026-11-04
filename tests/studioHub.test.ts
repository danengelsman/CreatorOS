import { describe, expect, it } from 'vitest';
import { getPipelineColumn, makeProjectDraft, contentProjects } from '../src/components/studio/studioHubHelpers';

describe('studio pipeline', () => {
  it('maps existing statuses without changing them', () => {
    for (const status of [undefined, null, '', 'Draft', 'draft', 'In Ideation']) expect(getPipelineColumn({ status })).toBe('ideation');
    for (const status of ['Scheduled', 'scheduled', 'In Production', 'in_production']) expect(getPipelineColumn({ status })).toBe('production');
    for (const status of ['Published', 'published']) expect(getPipelineColumn({ status })).toBe('published');
    expect(getPipelineColumn({ status: 'unexpected custom status' })).toBe('ideation');
  });
  it('only includes content projects', () => {
    const projects = [{ type: 'content', id: '1' }, { type: 'brand_kit' }, { type: 'workflow' }, null];
    expect(contentProjects(projects)).toEqual([projects[0]]);
  });
  it('creates a valid blank draft without a brand', () => {
    expect(makeProjectDraft('u1')).toEqual({ userId: 'u1', name: 'Untitled Content', type: 'content', status: 'Draft', data: { title: '', body: '', platform: 'youtube' } });
  });
  it('preserves idea content and bounds project names', () => {
    const result = makeProjectDraft('u1', { title: 'x'.repeat(120), hook: 'Hello', description: 'Details' }, 'idea');
    expect(result.name).toHaveLength(99);
    expect(result.data.title).toHaveLength(120);
    expect(result.data.body).toBe('Hook: Hello\n\nConcept: Details');
  });
  it('preserves template text and maps the editor platform', () => {
    const result = makeProjectDraft('u1', { title: 'Template', hook: 'Hook', body: 'Body', platform: 'Twitter' }, 'template');
    expect(result.data).toEqual({ title: 'Template', body: 'Hook: Hook\n\nScript: Body', platform: 'twitter' });
    expect(makeProjectDraft('u1', { platform: 'Instagram' }, 'template').data.platform).toBe('instagram');
    expect(() => makeProjectDraft('u1', { platform: 'LinkedIn' }, 'template')).toThrow(/not supported/);
  });
});
