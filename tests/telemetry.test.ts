import { describe, it, expect } from 'vitest';
import { calculateOneLever } from '../src/services/telemetry';

describe('calculateOneLever telemetry navigation paths', () => {
  it('returns /studio for new users with no projects', () => {
    const signal = calculateOneLever({ brandCompleted: true }, []);
    expect(signal).not.toBeNull();
    expect(signal?.id).toBe('onboarding-lever');
    expect(signal?.action.path).toBe('/studio');
  });

  it('opens the relevant project for a retention signal', () => {
    const projects = [
      {
        id: 'proj-1',
        type: 'content',
        title: 'Low Retention Video',
        data: { retentionScore: 35 },
      },
    ];
    const signal = calculateOneLever({ brandCompleted: true }, projects);
    expect(signal).not.toBeNull();
    expect(signal?.id).toBe('retention-signal');
    expect(signal?.action.path).toBe('/studio/proj-1');
    expect(signal?.action.params?.inspector).toBe('retention');
  });

  it('returns /brand when brand is not completed', () => {
    const projects = [
      {
        id: 'proj-1',
        type: 'content',
        title: 'Normal Video',
        data: { retentionScore: 80 },
      },
    ];
    const signal = calculateOneLever({ brandCompleted: false }, projects);
    expect(signal).not.toBeNull();
    expect(signal?.id).toBe('brand-signal');
    expect(signal?.action.path).toBe('/brand');
  });

  it('opens the relevant project for growth momentum', () => {
    const projects = [
      {
        id: 'proj-1',
        type: 'content',
        title: 'High Performing Video',
        data: { retentionScore: 80 },
      },
    ];
    const signal = calculateOneLever({ brandCompleted: true }, projects);
    expect(signal).not.toBeNull();
    expect(signal?.id).toBe('growth-signal');
    expect(signal?.action.path).toBe('/studio/proj-1');
    expect(signal?.action.params?.inspector).toBe('repurpose');
  });

  it('ignores newer non-content projects when choosing the active video', () => {
    const signal = calculateOneLever({ brandCompleted: true }, [
      { id: 'strategy', type: 'strategy', data: { retentionScore: 10 } },
      { id: 'video', type: 'content', data: { retentionScore: 30 } },
    ]);
    expect(signal?.action.path).toBe('/studio/video');
    expect(signal?.action.params?.inspector).toBe('retention');
  });

  it('ensures no signal paths start with /dashboard/', () => {
    const scenarios = [
      calculateOneLever({}, []),
      calculateOneLever({}, [{ id: '1', title: 'T', data: { retentionScore: 20 } }]),
      calculateOneLever({ brandCompleted: false }, [
        { id: '1', title: 'T', data: { retentionScore: 80 } },
      ]),
      calculateOneLever({ brandCompleted: true }, [
        { id: '1', title: 'T', data: { retentionScore: 80 } },
      ]),
    ];

    for (const signal of scenarios) {
      expect(signal).not.toBeNull();
      expect(signal!.action.path.startsWith('/dashboard/')).toBe(false);
      expect(signal!.action.path.startsWith('/')).toBe(true);
    }
  });
});
