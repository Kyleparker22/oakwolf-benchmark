'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Internal FTE Team Questions ───────────────────────────────────────────
const FTE_QUESTIONS = [
  {
    id: 'fte1',
    text: 'How many dedicated Epic Security FTEs do you have relative to your Epic user population?',
    answers: [
      { text: '0–1 FTEs for any size org (critically understaffed)', score: 1 },
      { text: '1–2 FTEs for under 2,000 users or 2–3 for 2,000–5,000 users', score: 4 },
      { text: '3–5 FTEs for mid-size or 5–8 for large (adequate)', score: 7 },
      { text: 'Fully staffed with dedicated leads, analysts, and IAM specialists', score: 10 },
    ],
  },
  {
    id: 'fte2',
    text: 'What percentage of your team\'s time is spent on reactive work (tickets, firefighting) vs proactive improvement?',
    answers: [
      { text: 'Mostly reactive — 80%+ of time on tickets and urgent issues', score: 1 },
      { text: 'Majority reactive — about 60–70% reactive', score: 4 },
      { text: 'Balanced — roughly 50/50 reactive vs proactive', score: 7 },
      { text: 'Mostly proactive — team has capacity for strategic improvement', score: 10 },
    ],
  },
  {
    id: 'fte3',
    text: 'How automated is your provisioning and lifecycle management?',
    answers: [
      { text: 'Fully manual — all access requests handled by the team', score: 1 },
      { text: 'Partial automation — IAM handles some workflows, manual for most', score: 4 },
      { text: 'Mostly automated — IAM handles 50–75% of lifecycle events', score: 7 },
      { text: 'Highly automated — 75%+ of provisioning and lifecycle is automated', score: 10 },
    ],
  },
  {
    id: 'fte4',
    text: 'How does your team handle access reviews and certification?',
    answers: [
      { text: 'No formal access reviews — ad hoc or never conducted', score: 1 },
      { text: 'Annual reviews only — typically painful and incomplete', score: 4 },
      { text: 'Semi-annual reviews with reasonable completion rates', score: 7 },
      { text: 'Quarterly reviews with structured process and high completion rate', score: 10 },
    ],
  },
  {
    id: 'fte5',
    text: 'What is your team\'s depth of Epic Security expertise?',
    answers: [
      { text: 'Limited — team is generalist IT, Epic Security is a secondary responsibility', score: 1 },
      { text: 'Moderate — some dedicated Epic Security knowledge but gaps remain', score: 4 },
      { text: 'Good — team has solid Epic Security knowledge with some specialization', score: 7 },
      { text: 'Deep — team includes true SMEs in RBAC, IAM integration, and governance', score: 10 },
    ],
  },
  {
    id: 'fte6',
    text: 'How does your team manage role design and RBAC governance?',
    answers: [
      { text: 'No formal governance — roles accumulate with no cleanup process', score: 1 },
      { text: 'Informal process — some effort but no structured program', score: 4 },
      { text: 'Defined process — role review happens but inconsistently', score: 7 },
      { text: 'Formal governance — structured RBAC program with regular optimization', score: 10 },
    ],
  },
  {
    id: 'fte7',
    text: 'How many unresolved access-related tickets does your team carry week over week?',
    answers: [
      { text: '50+ tickets — team is in constant firefighting mode', score: 1 },
      { text: '25–50 tickets — backlog is persistent and growing', score: 4 },
      { text: '10–25 tickets — manageable but still reactive', score: 7 },
      { text: 'Under 10 tickets — team operates proactively, backlog is minimal', score: 10 },
    ],
  },
  {
    id: 'fte8',
    text: 'How aligned is your Epic Security team with IAM and HR processes?',
    answers: [
      { text: 'Siloed — Epic Security, IAM, and HR operate independently', score: 1 },
      { text: 'Loosely connected — occasional coordination but no formal process', score: 4 },
      { text: 'Mostly aligned — regular touchpoints and some shared processes', score: 7 },
      { text: 'Fully aligned — Epic Security, IAM, and HR operate as an integrated program', score: 10 },
    ],
  },
  {
    id: 'fte9',
    text: 'How does your team approach post-go-live optimization and cleanup?',
    answers: [
      { text: 'No structured approach — issues accumulate over time', score: 1 },
      { text: 'Reactive cleanup — address issues when they become urgent', score: 4 },
      { text: 'Periodic initiatives — occasional cleanup projects', score: 7 },
      { text: 'Continuous improvement — structured optimization program in place', score: 10 },
    ],
  },
  {
    id: 'fte10',
    text: 'Does your team have the capacity to lead strategic Epic Security initiatives?',
    answers: [
      { text: 'No — fully consumed by day-to-day operations', score: 1 },
      { text: 'Rarely — strategic work happens occasionally between fires', score: 4 },
      { text: 'Sometimes — team can lead initiatives with some support', score: 7 },
      { text: 'Yes — team has dedicated capacity for strategic improvement', score: 10 },
    ],
  },
];

// ── Vendor Questions ──────────────────────────────────────────────────────
const VENDOR_QUESTIONS = [
  {
    id: 'v1',
    text: 'Does your current Epic Security vendor lead with a structured assessment before prescribing solutions?',
    answers: [
      { text: 'No — they started work immediately without a structured assessment', score: 1 },
      { text: 'Minimal — brief discovery call but no formal current-state evaluation', score: 4 },
      { text: 'Partial — some assessment activity but not comprehensive', score: 7 },
      { text: 'Yes — formal assessment of current state before any recommendations', score: 10 },
    ],
    oakwolf: 'Oakwolf leads every engagement with a structured assessment — current state → gap analysis → prioritized roadmap — before any implementation work begins.',
  },
  {
    id: 'v2',
    text: 'How does your vendor staff engagements — do they send a "resume pile" for you to sort through, or do they match consultants to the specific role?',
    answers: [
      { text: 'Resume pile — we receive a stack of candidates and have to figure out who is actually capable', score: 1 },
      { text: 'Mostly resume pile with some vetting — still significant client effort to evaluate', score: 4 },
      { text: 'Some pre-vetting — vendor narrows the field but we still evaluate fit ourselves', score: 7 },
      { text: 'Precise matching — consultant is assessed across technical, functional, consultative, and mentorship capabilities before being placed', score: 10 },
    ],
    oakwolf: 'Oakwolf does not send resume piles. Every consultant is assessed across four dimensions — technical depth, functional Epic knowledge, consultative approach, and mentorship capability — so the right person is placed on the right engagement from day one. Managers and directors should not have to sort through a stack of resumes to figure out who is actually capable.',
  },
  {
    id: 'v3',
    text: 'Does your vendor have deep expertise in both Epic Security AND IAM (not just one)?',
    answers: [
      { text: 'Epic Security only — limited IAM depth', score: 1 },
      { text: 'IAM focused — limited Epic-specific knowledge', score: 4 },
      { text: 'Good Epic Security knowledge with some IAM capability', score: 7 },
      { text: 'Deep in both — bridges Epic Security and IAM teams effectively', score: 10 },
    ],
    oakwolf: 'Oakwolf has deep expertise in both Epic Security (RBAC, SER, EMP, templates) and IAM (SailPoint, Imprivata, Entra ID, AD integrations). Most firms know one or the other.',
  },
  {
    id: 'v4',
    text: 'How does your vendor demonstrate value before asking for a project commitment?',
    answers: [
      { text: 'Sales call only — no upfront value before a statement of work', score: 1 },
      { text: 'Generic demo or capabilities presentation', score: 4 },
      { text: 'Some preliminary analysis or findings shared', score: 7 },
      { text: 'Free targeted working session — immediate expertise and insights, no obligation', score: 10 },
    ],
    oakwolf: 'Oakwolf offers free targeted SME working sessions — pressure testing architecture, sharing real-world patterns, and providing immediate value before any commitment.',
  },
  {
    id: 'v5',
    text: 'Does your vendor bring pattern recognition from multiple Epic environments, or treat yours as unique?',
    answers: [
      { text: 'Treats each engagement as unique — no cross-client insights', score: 1 },
      { text: 'Some patterns shared but limited cross-environment experience', score: 4 },
      { text: 'Good cross-client experience — able to benchmark against peers', score: 7 },
      { text: 'Strong pattern recognition — predicts where problems lead before they escalate', score: 10 },
    ],
    oakwolf: "Oakwolf has seen RBAC drift, template sprawl, and manual provisioning failures across dozens of Epic environments. We bring predictive insight — we know where your issues lead if left unaddressed.",
  },
  {
    id: 'v6',
    text: 'Does your vendor focus on post-go-live optimization or primarily implementation?',
    answers: [
      { text: 'Implementation focused — post-go-live support is minimal', score: 1 },
      { text: 'Mostly implementation — some stabilization support', score: 4 },
      { text: 'Balanced — supports both implementation and optimization', score: 7 },
      { text: 'Post-go-live specialists — stabilization, cleanup, and governance is their core', score: 10 },
    ],
    oakwolf: 'Oakwolf focuses heavily on post-go-live reality — stabilization, cleanup, optimization, and governance. This is where real problems surface (6–18 months post go-live) and where most firms fade.',
  },
  {
    id: 'v7',
    text: 'Does your vendor align recommendations to your problems or to Epic modules/features?',
    answers: [
      { text: 'Module-oriented — recommendations organized around Epic features', score: 1 },
      { text: 'Mix — some problem framing but often module-centric', score: 4 },
      { text: 'Mostly problem-oriented — good alignment to business outcomes', score: 7 },
      { text: 'Issue-oriented — fully aligned to executive pain and business outcomes', score: 10 },
    ],
    oakwolf: "Oakwolf organizes around problems and outcomes — not modules. 'Why IAM implementations fail in Epic,' 'Why reporting environments drift,' 'Why Lumens breaks post go-live.'",
  },
  {
    id: 'v8',
    text: 'How accountable is your vendor\'s leadership to your engagement outcomes?',
    answers: [
      { text: 'Low accountability — work managed by project managers, not leaders', score: 1 },
      { text: 'Moderate — leadership involved at kickoff and major milestones', score: 4 },
      { text: 'Good — regular leadership involvement', score: 7 },
      { text: 'High — direct access to leadership, fast decisions, high ownership', score: 10 },
    ],
    oakwolf: 'Oakwolf operates as a lean, senior, high-accountability firm. Clients get direct access to leadership — not bureaucratic escalation paths.',
  },
  {
    id: 'v9',
    text: 'Are your vendor\'s recommendations based on real implementations or generic best practices?',
    answers: [
      { text: 'Mostly theoretical — recommendations based on certifications and frameworks', score: 1 },
      { text: 'Mix — some field experience but heavy reliance on generic best practices', score: 4 },
      { text: 'Mostly field-tested — recommendations grounded in real experience', score: 7 },
      { text: 'Fully field-tested — every recommendation grounded in real Epic environments', score: 10 },
    ],
    oakwolf: 'Every Oakwolf recommendation is based on real implementations, real failures, and real recovery efforts — not generic best practices from a framework document.',
  },
  {
    id: 'v10',
    text: 'How does your vendor\'s Epic Security depth compare to what you actually need?',
    answers: [
      { text: 'Significant gap — vendor lacks depth in critical areas like RBAC, IAM integration, or governance', score: 1 },
      { text: 'Some gaps — adequate for basic work but limited for complex issues', score: 4 },
      { text: 'Good match — covers most needs with some limitations', score: 7 },
      { text: 'Strong match — deep expertise across RBAC, IAM, governance, and Epic-specific security', score: 10 },
    ],
    oakwolf: 'Oakwolf brings deep expertise across SER/EMP/RBAC design, template governance, SailPoint/Imprivata/AD integrations, ATAT alignment, and Epic Security governance frameworks.',
  },
];

function VendorBenchmarkContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sourceUuid = params.get('uuid') || '';

  const [mode, setMode] = useState<'select' | 'fte' | 'vendor' | 'results'>('select');
  const [benchmarkType, setBenchmarkType] = useState<'fte' | 'vendor'>('fte');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const questions = benchmarkType === 'fte' ? FTE_QUESTIONS : VENDOR_QUESTIONS;
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalQ) * 100);
  const currentQuestion = questions[currentQ];
  const allAnswered = answeredCount === totalQ;

  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const maxScore = totalQ * 10;
  const pctScore = Math.round((totalScore / maxScore) * 100);

  const getScoreLabel = (pct: number) => {
    if (pct >= 85) return { label: 'Strong', color: '#0D9488', desc: 'Your current setup demonstrates strong Epic Security capability.' };
    if (pct >= 70) return { label: 'Good', color: '#2563EB', desc: 'Solid foundation with some areas for targeted improvement.' };
    if (pct >= 50) return { label: 'Developing', color: '#D97706', desc: 'Important gaps exist that are creating risk and operational burden.' };
    if (pct >= 30) return { label: 'At Risk', color: '#EA580C', desc: 'Significant gaps are present. A structured improvement program is warranted.' };
    return { label: 'Critical', color: '#DC2626', desc: 'Critical gaps identified. Immediate attention is recommended.' };
  };

  const scoreInfo = getScoreLabel(pctScore);
  const weakAreas = questions.filter(q => (answers[q.id] || 0) <= 4);

  const handleSelect = (qId: string, score: number) => {
    setAnswers(prev => ({ ...prev, [qId]: score }));
    if (currentQ < totalQ - 1) {
      setTimeout(() => setCurrentQ(p => p + 1), 300);
    }
  };

  const startBenchmark = (type: 'fte' | 'vendor') => {
    setBenchmarkType(type);
    setAnswers({});
    setCurrentQ(0);
    setMode(type);
  };

  if (mode === 'select') {
    return (
      <main style={{ minHeight: '100vh', background: '#FAF9F6', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6B6977', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '2rem', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>← Back to Results</button>

          <div style={{ background: 'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius: '20px', padding: '2.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Oakwolf Competitive Intelligence</p>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '2rem', color: 'white', fontWeight: '400', margin: '0 0 0.75rem' }}>How capable is your current setup?</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: '1.7' }}>Benchmark your internal team or current Epic Security vendor against Oakwolf's capabilities, methodology, and delivery standards — in under 5 minutes.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer' }} onClick={() => startBenchmark('fte')}>
              <div style={{ width: '48px', height: '48px', background: '#EFF6FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.25rem', color: '#0F1F3D', fontWeight: '400', margin: '0 0 0.5rem' }}>Internal Team Benchmark</h2>
              <p style={{ fontSize: '0.85rem', color: '#6B6977', lineHeight: '1.6', margin: '0 0 1.5rem' }}>10 questions evaluating your internal Epic Security team's capacity, automation, expertise, and strategic capability relative to your organization size.</p>
              <div style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', borderRadius: '8px', padding: '0.625rem 1.25rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
                Start Team Benchmark →
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer' }} onClick={() => startBenchmark('vendor')}>
              <div style={{ width: '48px', height: '48px', background: '#F0FDF4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.25rem', color: '#0F1F3D', fontWeight: '400', margin: '0 0 0.5rem' }}>Vendor Benchmark</h2>
              <p style={{ fontSize: '0.85rem', color: '#6B6977', lineHeight: '1.6', margin: '0 0 1.5rem' }}>10 questions evaluating your current Epic Security consulting vendor against Oakwolf's methodology, SME depth, and delivery standards.</p>
              <div style={{ background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: 'white', borderRadius: '8px', padding: '0.625rem 1.25rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
                Start Vendor Benchmark →
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (mode === 'results') {
    return (
      <main style={{ minHeight: '100vh', background: '#FAF9F6', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', color: '#6B6977', textTransform: 'uppercase' }}>
              {benchmarkType === 'fte' ? 'Internal Team Assessment' : 'Vendor Assessment'} Results
            </p>
          </div>

          {/* Score card */}
          <div style={{ background: 'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius: '20px', padding: '2.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '5rem', fontWeight: '700', color: scoreInfo.color, lineHeight: 1, marginBottom: '0.25rem', fontFamily: 'DM Serif Display, serif' }}>{pctScore}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontSize: '0.9rem' }}>out of 100</div>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '99px', padding: '0.5rem 1.5rem', color: 'white', fontWeight: '600', marginBottom: '1rem' }}>{scoreInfo.label}</div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>{scoreInfo.desc}</p>
          </div>

          {/* Weak areas */}
          {weakAreas.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.3rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '1rem' }}>Key Gaps Identified</h2>
              {weakAreas.map((q, i) => (
                <div key={q.id} style={{ padding: '1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', marginBottom: '0.75rem' }}>
                  <p style={{ fontWeight: '600', fontSize: '0.875rem', color: '#0F1F3D', margin: '0 0 4px' }}>{q.text}</p>
                  {'oakwolf' in q && (
                    <div style={{ marginTop: '0.5rem', padding: '0.625rem 0.875rem', background: '#EFF6FF', borderRadius: '8px', borderLeft: '3px solid #2563EB' }}>
                      <p style={{ fontSize: '0.78rem', color: '#1D4ED8', margin: 0, lineHeight: '1.6' }}><strong>How Oakwolf approaches this:</strong> {(q as any).oakwolf}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius: '20px', padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: 'white', fontWeight: '400', marginBottom: '0.75rem' }}>
              {pctScore < 70 ? 'Ready to close these gaps?' : 'Want to see how Oakwolf compares?'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: '1.6' }}>
              {pctScore < 70
                ? 'Schedule a working session with Oakwolf to walk through your results and explore what a stronger approach would look like.'
                : 'Schedule a no-obligation working session with Oakwolf — we\'ll share patterns from similar health systems and give you immediate value.'}
            </p>
            <a href="mailto:kparker@oakwolfgroup.com?subject=Vendor Benchmark Results — Scheduling Discussion" style={{ display: 'inline-block', background: 'white', color: '#2563EB', fontWeight: '700', padding: '0.875rem 2rem', borderRadius: '10px', textDecoration: 'none', fontSize: '0.9rem' }}>
              Schedule a Free Working Session →
            </a>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setMode('select')} style={{ flex: 1, padding: '0.875rem', background: 'white', border: '1.5px solid #E5E3DE', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: '#374151' }}>
              Try the Other Benchmark
            </button>
            {sourceUuid && (
              <button onClick={() => router.push(`/results?uuid=${sourceUuid}&mode=external`)} style={{ flex: 1, padding: '0.875rem', background: 'white', border: '1.5px solid #0F1F3D', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: '#0F1F3D' }}>
                Back to My Report
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Questions view
  return (
    <main style={{ minHeight: '100vh', background: '#FAF9F6', padding: '0' }}>
      <div style={{ background: '#0F1F3D', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #2563EB, #0D9488)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>OAKWOLF</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>{benchmarkType === 'fte' ? 'Internal Team Benchmark' : 'Vendor Benchmark'}</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{answeredCount} / {totalQ}</span>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: '#2563EB', textTransform: 'uppercase', margin: '0 0 4px' }}>Question {currentQ + 1} of {totalQ}</p>
          <div style={{ width: '100%', height: '4px', background: '#E5E3DE', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2563EB, #0D9488)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.75rem', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ fontWeight: '500', color: '#0F1F3D', fontSize: '1rem', lineHeight: '1.6', margin: '0 0 1.5rem' }}>{currentQuestion.text}</p>
          {currentQuestion.answers.map((answer, i) => {
            const selected = answers[currentQuestion.id] === answer.score;
            return (
              <button key={i} onClick={() => handleSelect(currentQuestion.id, answer.score)}
                style={{ width: '100%', textAlign: 'left', padding: '0.875rem 1rem', borderRadius: '10px', marginBottom: '0.5rem', border: selected ? '1.5px solid #2563EB' : '1.5px solid #E5E3DE', background: selected ? '#EFF6FF' : 'white', color: selected ? '#1D4ED8' : '#374151', fontWeight: selected ? '600' : '400', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.15s' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: selected ? '5px solid #2563EB' : '2px solid #D1D5DB', flexShrink: 0, transition: 'all 0.15s' }} />
                {answer.text}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => currentQ > 0 && setCurrentQ(p => p - 1)} disabled={currentQ === 0}
            style={{ background: 'none', border: 'none', color: currentQ === 0 ? '#D1D5DB' : '#6B6977', fontWeight: '500', cursor: currentQ === 0 ? 'not-allowed' : 'pointer', padding: '0.75rem 1.25rem', fontFamily: 'DM Sans, sans-serif' }}>
            ← Back
          </button>
          {currentQ === totalQ - 1 ? (
            <button onClick={() => setMode('results')} disabled={!allAnswered}
              style={{ background: !allAnswered ? '#E5E3DE' : 'linear-gradient(135deg, #0D9488, #0F766E)', color: !allAnswered ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.875rem 2rem', fontWeight: '600', cursor: !allAnswered ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              See My Results →
            </button>
          ) : (
            <button onClick={() => setCurrentQ(p => p + 1)} disabled={!answers[currentQuestion.id]}
              style={{ background: !answers[currentQuestion.id] ? '#E5E3DE' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: !answers[currentQuestion.id] ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.875rem 2rem', fontWeight: '600', cursor: !answers[currentQuestion.id] ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Next →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VendorBenchmarkPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <VendorBenchmarkContent />
    </Suspense>
  );
}
