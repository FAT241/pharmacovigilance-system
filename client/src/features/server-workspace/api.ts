export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

let available = true
export function setConnectionAvailable(value: boolean) { available = value }

export async function requestApi<T>(path: string, token?: string, method = 'GET', body?: unknown): Promise<T> {
  if (!available && method !== 'GET') throw new ApiError(503, 'Mất kết nối máy chủ. Hãy chờ kết nối trở lại rồi lưu.')
  const response = await fetch('/api' + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data?.message || 'Không thể kết nối API.')
  if (!data) throw new ApiError(502, 'API trả về phản hồi không hợp lệ.')
  return data as T
}
