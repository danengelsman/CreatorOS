import { describe, it, expect } from 'vitest';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import MadeWithLove from '../src/components/MadeWithLove';

describe('MadeWithLove component', () => {
  it('renders the founder credit with Holland, MI and Daniel Engelsman', () => {
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MadeWithLove));
    expect(html).toContain('Made with');
    expect(html).toContain('love in Holland, MI by Daniel Engelsman');
    expect(html).toContain('data-testid="founder-credit"');
  });

  it('accepts custom className', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(MadeWithLove, { className: 'custom-class' }),
    );
    expect(html).toContain('custom-class');
  });
});
