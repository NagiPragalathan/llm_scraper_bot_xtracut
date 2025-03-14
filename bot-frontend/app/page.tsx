"use client";

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import { checkHealth } from '@/services/api';

// Define the Message and Conversation types here to ensure consistency
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

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  // Check backend health on load
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const isHealthy = await checkHealth();
        setIsBackendConnected(isHealthy);
      } catch (error) {
        console.error('Error checking backend health:', error);
        setIsBackendConnected(false);
      }
    };
    
    checkBackendHealth();
  }, []);

  // Load conversations from localStorage or initialize with a single empty conversation
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
        
        // Set active conversation to the first one if available
        if (conversationsWithDates.length > 0) {
          setActiveConversation(conversationsWithDates[0].id);
        }
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
        initializeWithEmptyConversation();
      }
    } else {
      initializeWithEmptyConversation();
    }
  }, []);

  const initializeWithEmptyConversation = () => {
    const newConversation = { 
      id: 1, 
      name: 'New Chat', 
      messages: [] 
    };
    setConversations([newConversation]);
    setActiveConversation(1);
  };

  const addNewConversation = () => {
    const newId = conversations.length > 0 ? Math.max(...conversations.map(c => c.id)) + 1 : 1;
    const newConversation = { id: newId, name: 'New Chat', messages: [] };
    
    // Add the new conversation at the beginning of the array
    setConversations([newConversation, ...conversations]);
    setActiveConversation(newId);
  };

  const deleteConversation = (id: number) => {
    // Filter out the conversation to delete
    const updatedConversations = conversations.filter(c => c.id !== id);
    
    // Update state
    setConversations(updatedConversations);
    
    // If we're deleting the active conversation, set a new active conversation
    if (activeConversation === id) {
      if (updatedConversations.length > 0) {
        // Set the first conversation as active
        setActiveConversation(updatedConversations[0].id);
      } else {
        // If no conversations left, create a new empty one
        addNewConversation();
      }
    }
  };

  const clearAllConversations = () => {
    // Create a new empty conversation
    const newConversation = { 
      id: Date.now(), 
      name: 'New Chat', 
      messages: [] 
    };
    
    // Reset to just this new conversation
    setConversations([newConversation]);
    setActiveConversation(newConversation.id);
  };

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  return (
    <div className="flex h-screen bg-[#f9fafb]">
      {isBackendConnected === false && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-100 text-yellow-800 py-2 px-4 text-center z-50">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              Running in offline mode. Backend server not connected. 
              <button 
                onClick={() => window.location.reload()}
                className="ml-2 underline hover:text-yellow-900"
              >
                Retry Connection
              </button>
            </span>
          </div>
        </div>
      )}
      
      <Sidebar 
        conversations={conversations}
        activeConversation={activeConversation}
        setActiveConversation={setActiveConversation}
        addNewConversation={addNewConversation}
        deleteConversation={deleteConversation}
        clearAllConversations={clearAllConversations}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      
      {activeConversation !== null && (
        <ChatInterface 
          conversation={conversations.find(c => c.id === activeConversation) || conversations[0]}
          setConversations={setConversations}
          conversations={conversations}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      )}
    </div>
  );
}
