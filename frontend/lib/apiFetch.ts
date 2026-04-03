import { getSessionId } from './session';

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let sessionId = 'anonymous';
  if (typeof window !== 'undefined') {
    sessionId = getSessionId();
  }

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      ...options.headers,
    },
  });
}
