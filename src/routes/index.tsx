import { createFileRoute, useNavigate } from '@tanstack/react-router';
import LandingPage from '@/components/LandingPage';

export const Route = createFileRoute('/')({
  component: () => {
    const navigate = useNavigate();
    return <LandingPage navigate={(path: string) => navigate({ to: path as any })} />;
  },
});
