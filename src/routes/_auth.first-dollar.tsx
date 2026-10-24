import { createFileRoute, useNavigate } from '@tanstack/react-router';
import FirstDollarDashboard from '@/components/FirstDollarDashboard';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/first-dollar')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const { brand } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <FirstDollarDashboard
          user={auth.user}
          brand={brand}
          setActiveTab={(tab) =>
            navigate({ to: (tab === 'home' ? '/dashboard' : `/${tab}`) as any })
          }
        />
      </LayoutShell>
    );
  },
});
