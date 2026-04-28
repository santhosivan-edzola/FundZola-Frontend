import React, { useState, useEffect, useRef } from 'react'; // React needed for React.Fragment in PipelineLayout
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

// ── Design tokens ─────────────────────────────────────────────────────────────
const CHART_COLORS = ['#E8967A', '#8ECFCA', '#7ab8e8', '#e8c07a', '#b07ae8', '#7ae87a', '#e87ab0', '#94a3b8'];
const MEDAL = ['🥇', '🥈', '🥉'];
const PIPELINE_STAGE_COLORS = {
  Prospect: '#7ab8e8', Qualified: '#8ECFCA', Proposal: '#e8c07a',
  Negotiation: '#b07ae8', Won: '#7ae87a', Lost: '#E8967A',
};
const TYPE_BADGE = {
  Corporate:   { bg: '#EBF4FD', color: '#1F6FA3' },
  Individual:  { bg: '#FDF0EB', color: '#A8452A' },
  Trust:       { bg: '#E8F7F6', color: '#1E7A74' },
  Society:     { bg: '#FDF7EB', color: '#9A6B10' },
  Foundation:  { bg: '#F5EBF9', color: '#6B28B0' },
};

const fmtVal = (v) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
  return v % 1 === 0 ? String(v) : Number(v).toFixed(2);
};

// ── Extract key metrics from markdown bold text ───────────────────────────────
function extractKeyMetrics(text) {
  const metrics = [];
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1];
    if (!/[\d₹]/.test(raw)) continue;
    const numMatch = raw.match(/^(₹[\d,]+(?:\.\d+)?(?:\s*(?:Cr|L|K))?|\d+(?:\.\d+)?%?)\s*(.*)$/);
    if (numMatch) {
      metrics.push({ value: numMatch[1], label: numMatch[2] || '' });
    } else {
      const numAtEnd = raw.match(/^(.+?)\s+([\d,]+(?:\.\d+)?%?)$/);
      if (numAtEnd) metrics.push({ value: numAtEnd[2], label: numAtEnd[1] });
    }
    if (metrics.length >= 4) break;
  }
  return metrics;
}

// ── Styled table cell helpers ─────────────────────────────────────────────────
function isAmountCell(val) { return /^₹/.test(String(val).trim()); }
function isRankCell(val)   { return /^\d+$/.test(String(val).trim()) && Number(val) < 50; }

function StyledTable({ children }) {
  return (
    <div style={{ overflowX: 'auto', margin: '12px 0', borderRadius: 10, border: '1px solid #E8E0D8', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>{children}</table>
    </div>
  );
}
function StyledThead({ children }) {
  return <thead style={{ background: '#1A1A1A' }}>{children}</thead>;
}
function StyledTh({ children }) {
  return <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: '#fff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{children}</th>;
}
function StyledTr({ children, index }) {
  return <tr style={{ background: index % 2 === 0 ? '#fff' : '#FAF7F4', borderBottom: '1px solid #F0EDE9' }}>{children}</tr>;
}
function StyledTd({ children }) {
  const val = String(children ?? '');
  if (isRankCell(val)) {
    return (
      <td style={{ padding: '8px 14px' }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#1A1A1A', color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {val}
        </span>
      </td>
    );
  }
  if (isAmountCell(val)) {
    return <td style={{ padding: '8px 14px', fontWeight: 700, color: '#E8967A', fontSize: 13 }}>{children}</td>;
  }
  const typeMeta = TYPE_BADGE[val];
  if (typeMeta) {
    return (
      <td style={{ padding: '8px 14px' }}>
        <span style={{ background: typeMeta.bg, color: typeMeta.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{val}</span>
      </td>
    );
  }
  return <td style={{ padding: '8px 14px', color: '#374151' }}>{children}</td>;
}

// ── LAYOUT 1: Leaderboard — top donors / rankings ────────────────────────────
function LeaderboardLayout({ chart }) {
  const { data, keys = ['value'], title } = chart;
  const key = keys[0];
  const max = Math.max(...data.map(d => Number(d[key] || 0)));
  return (
    <div style={{ background: 'linear-gradient(135deg,#1A1A1A 0%,#2D2D2D 100%)', borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
      {title && <p style={{ fontSize: 10, fontWeight: 700, color: '#8ECFCA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>{title}</p>}
      {data.map((d, i) => {
        const val = Number(d[key] || 0);
        const pct = max > 0 ? (val / max) * 100 : 0;
        const isTop3 = i < 3;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < data.length - 1 ? 12 : 0 }}>
            {/* Rank badge */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: isTop3 ? ['#FFD700','#C0C0C0','#CD7F32'][i] : '#3D3D3D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isTop3 ? 16 : 11, fontWeight: 800,
              color: isTop3 ? '#1A1A1A' : '#9CA3AF',
            }}>
              {isTop3 ? MEDAL[i] : i + 1}
            </div>
            {/* Name + bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }}>{fmtVal(val)}</span>
              </div>
              <div style={{ height: 5, background: '#3D3D3D', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${CHART_COLORS[i % CHART_COLORS.length]},${CHART_COLORS[(i + 1) % CHART_COLORS.length]})`, borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── LAYOUT 2: Comparison split — received vs spent ───────────────────────────
function ComparisonLayout({ chart }) {
  const { data, keys = ['value'], title } = chart;
  const key = keys[0];
  const vals = data.map(d => ({ name: d.name, val: Number(d[key] || 0) }));
  const received = vals.find(v => /receiv/i.test(v.name))?.val || vals[0]?.val || 0;
  const spent    = vals.find(v => /spent|expens/i.test(v.name))?.val || vals[1]?.val || 0;
  const balance  = vals.find(v => /balance|remain/i.test(v.name))?.val ?? Math.max(0, received - spent);
  const total    = received;
  const spentPct = total > 0 ? Math.round((spent / total) * 100) : 0;
  const ACCENTS  = ['#8ECFCA', '#E8967A', '#7ab8e8'];
  const ICONS    = ['↓', '↑', '='];
  const LABELS   = ['Total Received', 'Total Spent', 'Balance'];
  const DISPLAY  = [received, spent, balance];
  return (
    <div style={{ marginBottom: 16 }}>
      {title && <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{title}</p>}
      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {DISPLAY.map((v, i) => (
          <div key={i} style={{ background: '#fff', border: `1.5px solid ${ACCENTS[i]}33`, borderRadius: 14, padding: '14px 12px', textAlign: 'center', boxShadow: `0 2px 8px ${ACCENTS[i]}18` }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{ICONS[i]}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: ACCENTS[i], lineHeight: 1 }}>{fmtVal(v)}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{LABELS[i]}</div>
          </div>
        ))}
      </div>
      {/* Utilisation bar */}
      <div style={{ background: '#F3F4F6', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Fund Utilisation</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: spentPct > 80 ? '#E8967A' : '#8ECFCA' }}>{spentPct}%</span>
        </div>
        <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(spentPct, 100)}%`, background: spentPct > 80 ? '#E8967A' : '#8ECFCA', borderRadius: 5, transition: 'width 1s ease' }} />
        </div>
      </div>
    </div>
  );
}

// ── LAYOUT 3: Donut + legend cards — category breakdown ─────────────────────
function DonutLayout({ chart }) {
  const { data, keys = ['value'], title } = chart;
  const key = keys[0];
  const total = data.reduce((s, d) => s + Number(d[key] || 0), 0);
  return (
    <div style={{ marginBottom: 16 }}>
      {title && <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{title}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 14, alignItems: 'center' }}>
        {/* Donut */}
        <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data} dataKey={key} nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} startAngle={90} endAngle={-270}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip formatter={(v) => fmtVal(v)} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E8E0D8' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 10, color: '#9CA3AF' }}>Total</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#1A1A1A' }}>{fmtVal(total)}</div>
          </div>
        </div>
        {/* Legend cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((Number(d[key] || 0) / total) * 100) : 0;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', borderRadius: 8, padding: '7px 10px', border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}33` }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 11, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }}>{pct}%</span>
                <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{fmtVal(Number(d[key] || 0))}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── LAYOUT 4: Pipeline flow — deal stages ────────────────────────────────────
function PipelineLayout({ chart }) {
  const { data, keys = ['value'], title } = chart;
  const key = keys[0];
  const STAGE_ORDER = ['Prospect','Qualified','Proposal','Negotiation','Won','Lost'];
  const sorted = [...data].sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a.name);
    const bi = STAGE_ORDER.indexOf(b.name);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const total = sorted.reduce((s, d) => s + Number(d[key] || 0), 0);
  return (
    <div style={{ marginBottom: 16 }}>
      {title && <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{title}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {sorted.map((d, i) => {
          const val = Number(d[key] || 0);
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          const color = PIPELINE_STAGE_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <React.Fragment key={i}>
              <div style={{ background: '#fff', border: `2px solid ${color}`, borderRadius: 12, padding: '10px 14px', textAlign: 'center', minWidth: 80, flex: '1 1 80px', boxShadow: `0 2px 8px ${color}28` }}>
                <div style={{ fontSize: 15, fontWeight: 900, color, lineHeight: 1 }}>{fmtVal(val)}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', marginTop: 4 }}>{d.name}</div>
                <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, background: `${color}15`, borderRadius: 10, padding: '1px 6px', display: 'inline-block' }}>{pct}%</div>
              </div>
              {i < sorted.length - 1 && (
                <div style={{ fontSize: 16, color: '#D1D5DB', flexShrink: 0 }}>→</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Total strip */}
      <div style={{ marginTop: 10, background: '#F3F4F6', borderRadius: 8, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#6B7280' }}>Total Pipeline Value</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: '#1A1A1A' }}>{fmtVal(total)}</span>
      </div>
    </div>
  );
}

// ── LAYOUT 5: Grid cards — generic multi-category ────────────────────────────
function GridLayout({ chart }) {
  const { data, keys = ['value'], title } = chart;
  const key = keys[0];
  const max = Math.max(...data.map(d => Number(d[key] || 0)));
  return (
    <div style={{ marginBottom: 16 }}>
      {title && <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{title}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
        {data.map((d, i) => {
          const val = Number(d[key] || 0);
          const pct = max > 0 ? (val / max) * 100 : 0;
          const color = CHART_COLORS[i % CHART_COLORS.length];
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '12px', border: `1.5px solid ${color}33`, boxShadow: `0 1px 6px ${color}18`, overflow: 'hidden', position: 'relative' }}>
              {/* Color accent bar at top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '12px 12px 0 0' }} />
              <div style={{ fontSize: 13, fontWeight: 900, color, marginTop: 4, lineHeight: 1 }}>{fmtVal(val)}</div>
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
              {/* Mini fill bar */}
              <div style={{ height: 4, background: `${color}22`, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.7s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LAYOUT 6: Fallback horizontal bar (for generic bar charts) ───────────────
function HBarLayout({ chart }) {
  const { data, keys = ['value'], title } = chart;
  const key = keys[0];
  const max = Math.max(...data.map(d => Number(d[key] || 0)));
  return (
    <div style={{ background: '#FAF7F4', borderRadius: 14, padding: '16px', border: '1px solid #E8E0D8', marginBottom: 16 }}>
      {title && <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{title}</p>}
      {keys.length > 1 ? (
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36 + 40)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickFormatter={fmtVal} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} width={58} />
            <Tooltip formatter={(v) => fmtVal(v)} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E8E0D8' }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {keys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i]} radius={[0, 4, 4, 0]} maxBarSize={20} />)}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((d, i) => {
            const val = Number(d[key] || 0);
            const pct = max > 0 ? (val / max) * 100 : 0;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{d.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: CHART_COLORS[i % CHART_COLORS.length] }}>{fmtVal(val)}</span>
                </div>
                <div style={{ height: 7, background: '#E8E0D8', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Dynamic visual dispatcher ─────────────────────────────────────────────────
function DynamicVisual({ chart }) {
  if (!chart?.data?.length) return null;
  const layout = chart.layout;
  if (layout === 'leaderboard') return <LeaderboardLayout chart={chart} />;
  if (layout === 'comparison')  return <ComparisonLayout chart={chart} />;
  if (layout === 'donut')       return <DonutLayout chart={chart} />;
  if (layout === 'pipeline')    return <PipelineLayout chart={chart} />;
  if (layout === 'grid')        return <GridLayout chart={chart} />;
  // Fallback by type
  if (chart.type === 'pie')     return <DonutLayout chart={chart} />;
  return <HBarLayout chart={chart} />;
}

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

// ── Smart chart builder from live frontend data ───────────────────────────────
function buildSmartChart(question, { donations, expenses, deals }, fy) {
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
    return { type: 'bar', layout: 'leaderboard', title: `Top ${Math.min(limit, data.length)} Donors`, data, keys: ['value'] };
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
    return { type: 'bar', layout: 'comparison', title: 'Received vs Spent', data, keys: ['value'] };
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
    return { type: 'pie', layout: 'donut', title: 'Donations by Fund Category', data, keys: ['value'] };
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
    return { type: 'pie', layout: 'grid', title: 'Expenses by Category', data, keys: ['value'] };
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
    return { type: 'bar', layout: 'pipeline', title: 'Deal Pipeline by Stage', data, keys: ['value'] };
  }

  // ── Total donation / summary ───────────────────────────────────────────────
  if (/total donat|donat.*receiv|receiv.*donat|how many donat|donation.*total/i.test(q)) {
    const totals = {};
    fyDonations.forEach(d => {
      const k = d.donorName || d.donor_name || 'Unknown';
      totals[k] = (totals[k] || 0) + Number(d.amount || 0);
    });
    const data = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 13) + '…' : name, value }));
    if (data.length < 2) return null;
    return { type: 'bar', layout: 'leaderboard', title: 'Donations by Donor', data, keys: ['value'] };
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

// ── Row index tracker for alternating table rows ──────────────────────────────
let _rowIdx = 0;

// ── Visual answer renderer ────────────────────────────────────────────────────
function MessageContent({ content, smartChart }) {
  const { text, chart } = splitChartFromReply(content);
  const activeChart = smartChart || chart;
  const metrics = extractKeyMetrics(text);
  _rowIdx = 0;

  const mdComponents = {
    h1: ({ children }) => (
      <h1 style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: '0 0 10px', borderBottom: '2px solid #E8967A', paddingBottom: 6, display: 'inline-block' }}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '12px 0 6px' }}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '8px 0 4px' }}>{children}</h3>
    ),
    table: ({ children }) => <StyledTable>{children}</StyledTable>,
    thead: ({ children }) => <StyledThead>{children}</StyledThead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    th: ({ children }) => <StyledTh>{children}</StyledTh>,
    tr: ({ children }) => { const idx = _rowIdx++; return <StyledTr index={idx}>{children}</StyledTr>; },
    td: ({ children }) => <StyledTd>{children}</StyledTd>,
    p: ({ children }) => <p style={{ margin: '5px 0', fontSize: 13, lineHeight: 1.7, color: '#374151' }}>{children}</p>,
    ul: ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: 18 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: '6px 0', paddingLeft: 18 }}>{children}</ol>,
    li: ({ children }) => (
      <li style={{ margin: '3px 0', fontSize: 13, color: '#374151', lineHeight: 1.6, listStyleType: 'none', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <span style={{ marginTop: 6, width: 5, height: 5, borderRadius: '50%', background: '#E8967A', flexShrink: 0 }} />
        <span>{children}</span>
      </li>
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#1A1A1A' }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: '#6B7280', fontStyle: 'italic' }}>{children}</em>,
    code: ({ children }) => (
      <code style={{ background: '#F3F4F6', borderRadius: 4, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace', color: '#E8967A' }}>{children}</code>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{ borderLeft: '3px solid #8ECFCA', margin: '8px 0', paddingLeft: 12, color: '#6B7280', fontStyle: 'italic' }}>{children}</blockquote>
    ),
  };

  const hasChart = Boolean(activeChart?.data?.length);

  return (
    <div>
      {/* Visual first — full width above text */}
      {hasChart && <DynamicVisual chart={activeChart} />}

      {/* Metric pills — only if no chart */}
      {!hasChart && metrics.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{
              background: `${['#E8967A','#8ECFCA','#7ab8e8','#e8c07a'][i % 4]}18`,
              border: `1.5px solid ${['#E8967A','#8ECFCA','#7ab8e8','#e8c07a'][i % 4]}44`,
              borderRadius: 20, padding: '4px 12px', display: 'flex', gap: 6, alignItems: 'baseline',
            }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: ['#E8967A','#8ECFCA','#7ab8e8','#e8c07a'][i % 4] }}>{m.value}</span>
              {m.label && <span style={{ fontSize: 10, color: '#9CA3AF' }}>{m.label}</span>}
            </div>
          ))}
        </div>
      )}

      {/* AI text — compact insight strip when chart present, full otherwise */}
      {hasChart ? (
        <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', borderLeft: '3px solid #8ECFCA', marginTop: 4 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#8ECFCA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>AI Insight</p>
          <div className="copilot-md" style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{text}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="copilot-md">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{text}</ReactMarkdown>
        </div>
      )}
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
          background: '#fff', border: '1px solid #F0EDE9', borderRadius: '4px 18px 18px 18px',
          padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <MessageContent content={msg.content} smartChart={smartChart} />
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

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .copilot-md ol li { list-style: none; }
        .copilot-md ul li { list-style: none; }
      `}</style>
    </div>
  );
}

export default Copilot;
