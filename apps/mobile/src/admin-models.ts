import { AuthApiClientError } from "@attendease/auth"

export function mapAdminApiErrorToMessage(error: unknown): string {
  if (error instanceof AuthApiClientError) {
    const detailMessage = extractApiErrorMessage(error.details)

    switch (error.status) {
      case 401:
        return "Your admin session expired. Sign in again to continue."
      case 403:
        return detailMessage ?? "This action requires higher admin privileges."
      case 404:
        return detailMessage ?? "The requested record is no longer available."
      case 409:
        return detailMessage ?? "This action conflicts with the current state."
      default:
        return detailMessage ?? "AttendEase could not complete the admin request."
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred in the admin portal."
}

function extractApiErrorMessage(details: unknown): string | null {
  if (details && typeof details === "object" && "message" in details) {
    const message = (details as { message: unknown }).message
    if (typeof message === "string" && message.length > 0) {
      return message
    }
  }
  return null
}
