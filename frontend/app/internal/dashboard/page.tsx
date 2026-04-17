'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Assessment {
  id: number;
  assessment_uuid: string;
  client_name: string;
  assessment_date: string;
  status: string;
  overall_score_100: number | null;
  maturity_level: string | null;
  organization_context?: any;
}

const maturityColor = (level: string | null) => {
  if (!level) return '#9CA3AF';
  if (level.includes('5')) return '#0D9488';
  if (level.includes('4')) return '#2563EB';
  if (level.includes('3')) return '#D97706';
  if (level.includes('2')) return '#EA580C';
  return '#DC2626';
};

const col = (n: number) => n >= 85 ? '#0D9488' : n >= 70 ? '#2563EB' : n >= 50 ? '#D97706' : n >= 30 ? '#EA580C' : '#DC2626';

export default function InternalDashboard() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [clientName, setClientName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'assessments' | 'stats'>('assessments');

  useEffect(() => {
    checkAuth();
    loadAssessments();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/internal/login'); return; }
    setUser(session.user);
  };

  const loadAssessments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/assessments/list`);
      setAssessments(res.data.assessments || []);
    } catch { setAssessments([]); }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/internal/login');
  };

  const handleCreateAssessment = async () => {
    if (!clientName.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post(`${API_BASE}/assessments`, { user_type: 'internal', client_name: clientName.trim() });
      router.push(`/internal/assessment?uuid=${res.data.assessment_uuid}`);
    } catch { alert('Failed to create assessment.'); }
    setCreating(false);
  };

  // Stats calculations
  const completed = assessments.filter(a => a.status === 'completed' && a.overall_score_100 !== null);
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((s, a) => s + (a.overall_score_100 || 0), 0) / completed.length * 10) / 10 : 0;
  
  const maturityCounts: Record<string, number> = {};
  completed.forEach(a => {
    const key = a.maturity_level || 'Unknown';
    maturityCounts[key] = (maturityCounts[key] || 0) + 1;
  });

  const orgTypeCounts: Record<string, number> = {};
  completed.forEach(a => {
    const ctx = a.organization_context;
    const orgType = (Array.isArray(ctx) ? ctx[0] : ctx)?.org_type || 'Not specified';
    orgTypeCounts[orgType] = (orgTypeCounts[orgType] || 0) + 1;
  });
  const topOrgTypes = Object.entries(orgTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Source attribution from leads
  const [leads, setLeads] = useState<any[]>([]);
  useEffect(() => {
    axios.get(`${API_BASE}/leads/list`).then(r => setLeads(r.data.leads || [])).catch(() => {});
  }, []);

  const sourceCounts: Record<string, number> = {};
  leads.forEach(l => {
    const src = l.heard_from || 'Not specified';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

  const jobFunctionCounts: Record<string, number> = {};
  leads.forEach(l => {
    const jf = l.job_function || 'Not specified';
    jobFunctionCounts[jf] = (jobFunctionCounts[jf] || 0) + 1;
  });
  const topJobFunctions = Object.entries(jobFunctionCounts).sort((a, b) => b[1] - a[1]);

  const scoreDistribution = [
    { label: 'Reactive (0–29)', count: completed.filter(a => (a.overall_score_100 || 0) < 30).length, color: '#DC2626' },
    { label: 'Accumulating (30–49)', count: completed.filter(a => (a.overall_score_100 || 0) >= 30 && (a.overall_score_100 || 0) < 50).length, color: '#EA580C' },
    { label: 'Stabilizing (50–69)', count: completed.filter(a => (a.overall_score_100 || 0) >= 50 && (a.overall_score_100 || 0) < 70).length, color: '#D97706' },
    { label: 'Governed (70–84)', count: completed.filter(a => (a.overall_score_100 || 0) >= 70 && (a.overall_score_100 || 0) < 85).length, color: '#2563EB' },
    { label: 'Optimized (85+)', count: completed.filter(a => (a.overall_score_100 || 0) >= 85).length, color: '#0D9488' },
  ];

  const card: React.CSSProperties = {
    background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px',
    padding: '1.25rem 1.5rem', marginBottom: '0.75rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  return (
    <main style={{ minHeight: '100vh', background: '#FAF9F6' }}>
      {/* Nav */}
      <div style={{ background: '#0F1F3D', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/oakwolf-logo.jpg" alt="Oakwolf Group" style={{ height: '36px', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Internal Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{user.email}</span>}
          <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '2rem', color: '#0F1F3D', fontWeight: '400', margin: 0 }}>Internal Portal</h1>
            <p style={{ color: '#6B6977', fontSize: '0.875rem', margin: '4px 0 0' }}>Oakwolf Epic Security Benchmark</p>
          </div>
          <button onClick={() => setShowNew(!showNew)} style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
            + New Assessment
          </button>
        </div>

        {/* New assessment form */}
        {showNew && (
          <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.2rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '1rem' }}>New Assessment</h3>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Client Name</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input style={{ flex: 1, border: '1.5px solid #E5E3DE', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#0F1F3D', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                placeholder="e.g. Mercy Health System" value={clientName}
                onChange={e => setClientName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateAssessment()} />
              <button onClick={handleCreateAssessment} disabled={creating || !clientName.trim()}
                style={{ background: creating || !clientName.trim() ? '#E5E3DE' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: creating || !clientName.trim() ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600', cursor: creating || !clientName.trim() ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                {creating ? 'Creating...' : 'Start →'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {([['assessments', 'Assessments'], ['stats', 'Performance Stats']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', fontFamily: 'DM Sans, sans-serif', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', background: activeTab === tab ? '#0F1F3D' : 'white', color: activeTab === tab ? 'white' : '#6B6977', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ASSESSMENTS TAB ── */}
        {activeTab === 'assessments' && (
          loading ? (
            <p style={{ color: '#6B6977', textAlign: 'center', padding: '3rem' }}>Loading...</p>
          ) : assessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '16px', border: '1px solid #E5E3DE' }}>
              <p style={{ color: '#6B6977', marginBottom: '1rem' }}>No assessments yet.</p>
              <button onClick={() => setShowNew(true)} style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Create your first assessment
              </button>
            </div>
          ) : (
            assessments.map(a => (
              <div key={a.assessment_uuid} style={card}
                onClick={() => router.push(a.status === 'completed' ? `/internal/results?uuid=${a.assessment_uuid}` : `/internal/assessment?uuid=${a.assessment_uuid}`)}>
                <div>
                  <p style={{ fontWeight: '600', color: '#0F1F3D', margin: '0 0 4px', fontSize: '1rem' }}>{a.client_name || 'Unnamed'}</p>
                  <p style={{ color: '#9CA3AF', fontSize: '0.8rem', margin: 0 }}>{a.assessment_date} · {a.status === 'completed' ? 'Completed' : 'In progress'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {a.overall_score_100 !== null && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: '700', color: col(a.overall_score_100), margin: 0, lineHeight: 1 }}>{a.overall_score_100}</p>
                      <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '2px 0 0' }}>/100</p>
                    </div>
                  )}
                  {a.maturity_level && (
                    <div style={{ background: '#F3F4F6', borderRadius: '8px', padding: '0.35rem 0.75rem' }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: '600', color: maturityColor(a.maturity_level), margin: 0, whiteSpace: 'nowrap' }}>{a.maturity_level}</p>
                    </div>
                  )}
                  <span style={{ color: '#D1D5DB' }}>→</span>
                </div>
              </div>
            ))
          )
        )}

        {/* ── STATS TAB ── */}
        {activeTab === 'stats' && (
          <div>
            {/* Top stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Submissions', value: assessments.length, sub: 'all time', color: '#2563EB' },
                { label: 'Completed', value: completed.length, sub: `${assessments.length > 0 ? Math.round(completed.length / assessments.length * 100) : 0}% completion rate`, color: '#0D9488' },
                { label: 'Average Score', value: avgScore || '—', sub: 'across completed', color: avgScore ? col(avgScore) : '#9CA3AF' },
                { label: 'High Severity', value: completed.length > 0 ? 'Active' : '—', sub: 'findings present', color: '#DC2626' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>{stat.label}</p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: stat.color, margin: '0 0 4px', fontFamily: 'DM Serif Display, serif', lineHeight: 1 }}>{stat.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>{stat.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Score distribution */}
              <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.1rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '1.25rem' }}>Score Distribution</h3>
                {completed.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>No completed assessments yet.</p>
                ) : (
                  scoreDistribution.map(band => (
                    <div key={band.label} style={{ marginBottom: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#374151' }}>{band.label}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: band.color }}>{band.count}</span>
                      </div>
                      <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: completed.length > 0 ? `${(band.count / completed.length) * 100}%` : '0%', background: band.color, borderRadius: '99px' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Org type breakdown */}
              <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.1rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '1.25rem' }}>Organization Types</h3>
                {topOrgTypes.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>No data yet.</p>
                ) : (
                  topOrgTypes.map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #F3F4F6' }}>
                      <span style={{ fontSize: '0.82rem', color: '#374151' }}>{type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '60px', height: '5px', background: '#F3F4F6', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(count / (topOrgTypes[0]?.[1] || 1)) * 100}%`, background: '#2563EB', borderRadius: '99px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563EB', width: '20px', textAlign: 'right' }}>{count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Source attribution + job functions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.1rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '0.5rem' }}>Lead Sources</h3>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '1rem' }}>How external users found the benchmark</p>
                {topSources.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>No lead data yet.</p>
                ) : (
                  topSources.map(([src, count], i) => (
                    <div key={src} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < topSources.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <span style={{ fontSize: '0.82rem', color: '#374151' }}>{src}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '60px', height: '5px', background: '#F3F4F6', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(count / (topSources[0]?.[1] || 1)) * 100}%`, background: '#0D9488', borderRadius: '99px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0D9488', width: '20px', textAlign: 'right' }}>{count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.1rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '0.5rem' }}>Job Functions</h3>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '1rem' }}>Who is taking the benchmark</p>
                {topJobFunctions.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>No lead data yet.</p>
                ) : (
                  topJobFunctions.map(([jf, count], i) => (
                    <div key={jf} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < topJobFunctions.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <span style={{ fontSize: '0.82rem', color: '#374151' }}>{jf}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '60px', height: '5px', background: '#F3F4F6', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(count / (topJobFunctions[0]?.[1] || 1)) * 100}%`, background: '#7C3AED', borderRadius: '99px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#7C3AED', width: '20px', textAlign: 'right' }}>{count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent leads */}
            <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.1rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '1.25rem' }}>Recent Leads</h3>
              {leads.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>No leads yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E3DE' }}>
                      {['Name', 'Title', 'Organization', 'Email', 'Source', 'Score'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 15).map((lead, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.82rem', fontWeight: '600', color: '#0F1F3D' }}>{lead.first_name} {lead.last_name}</td>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.78rem', color: '#6B6977' }}>{lead.title || '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.78rem', color: '#6B6977' }}>{lead.organization || '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.78rem', color: '#2563EB' }}><a href={`mailto:${lead.email}`} style={{ color: '#2563EB', textDecoration: 'none' }}>{lead.email}</a></td>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#6B6977' }}>{lead.heard_from || '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.82rem', fontWeight: '700', color: lead.score ? (lead.score >= 70 ? '#0D9488' : lead.score >= 50 ? '#D97706' : '#DC2626') : '#9CA3AF' }}>{lead.score || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent assessments mini list */}
            <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.1rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '1.25rem' }}>Recent Completed Assessments</h3>
              {completed.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>No completed assessments yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E3DE' }}>
                      {['Client', 'Date', 'Score', 'Maturity Level'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {completed.slice(0, 10).map(a => (
                      <tr key={a.assessment_uuid} onClick={() => router.push(`/internal/results?uuid=${a.assessment_uuid}`)}
                        style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: '600', color: '#0F1F3D' }}>{a.client_name || 'Unnamed'}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.82rem', color: '#6B6977' }}>{a.assessment_date}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: '700', color: col(a.overall_score_100 || 0) }}>{a.overall_score_100}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ background: '#F3F4F6', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: '600', color: maturityColor(a.maturity_level) }}>{a.maturity_level}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
