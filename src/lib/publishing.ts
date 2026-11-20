export const PUBLISH_UNAVAILABLE_MESSAGE =
  'Publishing from CreatorOS is not available. Publish directly on the destination platform instead.';

export function clearSchedulingMessage(project: any): string {
  const resetStatus =
    typeof project.status === 'string' &&
    project.status.trim().toLowerCase() === 'scheduled' &&
    project.published !== true;
  return `Clear the planned date and saved auto-publish flag? ${resetStatus ? 'This changes Scheduled status to Draft.' : 'The recorded status and published flag stay unchanged.'} Content and the default planned time stay unchanged. No destination post is changed.`;
}
