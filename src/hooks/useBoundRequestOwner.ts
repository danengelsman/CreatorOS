import { useEffect, useRef } from 'react';
import type { ApiRequestOwner } from '../lib/apiClient';

/** Bind the parent's generation capability to this component's lifetime. */
export function useBoundRequestOwner(owner?: ApiRequestOwner): ApiRequestOwner | undefined {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return owner && { uid: owner.uid, isCurrent: () => mounted.current && owner.isCurrent() };
}
