import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/firebase', () => ({ db: {} }));
vi.mock('../src/components/ContentIdeaGenerator', () => ({ default: () => null }));
vi.mock('../src/components/ViralTemplatesLibrary', () => ({ default: () => null }));

import StudioHub from '../src/components/studio/StudioHub';

const props = {
  user: { uid: 'owner' },
  brand: null,
  isProjectsLoading: false,
  projectsLoadError: false,
  onOpenProject: vi.fn(),
  projects: [],
};

describe('StudioHub rendering', () => {
  it('offers a selected VideoIdeas handoff without consuming it while rendering', () => {
    const clear = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(StudioHub, {
        ...props,
        selectedIdea: { title: 'Handoff idea', hook: 'Hook', description: 'Concept' },
        onClearSelectedIdea: clear,
      }),
    );
    expect(html).toContain('Handoff idea');
    expect(html).toContain('Create from selected idea');
    expect(clear).not.toHaveBeenCalled();
  });
  it('shows loading and failure rather than an empty pipeline', () => {
    const loading = renderToStaticMarkup(
      React.createElement(StudioHub, { ...props, isProjectsLoading: true }),
    );
    expect(loading).toContain('Loading your projects');
    expect(loading).not.toContain('Your ideas and drafts will appear here');
    const error = renderToStaticMarkup(
      React.createElement(StudioHub, { ...props, projectsLoadError: true }),
    );
    expect(error).toContain('Projects could not be loaded');
    expect(error).not.toContain('Your ideas and drafts will appear here');
  });

  it('blocks a calendar-dated draft even without auto-publish', () => {
    const html = renderToStaticMarkup(
      React.createElement(StudioHub, {
        ...props,
        projects: [
          {
            id: 'dated',
            userId: 'owner',
            type: 'content',
            name: 'Calendar draft',
            status: 'Draft',
            scheduledDate: new Date(),
            autoPublish: false,
          },
        ],
      }),
    );
    expect(html.indexOf('Calendar draft')).toBeGreaterThan(html.indexOf('pipeline-production'));
    expect(html).toContain('Dates are manual plans');
    expect(html).not.toContain('Mark ready');
  });

  it('shows legacy boolean-published projects as published without stage controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(StudioHub, {
        ...props,
        projects: [
          {
            id: 'legacy',
            userId: 'owner',
            type: 'content',
            name: 'Legacy live',
            status: 'Draft',
            published: true,
          },
        ],
      }),
    );
    expect(html.indexOf('Legacy live')).toBeGreaterThan(html.indexOf('pipeline-published'));
    expect(html).toContain('This saved publication claim is not verified');
    expect(html).not.toContain('Change stage for Legacy live');
  });

  it('places only content projects into the mapped columns without hiding legacy statuses', () => {
    const html = renderToStaticMarkup(
      React.createElement(StudioHub, {
        ...props,
        projects: [
          { id: 'one', userId: 'owner', type: 'content', name: 'Draft item', status: 'Draft' },
          {
            id: 'two',
            userId: 'owner',
            type: 'content',
            name: 'Scheduled item',
            status: 'Scheduled',
          },
          { id: 'three', userId: 'owner', type: 'content', name: 'Live item', status: 'Published' },
          { id: 'four', userId: 'owner', type: 'workflow', name: 'Hidden workflow' },
        ],
      }),
    );
    expect(html).toContain('lg:grid-cols-3');
    expect(html).not.toContain('lg:grid-cols-4');
    const ideation = html.indexOf('pipeline-ideation');
    const production = html.indexOf('pipeline-production');
    const published = html.indexOf('pipeline-published');
    expect(html.indexOf('Draft item')).toBeGreaterThan(ideation);
    expect(html.indexOf('Draft item')).toBeLessThan(production);
    expect(html.indexOf('Scheduled item')).toBeGreaterThan(production);
    expect(html.indexOf('Scheduled item')).toBeLessThan(published);
    expect(html.indexOf('Live item')).toBeGreaterThan(published);
    expect(html).not.toContain('Hidden workflow');
    expect(html).toContain('Status: Scheduled');
    expect(html).toContain('Dates are manual plans');
    expect(html).toContain('does not publish content');
    expect(html).not.toContain('Mark as published');
    expect(html).toContain('Mark ready');
  });
});
