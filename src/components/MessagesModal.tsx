import React, { useState, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, Send, ArrowLeft, MessageSquare, User as UserIcon } from 'lucide-react';

interface MessagesModalProps {
  serviceId?: string;
  receiverId?: string;
  onClose: () => void;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({ serviceId: initialServiceId, receiverId: initialReceiverId, onClose }) => {
  const { user } = useAuth();
  
  const [activeServiceId, setActiveServiceId] = useState<string>(initialServiceId || '');
  const [activeReceiverId, setActiveReceiverId] = useState<string>(initialReceiverId || '');
  const [activeServiceTitle, setActiveServiceTitle] = useState<string>('');

  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await api.get<{ conversations: any[] }>('/messages/conversations');
      if (data && data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!activeServiceId) return;
    try {
      const data = await api.get<{ messages: Message[] }>(`/messages/${activeServiceId}`);
      if (data && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [activeServiceId]);

  useEffect(() => {
    if (!activeServiceId) {
      fetchConversations();
    } else {
      fetchMessages();
      const interval = setInterval(fetchMessages, 4000);
      return () => clearInterval(interval);
    }
  }, [activeServiceId, fetchConversations, fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !activeServiceId) return;

    setLoading(true);
    try {
      await api.post('/messages', {
        service_id: activeServiceId,
        receiver_id: activeReceiverId || 'user-target',
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

  const handleSelectConversation = (conv: any) => {
    setActiveServiceId(conv.service_id);
    setActiveReceiverId(conv.other_user?.id || '');
    setActiveServiceTitle(conv.service_title || `Servicio #${conv.service_id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col h-[520px]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-slate-100 pb-3 mb-3 flex items-center gap-2">
          {activeServiceId && (
            <button
              onClick={() => {
                setActiveServiceId('');
                setActiveReceiverId('');
                fetchConversations();
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition"
              title="Volver a lista de conversaciones"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>{activeServiceId ? (activeServiceTitle || 'Chat de Servicio') : 'Mensajes y Conversaciones SERVIYA.do'}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {activeServiceId ? 'Comunicación directa y segura en República Dominicana 🇩🇴' : 'Tus chats activos con clientes y trabajadores'}
            </p>
          </div>
        </div>

        {/* VIEW 1: Conversations List */}
        {!activeServiceId ? (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loadingConvs ? (
              <p className="text-xs text-slate-400 text-center py-10">Cargando conversaciones...</p>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Aún no tienes conversaciones activas</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Al solicitar o contratar un servicio podrás chatear directamente con la otra parte aquí.
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.service_id}
                  onClick={() => handleSelectConversation(conv)}
                  className="p-3.5 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200/80 cursor-pointer transition flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 border border-blue-200">
                    <UserIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-700">
                        {conv.other_user?.first_name} {conv.other_user?.last_name}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {conv.last_message?.created_at ? new Date(conv.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-blue-600 truncate">{conv.service_title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.last_message?.content || 'Inicia la conversación...'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* VIEW 2: Chat Box */
          <>
            {/* Message Log */}
            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-2xl mb-3 border border-slate-100">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">Envía un mensaje para coordinar los detalles de la obra.</p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs space-y-1 ${
                        isMine ? 'bg-blue-600 text-white rounded-br-none shadow-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
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
          </>
        )}

      </div>
    </div>
  );
};
