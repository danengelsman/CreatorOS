import React from 'react';
import { createRoot } from 'react-dom/client';
import StudioAssistants from '../../src/components/studio/StudioAssistants';
import '../../src/index.css';

const initial = new URLSearchParams(window.location.search).get('assistant');
createRoot(document.getElementById('root')!).render(
  <main>
    <label>
      Studio notes <input aria-label="Studio notes" />
    </label>
    <StudioAssistants
      user={null}
      initialAssistant={initial === 'analyzer' || initial === 'copilot' ? initial : undefined}
    />
    <button type="button">Outside action</button>
  </main>,
);
