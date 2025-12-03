import { NextRequest, NextResponse } from 'next/server'
import { createMLflowClient, MLflowSpan } from '@/lib/mlflow-client'

// Convert MLflow span to UI format
function convertSpanToUIFormat(span: MLflowSpan, allSpans: MLflowSpan[]): any {
  const durationMs = (span.end_time_ns - span.start_time_ns) / 1_000_000
  
  // Find children
  const children = allSpans
    .filter(s => s.parent_id === span.span_id)
    .map(child => convertSpanToUIFormat(child, allSpans))

  return {
    name: span.name,
    duration: durationMs,
    type: span.span_type.toLowerCase(),
    input: span.inputs,
    output: span.outputs,
    status: span.status.status_code,
    attributes: span.attributes,
    children: children.length > 0 ? children : undefined
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: traceId } = await params
  
  try {
    // Try to get from query params or environment
    const searchParams = request.nextUrl.searchParams
    const experimentId = searchParams.get('experiment_id')
    
    // Get Databricks configuration
    const databricksToken = process.env.DATABRICKS_TOKEN
    
    if (!databricksToken) {
      console.warn('DATABRICKS_TOKEN not set, returning mock data')
      return NextResponse.json(getMockTraceData())
    }

    // Get Databricks host from environment
    const databricksHost = process.env.DATABRICKS_HOST

    if (!databricksHost) {
      console.warn('DATABRICKS_HOST not set in environment')
      return NextResponse.json(getMockTraceData())
    }

    // Load agents config to get experiment ID
    const agentsResponse = await fetch('http://localhost:8000/api/agents')
    const agentsData = await agentsResponse.json()
    const firstAgent = agentsData.agents?.[0]

    // If no experiment ID provided, use from agents config
    const expId = experimentId || firstAgent?.mlflow_experiment_id

    if (!expId) {
      console.warn('No experiment ID available')
      return NextResponse.json(getMockTraceData())
    }

    // Fetch real trace data from MLflow
    const mlflowClient = createMLflowClient(databricksHost, databricksToken)
    
    if (!mlflowClient) {
      return NextResponse.json(getMockTraceData())
    }

    const trace = await mlflowClient.getTrace(traceId, expId)
    
    if (!trace) {
      console.warn(`Trace ${traceId} not found`)
      return NextResponse.json(getMockTraceData())
    }

    // Convert MLflow trace to UI format
    const rootSpans = trace.spans.filter(s => !s.parent_id)
    const spans = rootSpans.map(span => convertSpanToUIFormat(span, trace.spans))

    // Also include trace summary
    const summary = mlflowClient.analyzeTrace(trace)

    return NextResponse.json({
      spans,
      summary,
      metadata: {
        trace_id: trace.trace_id,
        experiment_id: trace.experiment_id,
        timestamp_ms: trace.timestamp_ms,
        duration_ms: trace.execution_duration_ms,
        status: trace.status
      }
    })
  } catch (error) {
    console.error('Error fetching trace:', error)
    return NextResponse.json(getMockTraceData())
  }
}

function getMockTraceData() {
  return {
    spans: [
      {
        name: 'Agent Execution',
        duration: 2340,
        type: 'agent',
        input: { 
          messages: [
            { role: 'user', content: 'explain the dataset' }
          ]
        },
        output: { 
          response: 'I\'ll query the TESTGenie space to get information about the available datasets.'
        },
        children: [
          {
            name: 'query_space_01f0b3e4147f1b3d9ecb85a10df6e25d',
            duration: 5600,
            type: 'tool',
            input: { 
              query: 'Can you provide a summary of the datasets available in this genie space?'
            },
            output: { 
              content: 'There is one dataset available: amine_charot.doh.diabetes_ehr_data. It contains electronic health record data for diabetes patients, including demographics, lab results, medication counts, complication status, and risk scores.',
              conversationId: '01f0c3c3bf8918ef9335d0231f92e3d7',
              messageId: '01f0c3c3bf9511e3bade055141008357'
            }
          }
        ]
      }
    ]
  }
}
