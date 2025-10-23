import { getConfig } from "./config";

export interface Endpoint {
  displayName: string;
  // Model serving endpoint name.
  endpointName: string;
  // Endpoint type: "openai-chat" for OpenAI-compatible, "databricks-agent" for agent endpoints
  type: "openai-chat" | "databricks-agent";
}

/**
 * Get the list of available endpoints from loaded configuration.
 *
 * Note: loadConfig() must be called before using this function.
 * The App component calls loadConfig() on mount to ensure configuration is ready.
 */
export function getEndpoints(): Endpoint[] {
  const config = getConfig();
  return config.endpoints;
}
