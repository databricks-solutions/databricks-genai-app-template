import { useAgentsContext } from "@/contexts/AgentsContext";

/**
 * Custom hook to access agent metadata from the AgentsContext.
 * The actual fetch happens once in the AgentsProvider.
 */
export function useAgents() {
  return useAgentsContext();
}
