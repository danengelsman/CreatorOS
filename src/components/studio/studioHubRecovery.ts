import type { StarterKind } from './studioHubHelpers';

export type PendingCreate = {
  version: 1;
  owner: string;
  id: string;
  operationId: string;
  draft: { userId: string; type: 'content'; [key: string]: unknown };
  kind: StarterKind;
};

const key = (owner: string) => `studio.pending-create.v1:${encodeURIComponent(owner)}`;

// sessionStorage survives same-tab reload/remount, not a closed tab or another device.
// Never silently replace malformed or inaccessible recovery records.
export function readPending(owner: string): PendingCreate | null {
  const raw = sessionStorage.getItem(key(owner));
  if (raw === null) return null;
  const value = JSON.parse(raw) as PendingCreate;
  if (
    value?.version !== 1 ||
    value.owner !== owner ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.operationId !== 'string' ||
    !value.operationId ||
    value.draft?.userId !== owner ||
    value.draft?.type !== 'content' ||
    !['blank', 'idea', 'template'].includes(value.kind)
  ) {
    throw new Error('Invalid recovery record');
  }
  return value;
}

export function writePending(value: PendingCreate): void {
  const raw = JSON.stringify(value);
  sessionStorage.setItem(key(value.owner), raw);
  if (sessionStorage.getItem(key(value.owner)) !== raw)
    throw new Error('Recovery record was not stored');
}

export function clearPending(value: PendingCreate): void {
  const current = readPending(value.owner);
  if (!current || current.operationId !== value.operationId)
    throw new Error('Recovery record changed');
  sessionStorage.removeItem(key(value.owner));
  if (sessionStorage.getItem(key(value.owner)) !== null)
    throw new Error('Recovery record was not cleared');
}
