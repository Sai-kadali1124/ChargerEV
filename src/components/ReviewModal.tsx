import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import type { ChargingHost, ConnectorType, HostReview } from '../utils/chargingLogic';

interface ReviewModalProps {
  host: ChargingHost | null;
  reviews: HostReview[];
  defaultVehicle?: string;
  onClose: () => void;
  onSubmitReview: (payload: {
    hostId: string;
    rating: number;
    comment: string;
    connectorUsed: ConnectorType;
    vehicleModel: string;
  }) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  host,
  reviews,
  defaultVehicle,
  onClose,
  onSubmitReview,
}) => {
  if (!host) return null;

  const hostReviews = reviews.filter((r) => r.hostId === host.id);
  const [rating, setRating] = useState(5);
  const [connectorUsed, setConnectorUsed] = useState<ConnectorType>(
    host.connectors[0] || 'Type 2 AC'
  );
  const [vehicleModel, setVehicleModel] = useState(defaultVehicle || 'Tata Nexon EV');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (comment.trim().length < 5) {
      setErrorMsg('Please write at least 5 characters describing your charging experience.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitReview({
        hostId: host.id,
        rating,
        comment,
        connectorUsed,
        vehicleModel,
      });
      setComment('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to post review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl my-8 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500">
              {host.city} · {host.category} · Rating {host.rating} ({host.reviewCount} reviews)
            </div>
            <h2 id="review-modal-title" className="text-lg font-bold text-slate-900 mt-0.5">
              Reviews & Compatibility Log — {host.stationName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reviews modal"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Reviews */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {hostReviews.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No community reviews yet for this station. Be the first to log earthing and charging
              performance!
            </p>
          ) : (
            hostReviews.map((rev) => (
              <div key={rev.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {rev.authorName} · {rev.vehicleModel}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {rev.rating}.0 / 5.0 · {rev.connectorUsed}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* Add Review Form */}
        <form onSubmit={handleSubmit} className="pt-4 border-t border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-900">
            Submit Charging & Earthing Verification Review
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="rev-rating" className="block text-xs font-medium text-slate-700 mb-1">
                Rating (1-5)
              </label>
              <select
                id="rev-rating"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg bg-white"
              >
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Adequate</option>
                <option value={2}>2 - Suboptimal</option>
                <option value={1}>1 - Unsafe / Fault</option>
              </select>
            </div>

            <div>
              <label htmlFor="rev-conn" className="block text-xs font-medium text-slate-700 mb-1">
                Connector Used
              </label>
              <select
                id="rev-conn"
                value={connectorUsed}
                onChange={(e) => setConnectorUsed(e.target.value as ConnectorType)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {host.connectors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rev-vehicle" className="block text-xs font-medium text-slate-700 mb-1">
                Vehicle Charged
              </label>
              <input
                id="rev-vehicle"
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rev-comment" className="block text-xs font-medium text-slate-700 mb-1">
              Review Comment (Earthing quality, kW speed, host responsiveness)
            </label>
            <textarea
              id="rev-comment"
              rows={2}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Verified clean earthing, steady 7.2 kW charge rate..."
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5" />
              {submitting ? 'Posting...' : 'Post Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
