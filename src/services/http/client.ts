import { appConfig } from '@/app/config/env'
import { ACCESS_TOKEN_KEY } from '@/modules/auth/storage'
import { getApiErrorMessage, isApiResponse } from '@/services/http/api-response'

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const payload = await readPayload(response)

  if (!response.ok) {
    throw new HttpError(getApiErrorMessage(payload, `La petición a ${path} falló`), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  if (isApiResponse(payload)) {
    return payload.data as T
  }

  return payload as T
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type') ?? ''

  if (response.status === 204 || !contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}
