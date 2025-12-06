// Type definitions for the application

// Stream event types from Databricks agent
export interface StreamTextDelta {
  type: "response.output_text.delta";
  item_id: string;
  delta: string;
  id: string;
}

export interface StreamFunctionCall {
  type: "function_call";
  id: string;
  call_id: string;
  name: string;
  arguments: string;
}

export interface StreamFunctionCallOutput {
  type: "function_call_output";
  call_id: string;
  output: string;
}

export interface StreamMessageDone {
  type: "response.output_item.done";
  item: {
    id: string;
    type: "message" | "function_call" | "function_call_output";
    content?: Array<{ text: string; type: "output_text" }>;
    role?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    output?: string;
  };
  id: string;
}

export interface TraceSummary {
  trace_id: string;
  duration_ms: number;
  status: string;
  tools_called: Array<{
    name: string;
    duration_ms: number;
    inputs?: any;
    outputs?: any;
    status: string;
  }>;
  retrieval_calls: Array<{
    name: string;
    duration_ms: number;
    num_documents?: number;
    relevance_scores?: number[];
  }>;
  llm_calls: Array<{
    name: string;
    duration_ms: number;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  }>;
  total_tokens: number;
  spans_count: number;
  function_calls?: Array<{
    call_id: string;
    name: string;
    arguments: any;
    output?: any;
  }>;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  traceId?: string;
  visualizations?: Visualization[];
  traceSummary?: TraceSummary;
}

export interface Visualization {
  type: "line" | "bar" | "pie" | "table";
  data: ChartData | TableData;
  options?: any;
}

export interface ChartData {
  labels: string[];
  datasets: Dataset[];
}

export interface Dataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  tension?: number;
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

export interface Chat {
  id: string;
  title: string;
  agentId?: string; // Agent used for this chat (locked once set)
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Tool {
  display_name: string;
  display_description: string;
  long_description?: string;
  type?: string;
  url: string;
  learn_more?: string;
}

export interface Agent {
  id: string;
  name: string;
  display_name: string;
  display_description: string;
  chat_title: string;
  chat_subtitle: string;
  endpoint_url: string;
  llm: string;
  tools: Tool[];
  mlflow_experiment_id: string;
  mlflow_experiment_url: string;
  mlflow_traces_url: string;
}

export interface AgentMetadata {
  agents: Agent[];
}

export interface TraceSpan {
  name: string;
  duration: number;
  input: any;
  output: any;
  type: "llm" | "tool" | "retrieval" | "other";
  children?: TraceSpan[];
}
