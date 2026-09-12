/** Plugin configuration shared between frontend and backend */
export interface PluginConfig {
  readonly pluginId: string;
  readonly version: string;
  readonly features: readonly string[];
}
