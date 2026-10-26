import { describe, it, expect } from 'vitest';
import { SANDBOX_PRESETS, FAQS } from '../src/components/landing/landingData';

describe('LandingPage modular architecture (F5.4)', () => {
  it('loads sandbox presets for all defined niches and vibes', () => {
    expect(SANDBOX_PRESETS).toHaveProperty('tech');
    expect(SANDBOX_PRESETS).toHaveProperty('cooking');
    expect(SANDBOX_PRESETS).toHaveProperty('finance');

    expect(SANDBOX_PRESETS.tech).toHaveProperty('calm');
    expect(SANDBOX_PRESETS.tech).toHaveProperty('bold');
    expect(SANDBOX_PRESETS.tech).toHaveProperty('educational');

    const techCalm = SANDBOX_PRESETS.tech.calm;
    expect(techCalm.name).toBe('Cozy Coding');
    expect(techCalm.colors).toHaveProperty('primary');
    expect(techCalm.colors).toHaveProperty('secondary');
    expect(techCalm.colors).toHaveProperty('accent');
    expect(techCalm.fontHeading).toBeTruthy();
    expect(techCalm.fontBody).toBeTruthy();
    expect(techCalm.hook).toBeTruthy();
  });

  it('provides comprehensive honest FAQs', () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(4);
    FAQS.forEach((faq) => {
      expect(faq.q).toBeTruthy();
      expect(faq.a).toBeTruthy();
    });
  });
});
