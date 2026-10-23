import { createFileRoute } from '@tanstack/react-router';
import Profile from '@/components/Profile';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/profile')({
  component: () => {
    const auth = useAuth();
    const { brand, projects } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <Profile user={auth.user} userData={auth.userData} brand={brand} projects={projects} />
      </LayoutShell>
    );
  },
});
