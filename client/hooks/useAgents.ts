import { useState, useEffect } from "react";
import { Agent } from "@/lib/types";

interface UseAgentsResult {
  agents: Agent[];
  loading: boolean;
  error: Error | null;
  getAgentById: (id: string) => Agent | undefined;
}

/**
 * Custom hook to fetch and cache agent metadata
 * Prevents duplicate fetches across components
 */
export function useAgents(): UseAgentsResult {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fetch from Next.js API proxy (proxies to Python backend)
    fetch("/api/config/agents")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load agents: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load agents:", err);
        setError(err);
        setLoading(false);
      });
  }, []);

  const getAgentById = (id: string) => {
    return agents.find((agent) => agent.id === id);
  };

  return {
    agents,
    loading,
    error,
    getAgentById,
  };
}
