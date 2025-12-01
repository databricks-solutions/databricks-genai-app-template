import { NextRequest } from 'next/server'
import { isRunningLocally } from '@/lib/config'

/**
 * Extract user ID from request headers
 * - Local dev: Use hardcoded user ID
 * - Databricks Apps: Use x-forwarded-email or x-forwarded-user header
 */
export function getUserId(request: NextRequest): string {
  const isLocalDevelopment = isRunningLocally()

  if (isLocalDevelopment) {
    return 'local-dev-user'
  }

  // Databricks Apps: Try email first, then user header
  const email = request.headers.get('x-forwarded-email')
  const user = request.headers.get('x-forwarded-user')

  return email || user || 'anonymous'
}
