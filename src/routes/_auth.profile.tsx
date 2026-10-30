import { createFileRoute } from '@tanstack/react-router';
import Profile from '@/components/Profile';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore, selectBrand, selectProjects } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/profile')({
  component: () => {
    const auth = useAuth();
    const state = useWorkspaceStore();
    const token = auth.workspaceToken?.uid === auth.user?.uid ? auth.workspaceToken : null;
    const brand = selectBrand(state, token);
    const projects = selectProjects(state, token);

    return (
      <LayoutShell user={auth.user}>
        <Profile user={auth.user} userData={auth.userData} brand={brand} projects={projects} />
      </LayoutShell>
    );
  },
});
