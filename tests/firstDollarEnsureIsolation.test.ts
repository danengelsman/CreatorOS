import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock('../src/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collection: string, uid: string) => ({ collection, uid }),
  runTransaction: fake.runTransaction,
  serverTimestamp: () => 'timestamp',
  onSnapshot: vi.fn(),
}));

import {
  ensureFirstDollarJourney,
  updateFirstDollarJourney,
} from '../src/services/firstDollarJourney';

describe('ensureFirstDollarJourney account lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.runTransaction.mockImplementation((_db, callback) =>
      callback({ get: fake.get, set: fake.set, update: fake.update }),
    );
  });

  it('does not stage a write when the originating generation changes during the read', async () => {
    let current = true;
    let release!: (value: { exists: () => boolean }) => void;
    fake.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = ensureFirstDollarJourney('A', () => current);
    expect(fake.get).toHaveBeenCalledWith({ collection: 'first_dollar_journeys', uid: 'A' });
    current = false;
    release({ exists: () => false });
    await expect(pending).rejects.toThrow();
    expect(fake.set).not.toHaveBeenCalled();
  });

  it('does not start another read when a transaction is retried after a switch', async () => {
    let current = true;
    fake.get.mockResolvedValue({ exists: () => false });
    fake.runTransaction.mockImplementation(async (_db, callback) => {
      await callback({ get: fake.get, set: fake.set });
      current = false;
      return callback({ get: fake.get, set: fake.set });
    });
    await expect(ensureFirstDollarJourney('A', () => current)).rejects.toThrow();
    expect(fake.get).toHaveBeenCalledOnce();
    expect(fake.set).toHaveBeenCalledOnce();
  });

  it('does not stage an update after the originating generation changes during the read', async () => {
    let current = true;
    let release!: (value: { exists: () => boolean }) => void;
    fake.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = updateFirstDollarJourney('A', { type: 'start' }, () => current);
    current = false;
    release({ exists: () => true });
    await expect(pending).rejects.toThrow();
    expect(fake.update).not.toHaveBeenCalled();
  });

  it('creates a normal journey for a current generation', async () => {
    fake.get.mockResolvedValue({ exists: () => false });
    const journey = await ensureFirstDollarJourney('A', () => true);
    expect(journey.uid).toBe('A');
    expect(fake.set).toHaveBeenCalledOnce();
  });
});
