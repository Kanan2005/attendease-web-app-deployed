export type AuthApiClientFetch = (
  input: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
  },
) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

export class AuthApiClientError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = "AuthApiClientError"
    this.status = status
    this.details = details
  }
}

export interface AuthApiClientOptions {
  baseUrl: string
  fetcher?: AuthApiClientFetch
}

export interface AuthApiRequestConfig<TResponse> {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  token?: string
  payload?: unknown
  query?: Record<string, string | undefined>
  headers?: Record<string, string>
  parse: (value: unknown) => TResponse
}

export type AuthApiRequest = <TResponse>(
  path: string,
  config: AuthApiRequestConfig<TResponse>,
) => Promise<TResponse>

export function buildGoogleExchangeRequest<TRequest>(input: TRequest): TRequest {
  return input
}

export function createAuthApiRequest(options: AuthApiClientOptions): AuthApiRequest {
  const globalFetch = (globalThis as { fetch?: AuthApiClientFetch }).fetch
  const fetcher = options.fetcher ?? globalFetch ?? null

  return async <TResponse>(
    path: string,
    config: AuthApiRequestConfig<TResponse>,
  ): Promise<TResponse> => {
    if (!fetcher) {
      throw new Error("No fetch implementation is available for the auth client.")
    }

    const url = new URL(path, options.baseUrl)

    if (config.query) {
      for (const [key, value] of Object.entries(config.query)) {
        if (value) {
          url.searchParams.set(key, value)
        }
      }
    }

    const response = await fetcher(url.toString(), {
      method: config.method,
      headers: {
        ...(config.payload !== undefined ? { "content-type": "application/json" } : {}),
        ...(config.token ? { authorization: `Bearer ${config.token}` } : {}),
        ...(config.headers ?? {}),
      },
      ...(config.payload !== undefined ? { body: JSON.stringify(config.payload) } : {}),
    })

    const body = await response.json()

    if (!response.ok) {
      throw new AuthApiClientError("Auth API request failed.", response.status, body)
    }

    return config.parse(body)
  }
}

export function toQuery(
  value: Record<string, string | boolean | number | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      entry === undefined ? undefined : String(entry),
    ]),
  )
}
