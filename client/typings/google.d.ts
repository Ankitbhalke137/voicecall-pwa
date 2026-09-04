declare global {
  interface Window {
    googleAccounts: {
      id: {
        initialize: (options: {
          client_id: string;
          context?: string;
          state_cookie_name?: string;
          ux_mode?: string;
        }) => void;
        prompt: () => Promise<{ credential: string }>;
        renderButton: (options: { theme: string; size: string }, element: HTMLElement) => void;
      };
    };
  }
}

export {};