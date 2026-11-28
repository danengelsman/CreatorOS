import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Community from '@/components/Community';
import CreatorHub from '@/components/CreatorHub';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore, selectProjects } from '@/store/workspaceStore';
import { cn } from '@/lib/utils';

type HubTab = 'community' | 'projects';

const HUB_TABS: { id: HubTab; label: string }[] = [
  { id: 'community', label: 'Community' },
  { id: 'projects', label: 'Projects & Calendar' },
];

export const Route = createFileRoute('/_auth/hub')({
  component: () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const state = useWorkspaceStore();
    const token = auth.workspaceToken?.uid === auth.user?.uid ? auth.workspaceToken : null;
    const projects = selectProjects(state, token);
    const [tab, setTab] = useState<HubTab>('community');

    const setActiveTab = (next: string) =>
      navigate({ to: (next === 'home' ? '/dashboard' : `/${next}`) as any });

    return (
      <LayoutShell user={auth.user}>
        {/* Segmented control follows the same pattern CreatorHub uses for
            its Grid/Calendar switch. Community is the primary tab: the brief
            defines the Creator Hub as "Community and mastermind", with the
            projects/calendar view kept one tap away. */}
        <div className="flex justify-center pt-4 px-4">
          <div
            role="tablist"
            aria-label="Creator Hub sections"
            className="inline-flex p-1 bg-[var(--bg-secondary)] rounded-[10px] w-full max-w-[400px]"
          >
            {HUB_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex-1 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all',
                  tab === item.id
                    ? 'bg-[var(--bg-tertiary)] ios-elevated shadow-sm'
                    : 'text-[var(--label-secondary)]',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'community' ? (
          <Community user={auth.user} userData={auth.userData} setActiveTab={setActiveTab} />
        ) : (
          <CreatorHub projects={projects} setActiveTab={setActiveTab} />
        )}
      </LayoutShell>
    );
  },
});
