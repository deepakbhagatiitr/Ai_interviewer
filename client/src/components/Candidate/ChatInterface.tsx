import React, { useEffect, useRef } from 'react';
import { X, Bot } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'ai' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isOpen,
  onClose
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const formatMessageContent = (content: string) => {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">CodeSage Responses</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No AI responses yet. The AI will provide feedback as you code!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start space-x-2">
                    <Bot className="h-4 w-4 mt-1 flex-shrink-0 text-blue-600" />
                    <div className="flex-1">
                      {/* Show header for test-based feedback */}
                      {message.metadata?.type === 'test_results' && (
                        <div className="mb-2">
                          {/* <h4 className="text-sm font-semibold text-blue-800">AI Interviewer Feedback</h4> */}
                        </div>
                      )}
                      <div
                        className="text-sm text-gray-900"
                        dangerouslySetInnerHTML={{
                          __html: formatMessageContent(message.content)
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs mt-1 text-gray-500">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center text-sm text-gray-500">
            <Bot className="h-4 w-4 inline mr-1" />
            AI responses will appear here as you code
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
