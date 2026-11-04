import { expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  analytics: vi.fn(),
  generate: vi.fn(),
}));
vi.mock('react', async (original) => {
  const real = await original<typeof import('react')>();
  return {
    ...real,
    useState: (initial: any) => [initial, vi.fn()],
    useRef: (initial: any) => ({ current: initial }),
    useEffect: (effect: any) => h.effects.push(effect),
  };
});
vi.mock('../src/firebase', () => ({
  auth: { currentUser: { uid: 'owner' } },
  authorizedFetch: h.analytics,
  apiFetch: h.generate,
}));
import ContentIdeaGenerator from '../src/components/ContentIdeaGenerator';

it.each(['resolve', 'reject'])(
  'does not generate with the old brand after an account switch when analytics %ss',
  async (outcome) => {
    h.effects = [];
    h.analytics.mockReset();
    h.generate.mockReset();
    let finish!: (value: any) => void;
    let fail!: (error: Error) => void;
    h.analytics.mockReturnValue(
      new Promise((resolve, reject) => {
        finish = resolve;
        fail = reject;
      }),
    );
    let current = true;
    ContentIdeaGenerator({
      brand: { name: 'Private A' },
      onSelectIdea: vi.fn(),
      isCurrentOwner: () => current,
    });
    h.effects.forEach((effect) => effect());
    current = false;
    if (outcome === 'resolve') finish({ success: true, summary: {} });
    else fail(new Error('analytics failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.generate).not.toHaveBeenCalled();
  },
);
