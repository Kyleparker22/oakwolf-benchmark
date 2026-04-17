'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SECTIONS } from '@/data/questions';
import { saveContext, submitResponses, runScoring } from '@/lib/api';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TOTAL_QUESTIONS = 28;

function InternalAssessmentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const uuid = params.get('uuid') || '';
  const [step, setStep] = useState<'context' | 'questions'>('context');
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [context, setContext] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeHint, setActiveHint] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/internal/login');
    };
    checkAuth();
  }, []);

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const section = SECTIONS[currentSection];
  const sectionAnswered = section.questions.every(q => answers[q.id]);
  const isLastSection = currentSection === SECTIONS.length - 1;
  const allAnswered = answeredCount === TOTAL_QUESTIONS;

  const handleContextNext = async () => {
    setLoading(true); setError('');
    try { await saveContext(uuid, context); setStep('questions'); }
    catch { setError('Failed to save. Please try again.'); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!allAnswered) { setError('Please answer all questions.'); return; }
    setLoading(true); setError('');
    try {
      const responses = Object.entries(answers).map(([question_id, selected_answer]) => ({ question_id, selected_answer }));
      await submitResponses(uuid, responses);
      await runScoring(uuid);
      router.push(`/internal/results?uuid=${uuid}`);
    } catch (e: any) { setError(e?.response?.data?.detail || 'Submission failed.'); }
    setLoading(false);
  };

  const nav = (
    <div style={{ background: '#0F1F3D', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #2563EB, #0D9488)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <span style={{ color: 'white', fontWeight: '700', fontSize: '0.95rem' }}>OAKWOLF</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Internal Assessment</span>
      </div>
      <button onClick={() => router.push('/internal/dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
        Back to Dashboard
      </button>
    </div>
  );

  const card: React.CSSProperties = { background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.75rem', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };
  const btn = (sel: boolean): React.CSSProperties => ({ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '0.5rem', border: sel ? '1.5px solid #2563EB' : '1.5px solid #E5E3DE', background: sel ? '#EFF6FF' : 'white', color: sel ? '#1D4ED8' : '#374151', fontWeight: sel ? '600' : '400', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.75rem' });
  const dot = (sel: boolean): React.CSSProperties => ({ width: '16px', height: '16px', borderRadius: '50%', border: sel ? '5px solid #2563EB' : '2px solid #D1D5DB', flexShrink: 0 });

  const CONTEXT_QUESTIONS = [
    { label: "Organization type", key: "org_type", options: ["Academic Medical Center","Community Health System","Integrated Delivery Network (IDN)","Regional Health System","Specialty Hospital System","Other"] },
    { label: "Number of hospitals", key: "hospital_count", options: ["1","2-5","6-10","11-20","20+"] },
    { label: "Total Epic users", key: "user_count", options: ["<500","500-2,000","2,000-5,000","5,000-10,000","10,000+"] },
    { label: "Internal Epic Security FTE team size", key: "epic_security_fte", options: ["0-1 (no dedicated team)","2-3","4-6","7-10","10+"] },
    { label: "Internal IAM FTE team size", key: "iam_fte", options: ["0-1 (no dedicated team)","2-3","4-6","7-10","10+"] },
    { label: "How long live on Epic?", key: "epic_tenure", options: ["<1 year","1-3 years","3-7 years","7+ years"] },
    { label: "Epic hosting model", key: "epic_hosting", options: ["Epic-hosted (Nebula)","Self-hosted (on-premise)","Hybrid","Cloud-hosted (non-Epic)","Unsure"] },
    { label: "IAM platform in use", key: "iam_platform", options: ["SailPoint","Entra ID / Azure AD","Okta","Homegrown / custom","No formal IAM platform"] },
    { label: "Epic Security management model", key: "security_model", options: ["Fully centralized team","Mostly centralized","Hybrid (central + distributed)","Decentralized"] },
    { label: "Primary strategic focus", key: "primary_focus", options: ["Access Training Alignment (ATAT Optimization)","Audit Readiness & Compliance Improvement","Automated Provisioning (IAM Integration)","Break-the-Glass & Privileged Access Controls","End User (EMP) Record Optimization","Identity Lifecycle Management (Joiner/Mover/Leaver)","M&A / Multi-Instance Security Alignment","Manual Provisioning Cleanup & Reduction","RBAC Standardization & Optimization","Reducing Operational Burden on Security Team","Security Template / Sub-Template Rationalization","Stabilizing Post-IAM or Post-Epic Environment","User Access Governance & Certification Processes"] },
    { label: "Primary reason for reaching out", key: "strategic_focus", options: ["Audit / Compliance Findings","Epic Upgrade or Major Initiative","Experiencing Access / Provisioning Issues","Exploring Automation Opportunities","General Benchmarking / Curiosity","Leadership Request / Executive Initiative","Mergers, Acquisitions, or Organizational Changes","Post-Go-Live Cleanup / Stabilization","Preparing for Epic Implementation / Go-Live","Preparing for IAM / IGA Implementation","Recently Completed IAM / IGA Go-Live","Resource Constraints / Team Bandwidth Challenges","Security Incident / Risk Concern"] },
              { label: "Current ticket backlog size", key: "ticket_backlog", options: ["0-10 tickets","11-25 tickets","26-50 tickets","51-100 tickets","100+ tickets","Unknown / not tracked"] },
              { label: "Average inbound requests / tickets per week", key: "tickets_per_week", options: ["Less than 10 per week","10-25 per week","26-50 per week","51-100 per week","100+ per week","Unknown / not tracked"] },
  ];

  if (step === 'context') {
    return (
      <main style={{ minHeight: '100vh', background: '#FAF9F6' }}>
        {nav}
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: '#2563EB', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Step 1 of 2</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.8rem', color: '#0F1F3D', fontWeight: '400', margin: '0 0 0.5rem' }}>About the Organization</h1>
          <p style={{ color: '#6B6977', fontSize: '0.875rem', margin: '0 0 2rem' }}>None of these answers affect the score.</p>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
            {CONTEXT_QUESTIONS.map(({ label, key, options }) => (
              <div key={key} style={{ ...card, padding: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>{label}</label>
                <select style={{ width: '100%', border: '1.5px solid #E5E3DE', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#0F1F3D', background: 'white', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                  value={context[key] || ''} onChange={e => setContext(p => ({ ...p, [key]: e.target.value }))}>
                  <option value="">Select...</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: '0.85rem', padding: '0.75rem', background: '#FEF2F2', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleContextNext} disabled={loading} style={{ background: loading ? '#E5E3DE' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: loading ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.875rem 2rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {loading ? 'Saving...' : 'Continue to Benchmark'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF9F6' }}>
      {nav}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: '#2563EB', textTransform: 'uppercase', margin: '0 0 4px' }}>Section {currentSection + 1} of {SECTIONS.length}</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.6rem', color: '#0F1F3D', fontWeight: '400', margin: 0 }}>{section.title}</h2>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#6B6977' }}>{answeredCount} / {TOTAL_QUESTIONS}</span>
        </div>
        <div style={{ width: '100%', height: '4px', background: '#E5E3DE', borderRadius: '99px', marginBottom: '2rem', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2563EB, #0D9488)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
        </div>
        {section.questions.map(q => (
          <div key={q.id} style={card}>
            <p style={{ fontWeight: '500', color: '#0F1F3D', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 1rem' }}>{q.text}</p>
            {q.answers.map(answer => (
              <button key={answer} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: answer }))} style={btn(answers[q.id] === answer)}>
                <span style={dot(answers[q.id] === answer)} />
                {answer}
              </button>
            ))}
          </div>
        ))}
        {error && <div style={{ color: '#DC2626', fontSize: '0.85rem', padding: '0.75rem', background: '#FEF2F2', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button onClick={() => currentSection > 0 && setCurrentSection(p => p - 1)} disabled={currentSection === 0}
            style={{ background: 'none', border: 'none', color: currentSection === 0 ? '#D1D5DB' : '#6B6977', fontWeight: '500', cursor: currentSection === 0 ? 'not-allowed' : 'pointer', padding: '0.75rem 1.25rem', fontFamily: 'DM Sans, sans-serif' }}>
            Back
          </button>
          {isLastSection ? (
            <button onClick={handleSubmit} disabled={loading || !allAnswered}
              style={{ background: loading || !allAnswered ? '#E5E3DE' : 'linear-gradient(135deg, #0D9488, #0F766E)', color: loading || !allAnswered ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.875rem 2rem', fontWeight: '600', cursor: loading || !allAnswered ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {loading ? 'Submitting...' : 'Submit Benchmark'}
            </button>
          ) : (
            <button onClick={() => { setCurrentSection(p => p + 1); window.scrollTo(0, 0); }} disabled={!sectionAnswered}
              style={{ background: !sectionAnswered ? '#E5E3DE' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: !sectionAnswered ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.875rem 2rem', fontWeight: '600', cursor: !sectionAnswered ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Next Section
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function InternalAssessmentPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <InternalAssessmentForm />
    </Suspense>
  );
}
