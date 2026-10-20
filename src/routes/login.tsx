
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Login from '@/components/Login';

export const Route = createFileRoute('/login')({
  component: () => {
    const navigate = useNavigate();
    return <Login navigate={navigate} />;
  },
});
