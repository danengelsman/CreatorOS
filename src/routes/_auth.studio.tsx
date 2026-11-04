import { createFileRoute, Outlet } from '@tanstack/react-router';
import LayoutShell from '@/components/LayoutShell';
import StudioAssistants from '@/components/studio/StudioAssistants';
import { useAuth } from '@/contexts/AuthContext';

type StudioSearch = {
  assistant?: 'analyzer' | 'copilot';
  inspector?: 'retention' | 'planner' | 'repurpose';
};

export const Route = createFileRoute('/_auth/studio')({
  validateSearch: (search: Record<string, unknown>): StudioSearch => ({
    assistant: search.assistant === 'analyzer' || search.assistant === 'copilot' ? search.assistant : undefined,
    inspector:
      search.inspector === 'retention' || search.inspector === 'planner' || search.inspector === 'repurpose'
        ? search.inspector
        : undefined,
  }),
  component: StudioLayout,
});

function StudioLayout() {
  const { user } = useAuth();
  const { assistant } = Route.useSearch();
  return (
    <LayoutShell user={user}>
      <div className="flex justify-end mb-4">
        <StudioAssistants key={`${user?.uid ?? ''}:${assistant ?? ''}`} user={user} initialAssistant={assistant} />
      </div>
      <Outlet />
    </LayoutShell>
  );
}
