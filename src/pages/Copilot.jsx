import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useCopilot } from '../hooks/useCopilot';
import { useToast } from '../components/ui/Toast';

// ── FY helpers ────────────────────────────────────────────────────────────────
function getCurrentFY() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(year + 1).slice(2)}`;
}

function getFYOptions() {
  const current = parseInt(getCurrentFY().split('-')[0]);
  return Array.from({ length: 5 }, (_, i) => {
    const y = current - i;
    return `${y}-${String(y + 1).slice(2)}`;
  });
}

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTED = [
  'What is the total donation received this FY?',
  'Show me the top 5 donors',
  'How much has been spent vs received?',
  'Which fund category has the highest utilisation?',
  'How many donations don\'t have 80G receipts?',
  'Show deal pipeline summary',
];

// ── Markdown renderer with table support ─────────────────────────────────────
function MessageContent({ content }) {
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7, color: 'inherit' }}
      className="copilot-md">
      <ReactMarkdown
        components={{
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '8px 0' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: '#F3F4F6' }}>{children}</thead>,
          th: ({ children }) => <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{children}</th>,
          td: ({ children }) => <td style={{ padding: '5px 12px', borderBottom: '1px solid #F3F4F6', color: '#374151' }}>{children}</td>,
          tr: ({ children }) => <tr style={{ borderBottom: '1px solid #F3F4F6' }}>{children}</tr>,
          p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 20 }}>{children}</ul>,
          li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
          code: ({ children }) => <code style={{ background: '#F3F4F6', borderRadius: 3, padding: '1px 4px', fontSize: 11, fontFamily: 'monospace' }}>{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg, fy, orgName, zohoSynced }) {
  const isUser = msg.role === 'user';
  const syncAt = msg.zoho_sync_at;

  function toIST(val) {
    if (!val) return null;
    const d = new Date(typeof val === 'string' && !val.includes('T') ? val.replace(' ', 'T') + 'Z' : val);
    return isNaN(d) ? null : d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
  }

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{
          maxWidth: '72%', background: '#1A1A1A', color: '#fff',
          borderRadius: '18px 18px 4px 18px', padding: '10px 16px',
          fontSize: 13, lineHeight: 1.5,
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start' }}>
      {/* Icon */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', background: '#E8F5F4',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#8ECFCA"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#8ECFCA', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
          FundZola Copilot
        </p>
        <div style={{
          background: '#fff', border: '1px solid #F3F4F6', borderRadius: '4px 18px 18px 18px',
          padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <MessageContent content={msg.content} />
        </div>
        {/* Context tags */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {fy && (
            <span style={{ fontSize: 10, background: '#FEF9C3', color: '#92400E', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
              FY {fy}
            </span>
          )}
          {orgName && (
            <span style={{ fontSize: 10, background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 8px' }}>
              {orgName}
            </span>
          )}
          {zohoSynced !== undefined && (
            <span style={{ fontSize: 10, background: zohoSynced ? '#D1FAE5' : '#FEE2E2', color: zohoSynced ? '#065F46' : '#991B1B', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
              {zohoSynced ? `Zoho Books: Synced${syncAt ? ' ✓ ' + toIST(syncAt) : ' ✓'}` : 'Zoho Books: Not connected'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Copilot() {
  const toast   = useToast();
  const { conversations, messages, activeConvId, loading, sending,
          fetchConversations, loadConversation, sendMessage, newChat, deleteConversation } = useCopilot();

  const [fy, setFy]           = useState(getCurrentFY);
  const [input, setInput]     = useState('');
  const [orgName, setOrgName] = useState('');
  const messagesEndRef        = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    // Fetch org name for context tags
    fetch('/api/organizations', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(d => { if (d.success) setOrgName(d.data?.org_name || ''); }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    try {
      await sendMessage(msg, fy);
    } catch (err) {
      toast.error(err.message || 'Failed to send message.');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function formatDate(d) {
    const date = new Date(d);
    const now  = new Date();
    const diff = now - date;
    if (diff < 86400000 && date.getDate() === now.getDate()) return 'Today, ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (diff < 172800000) return 'Yesterday, ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const fyOptions  = getFYOptions();
  const isNewChat  = !activeConvId && messages.length === 0;
  const lastAssMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];

  return (
    <div style={{ display: 'flex', height: '100%', background: '#F7F6F3', overflow: 'hidden' }}>

      {/* ── Left Sidebar ── */}
      <div style={{ width: 260, flexShrink: 0, background: '#FAFAF9', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Conversations</p>
          <button
            onClick={newChat}
            style={{ width: '100%', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
            </svg>
            New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {loading && <p style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 6px' }}>Loading…</p>}
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              style={{
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: activeConvId === conv.id ? '#E8F5F4' : 'transparent',
                border: activeConvId === conv.id ? '1px solid #8ECFCA' : '1px solid transparent',
                position: 'relative',
              }}
              onMouseEnter={e => { if (activeConvId !== conv.id) e.currentTarget.style.background = '#F3F4F6'; }}
              onMouseLeave={e => { if (activeConvId !== conv.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 20 }}>
                {conv.title}
              </p>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: '2px 0 0' }}>{formatDate(conv.updated_at)}</p>
              <button
                onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2, lineHeight: 1 }}
                title="Delete"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
          {!loading && conversations.length === 0 && (
            <p style={{ fontSize: 12, color: '#9CA3AF', padding: '12px 6px', textAlign: 'center' }}>No conversations yet</p>
          )}
        </div>
      </div>

      {/* ── Right Chat Panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E8F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#8ECFCA"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>FundZola Copilot <span style={{ color: '#8ECFCA' }}>✦</span></p>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>Ask anything about your funds, donors, and utilisation</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={fy}
              onChange={e => setFy(e.target.value)}
              style={{ fontSize: 12, fontWeight: 600, border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 10px', background: '#F9FAFB', color: '#374151', cursor: 'pointer' }}>
              {fyOptions.map(f => <option key={f} value={f}>FY {f}</option>)}
            </select>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Welcome state */}
          {isNewChat && (
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E8F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#8ECFCA"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#8ECFCA', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>FundZola Copilot</p>
                  <div style={{ background: '#fff', border: '1px solid #F3F4F6', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                      Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}! I'm your FundZola assistant for <strong>FY {fy}</strong>.
                      I have live access to your donors, donations, expenses, programs, and deal pipeline.
                      What would you like to explore today?
                    </p>
                  </div>
                  {/* Suggested prompts */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {SUGGESTED.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        style={{
                          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20,
                          padding: '5px 12px', fontSize: 12, color: '#374151', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#8ECFCA'; e.currentTarget.style.color = '#065F46'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151'; }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conversation messages */}
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                fy={fy}
                orgName={orgName}
                zohoSynced={msg.role === 'assistant' ? msg.zoho_synced : undefined}
              />
            ))}

            {/* Typing indicator */}
            {sending && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E8F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#8ECFCA"/>
                  </svg>
                </div>
                <div style={{ background: '#fff', border: '1px solid #F3F4F6', borderRadius: '4px 18px 18px 18px', padding: '12px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#8ECFCA', display: 'inline-block', animation: `bounce 1.2s ${i * 0.2}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #E5E7EB', background: '#fff', flexShrink: 0 }}>
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about donors, grants, utilisation, receipts…"
                disabled={sending}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
                  fontSize: 13, color: '#374151', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                background: input.trim() && !sending ? '#E8967A' : '#E5E7EB',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s', flexShrink: 0,
              }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

export default Copilot;
