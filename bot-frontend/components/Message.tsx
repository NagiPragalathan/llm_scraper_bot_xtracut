import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

// Import this interface from a shared types file or define it here
interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface MessageProps {
  message: Message;
  onRegenerate?: () => void;
  highlightText?: (text: string) => React.ReactNode;
  index: number;
}

export default function Message({ message, onRegenerate, highlightText, index }: MessageProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleTextToSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message.content);
      speechSynthRef.current = utterance;
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };
  
  return (
    <div 
      id={`message-${index}`}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ml-3 mr-0 shadow-md' 
            : 'bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-md'
        }`}>
          <span>{isUser ? 'U' : 
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }</span>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`py-3 px-4 rounded-2xl shadow-sm relative group ${
            isUser 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-none' 
              : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
          }`}
        >
          <div className="whitespace-pre-wrap">
            {message.content 
              ? (highlightText ? highlightText(message.content) : message.content)
              : (
                <span className="text-gray-400 italic">Generating response...</span>
              )
            }
          </div>
          
          <div className={`text-xs mt-2 flex justify-between items-center ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            
            {!isUser && message.content && (
              <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Text to Speech button */}
                <button 
                  onClick={handleTextToSpeech}
                  className={`p-1.5 rounded-full ${isSpeaking ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 hover:text-blue-700'} transition-colors`}
                  title={isSpeaking ? "Stop speaking" : "Listen to response"}
                >
                  {isSpeaking ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                
                {/* Copy button */}
                <button 
                  onClick={handleCopy}
                  className={`p-1.5 rounded-full ${isCopied ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100 hover:text-blue-700'} transition-colors`}
                  title={isCopied ? "Copied!" : "Copy to clipboard"}
                >
                  {isCopied ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                </button>
                
                {/* Regenerate button */}
                {onRegenerate && (
                  <button 
                    onClick={onRegenerate}
                    className="p-1.5 rounded-full hover:bg-gray-100 hover:text-blue-700 transition-colors"
                    title="Regenerate response"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Tooltip for copied state */}
          {isCopied && (
            <div className="absolute -top-8 right-0 bg-green-700 text-white text-xs py-1 px-2 rounded shadow-md">
              Copied to clipboard!
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 