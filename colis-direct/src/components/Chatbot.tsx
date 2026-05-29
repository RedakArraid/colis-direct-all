import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([
    { text: "Bonjour ! Comment puis-je vous aider aujourd'hui ?", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const messageText = inputValue.trim();
    setMessages([...messages, { text: messageText, isUser: true }]);
    setInputValue('');
    setSending(true);

    try {
      // Send to backend (will store in DB and send email)
      const { error } = await api.submitChatbotMessage({
        user_id: user?.id || null,
        user_email: user?.email || null,
        user_phone: user?.phone || null,
        message: messageText,
      });

      if (error) {
        console.error('Error sending message:', error);
      }

      setMessages(prev => [...prev, {
        text: "Merci pour votre message. Un conseiller vous répondra bientôt par email ou téléphone.",
        isUser: false
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        text: "Erreur lors de l'envoi. Veuillez réessayer ou nous contacter directement.",
        isUser: false
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-[#FF6C00] text-white p-4 rounded-full shadow-2xl hover:bg-[#e66100] transition-all z-50 flex items-center gap-2"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-sm sm:max-w-none bg-white rounded-2xl shadow-2xl z-50 flex flex-col" style={{ height: '500px' }}>
          <div className="bg-[#FF6C00] text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-bold">Chat COLISDIRECT</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-[#e66100] rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-lg ${
                    message.isUser
                      ? 'bg-[#FF6C00] text-white'
                      : 'bg-[#F6F7F9] text-[#1A1A1A]'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#E6E6E6]">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Écrivez votre message..."
                className="flex-1 px-4 py-2 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6C00]"
              />
              <button
                onClick={handleSend}
                className="bg-[#FF6C00] text-white p-2 rounded-lg hover:bg-[#e66100] transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;
