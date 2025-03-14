import { useState, useRef, useEffect, useMemo } from 'react';
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Add scroll detection to show/hide scroll button
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollButton(isScrolledUp);
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Add this effect to handle search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results: number[] = [];
    
    conversation.messages.forEach((msg, index) => {
      if (msg.content.toLowerCase().includes(query)) {
        results.push(index);
      }
    });
    
    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);
  }, [searchQuery, conversation.messages]);

  // Add this function to navigate between search results
  const navigateSearchResults = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    if (direction === 'next') {
      setCurrentResultIndex((prevIndex) => 
        prevIndex + 1 >= searchResults.length ? 0 : prevIndex + 1
      );
    } else {
      setCurrentResultIndex((prevIndex) => 
        prevIndex - 1 < 0 ? searchResults.length - 1 : prevIndex - 1
      );
    }
  };

  // Add this effect to scroll to the current search result
  useEffect(() => {
    if (currentResultIndex >= 0 && searchResults.length > 0) {
      const messageIndex = searchResults[currentResultIndex];
      const messageElement = document.getElementById(`message-${messageIndex}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentResultIndex, searchResults]);

  // Add this function to toggle search bar
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    setSearchQuery('');
    setSearchResults([]);
    
    // Focus the search input when opened
    if (!isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  // Add this function to highlight search matches in text
  const highlightSearchMatches = (text: string) => {
    if (!searchQuery.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 text-gray-900 px-0.5 rounded">{part}</mark> 
        : part
    );
  };

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
          // For new chats, use the first part of the message as the name
          updatedName = message.length > 25 ? message.substring(0, 25) + '...' : message;
          
          // If the message starts with a question, use that
          const questionMatch = message.match(/^(What|How|Why|When|Where|Is|Are|Can|Could|Do|Does|Who).{5,30}\??/i);
          if (questionMatch) {
            updatedName = questionMatch[0];
            if (!updatedName.endsWith('?')) updatedName += '?';
          }
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

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (isLoading) return;
    
    // Find the user message that triggered this response
    const assistantMessage = conversation.messages[messageIndex];
    if (!assistantMessage || assistantMessage.role !== 'assistant') return;
    
    // Find the preceding user message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0) {
      if (conversation.messages[userMessageIndex].role === 'user') {
        break;
      }
      userMessageIndex--;
    }
    
    if (userMessageIndex < 0) return;
    
    const userMessage = conversation.messages[userMessageIndex];
    
    // Remove all messages after and including the assistant message
    const updatedMessages = conversation.messages.slice(0, messageIndex);
    
    // Update the conversation
    setConversations(prevConversations => 
      prevConversations.map(c => 
        c.id === conversation.id 
          ? { ...c, messages: updatedMessages }
          : c
      )
    );
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Send the message to regenerate a response
      const response = await sendMessage(
        userMessage.content, 
        conversation.sessionId || null,
        updatedMessages
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
                sessionId: c.sessionId || `session-${Date.now()}`
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
    } catch (error) {
      console.error('Error regenerating response:', error);
      
      // Add an error message
      setConversations(prevConversations => 
        prevConversations.map(c => 
          c.id === conversation.id 
            ? { 
                ...c, 
                messages: [...c.messages, {
                  id: Date.now(),
                  content: 'Sorry, there was an error regenerating the response. Please try again.',
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
      className="flex-1 flex flex-col bg-white transition-all duration-300 relative !m-0"
      style={{marginLeft: isSidebarOpen && !isMobile ? '20rem' : '0'}}
    >
      {/* Chat header - College themed */}
      <div className="border-b border-gray-200 py-4 px-6 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md sticky top-0 z-10">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-white hover:bg-blue-600 transition-colors"
            aria-label="Open sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center flex-1 justify-center">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-700 mr-2 shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white truncate px-2 max-w-xs">
            {conversation.name || "College Assistant"}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button 
            className={`p-2 rounded-lg ${isSearchOpen ? 'bg-blue-600 text-white' : 'text-white hover:bg-blue-600'} transition-colors`}
            aria-label={isSearchOpen ? "Close search" : "Search conversation"}
            onClick={toggleSearch}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <button 
            className="p-2 rounded-lg text-white hover:bg-blue-600 transition-colors"
            aria-label="Refresh conversation"
            onClick={() => window.location.reload()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        {isOfflineMode && (
          <div className="absolute top-full left-0 right-0 bg-yellow-100 text-yellow-800 text-xs text-center py-1.5 px-2 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Offline Mode: Backend server not connected</span>
          </div>
        )}
      </div>

      {/* Search bar - add this right after the header */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 bg-white overflow-hidden"
          >
            <div className="p-2 flex items-center">
              <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-3 py-2">
                <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in conversation..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-gray-800"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="flex items-center ml-2">
                {searchResults.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600 mr-2">
                      {currentResultIndex + 1} of {searchResults.length}
                    </span>
                    <button
                      onClick={() => navigateSearchResults('prev')}
                      className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                      aria-label="Previous result"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateSearchResults('next')}
                      className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                      aria-label="Next result"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50 relative"
      >
        {conversation.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-full flex items-center justify-center text-white text-4xl mb-6 shadow-lg">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
              Your College Assistant
            </h2>
            <p className="text-gray-600 max-w-md mb-8">
              Ask me anything about your college! I can help with courses, professors, campus facilities, deadlines, and more.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {[
                { title: "Course Information", desc: "Ask about specific courses, prerequisites, or requirements", icon: "📚" },
                { title: "Campus Facilities", desc: "Learn about libraries, labs, dining options, and more", icon: "🏛️" },
                { title: "Academic Calendar", desc: "Get info on registration dates, exams, and holidays", icon: "📅" },
                { title: "Faculty Directory", desc: "Find contact information for professors and staff", icon: "👨‍🏫" }
              ].map((suggestion, i) => (
                <motion.button
                  key={i}
                  className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow group"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setMessage(suggestion.title + ": " + suggestion.desc);
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{suggestion.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">{suggestion.title}</h3>
                      <p className="text-sm text-gray-500">{suggestion.desc}</p>
                    </div>
                  </div>
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
                className={searchResults.includes(index) && currentResultIndex === searchResults.indexOf(index) 
                  ? 'ring-2 ring-yellow-400 ring-offset-2 rounded-2xl' 
                  : ''}
              >
                <Message 
                  message={msg} 
                  onRegenerate={msg.role === 'assistant' ? () => handleRegenerateResponse(index) : undefined} 
                  highlightText={highlightSearchMatches}
                  index={index}
                />
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
            <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-full flex items-center justify-center text-white shadow-md mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-6 right-6 p-3 rounded-full bg-white shadow-lg border border-gray-200 text-gray-600 hover:text-blue-700 hover:border-blue-500 transition-all duration-200"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.button>
        )}
      </div>

      {/* Message input - College themed */}
      <div className="border-t border-gray-200 p-4 md:p-6 bg-white sticky bottom-0 z-10">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <div className="flex items-center bg-white rounded-2xl border-2 border-gray-200 focus-within:border-blue-700 transition-colors duration-200 shadow-md input-focus-ring overflow-hidden">
            {/* Input field */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about courses, professors, campus facilities..."
              className="flex-1 p-4 focus:outline-none resize-none text-gray-800 bg-white min-h-[44px]"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            
            {/* Send button - properly aligned */}
            <div className="flex-shrink-0 p-2">
              <motion.button
                type="submit"
                disabled={isLoading || !message.trim()}
                className={`p-3 rounded-xl ${
                  isLoading || !message.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md hover:shadow-lg'
                } transition-all duration-200 flex items-center justify-center`}
                whileHover={isLoading || !message.trim() ? {} : { scale: 1.05 }}
                whileTap={isLoading || !message.trim() ? {} : { scale: 0.95 }}
                aria-label="Send message"
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
          
          {/* Action buttons below the input */}
          <div className="flex justify-between items-center mt-2 px-2 text-xs text-gray-500">
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                className="p-1.5 rounded-full hover:bg-gray-100 hover:text-blue-700 transition-colors"
                aria-label="Search course catalog"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button 
                type="button" 
                className="p-1.5 rounded-full hover:bg-gray-100 hover:text-blue-700 transition-colors"
                aria-label="Upload document"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
              <button 
                type="button" 
                className="p-1.5 rounded-full hover:bg-gray-100 hover:text-blue-700 transition-colors"
                aria-label="Academic calendar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 