import { v4 as uuidv4 } from 'uuid';

export function getSessionId(): string {
  // Check if sessionId already exists in localStorage
  let sessionId = localStorage.getItem('tl_session_id');
  
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem('tl_session_id', sessionId);
  }
  
  return sessionId;
}
