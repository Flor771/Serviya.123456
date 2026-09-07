import React, { useState, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, Send } from 'lucide-react';

interface MessagesModalProps {
  serviceId: string;
  receiverId: string;
  onClose: () => void;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({ serviceId, receiverId, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get<{ messages: Message[] }>(`/messages/${serviceId}`);
      setMessages(data.messages);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await api.post('/messages', {
        service_id: serviceId,
        receiver_id: receiverId,
        content
      });
      setContent('');
      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col h-[500px]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">💬 Mensajes Directos SERVIYA</h3>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-2xl mb-3 border border-slate-100">
          {messages.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">Envía un mensaje para coordinar los detalles de la obra.</p>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs space-y-1 ${
                    isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}>
                    <p>{m.content}</p>
                    <span className={`text-[9px] block text-right ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Send Box */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder="Escribe tu mensaje..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
