import '@/utils/polyfills';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  session_id?: string;
  stream: boolean;
  messages: { role: string; content: string }[];
}

const API_URL = 'http://localhost:5000';

// Mock responses for when the backend is unavailable
const mockResponses = [
  "I'm sorry, but I'm currently running in offline mode. The backend server is not available.",
  "It seems the backend server is not running. I'm operating in fallback mode with limited capabilities.",
  "I can't connect to the backend server right now. Please check if it's running at http://localhost:5000.",
  "I'm in offline mode. To get full functionality, please make sure the backend server is running.",
  "Backend connection failed. I'm providing a simulated response since I can't reach the server."
];

export const sendMessage = async (
  message: string, 
  sessionId: string | null = null,
  messages: Message[] = []
): Promise<Response> => {
  // Convert our frontend message format to the backend format
  const messageHistory = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const payload: ChatRequest = {
    message,
    session_id: sessionId || undefined,
    stream: true,
    messages: messageHistory
  };

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    return response;
  } catch (error) {
    console.error('Failed to connect to backend:', error);
    
    // Create a mock response with a random message from our fallback responses
    const mockResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    // Create a ReadableStream to simulate the streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Add a small delay to simulate network latency
        setTimeout(() => {
          controller.enqueue(encoder.encode(`data: ${mockResponse}\n\n`));
          controller.close();
        }, 500);
      }
    });
    
    // Return a mock Response object
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      status: 200
    });
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      // Add a timeout to prevent long waiting times
      signal: AbortSignal.timeout(3000)
    });
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}; 