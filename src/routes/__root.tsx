
import { createRootRoute, Outlet } from '@tanstack/react-router';
import LayoutShell from '@/components/LayoutShell';

export const Route = createRootRoute({
  component: () => (
    <Outlet />
  ),
});
