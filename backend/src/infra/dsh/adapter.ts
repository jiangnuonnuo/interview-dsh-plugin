/**
 * DSH runtime adapter stub.
 *
 * TODO: Replace with actual DSH SDK/Hooks integration once the runtime API is confirmed.
 */

export interface DshRuntime {
  readonly registerHook: (name: string, handler: () => void | Promise<void>) => void;
  readonly getConfig: () => Promise<Record<string, unknown>>;
}

export const createDshRuntime = async (): Promise<DshRuntime> => {
  // Placeholder implementation
  return {
    registerHook: (_name: string, _handler: () => void | Promise<void>) => {
      // no-op
    },
    getConfig: async () => ({}),
  };
};
