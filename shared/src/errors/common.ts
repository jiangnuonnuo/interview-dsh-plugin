/** Base error class for plugin domain errors */
export class PluginError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: readonly unknown[]
  ) {
    super(message);
    this.name = 'PluginError';
  }
}
