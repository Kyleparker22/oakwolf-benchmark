'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const col = (n: number) => n >= 85 ? '#0D9488' : n >= 70 ? '#2563EB' : n >= 50 ? '#D97706' : n >= 30 ? '#EA580C' : '#DC2626';
const fmt = (n: number) => '$' + (n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? Math.round(n/1000)+'K' : n);
const DOMAINS = ['Provisioning','RBAC','IAM','Authentication','Governance','Audit','Training','Operational'];

interface Assessment { assessment_uuid: string; assessment_date: string; overall_score_100: number; maturity_level: string; }

export default function RetakePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searched, setSearched] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareData, setCompareData] = useState<any>(null);

  const handleLookup = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/assessments/retake?email=${encodeURIComponent(email)}`);
      setAssessments(res.data.assessments || []);
      setSearched(true);
    } catch { setAssessments([]); setSearched(true); }
    setLoading(false);
  };

  const loadComparison = async (a1: Assessment, a2: Assessment) => {
    setComparing(true);
    try {
      const [r1, r2] = await Promise.all([
        axios.get(`${API_BASE}/assessments/${a1.assessment_uuid}/results?mode=external`),
        axios.get(`${API_BASE}/assessments/${a2.assessment_uuid}/results?mode=external`),
      ]);
      setCompareData({ older: { assessment: a1, results: r1.data }, newer: { assessment: a2, results: r2.data } });
    } catch { alert('Could not load comparison data.'); }
    setComparing(false);
  };

  const scoreDelta = compareData ? compareData.newer.assessment.overall_score_100 - compareData.older.assessment.overall_score_100 : 0;
  const improvedDomains = compareData ? DOMAINS.filter(d => {
    const oldScore = compareData.older.results.domain_scores?.find((s: any) => s.domain_name === d)?.normalized_score || 0;
    const newScore = compareData.newer.results.domain_scores?.find((s: any) => s.domain_name === d)?.normalized_score || 0;
    return newScore > oldScore;
  }) : [];
  const resolvedFindings = compareData ? (compareData.older.results.findings?.length || 0) - (compareData.newer.results.findings?.length || 0) : 0;
  const financialSaved = compareData && scoreDelta > 0 ? { laborHrs: Math.round(scoreDelta * 12), laborCost: Math.round(scoreDelta * 12 * 85), riskReduction: Math.round(scoreDelta * 1.5) } : null;

  return (
    <main style={{ minHeight:'100vh', background:'linear-gradient(135deg, #0F1F3D 0%, #1A3260 100%)', padding:'2rem 1rem' }}>
      <div style={{ maxWidth:'760px', margin:'0 auto' }}>

        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'10px', marginBottom:'0.5rem' }}>
            <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg, #2563EB, #0D9488)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{ color:'white', fontSize:'1.1rem', fontWeight:'600', letterSpacing:'0.05em' }}>OAKWOLF</span>
          </div>
          <h1 style={{ fontFamily:'DM Serif Display, serif', fontSize:'2rem', color:'white', fontWeight:'400', margin:'0 0 0.5rem' }}>Track Your Progress</h1>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.9rem' }}>See how your Epic Security maturity has improved over time</p>
        </div>

        <div style={{ background:'white', borderRadius:'20px', padding:'2rem', marginBottom:'1.5rem', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
          <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#374151', marginBottom:'0.4rem' }}>Work Email</label>
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <input style={{ flex:1, border:'1.5px solid #E5E3DE', borderRadius:'10px', padding:'0.875rem 1rem', fontSize:'0.95rem', color:'#0F1F3D', fontFamily:'DM Sans, sans-serif', outline:'none' }}
              type="email" placeholder="you@healthsystem.org" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup()} />
            <button onClick={handleLookup} disabled={loading || !email}
              style={{ padding:'0.875rem 1.5rem', background: loading||!email?'#E5E3DE':'linear-gradient(135deg, #2563EB, #1D4ED8)', color: loading||!email?'#9CA3AF':'white', border:'none', borderRadius:'10px', fontWeight:'600', cursor: loading||!email?'not-allowed':'pointer', fontFamily:'DM Sans, sans-serif', whiteSpace:'nowrap' }}>
              {loading ? 'Looking up...' : 'Find Results →'}
            </button>
          </div>
        </div>

        {searched && assessments.length === 0 && (
          <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:'16px', padding:'2rem', textAlign:'center' }}>
            <p style={{ color:'rgba(255,255,255,0.6)', marginBottom:'1rem' }}>No previous benchmarks found for this email.</p>
            <button onClick={() => router.push('/')} style={{ background:'linear-gradient(135deg, #2563EB, #1D4ED8)', color:'white', border:'none', borderRadius:'10px', padding:'0.75rem 1.5rem', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
              Start Your First Benchmark →
            </button>
          </div>
        )}

        {assessments.length > 0 && !compareData && (
          <div style={{ background:'white', borderRadius:'20px', padding:'2rem', marginBottom:'1.5rem' }}>
            <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.3rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'1rem' }}>Your Benchmark History</h2>
            {assessments.map((a, i) => (
              <div key={a.assessment_uuid} onClick={() => router.push(`/results?uuid=${a.assessment_uuid}&mode=external`)}
                style={{ background:'#F9FAFB', border:'1px solid #E5E3DE', borderRadius:'10px', padding:'1rem 1.25rem', marginBottom:'0.5rem', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontWeight:'600', fontSize:'0.9rem', color:'#0F1F3D', margin:'0 0 2px' }}>{a.assessment_date}</p>
                  <p style={{ fontSize:'0.78rem', color:'#6B6977', margin:0 }}>{a.maturity_level}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:'1.5rem', fontWeight:'700', color:col(a.overall_score_100), margin:0, lineHeight:1 }}>{a.overall_score_100}</p>
                    <p style={{ fontSize:'0.7rem', color:'#9CA3AF', margin:'2px 0 0' }}>/100</p>
                  </div>
                  {i === 0 && assessments.length > 1 && <span style={{ background:'#DCFCE7', color:'#16A34A', fontSize:'0.7rem', fontWeight:'700', padding:'0.2rem 0.5rem', borderRadius:'99px' }}>LATEST</span>}
                </div>
              </div>
            ))}
            {assessments.length >= 2 && (
              <div style={{ marginTop:'1.25rem', paddingTop:'1.25rem', borderTop:'1px solid #E5E3DE' }}>
                <p style={{ fontSize:'0.85rem', color:'#374151', fontWeight:'600', marginBottom:'0.75rem' }}>Compare your two most recent benchmarks:</p>
                <button onClick={() => loadComparison(assessments[1], assessments[0])} disabled={comparing}
                  style={{ width:'100%', padding:'0.875rem', background: comparing?'#E5E3DE':'linear-gradient(135deg, #0D9488, #0F766E)', color: comparing?'#9CA3AF':'white', border:'none', borderRadius:'10px', fontWeight:'600', cursor: comparing?'not-allowed':'pointer', fontFamily:'DM Sans, sans-serif' }}>
                  {comparing ? 'Loading comparison...' : `Compare ${assessments[1].assessment_date} vs ${assessments[0].assessment_date} →`}
                </button>
              </div>
            )}
            <button onClick={() => router.push('/')} style={{ width:'100%', marginTop:'0.75rem', padding:'0.875rem', background:'white', color:'#2563EB', border:'1.5px solid #2563EB', borderRadius:'10px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
              Take a New Benchmark →
            </button>
          </div>
        )}

        {compareData && (
          <>
            <div style={{ background:'white', borderRadius:'20px', padding:'2rem', marginBottom:'1.5rem' }}>
              <p style={{ fontSize:'0.75rem', fontWeight:'700', letterSpacing:'0.1em', color:'#6B6977', textTransform:'uppercase', marginBottom:'1rem' }}>Progress Report</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'1rem', alignItems:'center', marginBottom:'1.5rem' }}>
                <div style={{ textAlign:'center', padding:'1.5rem', background:'#F9FAFB', borderRadius:'14px' }}>
                  <p style={{ fontSize:'0.75rem', color:'#6B6977', margin:'0 0 4px' }}>{compareData.older.assessment.assessment_date}</p>
                  <p style={{ fontSize:'3rem', fontWeight:'700', color:col(compareData.older.assessment.overall_score_100), margin:'0 0 4px', lineHeight:1 }}>{compareData.older.assessment.overall_score_100}</p>
                  <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0 }}>{compareData.older.assessment.maturity_level}</p>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'2rem', fontWeight:'700', color: scoreDelta>=0?'#0D9488':'#DC2626' }}>{scoreDelta>=0?'+':''}{scoreDelta.toFixed(1)}</div>
                  <div style={{ fontSize:'0.7rem', color:'#9CA3AF' }}>points</div>
                  <div style={{ fontSize:'1.5rem', margin:'0.25rem 0' }}>→</div>
                </div>
                <div style={{ textAlign:'center', padding:'1.5rem', background: scoreDelta>=0?'#F0FDF4':'#FEF2F2', borderRadius:'14px', border:`2px solid ${scoreDelta>=0?'#BBF7D0':'#FECACA'}` }}>
                  <p style={{ fontSize:'0.75rem', color:'#6B6977', margin:'0 0 4px' }}>{compareData.newer.assessment.assessment_date}</p>
                  <p style={{ fontSize:'3rem', fontWeight:'700', color:col(compareData.newer.assessment.overall_score_100), margin:'0 0 4px', lineHeight:1 }}>{compareData.newer.assessment.overall_score_100}</p>
                  <p style={{ fontSize:'0.75rem', color:'#9CA3AF', margin:0 }}>{compareData.newer.assessment.maturity_level}</p>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0.75rem' }}>
                {[
                  { label:'Domains improved', value:improvedDomains.length, color:'#0D9488', sub:improvedDomains.slice(0,3).join(', ')||'none' },
                  { label:'Findings resolved', value:resolvedFindings>0?resolvedFindings:0, color:'#2563EB', sub:resolvedFindings>0?'fewer active findings':'no change' },
                  { label:'Maturity progression', value:scoreDelta>=5?'✓':'~', color:scoreDelta>=5?'#0D9488':'#D97706', sub:scoreDelta>=10?'Significant progress':scoreDelta>=5?'Meaningful progress':'Early progress' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#F9FAFB', borderRadius:'10px', padding:'1rem', textAlign:'center' }}>
                    <p style={{ fontSize:'1.75rem', fontWeight:'700', color:s.color, margin:'0 0 2px' }}>{s.value}</p>
                    <p style={{ fontSize:'0.72rem', fontWeight:'600', color:'#374151', margin:'0 0 2px' }}>{s.label}</p>
                    <p style={{ fontSize:'0.68rem', color:'#9CA3AF', margin:0 }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'white', borderRadius:'20px', padding:'2rem', marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.3rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'1.25rem' }}>Domain Comparison</h2>
              {DOMAINS.map(domain => {
                const oldScore = compareData.older.results.domain_scores?.find((s: any) => s.domain_name === domain)?.normalized_score || 0;
                const newScore = compareData.newer.results.domain_scores?.find((s: any) => s.domain_name === domain)?.normalized_score || 0;
                const delta = newScore - oldScore;
                return (
                  <div key={domain} style={{ marginBottom:'0.875rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                      <span style={{ fontSize:'0.85rem', fontWeight:'500', color:'#374151' }}>{domain}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                        <span style={{ fontSize:'0.8rem', color:'#9CA3AF' }}>{oldScore.toFixed(1)}</span>
                        <span style={{ fontSize:'0.8rem', color:'#D1D5DB' }}>→</span>
                        <span style={{ fontSize:'0.85rem', fontWeight:'700', color:col(newScore*10) }}>{newScore.toFixed(1)}</span>
                        {delta!==0 && <span style={{ fontSize:'0.72rem', fontWeight:'700', color:delta>0?'#0D9488':'#DC2626', background:delta>0?'#DCFCE7':'#FEE2E2', borderRadius:'99px', padding:'0.1rem 0.4rem' }}>{delta>0?'+':''}{delta.toFixed(1)}</span>}
                      </div>
                    </div>
                    <div style={{ position:'relative', height:'8px', background:'#F3F4F6', borderRadius:'99px', overflow:'hidden' }}>
                      <div style={{ position:'absolute', height:'100%', width:`${oldScore*10}%`, background:'#D3D1C7', borderRadius:'99px' }} />
                      <div style={{ position:'absolute', height:'100%', width:`${newScore*10}%`, background:delta>=0?col(newScore*10):'#DC2626', borderRadius:'99px', opacity:0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {financialSaved && scoreDelta > 0 && (
              <div style={{ background:'linear-gradient(135deg, #1A1A2E, #16213E)', borderRadius:'20px', padding:'2rem', marginBottom:'1.5rem' }}>
                <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.3rem', color:'white', fontWeight:'400', marginBottom:'0.5rem' }}>Estimated Value of Your Progress</h2>
                <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', marginBottom:'1.5rem' }}>Based on your {scoreDelta.toFixed(1)}-point improvement, here is the estimated financial impact.</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
                  {[
                    { icon:'⏱', label:'Labor Hours Recovered', value:`~${financialSaved.laborHrs.toLocaleString()} hrs/yr`, sub:`≈ ${fmt(financialSaved.laborCost)}/yr saved`, color:'#F59E0B' },
                    { icon:'⚖️', label:'Compliance Risk Reduced', value:`${financialSaved.riskReduction}% lower`, sub:'audit finding exposure', color:'#34D399' },
                    { icon:'🔧', label:'Rework Avoided', value:`${Math.round(scoreDelta*8)} hrs`, sub:`≈ ${fmt(scoreDelta*8*175)} avoided`, color:'#818CF8' },
                  ].map(item => (
                    <div key={item.label} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'1.25rem', textAlign:'center' }}>
                      <div style={{ fontSize:'1.5rem', marginBottom:'0.5rem' }}>{item.icon}</div>
                      <p style={{ fontSize:'0.72rem', fontWeight:'700', color:item.color, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 6px' }}>{item.label}</p>
                      <p style={{ fontSize:'1.1rem', fontWeight:'700', color:'white', margin:'0 0 4px' }}>{item.value}</p>
                      <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)', margin:0 }}>{item.sub}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background:'rgba(13,148,136,0.15)', border:'1px solid rgba(13,148,136,0.3)', borderRadius:'10px', padding:'1rem', textAlign:'center' }}>
                  <p style={{ color:'#34D399', fontWeight:'600', fontSize:'0.9rem', margin:'0 0 4px' }}>Keep going — you are on the right track</p>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem', margin:0 }}>Organizations that reach Level 4 typically see 2–3x the financial benefit of their current improvement trajectory.</p>
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <button onClick={() => router.push('/')} style={{ padding:'0.875rem', background:'linear-gradient(135deg, #2563EB, #1D4ED8)', color:'white', border:'none', borderRadius:'10px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans, sans-serif', fontSize:'0.9rem' }}>
                Take New Benchmark →
              </button>
              <a href="mailto:hello@oakwolfgroup.com?subject=Benchmark Progress Review" style={{ padding:'0.875rem', background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'10px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans, sans-serif', fontSize:'0.9rem', textAlign:'center', textDecoration:'none', display:'block' }}>
                Discuss with Oakwolf →
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
