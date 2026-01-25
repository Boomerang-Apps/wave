/**
 * HumanReviewBanner Component (Phase D.2)
 *
 * Displays pending human escalation items for review:
 * - Shows items that require human approval before proceeding
 * - Displays safety scores for each item
 * - Allows approve/reject actions
 */

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HumanReviewItem {
  id: string;
  type: string;
  reason: string;
  safety_score?: number;
  created_at: string;
}

export interface HumanReviewBannerProps {
  items: HumanReviewItem[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export function HumanReviewBanner({ items, onApprove, onReject }: HumanReviewBannerProps) {
  if (items.length === 0) return null;

  const handleReject = (id: string) => {
    const reason = window.prompt('Rejection reason:');
    if (reason) {
      onReject(id, reason);
    }
  };

  return (
    <div
      data-testid="human-review-banner"
      className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-500" data-testid="warning-icon" />
        <span className="font-semibold text-amber-500">
          {items.length} item(s) require human review
        </span>
      </div>

      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 bg-card rounded-lg mb-2 last:mb-0"
        >
          <div>
            <p className="font-medium">{item.type}</p>
            <p className="text-sm text-muted-foreground">{item.reason}</p>
            {item.safety_score !== undefined && (
              <span
                data-testid="safety-score"
                className={cn(
                  "text-xs",
                  item.safety_score < 0.7 ? "text-red-500" : "text-amber-500"
                )}
              >
                Safety Score: {Math.round(item.safety_score * 100)}%
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(item.id)}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleReject(item.id)}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default HumanReviewBanner;
