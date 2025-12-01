import { NextRequest } from 'next/server'
import { addMessageToChat, getChatById } from '@/lib/chat-storage'
import { promises as fs } from 'fs'
import path from 'path'
import { Agent } from '@/lib/types'
import { createMLflowClient, TraceSummary } from '@/lib/mlflow-client'
import { getUserId } from '@/lib/auth-helpers'
import { isRunningLocally } from '@/lib/config'

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, chatId, agentId } = body

    // Extract user ID for multi-user isolation
    const userId = getUserId(request)
    devLog(`👤 User ID: ${userId}`)

    // Validate chatId
    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'Chat ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify chat exists AND belongs to this user
    const chat = await getChatById(chatId, userId)
    if (!chat) {
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the last message (user's message)
    const userMessage = messages[messages.length - 1]

    // Save user message to storage
    await addMessageToChat(chatId, {
      role: 'user',
      content: userMessage.content
    }, userId)

    // Load agents metadata
    const agentsFilePath = path.join(process.cwd(), 'public', 'metadata', 'agents.json')
    const agentsFileContents = await fs.readFile(agentsFilePath, 'utf8')
    const agentsData = JSON.parse(agentsFileContents)
    
    // Find the selected agent or use the first one as default
    const selectedAgent: Agent = agentId 
      ? agentsData.agents.find((a: Agent) => a.id === agentId)
      : agentsData.agents[0]

    if (!selectedAgent) {
      return new Response(
        JSON.stringify({ error: 'No agent found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get Databricks host
    const databricksHost = selectedAgent.endpoint_url.split('/serving-endpoints')[0]

    // Detect environment and set up authentication
    const isLocalDevelopment = isRunningLocally()
    let authToken: string

    devLog('=== AUTH DEBUG START ===')
    devLog('DATABRICKS_TOKEN exists:', !!process.env.DATABRICKS_TOKEN)
    devLog('isLocalDevelopment:', isLocalDevelopment)
    devLog('Request headers:', {
      'x-forwarded-access-token': request.headers.get('x-forwarded-access-token') ? 'EXISTS' : 'MISSING',
      'x-forwarded-user': request.headers.get('x-forwarded-user') || 'MISSING',
      'x-forwarded-email': request.headers.get('x-forwarded-email') || 'MISSING',
    })

    if (isLocalDevelopment) {
      // Local development: Use PAT token
      if (!process.env.DATABRICKS_TOKEN) {
        console.error('DATABRICKS_TOKEN not configured for local development')
        return new Response(
          JSON.stringify({
            error: 'Databricks configuration missing',
            message: 'DATABRICKS_TOKEN environment variable is required for local development'
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
      authToken = process.env.DATABRICKS_TOKEN
      devLog('🔧 Running in LOCAL DEVELOPMENT mode with PAT token')
      devLog('Token length:', authToken.length)
    } else {
      // Databricks Apps: Use forwarded user token
      const userAccessToken = request.headers.get('x-forwarded-access-token')

      if (!userAccessToken) {
        console.error('Running in Databricks Apps mode but no user access token found in headers')
        return new Response(
          JSON.stringify({
            error: 'User authentication missing',
            message: 'Running in Databricks Apps mode but no user access token found in headers. Please ensure the app has proper permissions.'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      authToken = userAccessToken
      devLog('🚀 Running in DATABRICKS APPS mode with user access token')
      devLog('Token length:', authToken.length)
      devLog('Token prefix:', authToken.substring(0, 10) + '...')
    }
    devLog('=== AUTH DEBUG END ===')
    devLog('')

    // Format messages for the agent (Databricks format)
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }))

    // Generate conversation ID for this chat session
    const conversationId = chatId || `conv_${Date.now()}`

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Only add Authorization header if we have a token
    // On Databricks Apps without forwarded token, service principal handles auth
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    devLog('=== API REQUEST DEBUG ===')
    devLog('Endpoint:', selectedAgent.endpoint_url)
    devLog('Headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': headers['Authorization'] ? 'Bearer ***' + headers['Authorization'].slice(-10) : 'MISSING'
    })
    devLog('Conversation ID:', conversationId)
    devLog('=== API REQUEST DEBUG END ===')
    devLog('')

    // Call Databricks agent endpoint with correct payload format
    const agentResponse = await fetch(selectedAgent.endpoint_url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: formattedMessages,
        databricks_options: {
          conversation_id: conversationId,
          return_trace: true
        },
        context: {
          conversation_id: conversationId,
          user_id: 'user'
        },
        stream: true,
        temperature: 0.7
      })
    })

    devLog('=== API RESPONSE DEBUG ===')
    devLog('Status:', agentResponse.status, agentResponse.statusText)
    devLog('Response Headers:', Object.fromEntries(agentResponse.headers.entries()))
    devLog('=== API RESPONSE DEBUG END ===')
    devLog('')

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text()
      console.error('❌ === DATABRICKS API ERROR === ❌')
      console.error('Status:', agentResponse.status, agentResponse.statusText)
      console.error('Error Body:', errorText)
      console.error('Request was made with:', {
        hasAuthToken: !!authToken,
        endpoint: selectedAgent.endpoint_url,
        conversationId: conversationId
      })
      console.error('❌ === ERROR END === ❌')

      return new Response(
        JSON.stringify({
          error: `Agent returned status ${agentResponse.status}`,
          details: errorText,
          status: agentResponse.status,
          statusText: agentResponse.statusText
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a TransformStream to process the agent's stream
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    devLog('🌊 Created TransformStream for response')

    // Variables to accumulate data for THIS REQUEST ONLY
    let fullText = ''
    let traceId = ''
    let traceSummary: TraceSummary | null = null
    const functionCalls: Array<{
      call_id: string
      name: string
      arguments: any
      output?: any
    }> = []

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    devLog(`🆔 Request ID: ${requestId} for chat: ${chatId}`)

    // Process the stream in the background
    ;(async () => {
      const reader = agentResponse.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        console.error(`❌ [${requestId}] No reader from agent response`)
        await writer.close()
        return
      }

      devLog(`📖 [${requestId}] Starting to read from Databricks agent stream`)

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            devLog('✅ Stream reading completed')
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          devLog(`📦 Received chunk with ${lines.length} lines`)

          for (const line of lines) {
            if (!line.trim()) continue

            // Handle [DONE] marker
            if (line.trim() === 'data: [DONE]' || line.trim() === '[DONE]') {
              try {
                await writer.write(encoder.encode('data: [DONE]\n\n'))
              } catch (writeError) {
                devLog(`⚠️ [${requestId}] Client disconnected, ignoring [DONE] from upstream`)
              }
              continue
            }

            // Extract JSON string - handle multiple formats
            let jsonStr = line.trim()
            if (jsonStr.startsWith('data: ')) {
              jsonStr = jsonStr.slice(6).trim()
            } else if (jsonStr.startsWith('data:')) {
              jsonStr = jsonStr.slice(5).trim()
            }

            // Skip empty lines after extraction
            if (!jsonStr) continue

            // Detect HTML responses (error pages)
            if (jsonStr.startsWith('<') || jsonStr.startsWith('<!DOCTYPE')) {
              console.error(`❌ [${requestId}] Received HTML instead of JSON. First 200 chars:`, jsonStr.substring(0, 200))
              continue
            }

            try {
              // Try parsing the JSON
              const data = JSON.parse(jsonStr)

              // Extract trace ID from various possible locations
              if (data.id && !traceId) {
                traceId = data.id
                devLog('🆔 Extracted trace ID:', traceId)
              }

              // Handle Databricks genie-specific response formats
              if (data.databricks_output?.trace?.info?.trace_id && !traceId) {
                traceId = data.databricks_output.trace.info.trace_id
                devLog('🆔 Extracted trace ID from databricks_output:', traceId)
              }

              // Handle text deltas
              if (data.type === 'response.output_text.delta') {
                if (data.delta) {
                  fullText += data.delta
                  devLog('📝 Text delta:', data.delta.substring(0, 20))
                }
                // Forward to client (may fail if client disconnected, but continue processing)
                try {
                  await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
                } catch (writeError) {
                  // Client disconnected - continue accumulating but stop writing
                  devLog(`⚠️ [${requestId}] Client disconnected, continuing to process...`)
                }
              }

              // Handle completed items
              else if (data.type === 'response.output_item.done') {
                devLog('✅ Item done:', data.item?.type)
                const item = data.item

                // Extract function calls
                if (item?.type === 'function_call') {
                  try {
                    const functionCall = {
                      call_id: item.call_id,
                      name: item.name,
                      arguments: item.arguments ? (typeof item.arguments === 'string' ? JSON.parse(item.arguments) : item.arguments) : {}
                    }
                    functionCalls.push(functionCall)
                    devLog(`🔧 [${requestId}] Function call #${functionCalls.length}:`, functionCall.name, 'call_id:', functionCall.call_id)
                  } catch (argParseError) {
                    console.error(`❌ [${requestId}] Failed to parse function call arguments:`, argParseError)
                    // Store with raw arguments if parsing fails
                    functionCalls.push({
                      call_id: item.call_id,
                      name: item.name,
                      arguments: item.arguments || {}
                    })
                  }
                }

                // Extract function call outputs
                else if (item?.type === 'function_call_output') {
                  const call = functionCalls.find(fc => fc.call_id === item.call_id)
                  if (call) {
                    try {
                      call.output = item.output ? (typeof item.output === 'string' ? JSON.parse(item.output) : item.output) : {}
                      devLog(`📤 [${requestId}] Function output for`, call.name, 'call_id:', item.call_id)
                    } catch (outputParseError) {
                      console.error(`❌ [${requestId}] Failed to parse function output:`, outputParseError)
                      call.output = item.output || {}
                    }
                  }
                }

                // Extract complete message text
                else if (item?.type === 'message' && item.content) {
                  const textContent = item.content.find((c: any) => c.type === 'output_text')
                  if (textContent?.text) {
                    fullText = textContent.text
                  }
                }

                // Forward to client
                try {
                  await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
                } catch (writeError) {
                  devLog(`⚠️ [${requestId}] Client disconnected, continuing to process...`)
                }
              }

              // Forward all other events to client
              else {
                try {
                  await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
                } catch (writeError) {
                  devLog(`⚠️ [${requestId}] Client disconnected, continuing to process...`)
                }
              }
            } catch (parseError: any) {
              // Enhanced error logging
              const errorPreview = jsonStr.length > 500 ? jsonStr.substring(0, 500) + '...' : jsonStr

              if (jsonStr.includes('{') || jsonStr.includes('[')) {
                // Looks like JSON but failed to parse - this is important
                console.error(`❌ [${requestId}] JSON parse error:`, parseError.message)
                console.error(`   Line content (first 200 chars):`, jsonStr.substring(0, 200))
                console.error(`   Error position:`, parseError.message.match(/position (\d+)/)?.[1] || 'unknown')
              } else {
                // Doesn't look like JSON - might be metadata or comment
                devLog(`⚠️  [${requestId}] Skipping non-JSON line:`, errorPreview)
              }

              // Continue processing - don't let one bad line stop the stream
              continue
            }
          }
        }

        // IMPORTANT: Fetch trace data and send to client BEFORE sending [DONE]
        devLog(`📊 [${requestId}] Stream completed. Function calls captured: ${functionCalls.length}`)
        if (functionCalls.length > 0) {
          devLog(`   Function call IDs for this request:`, functionCalls.map(fc => fc.call_id))
        }

        if (traceId && selectedAgent.mlflow_experiment_id && authToken) {
          devLog(`Fetching MLflow trace for ID: ${traceId}`)
          const mlflowClient = createMLflowClient(databricksHost, authToken)
          
          if (mlflowClient) {
            try {
              // Wait for trace to be logged to MLflow
              await new Promise(resolve => setTimeout(resolve, 1500))
              
              const trace = await mlflowClient.getTrace(
                traceId,
                selectedAgent.mlflow_experiment_id
              )

              if (trace) {
                devLog(`✓ Retrieved MLflow trace with ${trace.spans.length} spans`)
                
                // Analyze the trace
                const mlflowTraceSummary = mlflowClient.analyzeTrace(trace)
                
                // Create a fresh traceSummary object with deep copied function calls
                traceSummary = {
                  ...mlflowTraceSummary,
                  // Deep clone function calls to ensure no reference sharing
                  function_calls: functionCalls.length > 0 
                    ? JSON.parse(JSON.stringify(functionCalls))
                    : []
                }
                
                devLog('MLflow Trace Summary:', {
                  tools_called: traceSummary.tools_called.length,
                  function_calls: traceSummary.function_calls?.length || 0,
                  total_tokens: traceSummary.total_tokens,
                  duration_ms: traceSummary.duration_ms
                })
              }
            } catch (traceError) {
              console.error('Error fetching MLflow trace:', traceError)
            }
          }
        }

        // If we don't have a trace summary yet, create one (even if empty)
        if (!traceSummary) {
          devLog(`📝 [${requestId}] Creating trace summary (function calls: ${functionCalls.length})`)
          traceSummary = {
            trace_id: traceId || `trace_${Date.now()}`,
            duration_ms: 0,
            status: 'OK',
            tools_called: [],
            retrieval_calls: [],
            llm_calls: [],
            total_tokens: 0,
            spans_count: functionCalls.length,
            // Deep clone to ensure no reference sharing
            function_calls: functionCalls.length > 0 
              ? JSON.parse(JSON.stringify(functionCalls))
              : []
          }
        }

        // ALWAYS send trace summary to client BEFORE [DONE]
        devLog(`📤 [${requestId}] Sending trace summary to client:`, {
          trace_id: traceSummary.trace_id,
          function_calls: traceSummary.function_calls?.length || 0,
          function_call_ids: traceSummary.function_calls?.map(fc => fc.call_id) || []
        })
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'trace.summary',
            traceSummary
          })}\n\n`))
        } catch (writeError) {
          devLog(`⚠️ [${requestId}] Client disconnected, but trace summary collected`)
        }

        // Send done marker AFTER trace summary
        try {
          await writer.write(encoder.encode('data: [DONE]\n\n'))
        } catch (writeError) {
          devLog(`⚠️ [${requestId}] Client disconnected before [DONE] marker`)
        }

      } catch (error) {
        console.error('Error processing stream:', error)
      } finally {
        reader.releaseLock()

        // IMPORTANT: Save message to storage even if client disconnected
        // This ensures responses are available when user returns to the chat
        devLog(`📝 [${requestId}] Finally block - fullText length: ${fullText.length}, chatId: ${chatId}`)

        if (fullText) {
          devLog(`💾 [${requestId}] Attempting to save message to storage...`)
          try {
            await addMessageToChat(chatId, {
              role: 'assistant',
              content: fullText,
              traceId: traceId || `trace_${Date.now()}`,
              // Deep clone traceSummary to ensure storage gets independent copy
              traceSummary: traceSummary ? JSON.parse(JSON.stringify(traceSummary)) : undefined
            }, userId)
            devLog(`✅ [${requestId}] Successfully saved message to chat ${chatId} with trace ID: ${traceId}`)
          } catch (saveError) {
            console.error(`❌ [${requestId}] Failed to save message to storage:`, saveError)
          }
        } else {
          devLog(`⚠️ [${requestId}] No content to save (fullText is empty)`)
        }

        try {
          await writer.close()
        } catch (closeError) {
          // Writer may already be closed if client aborted - this is fine
          devLog(`🔒 [${requestId}] Writer already closed (client likely disconnected)`)
        }
      }
    })()

    // Return the streaming response
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
