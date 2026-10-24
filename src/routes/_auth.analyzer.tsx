import { createFileRoute } from '@tanstack/react-router';
import VideoAnalyzer from '@/components/VideoAnalyzer';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/_auth/analyzer')({
  component: () => {
    const auth = useAuth();

    return (
      <LayoutShell user={auth.user}>
        <VideoAnalyzer />
      </LayoutShell>
    );
  },
});
