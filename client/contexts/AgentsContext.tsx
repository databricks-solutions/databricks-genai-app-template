"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Agent } from "@/lib/types";

interface AgentsContextType {
  agents: Agent[];
  loading: boolean;
  error: Error | null;
  getAgentById: (id: string) => Agent | undefined;
  refetch: () => void;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export function useAgentsContext() {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error("useAgentsContext must be used within an AgentsProvider");
  }
  return context;
}

interface AgentsProviderProps {
  children: ReactNode;
}

export function AgentsProvider({ children }: AgentsProviderProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = () => {
    setLoading(true);
    setError(null);

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
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const getAgentById = (id: string) => {
    return agents.find((agent) => agent.id === id);
  };

  return (
    <AgentsContext.Provider
      value={{
        agents,
        loading,
        error,
        getAgentById,
        refetch: fetchAgents,
      }}
    >
      {children}
    </AgentsContext.Provider>
  );
}
