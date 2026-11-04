import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../src/services/gemini', () => ({
  analyzeAndOptimizeRetention: vi.fn(),
  generateScenePlan: vi.fn(),
  repurposeContent: vi.fn(),
}));
import RetentionHookLab from '../src/components/RetentionHookLab';
import ScenePlanner from '../src/components/ScenePlanner';
import ContentRepurposer from '../src/components/ContentRepurposer';

describe('inspector current editor input', () => {
  it('renders the current script in every tool without requiring paste', () => {
    const currentScript = 'CURRENT UNSAVED SCRIPT';
    const components = [
      React.createElement(RetentionHookLab, { initialText: 'OLD', currentText: currentScript }),
      React.createElement(ScenePlanner, {
        initialScript: 'OLD',
        currentScript,
        currentTitle: 'CURRENT TITLE',
        showToast: () => {},
      }),
      React.createElement(ContentRepurposer, { currentContent: currentScript }),
    ];
    for (const component of components) {
      const html = renderToStaticMarkup(component);
      expect(html).toContain(currentScript);
      expect(html).toContain('readOnly');
      expect(html).not.toContain('>OLD</textarea>');
    }
    expect(renderToStaticMarkup(components[1])).toContain('CURRENT TITLE');
  });
  it('still allows standalone tools to accept their own inputs', () => {
    const html = renderToStaticMarkup(React.createElement(ContentRepurposer, {}));
    expect(html).not.toContain('readOnly');
  });
});
