import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import StudioHub from '@/components/studio/StudioHub';
import { ContentStudioWorkflow } from '@/components/ContentStudioWorkflow';
import { useAuth } from '@/contexts/AuthContext';
import {
  useWorkspaceStore,
  selectBrand,
  selectProjects,
  selectProjectsLoading,
  selectProjectsError,
  selectSelectedIdea,
  selectSelectedIdeaReceipt,
  isWorkspaceTokenCurrent,
} from '@/store/workspaceStore';
import { Sparkle, PenNib, ArrowUpRight } from '@phosphor-icons/react';

export const Route = createFileRoute('/_auth/studio/')({
  component: StudioHome,
});

function StudioHome() {
  const { user, workspaceToken } = useAuth();
  const navigate = useNavigate();
  const { inspector } = Route.useSearch();
  const state = useWorkspaceStore();
  const token = workspaceToken?.uid === user?.uid ? workspaceToken : null;
  const brand = selectBrand(state, token);
  const projects = selectProjects(state, token);
  const isProjectsLoading = selectProjectsLoading(state, token);
  const projectsLoadError = selectProjectsError(state, token);
  const selectedIdea = selectSelectedIdea(state, token);
  const receipt = selectSelectedIdeaReceipt(state, token);
  const [studioActiveStage, setStudioActiveStage] = useState('drafts');

  // Content Studio workflow stages
  const contentProjects = projects.filter((p) => p.type === 'content');
  const studioStages = [
    {
      id: 'ideas' as const,
      label: 'Ideas',
      count: 0,
      icon: <Sparkle className="h-5 w-5" weight="bold" />,
      color: 'var(--accent)',
      description: 'Capture & refine concepts',
    },
    {
      id: 'drafts' as const,
      label: 'Drafts',
      count: contentProjects.filter((p) => p.status === 'draft').length,
      icon: <PenNib className="h-5 w-5" weight="bold" />,
      color: '#8faa6e',
      description: 'Write & polish content',
    },
    {
      id: 'published' as const,
      label: 'Published',
      count: contentProjects.filter((p) => p.status === 'published').length,
      icon: <ArrowUpRight className="h-5 w-5" weight="bold" />,
      color: '#d89b5c',
      description: 'Live & performing',
    },
  ];

  return (
    <>
      {inspector && (
        <motion.p
          role="status"
          className="px-4 py-2 text-caption text-[var(--label-secondary)]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Choose a project to open{' '}
          {inspector === 'retention'
            ? 'Hook & Retention'
            : inspector === 'repurpose'
              ? 'Repurpose'
              : 'Scene Planner'}
          .
        </motion.p>
      )}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Content Studio Workflow Visual */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <ContentStudioWorkflow
            stages={studioStages}
            activeStage={studioActiveStage}
            onStageChange={setStudioActiveStage}
            onCreateContent={() => void navigate({ to: '/create' })}
          />
        </motion.section>

        {/* Existing Studio Hub (Kanban) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <StudioHub
            key={token?.generation}
            user={user}
            isCurrentOwner={() => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)}
            brand={brand}
            projects={projects}
            isProjectsLoading={isProjectsLoading}
            projectsLoadError={projectsLoadError}
            selectedIdea={selectedIdea}
            selectedIdeaReceipt={receipt}
            onClearSelectedIdea={(seed, originalReceipt) =>
              state.clearSelectedIdea(token, seed, originalReceipt)
            }
            onOpenProject={(projectId) => {
              if (isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)) {
                void navigate({
                  to: '/studio/$projectId',
                  params: { projectId },
                  search: { inspector },
                });
              }
            }}
          />
        </motion.section>
      </div>
    </>
  );
}
