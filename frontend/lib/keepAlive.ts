let keepAliveInterval: any = null;

export function startKeepAlive() {
  if (keepAliveInterval) return;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  
  console.log('🚀 Starting TruthLens Keep-Alive service...');
  
  // Initial ping
  fetch(`${backendUrl}/api/health`).catch(() => {});

  // Ping every 13 minutes (slightly less than 14 to ensure overlap)
  keepAliveInterval = setInterval(() => {
    console.log('💓 TruthLens Keep-Alive pinging backend...');
    fetch(`${backendUrl}/api/health`)
      .then(() => console.log('✅ Keep-alive ping successful'))
      .catch((err) => console.warn('❌ Keep-alive ping failed', err));
  }, 13 * 60 * 1000); 
}

export function stopKeepAlive() {
  if (keepAliveInterval) {
    console.log('🛑 Stopping TruthLens Keep-Alive service');
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}
