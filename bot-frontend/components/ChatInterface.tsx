import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Message from './Message';
import { sendMessage, checkHealth } from '@/services/api';

// Import these interfaces from a shared types file or define them here
interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Conversation {
  id: number;
  name: string;
  messages: Message[];
  sessionId?: string;
}

interface ChatInterfaceProps {
  conversation: Conversation;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversations: Conversation[];
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function ChatInterface({ 
  conversation, 
  setConversations,
  conversations,
  isSidebarOpen,
  setIsSidebarOpen
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, streamedResponse]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Load conversations from localStorage on initial load
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        // Convert string timestamps back to Date objects
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(conversationsWithDates);
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
      }
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Check backend connection on component mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      const isConnected = await checkHealth();
      setIsOfflineMode(!isConnected);
    };
    
    checkBackendConnection();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      content: message,
      role: 'user' as const,
      timestamp: new Date()
    };

    // Update conversation with user message
    const updatedConversations = conversations.map(c => {
      if (c.id === conversation.id) {
        // If this is the first message, update the conversation name
        let updatedName = c.name;
        if (c.messages.length === 0) {
          updatedName = message.length > 25 ? message.substring(0, 25) + '...' : message;
        }
        return {
          ...c,
          name: updatedName,
          messages: [...c.messages, userMessage]
        };
      }
      return c;
    });
    
    setConversations(updatedConversations);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);
    setStreamedResponse('');

    try {
      // Get the updated conversation with the new user message
      const currentConversation = updatedConversations.find(c => c.id === conversation.id);
      if (!currentConversation) throw new Error('Conversation not found');

      // Send the message to the backend
      const response = await sendMessage(
        message, 
        currentConversation.sessionId || null,
        currentConversation.messages
      );

      if (!response.ok && response.status !== 200) {
        throw new Error(`Server responded with ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      // Create a temporary message for the streaming response
      const tempAiMessage = {
        id: Date.now(),
        content: '',
        role: 'assistant' as const,
        timestamp: new Date()
      };

      // Add the temporary message to the conversation
      setConversations(prevConversations => 
        prevConversations.map(c => 
          c.id === conversation.id 
            ? { 
                ...c, 
                messages: [...c.messages, tempAiMessage],
                sessionId: c.sessionId || `session-${Date.now()}` // Create a session ID if none exists
              } 
            : c
        )
      );

      // Process the stream
      let accumulatedContent = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data) {
              accumulatedContent += data;
              setStreamedResponse(accumulatedContent);
              
              // Update the AI message content as we receive it
              setConversations(prevConversations => 
                prevConversations.map(c => 
                  c.id === conversation.id 
                    ? { 
                        ...c, 
                        messages: c.messages.map(m => 
                          m.id === tempAiMessage.id 
                            ? { ...m, content: accumulatedContent } 
                            : m
                        ) 
                      } 
                    : c
                )
              );
            }
          }
        }
      }

      // If we're in offline mode and successfully connected, update the status
      if (isOfflineMode) {
        setIsOfflineMode(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // If we get a connection error, set offline mode
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setIsOfflineMode(true);
      }
      
      // Add an error message
      setConversations(prevConversations => 
        prevConversations.map(c => 
          c.id === conversation.id 
            ? { 
                ...c, 
                messages: [...c.messages, {
                  id: Date.now(),
                  content: isOfflineMode 
                    ? "I'm currently in offline mode. The backend server is not available."
                    : 'Sorry, there was an error processing your request. Please try again.',
                  role: 'assistant' as const,
                  timestamp: new Date()
                }] 
              } 
            : c
        )
      );
    } finally {
      setIsLoading(false);
      setStreamedResponse('');
    }
  };

  return (
    <div 
      ref={chatContainerRef}
      className={`flex-1 flex flex-col bg-white transition-all duration-300 !m-0 ${isSidebarOpen && !isMobile ? 'ml-80' : 'ml-0'}`}
    >
      {/* Chat header */}
      <div className="border-b border-gray-200 py-3 px-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-10">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-800 flex-1 text-center truncate px-2">
          {conversation.name}
        </h2>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
        </div>
        {isOfflineMode && (
          <div className="absolute top-full left-0 right-0 bg-yellow-100 text-yellow-800 text-xs text-center py-1 px-2">
            Offline Mode: Backend server not connected
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
        {conversation.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl mb-6 shadow-lg">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">How can I help you today?</h2>
            <p className="text-gray-600 max-w-md mb-8">
              Ask me anything! I can help with coding, answer questions, generate content, and more.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {[
                { title: "Explain a concept", desc: "Like quantum computing or blockchain" },
                { title: "Write some code", desc: "In any programming language" },
                { title: "Draft an email", desc: "For any professional context" },
                { title: "Plan a trip", desc: "To any destination" }
              ].map((suggestion, i) => (
                <motion.button
                  key={i}
                  className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setMessage(suggestion.title + ": " + suggestion.desc);
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                >
                  <h3 className="font-medium text-gray-800 mb-1">{suggestion.title}</h3>
                  <p className="text-sm text-gray-500">{suggestion.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {conversation.messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Message message={msg} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {isLoading && !streamedResponse && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md mr-3">
              <span>AI</span>
            </div>
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Message input - Improved */}
      <div className="border-t border-gray-200 p-4 bg-white sticky bottom-0 z-10">
        <form onSubmit={handleSubmit} className="relative">
          <div className="rounded-2xl border-2 border-gray-200 focus-within:border-blue-500 transition-colors duration-200 shadow-sm input-focus-ring">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-4 pr-16 focus:outline-none resize-none rounded-2xl text-gray-800 bg-white"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute right-3 bottom-3">
              <motion.button
                type="submit"
                disabled={isLoading || !message.trim()}
                className={`p-3 rounded-xl ${
                  isLoading || !message.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg'
                } transition-all duration-200`}
                whileHover={isLoading || !message.trim() ? {} : { scale: 1.05 }}
                whileTap={isLoading || !message.trim() ? {} : { scale: 0.95 }}
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2 px-2 text-xs text-gray-500">
            <div>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="p-1 hover:text-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <button type="button" className="p-1 hover:text-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 