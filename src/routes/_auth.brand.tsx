import { createFileRoute } from '@tanstack/react-router';
import BrandingEngine from '@/components/BrandingEngine';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/brand')({
  component: () => {
    const auth = useAuth();
    const { brand, setBrand } = useWorkspaceStore();

    return (
      <LayoutShell user={auth.user}>
        <BrandingEngine user={auth.user} brand={brand} setBrand={setBrand} />
      </LayoutShell>
    );
  },
});
