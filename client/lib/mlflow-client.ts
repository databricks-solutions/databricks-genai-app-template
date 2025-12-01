// MLflow client for interacting with Databricks MLflow Tracing API
// Based on: https://docs.databricks.com/aws/en/mlflow3/genai/tracing/reference/trace-sdk

export interface MLflowSpan {
  span_id: string
  parent_id: string | null
  name: string
  span_type: 'CHAIN' | 'AGENT' | 'TOOL' | 'CHAT_MODEL' | 'RETRIEVER' | 'LLM' | 'PARSER' | 'EMBEDDING' | 'UNKNOWN'
  start_time_ns: number
  end_time_ns: number
  status: {
    status_code: 'OK' | 'ERROR' | 'UNSET'
    description?: string
  }
  attributes?: Record<string, any>
  inputs?: any
  outputs?: any
  events?: Array<{
    name: string
    timestamp_ns: number
    attributes?: Record<string, any>
  }>
}

export interface MLflowTrace {
  trace_id: string
  request_id: string
  experiment_id: string
  timestamp_ms: number
  execution_duration_ms: number
  status: 'OK' | 'ERROR' | 'IN_PROGRESS'
  request: string
  response: string
  spans: MLflowSpan[]
  tags?: Record<string, string>
  token_usage?: {
    total_input_tokens?: number
    total_output_tokens?: number
    total_tokens?: number
  }
}

export interface ToolCall {
  name: string
  duration_ms: number
  inputs?: any
  outputs?: any
  status: string
}

export interface TraceSummary {
  trace_id: string
  duration_ms: number
  status: string
  tools_called: ToolCall[]
  retrieval_calls: Array<{
    name: string
    duration_ms: number
    num_documents?: number
    relevance_scores?: number[]
  }>
  llm_calls: Array<{
    name: string
    duration_ms: number
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }>
  total_tokens: number
  spans_count: number
  function_calls?: Array<{
    call_id: string
    name: string
    arguments: any
    output?: any
  }>
}

/**
 * MLflow client for Databricks
 */
export class MLflowClient {
  private databricksHost: string
  private token: string

  constructor(databricksHost: string, token: string) {
    // Ensure host doesn't have trailing slash
    this.databricksHost = databricksHost.replace(/\/$/, '')
    this.token = token
  }

  /**
   * Build headers for API requests
   * Uses the provided token (either PAT for local dev or user token for Databricks Apps)
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    }
  }

  /**
   * Get trace by ID from MLflow
   * Reference: https://docs.databricks.com/aws/en/mlflow3/genai/tracing/reference/trace-sdk
   */
  async getTrace(traceId: string, experimentId: string): Promise<MLflowTrace | null> {
    try {
      // Call MLflow API to get trace
      // API endpoint: /api/2.0/mlflow/traces/get-trace
      const response = await fetch(
        `${this.databricksHost}/api/2.0/mlflow/traces/get-trace`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify({
            trace_id: traceId,
            experiment_id: experimentId
          })
        }
      )

      if (!response.ok) {
        console.error(`Failed to get trace ${traceId}:`, await response.text())
        return null
      }

      const data = await response.json()
      return this.parseTraceResponse(data)
    } catch (error) {
      console.error('Error fetching trace:', error)
      return null
    }
  }

  /**
   * Search traces in an experiment
   */
  async searchTraces(
    experimentId: string,
    filter?: string,
    maxResults: number = 100
  ): Promise<MLflowTrace[]> {
    try {
      const response = await fetch(
        `${this.databricksHost}/api/2.0/mlflow/traces/search-traces`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            experiment_ids: [experimentId],
            filter,
            max_results: maxResults
          })
        }
      )

      if (!response.ok) {
        console.error('Failed to search traces:', await response.text())
        return []
      }

      const data = await response.json()
      return data.traces?.map((t: any) => this.parseTraceResponse(t)) || []
    } catch (error) {
      console.error('Error searching traces:', error)
      return []
    }
  }

  /**
   * Parse trace response into our format
   */
  private parseTraceResponse(data: any): MLflowTrace {
    const info = data.info || {}
    const traceData = data.data || {}
    
    return {
      trace_id: info.trace_id || info.request_id,
      request_id: info.request_id,
      experiment_id: info.experiment_id,
      timestamp_ms: info.timestamp_ms || info.request_time,
      execution_duration_ms: info.execution_time_ms || info.execution_duration || 0,
      status: info.status || info.state || 'OK',
      request: traceData.request || '',
      response: traceData.response || '',
      spans: traceData.spans || [],
      tags: info.tags || {}
    }
  }

  /**
   * Analyze trace and extract summary information
   */
  analyzeTrace(trace: MLflowTrace): TraceSummary {
    const tools: ToolCall[] = []
    const retrievalCalls: TraceSummary['retrieval_calls'] = []
    const llmCalls: TraceSummary['llm_calls'] = []
    
    let totalInputTokens = 0
    let totalOutputTokens = 0

    // Process each span
    for (const span of trace.spans) {
      const durationMs = (span.end_time_ns - span.start_time_ns) / 1_000_000

      // Extract tool calls
      if (span.span_type === 'TOOL') {
        tools.push({
          name: span.name,
          duration_ms: durationMs,
          inputs: span.inputs,
          outputs: span.outputs,
          status: span.status.status_code
        })
      }

      // Extract retrieval calls
      if (span.span_type === 'RETRIEVER') {
        const numDocs = Array.isArray(span.outputs) ? span.outputs.length : undefined
        const relevanceScores: number[] = []
        
        if (Array.isArray(span.outputs)) {
          for (const doc of span.outputs) {
            if (doc?.metadata?.relevance_score) {
              relevanceScores.push(doc.metadata.relevance_score)
            }
          }
        }

        retrievalCalls.push({
          name: span.name,
          duration_ms: durationMs,
          num_documents: numDocs,
          relevance_scores: relevanceScores.length > 0 ? relevanceScores : undefined
        })
      }

      // Extract LLM calls and token usage
      if (span.span_type === 'CHAT_MODEL' || span.span_type === 'LLM') {
        const inputTokens = span.attributes?.['llm.token_usage.input_tokens'] || 0
        const outputTokens = span.attributes?.['llm.token_usage.output_tokens'] || 0
        const totalTokens = span.attributes?.['llm.token_usage.total_tokens'] || 
                          inputTokens + outputTokens

        totalInputTokens += inputTokens
        totalOutputTokens += outputTokens

        llmCalls.push({
          name: span.name,
          duration_ms: durationMs,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens
        })
      }
    }

    return {
      trace_id: trace.trace_id,
      duration_ms: trace.execution_duration_ms,
      status: trace.status,
      tools_called: tools,
      retrieval_calls: retrievalCalls,
      llm_calls: llmCalls,
      total_tokens: totalInputTokens + totalOutputTokens,
      spans_count: trace.spans.length
    }
  }

  /**
   * Log feedback/assessment to a trace
   */
  async logFeedback(
    traceId: string,
    experimentId: string,
    feedbackName: string,
    feedbackValue: any,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.databricksHost}/api/2.0/mlflow/traces/log-feedback`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trace_id: traceId,
            experiment_id: experimentId,
            name: feedbackName,
            value: feedbackValue,
            metadata
          })
        }
      )

      return response.ok
    } catch (error) {
      console.error('Error logging feedback:', error)
      return false
    }
  }
}

/**
 * Get MLflow client instance
 */
export function createMLflowClient(
  databricksHost: string,
  token: string
): MLflowClient | null {
  if (!databricksHost) {
    console.warn('Databricks host not configured for MLflow')
    return null
  }

  if (!token) {
    console.warn('No auth token provided for MLflow client')
    return null
  }

  return new MLflowClient(databricksHost, token)
}

