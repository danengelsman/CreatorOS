import { createFileRoute, useNavigate } from '@tanstack/react-router';
import HelpArticle from '@/components/HelpArticle';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/help_/$topic')({
  component: HelpTopic,
});

function HelpTopic() {
  const { topic } = Route.useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  return (
    <LayoutShell user={auth.user}>
      <HelpArticle topic={topic} onBack={() => void navigate({ to: '/help' })} />
    </LayoutShell>
  );
}
