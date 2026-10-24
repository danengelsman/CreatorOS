import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export interface MyRouterContext {
  auth: {
    user: any;
    isAuthenticated: boolean;
  };
}

export const router = createRouter({
  routeTree,
  context: {
    auth: {
      user: null,
      isAuthenticated: false,
    },
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
