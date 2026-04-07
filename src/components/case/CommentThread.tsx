'use client';

import { useState } from 'react';
import { useInventoryStore } from '@/lib/store/inventory-store';
import type { CaseComment } from '@/types/inventory';

interface CommentThreadProps {
  caseId: string;
  comments: CaseComment[];
  /** Current user role — controls how new comments are tagged */
  currentUserRole?: 'business_user' | 'governance_team' | 'reviewer';
  currentUserName?: string;
}

const roleStyles: Record<CaseComment['authorRole'], { label: string; bg: string; text: string }> = {
  business_user: { label: 'Business User', bg: 'bg-slate-100', text: 'text-slate-600' },
  governance_team: { label: 'Governance Team', bg: 'bg-blue-100', text: 'text-blue-700' },
  reviewer: { label: 'Reviewer', bg: 'bg-purple-100', text: 'text-purple-700' },
};

function formatRelative(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function CommentThread({
  caseId,
  comments,
  currentUserRole = 'governance_team',
  currentUserName = 'governance-team@example.com',
}: CommentThreadProps) {
  const addComment = useInventoryStore((s) => s.addComment);
  const [draft, setDraft] = useState('');

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    addComment(caseId, {
      author: currentUserName,
      authorRole: currentUserRole,
      body: trimmed,
    });
    setDraft('');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">
          Conversation{' '}
          {comments.length > 0 && (
            <span className="text-slate-400 font-normal">({comments.length})</span>
          )}
        </h2>
      </div>

      <div className="divide-y divide-slate-100">
        {comments.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-xs text-slate-400">
              No messages yet. Start a conversation about this use case.
            </p>
          </div>
        ) : (
          comments.map((c) => {
            const style = roleStyles[c.authorRole];
            return (
              <div key={c.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">{c.author}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{formatRelative(c.timestamp)}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {c.body}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 p-3 bg-slate-50/50">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Add a message..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-400">
            Posting as:{' '}
            <span className="font-medium text-slate-600">{roleStyles[currentUserRole].label}</span>
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={draft.trim().length === 0}
            className="px-3 py-1 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Post message
          </button>
        </div>
      </div>
    </div>
  );
}
