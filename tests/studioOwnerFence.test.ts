import { describe, expect, it, vi } from 'vitest';
import { prepareStudioOwnerFence } from '../src/components/studio/studioOwnerFence';

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  Timestamp: class Timestamp {},
  serverTimestamp: () => 'server-timestamp',
  runTransaction: vi.fn(),
}));
import { Timestamp } from 'firebase/firestore';
const stamp = new Timestamp(1, 0);
const valid = () => ({
  uid: 'alice',
  version: 1,
  currentStep: 'direction',
  status: 'not_started',
  answers: {},
  completedSteps: [],
  createdAt: stamp,
  updatedAt: stamp,
});
const fake = (data: unknown) => ({
  get: vi.fn(async () => ({ exists: () => data !== null, data: () => data })),
  update: vi.fn(),
  set: vi.fn(),
});

describe('Studio owner fence', () => {
  it('reads the owner journey and stages only its unchanged updatedAt', async () => {
    const tx = fake(valid());
    const stage = await prepareStudioOwnerFence(tx as never, {} as never, 'alice');
    expect(tx.update).not.toHaveBeenCalled();
    stage();
    expect(tx.update).toHaveBeenCalledWith(
      { collection: 'first_dollar_journeys', id: 'alice' },
      { updatedAt: stamp },
    );
  });
  it.each([
    { ...valid(), uid: 'bob' },
    { ...valid(), extra: true },
    { ...valid(), updatedAt: 'legacy' },
  ])('fails closed on unavailable or legacy journey %#', async (journey) => {
    const tx = fake(journey);
    await expect(prepareStudioOwnerFence(tx as never, {} as never, 'alice')).rejects.toThrow(
      'journey',
    );
    expect(tx.update).not.toHaveBeenCalled();
  });
  it('initializes only a missing journey with the ordinary pristine Today defaults', async () => {
    const tx = fake(null);
    const stage = await prepareStudioOwnerFence(tx as never, {} as never, 'alice');
    expect(tx.set).not.toHaveBeenCalled();
    stage();
    expect(tx.set).toHaveBeenCalledWith(
      { collection: 'first_dollar_journeys', id: 'alice' },
      {
        ...valid(),
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      },
    );
    expect(tx.update).not.toHaveBeenCalled();
  });
  it('preserves a completed journey rather than resetting its progress', async () => {
    const journey = {
      ...valid(),
      status: 'completed',
      currentStep: 'small_offer',
      answers: { direction: 'Saved answer' },
      completedSteps: ['direction', 'person', 'small_offer'],
    };
    const tx = fake(journey);
    (await prepareStudioOwnerFence(tx as never, {} as never, 'alice'))();
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalledWith(
      { collection: 'first_dollar_journeys', id: 'alice' },
      { updatedAt: stamp },
    );
    expect(journey.answers).toEqual({ direction: 'Saved answer' });
  });
  it('checks lifecycle after the read and before staging', async () => {
    const tx = fake(valid());
    let current = true;
    const stage = await prepareStudioOwnerFence(tx as never, {} as never, 'alice', () => current);
    current = false;
    expect(stage).toThrow('Account changed');
    expect(tx.update).not.toHaveBeenCalled();
  });
});
