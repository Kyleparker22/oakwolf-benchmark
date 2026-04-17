'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { submitLead, getResults } from '@/lib/api';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PERSONAL_DOMAINS = ['gmail','yahoo','hotmail','outlook','aol','icloud','me','mac','live','msn','protonmail','ymail','googlemail','comcast','att','verizon','sbcglobal','bellsouth'];
function isPersonalEmail(email: string): boolean {
  const domain = email.split('@')[1]?.split('.')[0]?.toLowerCase();
  return PERSONAL_DOMAINS.includes(domain || '');
}

interface DomainScore { domain_name: string; normalized_score: number; weight: number; }
interface Finding { title: string; severity: string; explanation: string; business_impact: string; source_rule: string; }
interface Results {
  assessment: { overall_score_100: number; maturity_level: string; assessment_uuid: string; assessment_date?: string; };
  domain_scores: DomainScore[];
  findings: Finding[];
  organization_context?: any;
}

const sev = (s: string) => ({
  high:   { bg: '#FEF2F2', border: '#FECACA', badge: '#DC2626', badgeBg: '#FEE2E2' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', badge: '#D97706', badgeBg: '#FEF3C7' },
  low:    { bg: '#F0FDF4', border: '#BBF7D0', badge: '#16A34A', badgeBg: '#DCFCE7' },
}[s] || { bg: '#F9FAFB', border: '#E5E7EB', badge: '#6B7280', badgeBg: '#F3F4F6' });

const col = (n: number) => n >= 85 ? '#0D9488' : n >= 70 ? '#2563EB' : n >= 50 ? '#D97706' : n >= 30 ? '#EA580C' : '#DC2626';
const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #E5E3DE', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#0F1F3D', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: 'white' };
const sel: React.CSSProperties = { ...inp, appearance: 'auto' as any };

// ── Regulatory mapping ────────────────────────────────────────────────────
const REGULATORY_MAP: Record<string, { standard: string; citation: string; description: string }[]> = {
  'R001': [
    { standard: 'HIPAA', citation: '§164.308(a)(3)(ii)(C)', description: 'Termination procedures — implement procedures for terminating access when employment ends' },
    { standard: 'HIPAA', citation: '§164.312(a)(2)(i)', description: 'Unique user identification — procedures for identifying and tracking user identity' },
    { standard: 'Joint Commission', citation: 'IM.02.01.01', description: 'Requires safeguards to protect health information from unauthorized access after employment termination' },
  ],
  'R002': [
    { standard: 'HIPAA', citation: '§164.308(a)(4)', description: 'Information access management — implement policies for authorizing access to ePHI' },
    { standard: 'NIST', citation: 'SP 800-53 AC-2', description: 'Account management — organizations must manage information system accounts including establishment and termination' },
  ],
  'R003': [
    { standard: 'HIPAA', citation: '§164.308(a)(3)(ii)(C)', description: 'Termination procedures — access removal must be timely upon employment separation' },
    { standard: 'Joint Commission', citation: 'IM.02.01.01', description: 'Requires timely removal of access privileges upon termination' },
  ],
  'R004': [
    { standard: 'HIPAA', citation: '§164.312(a)(1)', description: 'Access control — limit access to only authorized users and only necessary information' },
    { standard: 'SOC 2', citation: 'CC6.3', description: 'Role-based access controls must be implemented and access limited to what is required for job function' },
    { standard: 'Joint Commission', citation: 'RC.02.01.01', description: 'Requires organizations to maintain records of who has access to patient information' },
  ],
  'R005': [
    { standard: 'HIPAA', citation: '§164.312(a)(1)', description: 'Access control — technical policies must limit access to only authorized users' },
    { standard: 'SOC 2', citation: 'CC6.2', description: 'Prior to issuing credentials, entities must register and authorize new users appropriately' },
  ],
  'R009': [
    { standard: 'HIPAA', citation: '§164.308(a)(4)(ii)(B)', description: 'Access establishment and modification — implement policies for access based on job function' },
    { standard: 'SOC 2', citation: 'CC6.1', description: 'Logical access security software, infrastructure, and architectures have been implemented' },
  ],
  'R011': [
    { standard: 'HIPAA', citation: '§164.312(d)', description: 'Person or entity authentication — verify that a person seeking access is who they claim to be' },
    { standard: 'NIST', citation: 'SP 800-63B AAL2', description: 'Authentication assurance level 2 requires multi-factor authentication for access to sensitive systems' },
    { standard: 'Joint Commission', citation: 'IM.02.01.01', description: 'Requires authentication controls to protect health information from unauthorized access' },
  ],
  'R012': [
    { standard: 'HIPAA', citation: '§164.312(d)', description: 'Authentication — elevated risk when native auth bypasses centralized identity controls' },
    { standard: 'NIST', citation: 'SP 800-63B', description: 'Recommends phishing-resistant MFA; native auth without MFA is below recommended assurance level' },
  ],
  'R013': [
    { standard: 'HIPAA', citation: '§164.308(a)(5)(ii)(A)', description: 'Security awareness and training — training must precede access to ePHI systems' },
    { standard: 'Joint Commission', citation: 'HR.01.05.03', description: 'Staff must demonstrate competence before performing job responsibilities including system access' },
  ],
  'R015': [
    { standard: 'HIPAA', citation: '§164.308(a)(1)(ii)(D)', description: 'Information system activity review — regular review of records of information system activity' },
    { standard: 'SOC 2', citation: 'CC6.6', description: 'Logical access security measures restrict unregistered users; periodic access reviews required' },
    { standard: 'Joint Commission', citation: 'IM.02.01.01', description: 'Requires periodic review of who has access to patient information' },
  ],
  'R016': [
    { standard: 'HIPAA', citation: '§164.308(a)(1)(ii)(D)', description: 'Information system activity review — must regularly review audit logs' },
    { standard: 'HIPAA', citation: '§164.312(b)', description: 'Audit controls — hardware, software, and procedural mechanisms to record and examine access' },
    { standard: 'SOC 2', citation: 'CC7.2', description: 'The entity monitors system components and the operation of those components for anomalies' },
  ],
  'R017': [
    { standard: 'HIPAA', citation: '§164.308(a)(2)', description: 'Assigned security responsibility — identify the security official responsible for security policies' },
    { standard: 'HIPAA', citation: '§164.308(a)(1)', description: 'Security management process — implement policies and procedures to prevent security violations' },
    { standard: 'SOC 2', citation: 'CC1.3', description: 'Management establishes structures, reporting lines, and authorities for pursuit of objectives' },
  ],
  'R018': [
    { standard: 'HIPAA', citation: '§164.308(a)(4)(ii)(C)', description: 'Access establishment and modification — implement policies for access changes' },
    { standard: 'SOC 2', citation: 'CC6.2', description: 'Access provisioning and changes must follow a defined, documented process' },
  ],
  'R022': [
    { standard: 'HIPAA', citation: '§164.308(a)(1)', description: 'Security management process — systematic approach to managing security risks across the organization' },
    { standard: 'SOC 2', citation: 'CC9.1', description: 'Entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions' },
  ],
};

// ── Financial pain calculator ─────────────────────────────────────────────
function calculateFinancialExposure(findings: Finding[], orgContext: any) {
  const userCount = orgContext?.user_count || '2,000-5,000';
  const isLarge = ['5,000–10,000','10,000+'].includes(userCount);
  const isMedium = ['2,000–5,000'].includes(userCount);

  const highFindings = findings.filter(f => f.severity === 'high').length;
  const hasTerminationGap = findings.some(f => f.source_rule === 'R001' || f.source_rule === 'R003');
  const hasMFAGap = findings.some(f => f.source_rule === 'R011' || f.source_rule === 'R012');
  const hasGovernanceGap = findings.some(f => f.source_rule === 'R017' || f.source_rule === 'R022');
  const hasAuditGap = findings.some(f => f.source_rule === 'R015' || f.source_rule === 'R016');

  const weeklyHours = isLarge ? 25 : isMedium ? 18 : 12;
  const annualHours = weeklyHours * 52;
  const loadedRate = 85;
  const annualLaborCost = annualHours * loadedRate;

  const hipaaFineMin = hasGovernanceGap || hasAuditGap ? 100 : 10;
  const hipaaFineMax = hasMFAGap || hasTerminationGap ? 1900 : 250;

  const reworkHoursPerUser = isLarge ? 2.5 : 1.8;
  const wrongAccessPct = 0.15;
  const affectedUsers = isLarge ? 7500 : isMedium ? 3500 : 1500;
  const reworkHours = Math.round(affectedUsers * wrongAccessPct * reworkHoursPerUser);
  const reworkCostMin = reworkHours * 150;
  const reworkCostMax = reworkHours * 200;

  return {
    labor: { hours: annualHours, costMin: annualLaborCost * 0.7, costMax: annualLaborCost * 1.3 },
    compliance: { fineMin: hipaaFineMin * 1000, fineMax: hipaaFineMax * 1000, hasExposure: hasGovernanceGap || hasAuditGap || hasMFAGap || hasTerminationGap },
    rework: { hours: reworkHours, costMin: reworkCostMin, costMax: reworkCostMax },
    totalMin: annualLaborCost * 0.7 + (hasGovernanceGap ? hipaaFineMin * 1000 * 0.05 : 0) + reworkCostMin,
    totalMax: annualLaborCost * 1.3 + (hasMFAGap ? hipaaFineMax * 1000 * 0.1 : 0) + reworkCostMax,
  };
}

function fmt(n: number) { return '$' + (n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? Math.round(n/1000)+'K' : n); }

// ── Animated score ────────────────────────────────────────────────────────
function AnimatedScore({ target, color }: { target: number; color: string }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const duration = 1800;
    const start = performance.now();
    const ease = (t: number) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(parseFloat((ease(progress) * target).toFixed(1)));
      if (progress < 1) requestAnimationFrame(tick);
      else setDisplay(target);
    };
    requestAnimationFrame(tick);
  }, [target]);

  return <div style={{ fontSize: '5rem', fontWeight: '700', color, lineHeight: 1, marginBottom: '0.25rem', fontFamily: 'DM Serif Display, serif', transition: 'color 0.3s' }}>{display.toFixed(1)}</div>;
}

// ── Radar chart ───────────────────────────────────────────────────────────
function RadarChart({ domainScores }: { domainScores: DomainScore[] }) {
  const [animated, setAnimated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(W, H) / 2 - 48;
    const domains = domainScores.map(d => d.domain_name);
    const scores = domainScores.map(d => d.normalized_score / 10);
    const n = domains.length;
    const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

    ctx.clearRect(0, 0, W, H);

    // Grid rings
    [0.25, 0.5, 0.75, 1].forEach(frac => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = angle(i);
        const x = cx + Math.cos(a) * maxR * frac;
        const y = cy + Math.sin(a) * maxR * frac;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Spokes
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Score polygon
    const prog = animated ? 1 : 0;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      const r = maxR * scores[i] * prog;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(37,99,235,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dots
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      const r = maxR * scores[i] * prog;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = col(scores[i] * 100);
      ctx.fill();
    }

    // Labels
    ctx.font = '600 11px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      const labelR = maxR + 28;
      const x = cx + Math.cos(a) * labelR;
      const y = cy + Math.sin(a) * labelR;
      ctx.fillStyle = '#374151';
      ctx.fillText(domains[i], x, y - 6);
      ctx.font = '700 11px DM Sans, sans-serif';
      ctx.fillStyle = col(scores[i] * 100);
      ctx.fillText(scores[i] === 1 ? '10.0' : (scores[i] * 10).toFixed(1), x, y + 8);
      ctx.font = '600 11px DM Sans, sans-serif';
    }
  }, [domainScores, animated]);

  const [expanded, setExpanded] = useState<string | null>(null);

  const DOMAIN_BEST_PRACTICES: Record<string, { question: string; best: string; why: string }[]> = {
    Provisioning: [
      { question: "What % of provisioning is automated?", best: "75–100%", why: "Full automation eliminates manual errors, speeds onboarding, and ensures consistent access assignment across the organization." },
      { question: "How quickly are terminated users removed?", best: "<1 hour", why: "Same-session deprovisioning closes the window of inappropriate access and is the clearest signal of a mature lifecycle program." },
      { question: "AD-disabled users still active in Epic?", best: "Never", why: "Any mismatch between AD and Epic is an access control gap. Automated sync eliminates this entirely." },
    ],
    RBAC: [
      { question: "Avg templates/roles per user?", best: "1", why: "One well-designed role per user is the gold standard. Multiple roles indicate either poor template design or accumulated access over time." },
      { question: "Access granted via exceptions?", best: "Rarely (<10%)", why: "High exception rates signal that your role library does not match real workflows. The fix is role redesign, not more exceptions." },
      { question: "Duplicate or overlapping roles?", best: "None", why: "Duplicate roles make access reviews unreliable and inflate the blast radius of any single compromised account." },
    ],
    IAM: [
      { question: "% of users managed through IAM?", best: "75–100%", why: "Full IAM coverage is the foundation. Any user outside IAM is outside your lifecycle controls." },
      { question: "Is lifecycle fully automated?", best: "Fully automated", why: "Automated hire/transfer/terminate is the core value of IAM. Manual processes create gaps that accumulate over time." },
      { question: "Does IAM enforce role-based provisioning?", best: "Always", why: "Consistent enforcement means access is predictable, auditable, and does not depend on individual judgment." },
    ],
    Authentication: [
      { question: "% authenticating via SSO?", best: "75–100%", why: "SSO centralizes authentication control and is the prerequisite for MFA enforcement at scale." },
      { question: "Users authenticating natively through Epic?", best: "None", why: "Native auth bypasses your identity controls entirely. Every native auth user is outside your security perimeter." },
      { question: "Is MFA enforced for Epic access?", best: "Fully enforced", why: "MFA is the single highest-impact control for preventing credential-based attacks on the EHR." },
    ],
    Training: [
      { question: "Is access granted after training?", best: "Always", why: "Access before training is a compliance risk and a patient safety issue. The linkage should be automated, not manual." },
      { question: "How aligned is training to job roles?", best: "Fully aligned", why: "Misaligned training means users either lack required knowledge or are trained on things they do not need." },
      { question: "Users with access but no training?", best: "None", why: "Any user with active access and no training is an uncontrolled risk. Automated ATAT enforcement closes this gap." },
    ],
    Audit: [
      { question: "How often are access reviews conducted?", best: "Quarterly or more frequent", why: "Annual reviews miss a year of access drift. Quarterly reviews catch and correct issues before they compound." },
      { question: "Monitoring for anomalous access?", best: "Advanced monitoring", why: "Without monitoring, you cannot detect when controls fail. Advanced monitoring shifts you from reactive to proactive." },
      { question: "How robust is audit logging?", best: "Comprehensive", why: "Comprehensive logging is required for regulatory defense and for investigating incidents after the fact." },
    ],
    Governance: [
      { question: "Is there clear ownership of Epic Security?", best: "Clearly defined", why: "Unclear ownership means no one is accountable. Every governance gap traces back to this." },
      { question: "Formal access governance structure?", best: "Fully established", why: "Governance formalizes decisions that would otherwise be ad hoc, making improvements sustainable rather than episodic." },
      { question: "How aligned are HR, IAM, and Epic?", best: "Fully aligned", why: "Misalignment between these three systems is the root cause of most lifecycle gaps in Epic Security environments." },
    ],
    Operational: [
      { question: "How is team workload distributed?", best: "Mostly proactive / strategic", why: "A team in firefighting mode cannot improve. Proactive capacity is a prerequisite for sustained maturity growth." },
      { question: "How often do you run optimization initiatives?", best: "Continuously", why: "Continuous improvement is what separates Level 4 from Level 5. It requires dedicated capacity, not just intent." },
      { question: "Overall operational maturity?", best: "Strategic / forward-looking", why: "Strategic teams anticipate problems before they become incidents. This is the end state every Epic Security program should target." },
    ],
  };

  return (
    <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '0.5rem' }}>Domain Scorecard</h2>
      <p style={{ fontSize: '0.85rem', color: '#6B6977', marginBottom: '1.5rem' }}>Your maturity across all 8 Epic Security domains. Click any domain below to see what best practice looks like.</p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} width={420} height={380} style={{ maxWidth: '100%' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '1rem', marginBottom: '1.5rem' }}>
        {domainScores.map(d => (
          <div key={d.domain_name} onClick={() => setExpanded(expanded === d.domain_name ? null : d.domain_name)}
            style={{ textAlign: 'center', padding: '0.5rem', background: expanded === d.domain_name ? '#EFF6FF' : '#F9FAFB', borderRadius: '8px', cursor: 'pointer', border: expanded === d.domain_name ? '1.5px solid #BFDBFE' : '1.5px solid transparent' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: col(d.normalized_score * 10) }}>{d.normalized_score.toFixed(1)}</div>
            <div style={{ fontSize: '0.65rem', color: '#6B6977', marginTop: '2px' }}>{d.domain_name}</div>
            <div style={{ fontSize: '0.6rem', color: '#BFDBFE', marginTop: '2px' }}>tap to expand</div>
          </div>
        ))}
      </div>
      {expanded && DOMAIN_BEST_PRACTICES[expanded] && (
        <div style={{ border: '1px solid #BFDBFE', borderRadius: '12px', padding: '1.25rem', background: '#F8FBFF' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: '#2563EB', textTransform: 'uppercase', marginBottom: '1rem' }}>{expanded} — What best practice looks like</p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {DOMAIN_BEST_PRACTICES[expanded].map((p, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '0.875rem', border: '1px solid #E5E3DE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.35rem' }}>
                  <p style={{ fontSize: '0.825rem', color: '#374151', fontWeight: '500', margin: 0 }}>{p.question}</p>
                  <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '99px', flexShrink: 0, whiteSpace: 'nowrap' }}>Best: {p.best}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: '1.6', margin: 0 }}>{p.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit mapping ─────────────────────────────────────────────────────────
function AuditSection({ findings }: { findings: Finding[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const highFindings = findings.filter(f => f.severity === 'high' && REGULATORY_MAP[f.source_rule]);
  if (highFindings.length === 0) return null;

  const standardColor = (s: string) => s === 'HIPAA' ? { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' } : s === 'Joint Commission' ? { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' } : s === 'SOC 2' ? { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' } : { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };

  return (
    <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', background: '#FEF2F2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        </div>
        <div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: '#0F1F3D', fontWeight: '400', margin: '0 0 4px' }}>Regulatory Exposure</h2>
          <p style={{ fontSize: '0.85rem', color: '#6B6977', margin: 0 }}>{highFindings.length} of your high-severity findings have direct regulatory implications. A compliance officer or privacy officer should review these.</p>
        </div>
      </div>

      <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8rem', color: '#92400E', margin: 0, lineHeight: '1.6' }}>
          <strong>Note:</strong> This section identifies findings relevant to regulatory standards. It is not a formal compliance determination. Organizations should consult their privacy officer and legal counsel to assess actual compliance status.
        </p>
      </div>

      {highFindings.map((f, i) => {
        const regs = REGULATORY_MAP[f.source_rule] || [];
        const isOpen = expanded === f.source_rule;
        return (
          <div key={i} style={{ border: '1px solid #E5E3DE', borderRadius: '12px', marginBottom: '0.75rem', overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : f.source_rule)} style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isOpen ? '#FEF9F0' : 'white' }}>
              <div>
                <p style={{ fontWeight: '600', fontSize: '0.875rem', color: '#0F1F3D', margin: '0 0 4px' }}>{f.title}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {regs.map(r => {
                    const sc = standardColor(r.standard);
                    return <span key={r.citation} style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontSize: '0.68rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>{r.standard}</span>;
                  })}
                </div>
              </div>
              <span style={{ color: '#9CA3AF', fontSize: '0.75rem', marginLeft: '1rem' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid #E5E3DE', padding: '1.25rem', background: '#FAFAFA' }}>
                {regs.map((r, j) => {
                  const sc = standardColor(r.standard);
                  return (
                    <div key={j} style={{ marginBottom: j < regs.length - 1 ? '0.875rem' : 0, paddingBottom: j < regs.length - 1 ? '0.875rem' : 0, borderBottom: j < regs.length - 1 ? '1px solid #E5E3DE' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '99px' }}>{r.standard}</span>
                        <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#374151', fontFamily: 'monospace' }}>{r.citation}</span>
                      </div>
                      <p style={{ fontSize: '0.825rem', color: '#4B5563', lineHeight: '1.6', margin: 0 }}>{r.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Financial pain ────────────────────────────────────────────────────────
function FinancialPain({ findings, orgContext }: { findings: Finding[]; orgContext: any }) {
  const data = calculateFinancialExposure(findings, orgContext);
  const highCount = findings.filter(f => f.severity === 'high').length;
  if (highCount === 0) return null;

  return (
    <div style={{ background: 'linear-gradient(135deg, #1A1A2E, #16213E)', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem' }}>
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: 'white', fontWeight: '400', marginBottom: '0.5rem' }}>Estimated Financial Exposure</h2>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>Based on your benchmark findings and organization size. Ranges are illustrative — actual costs vary by incident and organization.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          {
            icon: '⏱',
            label: 'Manual Provisioning Labor',
            sublabel: 'Annual cost of manual access work',
            hours: `${data.labor.hours.toLocaleString()} hrs/yr`,
            range: `${fmt(data.labor.costMin)} – ${fmt(data.labor.costMax)}`,
            color: '#F59E0B',
          },
          {
            icon: '⚖️',
            label: 'Compliance Incident Exposure',
            sublabel: 'HIPAA fine range if audited',
            hours: data.compliance.hasExposure ? 'Active risk identified' : 'Lower risk profile',
            range: data.compliance.hasExposure ? `${fmt(data.compliance.fineMin)} – ${fmt(data.compliance.fineMax)}` : 'Reduced exposure',
            color: '#EF4444',
          },
          {
            icon: '🔧',
            label: 'Cost of Working With the Wrong Partner',
            sublabel: 'Rework hours from poor access design, misaligned implementations, or consultants who lack Epic Security depth — re-doing work that should have been done right the first time',
            hours: `~${data.rework.hours.toLocaleString()} hrs of avoidable rework`,
            range: `${fmt(data.rework.costMin)} – ${fmt(data.rework.costMax)}`,
            color: '#8B5CF6',
          },
        ].map(item => (
          <div key={item.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
            <p style={{ fontSize: '0.78rem', fontWeight: '700', color: item.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{item.label}</p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 0.75rem' }}>{item.sublabel}</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>{item.hours}</p>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', margin: 0 }}>{item.range}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated total annual exposure</p>
          <p style={{ fontSize: '1.6rem', fontWeight: '700', color: '#EF4444', margin: 0 }}>{fmt(data.totalMin)} – {fmt(data.totalMax)}</p>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', maxWidth: '300px', margin: 0, lineHeight: '1.6' }}>
          Oakwolf engagements typically reduce this exposure by 50–80% through automation, governance, and process improvement.
        </p>
      </div>
    </div>
  );
}

// ── Outcome tiles ─────────────────────────────────────────────────────────
function domainAvg(scores: Record<string, number>, domains: string[]): number {
  const vals = domains.map(d => scores[d] ?? 5);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function deriveCurrentPct(avg: number, min: number, max: number): number {
  return Math.round(min + (avg / 10) * (max - min));
}
const OUTCOME_CATEGORIES = [
  { cat: 'Clinical', color: '#185FA5', bgColor: 'rgba(24,95,165,0.12)', headline: '30–60%', headlineSub: 'reduction in access risk events',
    metrics: [
      { label: 'Training compliance', sourceDomains: ['Training'], currentMin: 40, currentMax: 72, target: 94 },
      { label: 'Deprovisioning speed', sourceDomains: ['Provisioning', 'IAM'], currentMin: 20, currentMax: 65, target: 91 },
    ]},
  { cat: 'Financial', color: '#0F6E56', bgColor: 'rgba(15,110,86,0.12)', headline: '70–85%', headlineSub: 'reduction in manual provisioning effort',
    metrics: [
      { label: 'Manual effort reduction', sourceDomains: ['Provisioning', 'IAM'], currentMin: 10, currentMax: 45, target: 78 },
      { label: 'Audit findings resolved', sourceDomains: ['Governance', 'Audit'], currentMin: 20, currentMax: 52, target: 65 },
    ]},
  { cat: 'Operational', color: '#3B6D11', bgColor: 'rgba(59,109,17,0.12)', headline: '30–50%', headlineSub: 'of team time reclaimed from reactive work',
    metrics: [
      { label: 'Access review completion', sourceDomains: ['Governance', 'Audit'], currentMin: 40, currentMax: 72, target: 98 },
      { label: 'Team strategic capacity', sourceDomains: ['Operational', 'RBAC'], currentMin: 15, currentMax: 45, target: 60 },
    ]},
];

function OutcomeTiles({ domainScores }: { domainScores: DomainScore[] }) {
  const scoreMap: Record<string, number> = {};
  domainScores.forEach(d => { scoreMap[d.domain_name] = d.normalized_score; });
  return (
    <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '0.5rem' }}>Your Improvement Opportunity</h2>
      <p style={{ fontSize: '0.85rem', color: '#6B6977', lineHeight: '1.6', marginBottom: '1.5rem' }}>Based on your benchmark scores, here is what organizations at your maturity level typically achieve when they reach Level 4–5.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '12px' }}>
        {OUTCOME_CATEGORIES.map(cat => (
          <div key={cat.cat} style={{ background: 'white', border: '0.5px solid #E5E3DE', borderRadius: '12px', padding: '1.25rem', borderTop: `3px solid ${cat.color}` }}>
            <p style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: cat.color, margin: '0 0 1rem' }}>{cat.cat}</p>
            {cat.metrics.map((metric, i) => {
              const avg = domainAvg(scoreMap, metric.sourceDomains);
              const current = deriveCurrentPct(avg, metric.currentMin, metric.currentMax);
              return (
                <div key={metric.label} style={{ marginBottom: i < cat.metrics.length - 1 ? '1rem' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'baseline' }}>
                    <p style={{ fontSize: '11px', color: '#6B6977', margin: '0', flexShrink: 0 }}>{metric.label}</p>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#0F1F3D', margin: '0', whiteSpace: 'nowrap', marginLeft: '8px' }}>{current}% → <span style={{ color: cat.color }}>{metric.target}%</span></p>
                  </div>
                  <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', height: '100%', width: `${metric.target}%`, background: cat.bgColor, borderRadius: '99px' }} />
                    <div style={{ position: 'absolute', height: '100%', width: `${current}%`, background: '#D3D1C7', borderRadius: '99px' }} />
                  </div>
                </div>
              );
            })}
            <div style={{ borderTop: '0.5px solid #E5E3DE', paddingTop: '0.75rem', marginTop: '0.875rem' }}>
              <p style={{ fontSize: '18px', fontWeight: '500', color: '#0F1F3D', margin: '0 0 2px' }}>{cat.headline}</p>
              <p style={{ fontSize: '11px', color: '#6B6977', margin: '0' }}>{cat.headlineSub}</p>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1rem', lineHeight: '1.6' }}>Current state bars are derived from your benchmark domain scores. Target ranges reflect Oakwolf observations across health system engagements that have reached Level 4–5 maturity.</p>
    </div>
  );
}

// ── Peer benchmark ────────────────────────────────────────────────────────
function PeerBenchmark({ score, orgType }: { score: number; orgType?: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const params = new URLSearchParams();
    if (orgType) params.set('org_type', orgType);
    axios.get(`${API_BASE}/assessments/peer-benchmarks?${params}`).then(r => setData(r.data)).catch(() => {});
  }, []);
  if (!data) return null;
  const { percentiles, distribution, org_type, note } = data;
  // Use actual percentile markers for accurate calculation
  let better = 0;
  if (score <= percentiles.p25) {
    better = Math.round((score / percentiles.p25) * 25);
  } else if (score <= percentiles.p50) {
    better = 25 + Math.round(((score - percentiles.p25) / (percentiles.p50 - percentiles.p25)) * 25);
  } else if (score <= percentiles.p75) {
    better = 50 + Math.round(((score - percentiles.p50) / (percentiles.p75 - percentiles.p50)) * 25);
  } else {
    better = 75 + Math.round(((score - percentiles.p75) / (100 - percentiles.p75)) * 20);
  }
  better = Math.max(5, Math.min(95, better));
  return (
    <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '0.5rem' }}>Peer Comparison</h2>
      <p style={{ fontSize: '0.85rem', color: '#6B6977', marginBottom: '1.5rem' }}>{org_type} · {note}</p>
      <div style={{ background: 'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', fontWeight: '700', color: col(score), lineHeight: 1 }}>{score.toFixed(1)}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Your score</div>
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <p style={{ color: 'white', fontWeight: '600', fontSize: '1rem', margin: '0 0 4px' }}>You scored higher than <span style={{ color: col(score) }}>{better}%</span> of similar organizations</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Peer median: {percentiles.p50} · 75th percentile: {percentiles.p75}</p>
        </div>
      </div>
      <p style={{ fontSize: '0.78rem', fontWeight: '600', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>Score distribution across peers</p>
      {distribution.map((band: any) => {
        const [low, high] = band.range.split('–').map(Number);
        const isUser = score >= low && score <= high;
        return (
          <div key={band.range} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '80px', fontSize: '0.75rem', color: '#6B6977', flexShrink: 0 }}>{band.range}</div>
            <div style={{ flex: 1, height: '24px', background: '#F3F4F6', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${Math.max(band.pct * 3, 4)}%`, background: isUser ? col(score) : '#D3D1C7', borderRadius: '6px', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                {band.pct > 8 && <span style={{ fontSize: '0.7rem', color: isUser ? 'white' : '#6B6977', fontWeight: '600' }}>{band.pct}%</span>}
              </div>
              {isUser && <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: 'white', fontWeight: '700', background: col(score), borderRadius: '4px', padding: '1px 5px' }}>YOU</div>}
            </div>
            <div style={{ width: '70px', fontSize: '0.75rem', color: '#9CA3AF', flexShrink: 0 }}>{band.label}</div>
          </div>
        );
      })}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '1rem' }}>
        {[['25th', percentiles.p25], ['Median', percentiles.p50], ['75th', percentiles.p75]].map(([label, val]) => (
          <div key={String(label)} style={{ background: '#F9FAFB', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0F1F3D', margin: '0 0 2px' }}>{val}</p>
            <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>{label} percentile</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const uuid = params.get('uuid') || '';
  const mode = (params.get('mode') || 'external') as 'internal' | 'external';
  const [stage, setStage] = useState<'gate'|'results'>(mode === 'internal' ? 'results' : 'gate');
  const [results, setResults] = useState<Results | null>(null);
  const [aiOutputs, setAiOutputs] = useState<Record<string,string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lead, setLead] = useState({ first_name:'', last_name:'', title:'', organization:'', email:'', phone:'', job_function:'', heard_from:'' });

  useEffect(() => { if (mode === 'internal') loadResults(); }, []);

  const loadResults = async () => {
    setLoading(true);
    try { const data = await getResults(uuid, mode); setResults(data); generateAI(); }
    catch { setError('Failed to load results.'); }
    setLoading(false);
  };

  const generateAI = async () => {
    setAiLoading(true);
    try { const res = await axios.post(`${API_BASE}/assessments/${uuid}/generate-ai?mode=${mode}`); setAiOutputs(res.data.outputs || {}); }
    catch (e) { console.error('AI failed:', e); }
    setAiLoading(false);
  };

  const handleLeadSubmit = async () => {
    setError('');
    if (!lead.first_name || !lead.last_name || !lead.title || !lead.organization || !lead.email) { setError('Please fill in all required fields.'); return; }
    if (!lead.email.includes('@') || !lead.email.includes('.')) { setError('Please enter a valid email address.'); return; }
    if (isPersonalEmail(lead.email)) { setError('Please use your work email address. Personal email addresses (Gmail, Yahoo, Hotmail, etc.) are not accepted.'); return; }
    if (!lead.job_function) { setError('Please select your job function.'); return; }
    setLoading(true);
    try {
      await submitLead(uuid, { first_name: lead.first_name, last_name: lead.last_name, title: lead.title, organization: lead.organization, email: lead.email, phone: lead.phone || undefined });
      await loadResults();
      setStage('results');
    } catch (e: any) { setError(e?.response?.data?.detail || 'Something went wrong.'); }
    setLoading(false);
  };

  if (stage === 'gate') {
    return (
      <main style={{ minHeight:'100vh', background:'#FAF9F6', padding:'2rem 1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ maxWidth:'560px', width:'100%' }}>
          <div style={{ background:'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius:'20px', padding:'2.5rem', marginBottom:'1.5rem', textAlign:'center' }}>
            <p style={{ fontSize:'0.75rem', letterSpacing:'0.1em', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', marginBottom:'0.75rem' }}>Your Score</p>
            <div style={{ fontSize:'4rem', fontWeight:'700', color:'rgba(255,255,255,0.15)', lineHeight:1, marginBottom:'0.25rem' }}>??</div>
            <div style={{ fontSize:'1rem', color:'rgba(255,255,255,0.3)', marginBottom:'2rem' }}>out of 100</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'1.5rem' }}>
              {['Provisioning','RBAC','IAM','Authentication','Governance','Audit','Training','Operational'].map(d => (
                <div key={d} style={{ background:'rgba(255,255,255,0.05)', borderRadius:'8px', padding:'0.6rem', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>{d}</span>
                  <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.15)' }}>••••</span>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(37,99,235,0.2)', border:'1px solid rgba(37,99,235,0.3)', borderRadius:'10px', padding:'0.875rem', color:'rgba(255,255,255,0.6)', fontSize:'0.85rem' }}>
              🔒 Findings identified — enter your info to unlock
            </div>
          </div>
          <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'20px', padding:'2.5rem', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.6rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'0.5rem' }}>Your results are ready</h2>
            <p style={{ color:'#6B6977', fontSize:'0.875rem', lineHeight:'1.6', marginBottom:'1.75rem' }}>Enter your information to unlock your full report and see how your Epic Security environment compares against Oakwolf's maturity model.</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#374151', marginBottom:'0.4rem' }}>First Name *</label>
                <input style={inp} value={lead.first_name} onChange={e => setLead(p => ({...p, first_name:e.target.value}))} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#374151', marginBottom:'0.4rem' }}>Last Name *</label>
                <input style={inp} value={lead.last_name} onChange={e => setLead(p => ({...p, last_name:e.target.value}))} />
              </div>
            </div>
            {[{label:'Title *',key:'title',ph:'e.g. Director of Epic Security'},{label:'Organization *',key:'organization',ph:'Health system name'}].map(({label,key,ph}) => (
              <div key={key} style={{ marginBottom:'0.75rem' }}>
                <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#374151', marginBottom:'0.4rem' }}>{label}</label>
                <input style={inp} placeholder={ph} value={(lead as any)[key]} onChange={e => setLead(p => ({...p,[key]:e.target.value}))} />
              </div>
            ))}
            <div style={{ marginBottom:'0.75rem' }}>
              <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#374151', marginBottom:'0.4rem' }}>Work Email *</label>
              <input style={inp} type="email" placeholder="you@healthsystem.org" value={lead.email} onChange={e => setLead(p => ({...p,email:e.target.value}))} />
              <p style={{ fontSize:'0.72rem', color:'#9CA3AF', margin:'4px 0 0' }}>Work email required. Personal email addresses are not accepted.</p>
            </div>
            <div style={{ marginBottom:'0.75rem' }}>
              <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#374151', marginBottom:'0.4rem' }}>Job Function *</label>
              <select style={sel} value={lead.job_function} onChange={e => setLead(p => ({...p,job_function:e.target.value}))}>
                <option value="">Select...</option>
                {['CIO / CEO','CISO','Other C-Suite','Director','Manager','Architect','Other'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:'0.75rem' }}>
              <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#374151', marginBottom:'0.4rem' }}>How did you hear about this benchmark?</label>
              <select style={sel} value={lead.heard_from} onChange={e => setLead(p => ({...p,heard_from:e.target.value}))}>
                <option value="">Select...</option>
                {['LinkedIn','Colleague / Word of mouth','Epic UserWeb / Community','Google search','Oakwolf outreach','Conference or event','Other'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:'0.75rem' }}>
              <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#374151', marginBottom:'0.4rem' }}>Phone (optional)</label>
              <input style={inp} value={lead.phone} onChange={e => setLead(p => ({...p,phone:e.target.value}))} />
            </div>
            {error && <div style={{ color:'#DC2626', fontSize:'0.85rem', padding:'0.875rem', background:'#FEF2F2', borderRadius:'8px', border:'1px solid #FECACA', marginTop:'0.5rem', lineHeight:'1.5' }}>{error}</div>}
            <button onClick={handleLeadSubmit} disabled={loading} style={{ width:'100%', marginTop:'1.25rem', padding:'1rem', background:loading?'#93C5FD':'linear-gradient(135deg, #2563EB, #1D4ED8)', color:'white', border:'none', borderRadius:'10px', fontWeight:'600', fontSize:'0.95rem', cursor:loading?'not-allowed':'pointer', fontFamily:'DM Sans, sans-serif' }}>
              {loading?'Loading your results...':'View My Results →'}
            </button>
            <p style={{ textAlign:'center', fontSize:'0.75rem', color:'#9CA3AF', marginTop:'1rem' }}>Oakwolf uses this information only to deliver your report and follow up on your results.</p>
          </div>
        </div>
      </main>
    );
  }

  if (loading || !results) {
    return <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF9F6' }}><p style={{ color:'#6B6977' }}>Loading your results...</p></main>;
  }

  const score = results.assessment.overall_score_100;
  const level = results.assessment.maturity_level;
  const c = col(score);
  const orgType = results.organization_context?.org_type;

  return (
    <main style={{ minHeight:'100vh', background:'#FAF9F6', padding:'2rem 1rem' }}>
      <div style={{ maxWidth:'760px', margin:'0 auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <span style={{ fontSize:'0.75rem', fontWeight:'700', letterSpacing:'0.1em', color:'#6B6977', textTransform:'uppercase' }}>Oakwolf Epic Security Maturity Benchmark</span>
          <button onClick={() => window.print()} style={{ background:'white', border:'1.5px solid #E5E3DE', borderRadius:'8px', padding:'0.5rem 1rem', fontSize:'0.8rem', fontWeight:'600', color:'#374151', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>⬇ Download PDF</button>
        </div>

        {/* Animated score card */}
        <div style={{ background:'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius:'24px', padding:'3rem 2rem', marginBottom:'1.5rem', textAlign:'center' }}>
          <AnimatedScore target={score} color={c} />
          <div style={{ color:'rgba(255,255,255,0.4)', marginBottom:'1rem', fontSize:'0.9rem' }}>out of 100</div>
          <div style={{ display:'inline-block', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'99px', padding:'0.5rem 1.5rem', color:'white', fontWeight:'600', marginBottom:'2rem' }}>{level}</div>
          <div style={{ width:'100%', maxWidth:'400px', margin:'0 auto' }}>
            <div style={{ height:'6px', background:'rgba(255,255,255,0.1)', borderRadius:'99px', overflow:'hidden', marginBottom:'0.5rem' }}>
              <div style={{ height:'100%', width:`${score}%`, background:`linear-gradient(90deg, ${c}, ${c}CC)`, borderRadius:'99px', transition:'width 1.8s ease' }} />
            </div>
            {(() => {
              const levels = [
                { label:'Reactive', range:'0–29', desc:'Unstructured, ad hoc access management with the highest compliance and audit risk.' },
                { label:'Accumulating', range:'30–49', desc:'Foundations are being built but remain inconsistent. Significant manual effort persists.' },
                { label:'Stabilizing', range:'50–69', desc:'Functional baselines are in place with notable gaps in automation or governance.' },
                { label:'Governed', range:'70–84', desc:'Defined ownership, consistent processes, and meaningful automation are in place.' },
                { label:'Optimized', range:'85–100', desc:'Comprehensive automation, strong governance, and continuous improvement are the norm.' },
              ];
              return (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', position:'relative', marginTop:'4px' }}>
                  {levels.map((lvl, i) => {
                    const isActive = (i===0&&score<30)||(i===1&&score>=30&&score<50)||(i===2&&score>=50&&score<70)||(i===3&&score>=70&&score<85)||(i===4&&score>=85);
                    return (
                      <div key={lvl.label} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}
                        onMouseEnter={e => {
                          const tip = document.getElementById(`maturity-tip-${i}`);
                          if (tip) tip.style.display = 'block';
                        }}
                        onMouseLeave={e => {
                          const tip = document.getElementById(`maturity-tip-${i}`);
                          if (tip) tip.style.display = 'none';
                        }}>
                        <span style={{ color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)', fontWeight: isActive ? '700' : '400', cursor:'default', userSelect:'none' }}>
                          {lvl.label}
                        </span>
                        {isActive && <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'white', opacity:0.7 }} />}
                        <div id={`maturity-tip-${i}`} style={{ display:'none', position:'absolute', bottom:'28px', left:'50%', transform:'translateX(-50%)', background:'white', color:'#0F1F3D', borderRadius:'8px', padding:'0.6rem 0.875rem', fontSize:'0.75rem', lineHeight:'1.5', width:'180px', textAlign:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.25)', zIndex:100, fontWeight:'400' }}>
                          <strong style={{ display:'block', marginBottom:'2px' }}>Level {i+1} – {lvl.label}</strong>
                          <span style={{ color:'#6B6977' }}>{lvl.range}</span>
                          <div style={{ marginTop:'4px', color:'#374151' }}>{lvl.desc}</div>
                          <div style={{ position:'absolute', bottom:'-5px', left:'50%', transform:'translateX(-50%)', width:'10px', height:'10px', background:'white', rotate:'45deg' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Executive Summary */}
        <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'20px', padding:'2rem', marginBottom:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.4rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'1rem' }}>Executive Summary</h2>

          {/* Maturity level explainer */}
          {(() => {
            const levelDescriptions: Record<string, { name: string; color: string; bg: string; border: string; description: string; what: string }> = {
              'Level 1': { name: 'Reactive', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', description: 'Your Epic Security program is largely unstructured and responds to issues as they arise rather than preventing them. Access decisions are made ad hoc, lifecycle processes are manual or inconsistent, and there is limited visibility into who has access to what.', what: 'Organizations at this level face the highest compliance risk and operational burden. Access-related incidents are common, audit preparation is painful, and the team spends most of its time firefighting rather than improving.' },
              'Level 2': { name: 'Accumulating', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', description: 'Your organization has begun building Epic Security foundations but they are inconsistent or incomplete. Some processes exist but are not standardized, and significant manual effort remains throughout the access lifecycle.', what: 'Progress is being made but the gaps are still significant. Without structured improvement, organizations at this level often plateau here for years — accumulating technical debt in their role libraries, access exceptions, and governance processes.' },
              'Level 3': { name: 'Stabilizing', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', description: 'Your Epic Security program has functional baselines in most domains but notable gaps remain in automation, governance, or standardization. Core processes exist but may not be consistently enforced or fully integrated across systems.', what: 'This is the most common maturity level for health systems that have been live on Epic for 3+ years. The risk is complacency — good enough is not the same as secure. Moving from Level 3 to Level 4 typically requires a structured improvement initiative.' },
              'Level 4': { name: 'Governed', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', description: 'Your Epic Security environment is well-structured with defined ownership, consistent processes, and meaningful automation across the access lifecycle. Governance frameworks are in place and access decisions follow documented policies.', what: 'Level 4 organizations have moved from reactive to proactive. The remaining gaps are typically in advanced automation, continuous monitoring, or optimization of existing controls. The focus shifts from building foundational processes to refining and sustaining them.' },
              'Level 5': { name: 'Optimized', color: '#0D9488', bg: '#F0FDF4', border: '#BBF7D0', description: 'Your Epic Security program operates at a high level of maturity with comprehensive automation, strong governance, and continuous improvement embedded in daily operations. Access is managed predictably, compliantly, and efficiently at scale.', what: 'Level 5 organizations are in the minority. They have moved beyond implementation and stabilization into true operational excellence. The focus is on sustaining this standard, adapting to organizational change, and continuously raising the bar.' },
            };
            const levelKey = Object.keys(levelDescriptions).find(k => level.includes(k.replace('Level ', '')));
            const ld = levelKey ? levelDescriptions[levelKey] : null;
            if (!ld) return null;
            return (
              <div style={{ background: ld.bg, border: `1px solid ${ld.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ background: ld.color, color: 'white', fontSize: '0.72rem', fontWeight: '700', padding: '0.25rem 0.75rem', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{level}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: ld.color }}>{ld.name}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.7', margin: '0 0 0.625rem' }}>{ld.description}</p>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: '1.7', margin: 0, fontStyle: 'italic' }}>{ld.what}</p>
              </div>
            );
          })()}

          {aiLoading?<p style={{ color:'#6B6977', fontSize:'0.875rem', fontStyle:'italic' }}>Generating executive summary...</p>
            :aiOutputs.executive_summary?<p style={{ color:'#374151', lineHeight:'1.8', fontSize:'0.925rem' }}>{aiOutputs.executive_summary}</p>
            :<p style={{ color:'#9CA3AF', fontSize:'0.875rem', fontStyle:'italic' }}>Executive summary unavailable.</p>}
        </div>

        <PeerBenchmark score={score} orgType={orgType} />
        <RadarChart domainScores={results.domain_scores} />

        {/* Findings */}
        {results.findings.length > 0 && (
          <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'20px', padding:'2rem', marginBottom:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.4rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'1.5rem' }}>Key Findings <span style={{ fontSize:'0.9rem', color:'#6B6977', fontFamily:'DM Sans, sans-serif', fontWeight:'400' }}>({results.findings.length} identified)</span></h2>
            {results.findings.map((f:Finding, i:number) => {
              const sv = sev(f.severity);
              return (
                <div key={i} style={{ background:sv.bg, border:`1px solid ${sv.border}`, borderRadius:'12px', padding:'1.25rem', marginBottom:'0.875rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', marginBottom:'0.5rem' }}>
                    <p style={{ fontWeight:'600', fontSize:'0.9rem', color:'#0F1F3D', margin:0 }}>{f.title}</p>
                    <span style={{ background:sv.badgeBg, color:sv.badge, fontSize:'0.7rem', fontWeight:'700', padding:'0.25rem 0.6rem', borderRadius:'99px', flexShrink:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>{f.severity}</span>
                  </div>
                  <p style={{ fontSize:'0.85rem', color:'#4B5563', lineHeight:'1.6', marginBottom:'0.75rem' }}>{f.explanation}</p>
                  <div style={{ background: f.severity === 'high' ? '#FEE2E2' : f.severity === 'medium' ? '#FEF3C7' : '#DCFCE7', borderRadius:'8px', padding:'0.625rem 0.875rem', display:'flex', alignItems:'flex-start', gap:'0.5rem' }}>
                    <span style={{ fontSize:'0.8rem', flexShrink:0 }}>⚠️</span>
                    <p style={{ fontSize:'0.8rem', color:'#0F1F3D', margin:0, lineHeight:'1.6' }}><span style={{ fontWeight:'700' }}>Business impact: </span>{f.business_impact}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AuditSection findings={results.findings} />
        <FinancialPain findings={results.findings} orgContext={results.organization_context} />
        <OutcomeTiles domainScores={results.domain_scores} />

        {(aiOutputs.what_good_looks_like||aiLoading) && (
          <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'20px', padding:'2rem', marginBottom:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.4rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'1rem' }}>What Good Looks Like</h2>
            {aiLoading?<p style={{ color:'#6B6977', fontSize:'0.875rem', fontStyle:'italic' }}>Generating...</p>
              :<p style={{ color:'#374151', lineHeight:'1.8', fontSize:'0.925rem' }}>{aiOutputs.what_good_looks_like}</p>}
          </div>
        )}

        {/* Business Case */}
        {results.findings.length > 0 && (() => {
          const orgContext = results.organization_context || {};
          const userCount = orgContext.user_count || '2,000–5,000';
          const teamSize = orgContext.team_size || '3–5';
          const isLarge = ['5,000–10,000','10,000+'].includes(userCount);
          const isMedium = ['2,000–5,000'].includes(userCount);
          const highCount = results.findings.filter((f:Finding) => f.severity === 'high').length;
          const medCount = results.findings.filter((f:Finding) => f.severity === 'medium').length;
          const lowCount = results.findings.filter((f:Finding) => f.severity === 'low').length;
          const totalFindings = highCount + medCount + lowCount;
          const assessAnalysts = isLarge ? 2 : 1;
          const assessLow = Math.round((1 * 20 * 3 * 185) + (assessAnalysts * 40 * 3 * 165));
          const assessHigh = Math.round((1 * 20 * 6 * 200) + (assessAnalysts * 40 * 6 * 180));
          const highWeeksLow = isLarge ? 5 : 3; const highWeeksHigh = isLarge ? 10 : 6;
          const medWeeksLow = isLarge ? 3 : 2; const medWeeksHigh = isLarge ? 6 : 4;
          const remLow = Math.round(highCount*((1*20*highWeeksLow*185)+(2*40*highWeeksLow*165))+medCount*((1*20*medWeeksLow*185)+(1*40*medWeeksLow*165))+lowCount*(1*40*1*165));
          const remHigh = Math.round(highCount*((1*20*highWeeksHigh*200)+(2*40*highWeeksHigh*180))+medCount*((1*20*medWeeksHigh*200)+(1*40*medWeeksHigh*180))+lowCount*(1*40*2*180));
          const remediationLow = Math.max(45000, Math.min(remLow, isLarge ? 400000 : 200000));
          const remediationHigh = Math.max(90000, Math.min(remHigh, isLarge ? 600000 : 350000));
          const healthCheckLow = 28000; const healthCheckHigh = 56000;
          const totalInvestLow = assessLow + remediationLow + healthCheckLow;
          const totalInvestHigh = assessHigh + remediationHigh + healthCheckHigh;
          const weeklyHours = isLarge ? 30 : isMedium ? 22 : 15;
          const laborSavings = Math.round(weeklyHours * 52 * 95 * 0.70);
          const complianceRiskReduction = highCount * 22000 + medCount * 8000;
          const reworkAvoidance = isLarge ? 225000 : isMedium ? 155000 : 95000;
          const totalAnnualSavings = laborSavings + complianceRiskReduction + reworkAvoidance;
          const paybackMonths = Math.max(6, Math.round((totalInvestLow / totalAnnualSavings) * 12));
          const threeYearNet = totalAnnualSavings * 3 - totalInvestHigh;
          const threeYearROI = Math.round((threeYearNet / totalInvestHigh) * 100);
          const remScopeNote = [highCount > 0 ? `${highCount} high-severity item${highCount > 1 ? 's' : ''} (complex, multi-week)` : '', medCount > 0 ? `${medCount} medium-severity item${medCount > 1 ? 's' : ''} (targeted fixes)` : '', lowCount > 0 ? `${lowCount} low-severity item${lowCount > 1 ? 's' : ''} (quick wins)` : ''].filter(Boolean).join(' · ');
          return (
            <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #2563EB, #0D9488)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: '#0F1F3D', fontWeight: '400', margin: 0 }}>Business Case for Action</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#6B6977', marginBottom: '1.75rem', lineHeight: '1.6' }}>Based on your benchmark findings, organization size, and Oakwolf’s engagement model — here is what a structured improvement program would cost and what it would return over three years.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ border: '1px solid #E5E3DE', borderRadius: '14px', padding: '1.5rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1rem' }}>Oakwolf Engagement Investment</p>
                  {[{phase:'Phase 1 — Assessment',note:`${isLarge?'1 Advisor + 2 Analysts':'1 Advisor + 1 Analyst'} · 3–6 weeks`,duration:'3–6 weeks',low:assessLow,high:assessHigh},{phase:'Phase 2 — Remediation',note:remScopeNote||'Scope defined post-assessment',duration:isLarge?'3–9 months':'6 weeks–6 months',low:remediationLow,high:remediationHigh},{phase:'Phase 3 — Health Check',note:'1 Advisor + 1 Analyst · Quarterly',duration:'Ongoing quarterly',low:healthCheckLow,high:healthCheckHigh}].map((p,i)=>(
                    <div key={i} style={{marginBottom:i<2?'1rem':0,paddingBottom:i<2?'1rem':0,borderBottom:i<2?'1px solid #F3F4F6':'none'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem'}}>
                        <div style={{flex:1}}><p style={{fontSize:'0.82rem',fontWeight:'600',color:'#0F1F3D',margin:'0 0 2px'}}>{p.phase}</p><p style={{fontSize:'0.7rem',color:'#9CA3AF',margin:0,lineHeight:'1.5'}}>{p.note}</p></div>
                        <div style={{textAlign:'right',flexShrink:0,marginLeft:'0.5rem'}}><p style={{fontSize:'0.85rem',fontWeight:'700',color:'#0F1F3D',margin:0}}>{fmt(p.low)}–{fmt(p.high)}</p><p style={{fontSize:'0.65rem',color:'#9CA3AF',margin:0}}>{p.duration}</p></div>
                      </div>
                    </div>
                  ))}
                  <div style={{borderTop:'2px solid #0F1F3D',marginTop:'1rem',paddingTop:'1rem',display:'flex',justifyContent:'space-between'}}>
                    <p style={{fontSize:'0.85rem',fontWeight:'700',color:'#0F1F3D',margin:0}}>Total Investment</p>
                    <p style={{fontSize:'0.95rem',fontWeight:'700',color:'#0F1F3D',margin:0}}>{fmt(totalInvestLow)}–{fmt(totalInvestHigh)}</p>
                  </div>
                </div>
                <div style={{border:'1px solid #BBF7D0',borderRadius:'14px',padding:'1.5rem',background:'#F0FDF4'}}>
                  <p style={{fontSize:'0.72rem',fontWeight:'700',color:'#16A34A',textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 1rem'}}>Estimated Annual Return</p>
                  {[{label:'Labor cost reduction',sublabel:'Automation of provisioning, lifecycle & access reviews',value:laborSavings},{label:'Compliance risk avoided',sublabel:`${totalFindings} findings remediated — reduced audit exposure`,value:complianceRiskReduction},{label:'Rework & bad-fit costs eliminated',sublabel:'Correct design from day one vs. fixing mistakes later',value:reworkAvoidance}].map((s,i)=>(
                    <div key={i} style={{marginBottom:i<2?'1rem':0,paddingBottom:i<2?'1rem':0,borderBottom:i<2?'1px solid #BBF7D0':'none'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem'}}>
                        <div style={{flex:1}}><p style={{fontSize:'0.82rem',fontWeight:'600',color:'#0F1F3D',margin:'0 0 2px'}}>{s.label}</p><p style={{fontSize:'0.7rem',color:'#6B7280',margin:0,lineHeight:'1.5'}}>{s.sublabel}</p></div>
                        <p style={{fontSize:'0.85rem',fontWeight:'700',color:'#16A34A',margin:0,flexShrink:0,marginLeft:'0.5rem'}}>{fmt(s.value)}/yr</p>
                      </div>
                    </div>
                  ))}
                  <div style={{borderTop:'2px solid #16A34A',marginTop:'1rem',paddingTop:'1rem',display:'flex',justifyContent:'space-between'}}>
                    <p style={{fontSize:'0.85rem',fontWeight:'700',color:'#0F1F3D',margin:0}}>Total Annual Return</p>
                    <p style={{fontSize:'0.95rem',fontWeight:'700',color:'#16A34A',margin:0}}>{fmt(totalAnnualSavings)}/yr</p>
                  </div>
                </div>
              </div>
              <div style={{background:'linear-gradient(135deg, #0F1F3D, #1A3260)',borderRadius:'14px',padding:'1.5rem',display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'1rem',textAlign:'center',marginBottom:'1rem'}}>
                {[{label:'Estimated Payback',value:`${paybackMonths} months`,sub:'Time to recover full investment'},{label:'3-Year Net Return',value:fmt(Math.max(0,threeYearNet)),sub:'After all engagement costs'},{label:'3-Year ROI',value:`${Math.max(0,threeYearROI)}%`,sub:'Return on total investment'}].map(stat=>(
                  <div key={stat.label}><p style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 6px'}}>{stat.label}</p><p style={{fontSize:'1.6rem',fontWeight:'700',color:'#34D399',margin:'0 0 4px',fontFamily:'DM Serif Display, serif'}}>{stat.value}</p><p style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.35)',margin:0}}>{stat.sub}</p></div>
                ))}
              </div>
              <p style={{fontSize:'0.75rem',color:'#9CA3AF',lineHeight:'1.6',margin:0}}>Engagement investment is estimated based on your findings profile, organization size, and Oakwolf’s standard advisory and analyst resource model. Remediation scope and final cost are confirmed following the Phase 1 assessment. Return estimates reflect Oakwolf observations across comparable health system engagements and are illustrative — actual results vary.</p>
            </div>
          );
        })()}
        <div style={{ background:'white', border:'1.5px solid #E5E3DE', borderRadius:'20px', padding:'1.75rem', marginBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h3 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.1rem', color:'#0F1F3D', fontWeight:'400', margin:'0 0 4px' }}>Track your progress over time</h3>
            <p style={{ fontSize:'0.825rem', color:'#6B6977', margin:0 }}>Retake this benchmark in 90 days to see how your maturity has improved.</p>
          </div>
          <button onClick={() => router.push('/retake')} style={{ background:'white', border:'1.5px solid #0F1F3D', borderRadius:'10px', padding:'0.75rem 1.25rem', fontWeight:'600', fontSize:'0.875rem', color:'#0F1F3D', cursor:'pointer', fontFamily:'DM Sans, sans-serif', whiteSpace:'nowrap' }}>
            Retake Benchmark →
          </button>
        </div>


        {/* Vendor Benchmark CTA */}
        <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'20px', padding:'1.75rem', marginBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <div>
            <h3 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.1rem', color:'#0F1F3D', fontWeight:'400', margin:'0 0 4px' }}>How does your current setup compare?</h3>
            <p style={{ fontSize:'0.825rem', color:'#6B6977', margin:0 }}>Benchmark your internal team or current vendor against Oakwolf in 10 questions.</p>
          </div>
          <button onClick={() => router.push(`/vendor-benchmark?uuid=${uuid}`)} style={{ background:'linear-gradient(135deg, #0D9488, #0F766E)', border:'none', color:'white', borderRadius:'10px', padding:'0.75rem 1.25rem', fontWeight:'600', fontSize:'0.875rem', cursor:'pointer', fontFamily:'DM Sans, sans-serif', whiteSpace:'nowrap' }}>
            Benchmark Your Vendor or Internal FTE Team →
          </button>
        </div>

        <div style={{ background:'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius:'20px', padding:'2.5rem', textAlign:'center' }}>
          <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.6rem', color:'white', fontWeight:'400', marginBottom:'0.75rem' }}>Want a deeper breakdown?</h2>
          <p style={{ color:'rgba(255,255,255,0.7)', marginBottom:'1.75rem', fontSize:'0.9rem', lineHeight:'1.6' }}>Schedule a working session with Oakwolf to review your full results, quick wins, and a prioritized roadmap.</p>
          <a href="mailto:hello@oakwolfgroup.com?subject=Epic Security Benchmark Follow-Up" style={{ display:'inline-block', background:'white', color:'#2563EB', fontWeight:'700', padding:'0.875rem 2rem', borderRadius:'10px', textDecoration:'none', fontSize:'0.9rem' }}>
            Schedule a Discussion →
          </a>
        </div>

      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
