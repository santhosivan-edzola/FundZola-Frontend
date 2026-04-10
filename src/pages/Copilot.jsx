import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useCopilot } from '../hooks/useCopilot';
import { useToast } from '../components/ui/Toast';
import { useDonors } from '../hooks/useDonors';
import { useDonations } from '../hooks/useDonations';
import { useExpenses } from '../hooks/useExpenses';
import { useDeals } from '../hooks/useDeals';

// ── Chart colours ─────────────────────────────────────────────────────────────
const CHART_COLORS = ['#E8967A', '#8ECFCA', '#7ab8e8', '#e8c07a', '#b07ae8', '#7ae87a', '#e87ab0', '#a0a0a0'];

const fmtVal = (v) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
  return v % 1 === 0 ? String(v) : Number(v).toFixed(2);
};

// ── 1. Try extracting explicit CHART_JSON block appended by AI ────────────────
function extractChartJson(content) {
  const idx = content.lastIndexOf('CHART_JSON:');
  if (idx === -1) return { text: content, chart: null };
  const jsonStr = content.slice(idx + 'CHART_JSON:'.length).trim();
  const text    = content.slice(0, idx).trimEnd();
  try {
    const chart = JSON.parse(jsonStr);
    if (!chart.data?.length || chart.data.length < 2) return { text, chart: null };
    return { text, chart };
  } catch {
    return { text, chart: null };
  }
}

// ── 2. Fallback: parse a markdown table from the raw text ─────────────────────
function parseTableFallback(content) {
  // Match markdown table: header row | separator row | data rows
  const tableRe = /\|(.+)\|\s*\n\s*\|[-| :]+\|\s*\n((?:\s*\|.+\|\s*\n?)+)/;
  const m = tableRe.exec(content);
  if (!m) return null;

  const headers = m[1].split('|').map(h => h.trim()).filter(Boolean);
  const rows = m[2].trim().split('\n').map(r =>
    r.split('|').map(c => c.trim()).filter(Boolean)
  ).filter(r => r.length >= 2);

  if (!rows.length || headers.length < 2) return null;

  // Find numeric columns (skip index 0 which is the label)
  const numCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => i > 0 && rows.some(r => {
      const raw = (r[i] || '').replace(/[₹,%\s,]/g, '');
      return raw !== '' && !isNaN(Number(raw)) && Number(raw) > 0;
    }));

  if (!numCols.length) return null;

  const data = rows.map(row => {
    const entry = { name: row[0] || '' };
    numCols.forEach(({ h, i }) => {
      const raw = (row[i] || '').replace(/[₹,%\s,]/g, '');
      entry[h] = isNaN(Number(raw)) ? 0 : Number(raw);
    });
    return entry;
  });

  const keys = numCols.map(c => c.h);
  const isPie = /breakdown|distribut|split|percentage|categor/i.test(content) && keys.length === 1 && data.length <= 8;
  return { type: isPie ? 'pie' : 'bar', title: null, data, keys };
}

// ── Decide chart data from content ───────────────────────────────────────────
function splitChartFromReply(content) {
  // First try CHART_JSON block
  const fromJson = extractChartJson(content);
  if (fromJson.chart) return fromJson;

  // Fallback: parse markdown table
  const fallback = parseTableFallback(content);
  return { text: content, chart: fallback };
}

// ── Chart renderer ────────────────────────────────────────────────────────────
function CopilotChart({ chart }) {
  if (!chart) return null;
  const { type, title, data, keys = ['value'] } = chart;

  if (type === 'pie') {
    return (
      <div style={{ marginTop: 16, background: '#FAF7F4', borderRadius: 12, padding: '16px 12px 12px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          {title || 'Visual Summary'}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey={keys[0]} nameKey="name" cx="50%" cy="50%" outerRadius={90}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#ccc', strokeWidth: 1 }}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => fmtVal(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E0D8' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const bottomMargin = data.some(d => (d.name || '').length > 10) ? 60 : 32;
  return (
    <div style={{ marginTop: 16, background: '#FAF7F4', borderRadius: 12, padding: '16px 12px 12px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {title || 'Visual Summary'}
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: bottomMargin }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }}
            angle={data.length > 4 ? -30 : 0}
            textAnchor={data.length > 4 ? 'end' : 'middle'}
            interval={0} />
          <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={fmtVal} width={58} />
          <Tooltip formatter={(v, name) => [fmtVal(v), name]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E0D8' }} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} name={key}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]} maxBarSize={52} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Smart chart builder from live frontend data ───────────────────────────────
function buildSmartChart(question, { donors, donations, expenses, deals }, fy) {
  const q = question.toLowerCase();

  // FY filter helper — FY "2026-27" => Apr 2026 – Mar 2027
  function inFY(dateStr) {
    if (!fy || !dateStr) return true;
    const startYear = parseInt(fy.split('-')[0]);
    const d = new Date(dateStr);
    const fyStart = new Date(`${startYear}-04-01`);
    const fyEnd   = new Date(`${startYear + 1}-03-31`);
    return d >= fyStart && d <= fyEnd;
  }

  const fyDonations = donations.filter(d => inFY(d.date || d.donation_date || d.created_at));
  const fyExpenses  = expenses.filter(e => inFY(e.date || e.expense_date || e.created_at));

  // ── Top donors ──────────────────────────────────────────────────────────────
  if (/top\s*\d*\s*donor|highest donor|best donor|donor rank|donor list/i.test(q)) {
    const limit = parseInt(q.match(/top\s*(\d+)/i)?.[1] || '5');
    const totals = {};
    fyDonations.forEach(d => {
      const key = d.donorName || d.donor_name || d.donorId || 'Unknown';
      totals[key] = (totals[key] || 0) + Number(d.amount || 0);
    });
    const data = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 13) + '…' : name, value }));
    if (!data.length) return null;
    return { type: 'bar', title: `Top ${Math.min(limit, data.length)} Donors by Donation`, data, keys: ['value'] };
  }

  // ── Spent vs received / comparison ─────────────────────────────────────────
  if (/spent.*(receiv|collect)|receiv.*(spent|expens)|how much.*(spent|expens)|utilis|utiliz|vs receiv|vs collect/i.test(q)) {
    const totalDonated = fyDonations.reduce((s, d) => s + Number(d.amount || 0), 0);
    const totalSpent   = fyExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const data = [
      { name: 'Received', value: totalDonated },
      { name: 'Spent', value: totalSpent },
      { name: 'Balance', value: Math.max(0, totalDonated - totalSpent) },
    ];
    return { type: 'bar', title: 'Received vs Spent', data, keys: ['value'] };
  }

  // ── Fund category breakdown ────────────────────────────────────────────────
  if (/fund categor|categor.*donat|donat.*categor|which fund|fund.*highest|fund.*breakdown|fund.*split/i.test(q)) {
    const totals = {};
    fyDonations.forEach(d => {
      const cat = d.fundCategory || d.fund_category || 'General';
      totals[cat] = (totals[cat] || 0) + Number(d.amount || 0);
    });
    const data = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    if (!data.length) return null;
    return { type: 'pie', title: 'Donations by Fund Category', data, keys: ['value'] };
  }

  // ── Expense category breakdown ─────────────────────────────────────────────
  if (/expens.*categor|categor.*expens|expens.*breakdown|expens.*spend|most.*expens|highest.*expens/i.test(q)) {
    const totals = {};
    fyExpenses.forEach(e => {
      const cat = e.category || e.fundCategory || e.fund_category || 'Other';
      totals[cat] = (totals[cat] || 0) + Number(e.amount || 0);
    });
    const data = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    if (!data.length) return null;
    return { type: 'pie', title: 'Expenses by Category', data, keys: ['value'] };
  }

  // ── Deal pipeline ──────────────────────────────────────────────────────────
  if (/deal.*pipeline|pipeline|deal.*stage|stage.*deal/i.test(q)) {
    const totals = {};
    deals.forEach(d => {
      const stage = d.stage || 'Unknown';
      totals[stage] = (totals[stage] || 0) + Number(d.amount || 0);
    });
    const data = Object.entries(totals).map(([name, value]) => ({ name, value }));
    if (!data.length) return null;
    return { type: 'bar', title: 'Deal Pipeline by Stage', data, keys: ['value'] };
  }

  // ── Total donation / summary ───────────────────────────────────────────────
  if (/total donat|donat.*receiv|receiv.*donat|how many donat|donation.*total/i.test(q)) {
    const totals = {};
    fyDonations.forEach(d => {
      const key = d.donorName || d.donor_name || 'Unknown';
      totals[key] = (totals[key] || 0) + Number(d.amount || 0);
    });
    const data = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 13) + '…' : name, value }));
    if (data.length < 2) return null;
    return { type: 'bar', title: 'Donations by Donor', data, keys: ['value'] };
  }

  return null;
}

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
  const { text, chart } = splitChartFromReply(content);
  return (
    <div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'inherit' }} className="copilot-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
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
            code: ({ children }) => <code style={{ background: '#F3F4F6', borderRadius: 3, padding: '1px 4px', fontSize: 11, fontFamily: 'Roboto, sans-serif' }}>{children}</code>,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
      <CopilotChart chart={chart} />
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg, fy, orgName, zohoSynced, smartChart }) {
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
          {smartChart && <CopilotChart chart={smartChart} />}
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

  // Live data from frontend context
  const { donors, fetchDonors }         = useDonors();
  const { donations, fetchDonations }   = useDonations();
  const { expenses, fetchExpenses }     = useExpenses();
  const { deals, fetchDeals }           = useDeals();
  const liveData = { donors, donations, expenses, deals };

  const [fy, setFy]           = useState(getCurrentFY);
  const [input, setInput]     = useState('');
  const [orgName, setOrgName] = useState('');
  // Charts keyed by assistant message id
  const [msgCharts, setMsgCharts]   = useState({});
  const pendingChart                = useRef(null);
  const messagesEndRef              = useRef(null);
  const inputRef                    = useRef(null);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Load live data so smart charts always have real numbers
  useEffect(() => {
    fetchDonors();
    fetchDonations();
    fetchExpenses();
    fetchDeals();
  }, []);

  useEffect(() => {
    // Fetch org name for context tags
    fetch('/api/organizations', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(d => { if (d.success) setOrgName(d.data?.org_name || ''); }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // When a new assistant message arrives, attach the pending chart to it
  useEffect(() => {
    if (!pendingChart.current) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant') {
      setMsgCharts(prev => ({ ...prev, [lastMsg.id]: pendingChart.current }));
      pendingChart.current = null;
    }
  }, [messages]);

  async function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    // Build smart chart from live frontend data for this question
    pendingChart.current = buildSmartChart(msg, liveData, fy);
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
                smartChart={msg.role === 'assistant' ? msgCharts[msg.id] : undefined}
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
