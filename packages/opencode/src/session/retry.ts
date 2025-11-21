import { iife } from "@/util/iife"
import { MessageV2 } from "./message-v2"

export namespace SessionRetry {
  export const RETRY_INITIAL_DELAY = 2000
  export const RETRY_BACKOFF_FACTOR = 2
  export const RETRY_MAX_DELAY_NO_HEADERS = 30_000 // 30 seconds

  export async function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms)
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timeout)
          reject(new DOMException("Aborted", "AbortError"))
        },
        { once: true },
      )
    })
  }

  export function delay(error: MessageV2.APIError, attempt: number): number {
    const headers = error.data.responseHeaders
    if (headers) {
      const retryAfterMs = headers["retry-after-ms"]
      if (retryAfterMs) {
        const parsedMs = Number.parseFloat(retryAfterMs)
        if (!Number.isNaN(parsedMs)) {
          return parsedMs
        }
      }

      const retryAfter = headers["retry-after"]
      if (retryAfter) {
        const parsedSeconds = Number.parseFloat(retryAfter)
        if (!Number.isNaN(parsedSeconds)) {
          // convert seconds to milliseconds
          return Math.ceil(parsedSeconds * 1000)
        }
        // Try parsing as HTTP date format
        const parsed = Date.parse(retryAfter) - Date.now()
        if (!Number.isNaN(parsed) && parsed > 0) {
          return Math.ceil(parsed)
        }
      }

      return RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, attempt - 1)
    }

    return Math.min(RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, attempt - 1), RETRY_MAX_DELAY_NO_HEADERS)
  }

  export function getRetryDelayInMs(error: MessageV2.APIError, attempt: number): number | undefined {
    const TEN_MINUTES = 600_000 // 10 minutes in milliseconds
    const headers = error.data.responseHeaders

    // For custom headers, use the delay function to get the value
    if (headers) {
      const baseDelay = delay(error, attempt)
      // Return undefined if exceeds 10 minutes
      if (baseDelay > TEN_MINUTES) {
        return undefined
      }
      return baseDelay
    }

    // For no headers case, return uncapped exponential until it exceeds 10 minutes
    const exponential = RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, attempt - 1)
    if (exponential > TEN_MINUTES) {
      return undefined
    }
    return exponential
  }

  export function getBoundedDelay(args: {
    error: MessageV2.APIError
    attempt: number
    startTime: number
    maxDuration?: number
  }): number | undefined {
    const { error, attempt, startTime, maxDuration } = args
    const RETRY_TIMEOUT = maxDuration ?? 600_000 // 10 minutes in milliseconds default
    const elapsedTime = Date.now() - startTime
    const remainingTime = RETRY_TIMEOUT - elapsedTime

    // Return undefined if time budget is exhausted
    if (remainingTime <= 0) {
      return undefined
    }

    // Check if getRetryDelayInMs would return undefined
    const retryDelay = getRetryDelayInMs(error, attempt)
    if (retryDelay === undefined) {
      return undefined
    }

    // Cap the delay to remaining time
    const boundedDelay = Math.min(retryDelay, remainingTime)
    // Return undefined if the bounded delay is zero or negative
    return boundedDelay > 0 ? boundedDelay : undefined
  }
}
