import { recoveryPendingWrites, type StudioBaseline, type StudioDraft } from './studioDraft';

export type StudioRecovery = {
  draft: StudioDraft;
  baseline: StudioBaseline;
  pending: StudioDraft | null;
  pendingWrites: StudioDraft[];
};

type Entry = { record: StudioRecovery | null; memoryOnly: boolean };
// Tab-lifetime only. A null record shadows an older sessionStorage record
// that could not be removed; it is not a representation of a remote project.
const entries = new Map<string, Map<string, Entry>>();
const leases = new Map<string, Map<string, object>>();
// If the existing value could not be inspected, never overwrite or remove it
// during this tab lifetime, even if reads later recover. It may be a draft.
const unreadable = new Map<string, Map<string, boolean>>();

// Avoid delimiter collisions between account/project pairs while preserving
// legacy keys for IDs that do not themselves contain the delimiter.
function storageKey(uid: string, projectId: string): string {
  return uid.includes(':') || projectId.includes(':')
    ? `studio-draft-v2:${JSON.stringify([uid, projectId])}`
    : `studio-draft:${uid}:${projectId}`;
}

function bucket<T>(map: Map<string, Map<string, T>>, uid: string): Map<string, T> {
  let result = map.get(uid);
  if (!result) {
    result = new Map();
    map.set(uid, result);
  }
  return result;
}

export function readRecovery(uid: string, projectId: string): Entry | undefined {
  const inMemory = entries.get(uid)?.get(projectId);
  if (inMemory) return inMemory;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(uid, projectId)) || 'null');
    if (!saved) return undefined;
    if (
      !['title', 'body', 'platform'].every(
        (key) =>
          typeof saved.draft?.[key] === 'string' && typeof saved.baseline?.[key] === 'string',
      )
    ) {
      bucket(unreadable, uid).set(projectId, true);
      if (['title', 'body', 'platform'].every((key) => typeof saved.draft?.[key] === 'string')) {
        const pendingWrites = recoveryPendingWrites(saved);
        return {
          record: {
            draft: saved.draft,
            baseline: { ...saved.draft, name: undefined },
            pending: pendingWrites[0] || null,
            pendingWrites,
          },
          memoryOnly: true,
        };
      }
      return { record: null, memoryOnly: true };
    }
    const pendingWrites = recoveryPendingWrites(saved);
    return {
      record: {
        draft: saved.draft,
        baseline: saved.baseline,
        pending: pendingWrites[0] || null,
        pendingWrites,
      },
      memoryOnly: false,
    };
  } catch {
    bucket(unreadable, uid).set(projectId, true);
    return { record: null, memoryOnly: true };
  }
}

// Legacy records without a valid baseline are copyable, but not saveable.
export function readRecoveryDraft(
  uid: string,
  projectId: string,
): { draft: StudioDraft; memoryOnly: boolean } | undefined {
  const memory = entries.get(uid)?.get(projectId);
  if (memory)
    return memory.record
      ? { draft: memory.record.draft, memoryOnly: memory.memoryOnly }
      : undefined;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(uid, projectId)) || 'null');
    if (
      saved &&
      ['title', 'body', 'platform'].every((key) => typeof saved.draft?.[key] === 'string')
    ) {
      return { draft: saved.draft, memoryOnly: false };
    }
  } catch {
    /* No storage-backed draft available. */
  }
  return undefined;
}

// Every committed editor mount gets a fresh lease, including re-entry with the
// same UID after an account-generation change. Late callbacks from older mounts
// cannot update or remove the new mount's recovery record.
export function claimRecovery(uid: string, projectId: string, lease: object): void {
  bucket(leases, uid).set(projectId, lease);
}
export function ownsRecovery(uid: string, projectId: string, lease: object): boolean {
  return leases.get(uid)?.get(projectId) === lease;
}
export function releaseRecovery(uid: string, projectId: string, lease: object): void {
  if (ownsRecovery(uid, projectId, lease)) leases.get(uid)?.delete(projectId);
}
export function persistRecovery(
  uid: string,
  projectId: string,
  lease: object,
  record: StudioRecovery | null,
): boolean {
  if (!ownsRecovery(uid, projectId, lease)) return false;
  let memoryOnly = false;
  try {
    const key = storageKey(uid, projectId);
    if (unreadable.get(uid)?.get(projectId)) throw new Error('Uninspected recovery record');
    try {
      sessionStorage.getItem(key);
    } catch {
      bucket(unreadable, uid).set(projectId, true);
      throw new Error('Recovery read unavailable');
    }
    const value = record ? JSON.stringify(record) : null;
    if (value !== null) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
    // Writes can succeed while reads are blocked; keep the latest copy in
    // memory unless it can actually be recovered from storage.
    if (sessionStorage.getItem(key) !== value) memoryOnly = true;
  } catch {
    memoryOnly = true;
  }
  if (memoryOnly) bucket(entries, uid).set(projectId, { record, memoryOnly });
  else entries.get(uid)?.delete(projectId);
  return memoryOnly;
}
