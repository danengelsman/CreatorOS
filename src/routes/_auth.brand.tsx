import { createFileRoute } from '@tanstack/react-router';
import BrandingEngine from '@/components/BrandingEngine';
import LayoutShell from '@/components/LayoutShell';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore, selectBrand } from '@/store/workspaceStore';

export const Route = createFileRoute('/_auth/brand')({
  component: () => {
    const auth = useAuth();
    const state = useWorkspaceStore();
    const token = auth.workspaceToken?.uid === auth.user?.uid ? auth.workspaceToken : null;
    const brand = selectBrand(state, token);
    const setBrand = (value: any) => state.setBrand(token, value);

    return (
      <LayoutShell user={auth.user}>
        <BrandingEngine
          key={token?.generation}
          user={auth.user}
          brand={brand}
          setBrand={setBrand}
        />
      </LayoutShell>
    );
  },
});
