'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const col = (n: number) => n >= 85 ? '#0D9488' : n >= 70 ? '#2563EB' : n >= 50 ? '#D97706' : n >= 30 ? '#EA580C' : '#DC2626';
const fmt = (n: number) => '$' + (n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? Math.round(n/1000)+'K' : String(n));

const sev = (s: string) => ({
  high:   { bg: '#FEF2F2', border: '#FECACA', badge: '#DC2626', badgeBg: '#FEE2E2', label: 'HIGH' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', badge: '#D97706', badgeBg: '#FEF3C7', label: 'MEDIUM' },
  low:    { bg: '#F0FDF4', border: '#BBF7D0', badge: '#16A34A', badgeBg: '#DCFCE7', label: 'LOW' },
}[s] || { bg: '#F9FAFB', border: '#E5E7EB', badge: '#6B7280', badgeBg: '#F3F4F6', label: s.toUpperCase() });

function ProposalContent() {
  const params = useSearchParams();
  const router = useRouter();
  const uuid = params.get('uuid') || '';
  const printRef = useRef<HTMLDivElement>(null);

  const [results, setResults] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [preparedFor, setPreparedFor] = useState('');
  const [preparedBy, setPreparedBy] = useState('Kyle Parker');
  const [proposalDate, setProposalDate] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/internal/login'); return; }
      await loadData();
    };
    init();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resultsRes, proposalRes] = await Promise.all([
        axios.get(`${API_BASE}/assessments/${uuid}/results?mode=internal`),
        axios.post(`${API_BASE}/assessments/${uuid}/generate-proposal`).catch(() => null),
      ]);
      setResults(resultsRes.data);
      if (proposalRes) setProposal(proposalRes.data);
      const clientName = resultsRes.data?.assessment?.client_name || '';
      setPreparedFor(clientName);
    } catch { alert('Failed to load proposal data.'); }
    setLoading(false);
  };

  const handlePrint = () => { window.print(); };

  if (loading || !results) {
    return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF9F6' }}><p style={{ color: '#6B6977' }}>Loading proposal...</p></main>;
  }

  const score = results.assessment?.overall_score_100 || 0;
  const level = results.assessment?.maturity_level || '';
  const clientName = results.assessment?.client_name || 'Your Organization';
  const findings = results.findings || [];
  const domainScores = results.domain_scores || [];
  const orgContext = results.organization_context || {};
  const highCount = findings.filter((f: any) => f.severity === 'high').length;
  const medCount = findings.filter((f: any) => f.severity === 'medium').length;
  const lowCount = findings.filter((f: any) => f.severity === 'low').length;

  // Engagement sizing
  const userCount = orgContext.user_count || '2,000–5,000';
  const isLarge = ['5,000–10,000','10,000+'].includes(userCount);
  const isMedium = ['2,000–5,000'].includes(userCount);
  const assessAnalysts = isLarge ? 2 : 1;
  const assessLow = Math.round((1 * 20 * 3 * 185) + (assessAnalysts * 40 * 3 * 165));
  const assessHigh = Math.round((1 * 20 * 6 * 200) + (assessAnalysts * 40 * 6 * 180));
  const highWeeksLow = isLarge ? 5 : 3; const highWeeksHigh = isLarge ? 10 : 6;
  const medWeeksLow = isLarge ? 3 : 2; const medWeeksHigh = isLarge ? 6 : 4;
  const remLow = Math.round(highCount * ((1*20*highWeeksLow*185)+(2*40*highWeeksLow*165)) + medCount * ((1*20*medWeeksLow*185)+(1*40*medWeeksLow*165)) + lowCount*(1*40*1*165));
  const remHigh = Math.round(highCount * ((1*20*highWeeksHigh*200)+(2*40*highWeeksHigh*180)) + medCount * ((1*20*medWeeksHigh*200)+(1*40*medWeeksHigh*180)) + lowCount*(1*40*2*180));
  const remediationLow = Math.max(45000, Math.min(remLow, isLarge ? 400000 : 200000));
  const remediationHigh = Math.max(90000, Math.min(remHigh, isLarge ? 600000 : 350000));
  const healthCheckLow = 28000; const healthCheckHigh = 56000;
  const totalLow = assessLow + remediationLow + healthCheckLow;
  const totalHigh = assessHigh + remediationHigh + healthCheckHigh;

  // ROI
  const weeklyHours = isLarge ? 30 : isMedium ? 22 : 15;
  const laborSavings = Math.round(weeklyHours * 52 * 95 * 0.70);
  const complianceRisk = highCount * 22000 + medCount * 8000;
  const reworkAvoidance = isLarge ? 225000 : isMedium ? 155000 : 95000;
  const totalAnnualSavings = laborSavings + complianceRisk + reworkAvoidance;
  const paybackMonths = Math.max(6, Math.round((totalLow / totalAnnualSavings) * 12));
  const threeYearNet = totalAnnualSavings * 3 - totalHigh;
  const threeYearROI = Math.round((threeYearNet / totalHigh) * 100);

  const styles = {
    page: { maxWidth: '850px', margin: '0 auto', fontFamily: 'Georgia, serif', color: '#1a1a2e', background: 'white' } as React.CSSProperties,
    section: { padding: '2.5rem 3rem', borderBottom: '1px solid #E5E3DE' } as React.CSSProperties,
    h1: { fontSize: '2rem', fontWeight: '400', color: '#0F1F3D', margin: '0 0 0.5rem', lineHeight: 1.2 } as React.CSSProperties,
    h2: { fontSize: '1.3rem', fontWeight: '400', color: '#0F1F3D', margin: '0 0 1rem', borderBottom: '2px solid #2563EB', paddingBottom: '0.5rem', fontFamily: 'Georgia, serif' } as React.CSSProperties,
    h3: { fontSize: '1rem', fontWeight: '700', color: '#0F1F3D', margin: '0 0 0.5rem', fontFamily: 'Arial, sans-serif' } as React.CSSProperties,
    p: { fontSize: '0.9rem', lineHeight: '1.8', color: '#374151', margin: '0 0 0.75rem' } as React.CSSProperties,
    label: { fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  };

  return (
    <main style={{ background: '#E5E3DE', minHeight: '100vh', padding: '2rem 1rem' }}>
      {/* Controls — hidden on print */}
      <div className="no-print" style={{ maxWidth: '850px', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => router.push(`/internal/results?uuid=${uuid}`)} style={{ background: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: '#374151' }}>
          ← Back to Report
        </button>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={preparedFor} onChange={e => setPreparedFor(e.target.value)} placeholder="Client name" style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }} />
          <input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} placeholder="Your name" style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }} />
          <button onClick={handlePrint} style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: '600' }}>
            ⬇ Download PDF
          </button>
        </div>
      </div>

      {/* Proposal document */}
      <div ref={printRef} style={styles.page}>

        {/* Cover page */}
        <div style={{ background: 'linear-gradient(160deg, #0F1F3D 0%, #1A3260 100%)', padding: '4rem 3rem 3rem', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(37,99,235,0.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(13,148,136,0.1)', pointerEvents: 'none' }} />

          {/* Logo */}
          <div style={{ marginBottom: '3rem', position: 'relative' }}>
            <img src="/oakwolf-logo.jpg" alt="Oakwolf Group" style={{ height: '80px', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
          </div>

          {/* Title */}
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', margin: '0 0 1rem' }}>Statement of Work & Engagement Proposal</p>
            <h1 style={{ fontSize: '2.8rem', fontWeight: '400', color: 'white', margin: '0 0 1rem', lineHeight: 1.15, fontFamily: 'Georgia, serif' }}>
              Epic Security<br />Maturity Improvement<br /><span style={{ color: '#60A5FA', fontStyle: 'italic' }}>Program</span>
            </h1>
            <div style={{ width: '60px', height: '3px', background: 'linear-gradient(90deg, #2563EB, #0D9488)', borderRadius: '99px', margin: '1.5rem 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Prepared for</p>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'white', margin: 0 }}>{preparedFor || clientName}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Prepared by</p>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'white', margin: '0 0 2px' }}>{preparedBy}</p>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Oakwolf Group</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Date</p>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>{proposalDate}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Contact</p>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>kparker@oakwolfgroup.com</p>
              </div>
            </div>

            {/* Benchmark score badge */}
            <div style={{ marginTop: '2.5rem', display: 'inline-flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '1rem 1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2.5rem', fontWeight: '700', color: col(score), margin: 0, lineHeight: 1, fontFamily: 'Georgia, serif' }}>{score.toFixed(1)}</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Benchmark Score</p>
              </div>
              <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: 'white', margin: '0 0 2px' }}>{level}</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Current Maturity Level</p>
              </div>
              <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <p style={{ fontSize: '1rem', fontWeight: '600', color: '#EF4444', margin: '0 0 2px' }}>{highCount} High · {medCount} Med · {lowCount} Low</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Findings Identified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Oakwolf intro */}
        <div style={styles.section}>
          <h2 style={styles.h2}>About Oakwolf Group</h2>
          <p style={styles.p}>
            Oakwolf Group is a healthcare IT consulting firm specializing in Epic Security, Identity and Access Management (IAM), and enterprise platform optimization. We work exclusively with health systems to close the gap between where their Epic Security programs are and where they need to be — with a differentiated focus on post-go-live maturity, not just implementation.
          </p>
          <p style={styles.p}>
            Our team brings deep pattern recognition across health system engagements of all sizes and types. We are not a generalist IT firm that does Epic on the side — Epic Security and IAM is our core practice. This means our advisors bring field-tested methodologies, role library standards, governance frameworks, and lifecycle automation expertise that accelerate time to value and reduce the risk of rework.
          </p>
          <p style={{ ...styles.p, fontStyle: 'italic', color: '#6B6977', borderLeft: '3px solid #2563EB', paddingLeft: '1rem', margin: '1.5rem 0 0' }}>
            "Capable of being Strategic. Willing to be Tactical. Committed to being Practical."
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
            {[
              { label: 'Epic Security & IAM', items: ['Role design & RBAC standardization', 'IAM integration (SailPoint, Entra, Okta)', 'Automated lifecycle management', 'Access governance program design'] },
              { label: 'Assessment & Advisory', items: ['Epic Security maturity assessments', 'Access review program build-out', 'Audit readiness & compliance prep', 'Team capability uplift'] },
              { label: 'Implementation', items: ['Provisioning automation', 'Deprovisioning & termination workflows', 'Community Connect security', 'Post-M&A Epic consolidation'] },
            ].map(col => (
              <div key={col.label} style={{ background: '#F8FAFF', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>{col.label}</p>
                {col.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2563EB', flexShrink: 0, marginTop: '6px' }} />
                    <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0, lineHeight: '1.5' }}>{item}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Executive summary */}
        <div style={styles.section}>
          <h2 style={styles.h2}>Executive Summary</h2>
          <p style={styles.p}>
            Oakwolf Group conducted an Epic Security and IAM Maturity Benchmark assessment for {preparedFor || clientName}. The assessment evaluated the organization across eight critical domains: Provisioning & Lifecycle Automation, Role-Based Access Control (RBAC), Identity & Access Management (IAM), Authentication, Training & Competency, Audit & Monitoring, Governance, and Operational Maturity.
          </p>
          <p style={styles.p}>
            {preparedFor || clientName} achieved an overall maturity score of <strong>{score.toFixed(1)} out of 100</strong>, placing the organization at <strong>{level}</strong>. The assessment identified <strong>{findings.length} findings</strong> — {highCount} high-severity, {medCount} medium-severity, and {lowCount} low-severity — each representing a gap between the current state and Oakwolf's maturity model benchmarks.
          </p>
          <p style={styles.p}>
            This proposal outlines a structured three-phase engagement designed to address these findings, elevate the organization's Epic Security maturity, and deliver measurable clinical, operational, and financial outcomes. The engagement is scoped to the specific findings profile of {preparedFor || clientName} and is designed to produce sustainable, long-term improvement rather than one-time fixes.
          </p>

          {/* Score summary bar */}
          <div style={{ background: 'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '2.5rem', fontWeight: '700', color: col(score), margin: 0, fontFamily: 'Georgia, serif', lineHeight: 1 }}>{score.toFixed(1)}</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Overall Score</p>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{ height: '100%', width: `${score}%`, background: col(score), borderRadius: '99px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>
                <span>Reactive</span><span>Accumulating</span><span>Stabilizing</span><span>Governed</span><span>Optimized</span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'white', margin: '0 0 2px' }}>{level}</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Maturity Level</p>
            </div>
          </div>
        </div>

        {/* Domain Scorecard */}
        <div style={styles.section}>
          <h2 style={styles.h2}>Domain Scorecard</h2>
          <p style={styles.p}>The following scores reflect {preparedFor || clientName}'s current maturity across each of Oakwolf's eight Epic Security domains. Scores are normalized to a 0–10 scale, with 10 representing full maturity.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
            {domainScores.map((d: any) => (
              <div key={d.domain_name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E3DE' }}>
                <div style={{ width: '90px', fontSize: '0.82rem', fontWeight: '600', color: '#374151', flexShrink: 0 }}>{d.domain_name}</div>
                <div style={{ flex: 1, height: '6px', background: '#E5E3DE', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.normalized_score * 10}%`, background: col(d.normalized_score * 10), borderRadius: '99px' }} />
                </div>
                <div style={{ width: '28px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '700', color: col(d.normalized_score * 10), flexShrink: 0 }}>{d.normalized_score.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Findings */}
        {findings.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.h2}>Assessment Findings</h2>
            <p style={styles.p}>The following findings were identified during the benchmark assessment. Each finding represents a measurable gap against Oakwolf's Epic Security Maturity Model benchmarks, with associated clinical, operational, or financial business impact.</p>

            {['high','medium','low'].map(severity => {
              const sevFindings = findings.filter((f: any) => f.severity === severity);
              if (sevFindings.length === 0) return null;
              const sv = sev(severity);
              return (
                <div key={severity} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ background: sv.badgeBg, color: sv.badge, fontSize: '0.68rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sv.label}</span>
                    <span style={{ fontSize: '0.8rem', color: '#6B6977' }}>{sevFindings.length} finding{sevFindings.length > 1 ? 's' : ''}</span>
                  </div>
                  {sevFindings.map((f: any, i: number) => (
                    <div key={i} style={{ background: sv.bg, border: `1px solid ${sv.border}`, borderRadius: '8px', padding: '1rem', marginBottom: '0.5rem' }}>
                      <p style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0F1F3D', margin: '0 0 0.4rem' }}>{f.title}</p>
                      <p style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: '1.6', margin: '0 0 0.4rem' }}>{f.explanation}</p>
                      <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0 }}><strong>Business impact:</strong> {f.business_impact}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Proposed engagement */}
        <div style={styles.section}>
          <h2 style={styles.h2}>Proposed Engagement</h2>
          <p style={styles.p}>
            Oakwolf proposes a three-phase engagement structured to deliver immediate value through quick-win remediation, drive sustainable improvement through a structured remediation program, and maintain long-term maturity through ongoing health checks.
          </p>

          {[
            {
              phase: '01', title: 'Epic Security Assessment', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
              duration: '3–6 weeks',
              team: isLarge ? '1 Senior Advisor + 2 Analysts' : '1 Senior Advisor + 1 Analyst',
              cost: `${fmt(assessLow)} – ${fmt(assessHigh)}`,
              description: `A structured deep-dive into ${preparedFor || clientName}'s Epic Security and IAM environment. The assessment will validate and expand on the benchmark findings, map the current-state access control posture, identify root causes, and produce a prioritized remediation roadmap.`,
              deliverables: [
                'Current-state access control assessment report',
                'Root cause analysis for each identified finding',
                'Prioritized remediation roadmap (quick wins, near-term, long-term)',
                'Role library and RBAC gap analysis',
                'IAM integration and lifecycle automation evaluation',
                'Executive presentation of findings and recommendations',
              ],
            },
            {
              phase: '02', title: 'Remediation & Implementation', color: '#0D9488', bg: '#F0FDF4', border: '#BBF7D0',
              duration: isLarge ? '3–9 months' : '6 weeks – 6 months',
              team: `Scaled to findings — ${highCount > 0 ? `${highCount} high-severity item${highCount > 1 ? 's' : ''} require 1 Advisor + 2 Analysts` : ''}${medCount > 0 ? `${highCount > 0 ? ', ' : ''}${medCount} medium-severity item${medCount > 1 ? 's' : ''} require 1 Advisor + 1 Analyst` : ''}`,
              cost: `${fmt(remediationLow)} – ${fmt(remediationHigh)}`,
              description: `Structured remediation of findings identified in Phase 1, executed in priority order. High-severity items are addressed first to reduce compliance and operational risk as quickly as possible. Oakwolf resources are scaled based on the complexity and volume of work, with clear milestones and progress reporting throughout.`,
              deliverables: [
                `Remediation of ${findings.length} identified findings across ${domainScores.length} domains`,
                'Role library redesign and RBAC standardization',
                'IAM lifecycle automation implementation',
                'Access governance framework and process documentation',
                'Training and knowledge transfer to internal team',
                'Progress reporting and milestone sign-off at each phase',
              ],
            },
            {
              phase: '03', title: 'Ongoing Health Check', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
              duration: 'Quarterly',
              team: '1 Senior Advisor + 1 Analyst',
              cost: `${fmt(healthCheckLow)} – ${fmt(healthCheckHigh)} per engagement`,
              description: `Quarterly health checks maintain and advance the maturity gains achieved in Phases 1 and 2. Each engagement includes a benchmark refresh, access review audit, and maturity progression report — keeping ${preparedFor || clientName}'s Epic Security program ahead of organizational change, regulatory requirements, and emerging risk.`,
              deliverables: [
                'Quarterly benchmark refresh and maturity score update',
                'Access review and certification audit',
                'Review of new findings or emerging gaps',
                'Updated remediation roadmap and priority adjustments',
                'Executive maturity progression report',
              ],
            },
          ].map(phase => (
            <div key={phase.phase} style={{ border: `1px solid ${phase.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <div style={{ background: phase.bg, padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '36px', height: '36px', background: phase.color, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: '700' }}>{phase.phase}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: '700', color: '#0F1F3D', margin: '0 0 2px' }}>{phase.title}</p>
                    <p style={{ fontSize: '0.78rem', color: '#6B6977', margin: 0 }}>{phase.duration} · {phase.team}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: phase.color, margin: 0 }}>{phase.cost}</p>
                  <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>T&M · Estimated range</p>
                </div>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', background: 'white' }}>
                <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.7', margin: '0 0 1rem' }}>{phase.description}</p>
                <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>Key Deliverables</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  {phase.deliverables.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <span style={{ color: phase.color, fontSize: '0.7rem', flexShrink: 0, marginTop: '3px' }}>✓</span>
                      <p style={{ fontSize: '0.78rem', color: '#4B5563', margin: 0, lineHeight: '1.5' }}>{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Total investment */}
          <div style={{ background: '#0F1F3D', borderRadius: '10px', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Total Estimated Engagement Investment</p>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>All three phases · T&M basis · Scope refined following Phase 1 assessment</p>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', margin: 0, fontFamily: 'Georgia, serif' }}>{fmt(totalLow)} – {fmt(totalHigh)}</p>
          </div>
        </div>

        {/* Business Case */}
        <div style={styles.section}>
          <h2 style={styles.h2}>Business Case & Return on Investment</h2>
          <p style={styles.p}>
            The following analysis illustrates the financial case for engaging Oakwolf. The investment side reflects the estimated engagement cost based on {preparedFor || clientName}'s findings profile and organization size. The return side reflects Oakwolf's observations across comparable health system engagements.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ border: '1px solid #E5E3DE', borderRadius: '10px', padding: '1.25rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1rem' }}>Engagement Investment</p>
              {[
                { label: 'Phase 1 — Assessment', value: `${fmt(assessLow)}–${fmt(assessHigh)}` },
                { label: 'Phase 2 — Remediation', value: `${fmt(remediationLow)}–${fmt(remediationHigh)}` },
                { label: 'Phase 3 — Health Check (annual)', value: `${fmt(healthCheckLow)}–${fmt(healthCheckHigh)}` },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
                  <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>{row.label}</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0F1F3D', margin: 0 }}>{row.value}</p>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', marginTop: '0.25rem', borderTop: '2px solid #0F1F3D' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F1F3D', margin: 0 }}>Total</p>
                <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0F1F3D', margin: 0 }}>{fmt(totalLow)}–{fmt(totalHigh)}</p>
              </div>
            </div>

            <div style={{ border: '1px solid #BBF7D0', borderRadius: '10px', padding: '1.25rem', background: '#F0FDF4' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1rem' }}>Estimated Annual Return</p>
              {[
                { label: 'Labor cost reduction', value: fmt(laborSavings) },
                { label: 'Compliance risk avoided', value: fmt(complianceRisk) },
                { label: 'Rework & bad-fit costs eliminated', value: fmt(reworkAvoidance) },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 2 ? '1px solid #BBF7D0' : 'none' }}>
                  <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>{row.label}</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#16A34A', margin: 0 }}>{row.value}/yr</p>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', marginTop: '0.25rem', borderTop: '2px solid #16A34A' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F1F3D', margin: 0 }}>Total Annual Return</p>
                <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#16A34A', margin: 0 }}>{fmt(totalAnnualSavings)}/yr</p>
              </div>
            </div>
          </div>

          {/* ROI summary */}
          <div style={{ background: 'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius: '12px', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
            {[
              { label: 'Estimated Payback', value: `${paybackMonths} months`, sub: 'Time to recover full investment' },
              { label: '3-Year Net Return', value: fmt(Math.max(0, threeYearNet)), sub: 'After all engagement costs' },
              { label: '3-Year ROI', value: `${Math.max(0, threeYearROI)}%`, sub: 'Return on total investment' },
            ].map(stat => (
              <div key={stat.label}>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{stat.label}</p>
                <p style={{ fontSize: '1.6rem', fontWeight: '700', color: '#34D399', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{stat.value}</p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '1rem', lineHeight: '1.6' }}>
            Return estimates reflect Oakwolf observations across comparable health system engagements and are illustrative. Actual results vary based on organizational complexity, internal capacity, and implementation approach. Engagement investment is estimated based on findings profile and organization size — final scope and cost are confirmed following the Phase 1 assessment.
          </p>
        </div>

        {/* Why Oakwolf */}
        <div style={styles.section}>
          <h2 style={styles.h2}>Why Oakwolf</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {[
              { icon: '🎯', title: 'Epic Security is our core practice', desc: 'We do not do Epic Security on the side of a larger IT practice. Our entire team is focused on Epic Security, IAM, and identity — which means deeper expertise, faster delivery, and lower risk of rework.' },
              { icon: '🔍', title: 'Assessment-led, not assumption-led', desc: 'We do not prescribe solutions before we understand the problem. Every engagement starts with a structured assessment that grounds the remediation roadmap in your actual environment, not a template.' },
              { icon: '📊', title: 'Pattern recognition across health systems', desc: 'We have worked with health systems of all sizes and types. This gives us benchmarks, role library standards, and governance frameworks that are grounded in what actually works in production Epic environments.' },
              { icon: '🤝', title: 'Peer-to-peer, non-salesy engagement', desc: 'We engage as advisors, not vendors. Our goal is to give your team a clear picture of where you are and a practical path forward — whether that leads to an Oakwolf engagement or not.' },
            ].map(item => (
              <div key={item.title} style={{ background: '#F8FAFF', borderRadius: '10px', padding: '1.25rem', border: '1px solid #E5E3DE' }}>
                <p style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>{item.icon}</p>
                <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0F1F3D', margin: '0 0 0.4rem' }}>{item.title}</p>
                <p style={{ fontSize: '0.8rem', color: '#4B5563', lineHeight: '1.6', margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>


        {/* Footer */}
        <div style={{ padding: '2rem 3rem', background: '#F8FAFF', borderTop: '1px solid #E5E3DE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/oakwolf-logo.jpg" alt="Oakwolf Group" style={{ height: '48px', opacity: 0.7 }} />
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#0F1F3D', margin: '0 0 2px' }}>{preparedBy} · Oakwolf Group</p>
            <p style={{ fontSize: '0.75rem', color: '#6B6977', margin: '0 0 2px' }}>kparker@oakwolfgroup.com</p>
            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>© {new Date().getFullYear()} Oakwolf Group · Confidential & Proprietary</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          main { background: white !important; padding: 0 !important; }
        }
      `}</style>
    </main>
  );
}

export default function ProposalPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading proposal...</div>}>
      <ProposalContent />
    </Suspense>
  );
}
