import React from 'react';
import { ContentStudioWorkflow } from '@/components/ContentStudioWorkflow';
import { RoadmapStepper } from '@/components/RoadmapStepper';
import { Sparkle, PenNib, ArrowUpRight, Columns } from '@phosphor-icons/react';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  className?: string;
}

interface PanelConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const defaultLeftPanel: PanelConfig = {
  id: 'studio',
  title: 'Content Studio',
  icon: <Sparkle className="h-5 w-5" weight="bold" />,
  color: 'var(--accent)',
  badge: 'Ideas → Drafts → Published',
};

const defaultRightPanel: PanelConfig = {
  id: 'roadmap',
  title: 'Roadmap',
  icon: <Columns size={18} className="text-[var(--accent)]" />,
  color: 'var(--accent)',
};

export function WorkspaceLayout({ 
  children, 
  leftPanel, 
  rightPanel, 
  className 
}: WorkspaceLayoutProps) {
  return (
    <main className={`flex-1 overflow-hidden flex lg:px-0 lg:py-0 ${className || ''}`}>
      <div className="flex flex-1 h-full lg:grid lg:grid-cols-[280px_1fr_320px] lg:gap-4 lg:p-4 lg:h-full">
        {/* Left Panel - Content Studio */}
        <aside className="hidden lg:flex flex-col h-full card-glass border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {defaultLeftPanel.icon}
              <h3 className="font-semibold text-[var(--label-primary)]">{defaultLeftPanel.title}</h3>
            </div>
            <span className="text-micro font-medium px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
              {defaultLeftPanel.badge}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {leftPanel || (
              <ContentStudioWorkflow
                stages={[
                  { id: 'ideas', label: 'Ideas', count: 0, icon: <Sparkle className="h-5 w-5" weight="bold" />, color: 'var(--accent)', description: 'Capture & refine concepts' },
                  { id: 'drafts', label: 'Drafts', count: 0, icon: <PenNib className="h-5 w-5" weight="bold" />, color: '#8faa6e', description: 'Write & polish content' },
                  { id: 'published', label: 'Published', count: 0, icon: <ArrowUpRight className="h-5 w-5" weight="bold" />, color: '#d89b5c', description: 'Live & performing' },
                ]}
                activeStage="drafts"
                onStageChange={() => {}}
                onCreateContent={() => {}}
              />
            )}
          </div>
        </aside>

        {/* Center Panel - Main Workspace */}
        <section className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:overflow-y-auto">
          <div className="flex-1 flex flex-col min-h-0">{children}</div>
        </section>

        {/* Right Panel - Roadmap */}
        <aside className="hidden lg:flex flex-col h-full card-glass border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {defaultRightPanel.icon}
              <h3 className="font-semibold text-[var(--label-primary)]">{defaultRightPanel.title}</h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {rightPanel || (
              <RoadmapStepper
                steps={[
                  { id: 'direction', title: 'Choose a direction', description: 'Write down one skill, experience, or interest you could share.', phase: 'discover' as const },
                  { id: 'person', title: 'Name one person', description: 'Describe a specific person and one problem they have.', phase: 'discover' as const },
                  { id: 'small_offer', title: 'Sketch a small way to help', description: 'Describe one small, concrete thing you could make.', phase: 'build' as const },
                  { id: 'brand', title: 'Build brand system', description: 'Visual identity, voice, and positioning for your channel.', phase: 'build' as const },
                  { id: 'first_content', title: 'Create first content', description: 'Script, record, and publish your first piece.', phase: 'build' as const },
                  { id: 'audience', title: 'Grow audience', description: 'Consistent publishing and engagement.', phase: 'monetize' as const },
                  { id: 'offer', title: 'Design your offer', description: 'Productize your expertise into a paid offer.', phase: 'monetize' as const },
                  { id: 'launch', title: 'Launch & iterate', description: 'First dollar to sustainable revenue.', phase: 'monetize' as const },
                ]}
                currentStepId="direction"
                onStepClick={() => {}}
              />
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}