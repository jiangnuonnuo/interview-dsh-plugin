/**
 * Backend entry point.
 *
 * TODO: Replace with actual DSH plugin registration once runtime API is confirmed.
 */

import { createDshRuntime } from './infra/dsh/adapter.js';

export const bootstrap = async () => {
  const runtime = await createDshRuntime();
  // Placeholder: register hooks via DSH runtime
  // await runtime.registerHook('interview:ready', async () => { ... });
  return runtime;
};
