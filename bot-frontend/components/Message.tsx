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
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ml-3 mr-0 shadow-md' 
            : 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-md'
        }`}>
          <span>{isUser ? 'U' : 'AI'}</span>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`py-3 px-4 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-none' 
              : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
          }`}
        >
          <div className="whitespace-pre-wrap">
            {message.content || (
              <span className="text-gray-400 italic">Generating response...</span>
            )}
          </div>
          <div className={`text-xs mt-2 flex justify-between items-center ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="flex gap-2 ml-4">
              {!isUser && (
                <>
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 