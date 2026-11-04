export type PipelineColumn = 'ideation' | 'production' | 'published';
export type StudioStage = 'ideation' | 'production' | 'complete';
export type StarterKind = 'blank' | 'idea' | 'template';

const normalizedStatus = (status: unknown) =>
  typeof status === 'string' ? status.trim().toLowerCase().replace(/[_-]+/g, ' ') : '';

export function isPublished(project: any): boolean {
  return project?.published === true || normalizedStatus(project?.status) === 'published';
}

export function isScheduleManaged(project: any): boolean {
  return (
    !!project?.autoPublish ||
    project?.scheduledDate != null ||
    normalizedStatus(project?.status) === 'scheduled'
  );
}

// Calendar publication status takes precedence; studioStage never publishes content.
export function getPipelineColumn(project: any): PipelineColumn {
  const status = normalizedStatus(project?.status);
  if (isPublished(project)) return 'published';
  if (isScheduleManaged(project)) return 'production';
  if (project?.studioStage === 'complete' || project?.studioStage === 'production')
    return 'production';
  if (project?.studioStage === 'ideation') return 'ideation';
  if (status === 'in production') return 'production';
  return 'ideation';
}

export function contentProjects(projects: any[]): any[] {
  return projects.filter((project) => project?.type === 'content');
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const templatePlatforms = new Map([
  ['Twitter', 'twitter'],
  ['TikTok', 'tiktok'],
  ['Instagram', 'instagram'],
  ['YouTube Shorts', 'youtube'],
]);

export function templatePlatform(value: unknown): string | undefined {
  return templatePlatforms.get(text(value));
}

export function makeProjectDraft(userId: string, seed: any = {}, kind: StarterKind = 'blank') {
  const title = text(seed?.title).trim();
  const hook = text(seed?.hook).trim();
  const detail = kind === 'idea' ? text(seed?.description) : text(seed?.body);
  const body = [
    hook && `Hook: ${hook}`,
    detail && `${kind === 'idea' ? 'Concept' : 'Script'}: ${detail}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const platform = kind === 'template' ? templatePlatform(seed?.platform) : 'youtube';
  if (!platform)
    throw new Error(
      'This template’s platform is not supported in the editor. Choose a different template.',
    );
  return {
    userId,
    name: (title || 'Untitled Content').slice(0, 99),
    type: 'content' as const,
    status: 'Draft' as const,
    data: { title, body, platform },
  };
}
