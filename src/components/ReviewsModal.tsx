import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Star, CheckCircle } from 'lucide-react';

interface ReviewsModalProps {
  serviceId: string;
  targetUserId: string;
  onClose: () => void;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({ serviceId, targetUserId, onClose }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        service_id: serviceId,
        target_user_id: targetUserId,
        rating,
        comment
      });
      setMsgSuccess('¡Gracias por tu calificación! Ayuda a mantener alta la calidad del trabajo en RD.');
    } catch (err) {
      console.error('Error sending review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 mb-1">Calificar Trabajo Realizado</h3>
        <p className="text-xs text-slate-500 mb-4">Evalúa el desempeño para construir reputación en la plataforma.</p>

        {msgSuccess ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{msgSuccess}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Stars */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-2xl transition transform active:scale-125"
                >
                  <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Comentario sobre la experiencia</label>
              <textarea
                rows={3}
                placeholder="Puntualidad, trato, pulcritud, herramientas..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : '⭐ Publicar Calificación'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
