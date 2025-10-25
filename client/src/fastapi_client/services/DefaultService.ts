/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgentRequestOptions } from "../models/AgentRequestOptions";
import type { EndpointRequestOptions } from "../models/EndpointRequestOptions";
import type { LogAssessmentRequestOptions } from "../models/LogAssessmentRequestOptions";
import type { QueryAgentResponse } from "../models/QueryAgentResponse";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DefaultService {
  /**
   * Experiment
   * Get the MLFlow experiment info.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static experimentApiTracingExperimentGet(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/tracing_experiment",
    });
  }
  /**
   * Health Check
   * Health check endpoint for monitoring app status.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static healthCheckApiHealthGet(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/health",
    });
  }
  /**
   * Agent
   * Agent API.
   * @param requestBody
   * @returns QueryAgentResponse Successful Response
   * @throws ApiError
   */
  public static agentApiAgentPost(
    requestBody: AgentRequestOptions
  ): CancelablePromise<QueryAgentResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/agent",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Log Feedback
   * Log assessment for the agent API.
   * @param requestBody
   * @returns any Successful Response
   * @throws ApiError
   */
  public static logFeedbackApiLogAssessmentPost(
    requestBody: LogAssessmentRequestOptions
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/log_assessment",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Invoke Endpoint
   * Agent API.
   * @param requestBody
   * @returns any Successful Response
   * @throws ApiError
   */
  public static invokeEndpointApiInvokeEndpointPost(
    requestBody: EndpointRequestOptions
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/invoke_endpoint",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
