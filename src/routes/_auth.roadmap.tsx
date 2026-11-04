import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import Roadmap from '@/components/Roadmap';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore, selectBrand, selectProjects } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/roadmap')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const state = useWorkspaceStore();
    const token = auth.workspaceToken?.uid === auth.user?.uid ? auth.workspaceToken : null;
    const brand = selectBrand(state, token);
    const projects = selectProjects(state, token);

    return (
      <LayoutShell user={auth.user}>
        <div className="px-4 pt-4 sm:px-6">
          <Link
            to="/first-dollar"
            className="text-sm font-semibold text-[var(--accent)] underline focus-visible:outline focus-visible:outline-2"
          >
            First Dollar dashboard
          </Link>
        </div>
        <Roadmap
          user={auth.user}
          brand={brand}
          projects={projects}
          setActiveTab={(tab) =>
            navigate({ to: (tab === 'home' ? '/dashboard' : `/${tab}`) as any })
          }
        />
      </LayoutShell>
    );
  },
});
