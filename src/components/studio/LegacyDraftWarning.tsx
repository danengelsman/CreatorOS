// The old key did not encode the boundary between user and project IDs.
// This warning must not depend on whether a matching storage entry exists.
export default function LegacyDraftWarning({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  if (!userId.includes(':') && !projectId.includes(':')) return null;
  return (
    <aside aria-label="Older draft recovery warning" className="space-y-2">
      <p>
        An older draft may not be recoverable automatically for this project. Older browser records
        cannot reliably identify their owner, so they are not displayed or imported.
      </p>
      <p>
        Keep this browser tab open and do not clear site data. Ask a trusted administrator about
        private recovery; do not share browser storage or draft contents with anyone who should not
        see them.
      </p>
    </aside>
  );
}
