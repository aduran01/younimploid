import { useEffect, useState } from 'react';
import { sendMessage } from '../shared/messages';

export function App() {
  const [status, setStatus] = useState('Checking background...');

  useEffect(() => {
    sendMessage({ type: 'PING' })
      .then((response) => setStatus(`Background replied: ${response.type}`))
      .catch(() => setStatus('Background did not reply'));
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">younimploid</h1>
      <p className="mt-2 text-gray-600">{status}</p>
    </main>
  );
}
