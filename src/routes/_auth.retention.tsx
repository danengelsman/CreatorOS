import { createFileRoute } from '@tanstack/react-router';
import RetentionHookLab from '@/components/RetentionHookLab';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/retention')({
  component: () => {
    const auth = useAuth();
    const { brand } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <RetentionHookLab brand={brand} />
      </LayoutShell>
    );
  },
});
