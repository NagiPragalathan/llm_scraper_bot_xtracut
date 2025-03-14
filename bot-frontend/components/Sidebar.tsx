import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface SidebarProps {
  conversations: Conversation[];
  activeConversation: number | null;
  setActiveConversation: (id: number) => void;
  addNewConversation: () => void;
  deleteConversation: (id: number) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  clearAllConversations: () => void;
}

export default function Sidebar({ 
  conversations, 
  activeConversation, 
  setActiveConversation, 
  addNewConversation,
  deleteConversation,
  isSidebarOpen,
  setIsSidebarOpen,
  clearAllConversations,
}: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredConversation, setHoveredConversation] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [setIsSidebarOpen]);

  const getLastMessagePreview = (conversation: Conversation) => {
    if (conversation.messages.length === 0) return 'No messages yet';
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const preview = lastMessage.content.length > 30 
      ? lastMessage.content.substring(0, 30) + '...' 
      : lastMessage.content;
      
    return preview;
  };

  const getFormattedDate = (conversation: Conversation) => {
    if (conversation.messages.length === 0) return '';
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const date = new Date(lastMessage.timestamp);
    
    // If today, show time
    if (isToday(date)) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (isThisYear(date)) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isThisYear = (date: Date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear();
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    setShowDeleteConfirm(conversationId);
  };

  const confirmDelete = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    deleteConversation(conversationId);
    setShowDeleteConfirm(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(null);
  };

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              bg-white w-80 flex-shrink-0 flex flex-col border-r border-gray-200
              ${isMobile ? 'fixed inset-y-0 left-0 z-40 shadow-xl' : ''}
            `}
          >
            <div className="p-4 border-b border-gray-200">
              <button 
                onClick={addNewConversation}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Chat
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 px-3">
              {conversations.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No conversations yet. Start a new chat!
                </div>
              ) : (
                <div className="space-y-2">
                  {[...conversations]
                    .sort((a, b) => {
                      const aTimestamp = a.messages.length > 0 
                        ? new Date(a.messages[a.messages.length - 1].timestamp).getTime() 
                        : a.id;
                      const bTimestamp = b.messages.length > 0 
                        ? new Date(b.messages[b.messages.length - 1].timestamp).getTime() 
                        : b.id;
                      
                      return bTimestamp - aTimestamp;
                    })
                    .map((conversation) => (
                      <motion.div
                        key={conversation.id}
                        className="relative"
                        onMouseEnter={() => setHoveredConversation(conversation.id)}
                        onMouseLeave={() => setHoveredConversation(null)}
                      >
                        <button
                          onClick={() => {
                            setActiveConversation(conversation.id);
                            if (isMobile) {
                              setIsSidebarOpen(false);
                            }
                          }}
                          className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 transition-all duration-200
                            ${activeConversation === conversation.id 
                              ? 'bg-blue-50 text-blue-600 font-medium' 
                              : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            activeConversation === conversation.id 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="block truncate font-medium">{conversation.name}</span>
                              {getFormattedDate(conversation) && (
                                <span className="text-xs text-gray-500">{getFormattedDate(conversation)}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 truncate block">
                              {getLastMessagePreview(conversation)}
                            </span>
                          </div>
                        </button>
                        
                        {(hoveredConversation === conversation.id || showDeleteConfirm === conversation.id) && (
                          <div 
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {showDeleteConfirm === conversation.id ? (
                              <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-md border border-gray-200">
                                <button
                                  onClick={(e) => confirmDelete(e, conversation.id)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                  title="Confirm delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={cancelDelete}
                                  className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
                                  title="Cancel"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleDeleteClick(e, conversation.id)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                                title="Delete conversation"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              {showClearAllConfirm ? (
                <div className="bg-red-50 p-3 rounded-xl mb-3">
                  <p className="text-sm text-red-800 mb-2">Delete all conversations?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        clearAllConversations();
                        setShowClearAllConfirm(false);
                      }}
                      className="flex-1 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    >
                      Yes, delete all
                    </button>
                    <button
                      onClick={() => setShowClearAllConfirm(false)}
                      className="flex-1 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  className="w-full text-left mb-3 py-2 px-3 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear all conversations
                </button>
              )}
              
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-md">
                  <span>U</span>
                </div>
                <div className="flex-1">
                  <span className="block font-medium text-gray-800">User Account</span>
                  <span className="text-xs text-gray-500">user@example.com</span>
                </div>
                <button className="text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar toggle */}
      {isMobile && (
        <button 
          className="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-full shadow-lg"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      )}
    </>
  );
} 