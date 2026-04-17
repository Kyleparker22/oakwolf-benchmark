'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SECTIONS } from '@/data/questions';
import { saveContext, submitResponses, runScoring } from '@/lib/api';



const TOTAL_QUESTIONS = 28;

const QUESTION_HINTS: Record<string, string> = {
  Q1: "Count users provisioned automatically via IAM rules vs. those requiring manual tickets or admin action.",
  Q2: "Think about your most common provisioning scenario — a new nurse hire, a new physician, a transfer. What actually happens step by step?",
  Q3: "From the moment HR terminates in your source system to when Epic access is disabled. Include weekends and after-hours if relevant.",
  Q4: "Pull an AD vs. Epic account status report. Any account disabled in AD but still active in Epic counts as a mismatch.",
  Q5: "Count the distinct security templates or roles on a typical user account. Most health systems average 2–4; best practice is 1 well-designed role.",
  Q6: "Exceptions include any access granted outside a standard template — break-glass, temporary, manually added subtemplate, or one-off request.",
  Q7: "Standardized means the same job code gets the same template every time, across all sites and departments.",
  Q8: "Duplicate roles have the same or near-identical permissions. Overlapping roles grant the same access through different paths.",
  Q9: "Managed through IAM means the account lifecycle is controlled by your IAM platform, not manual processes.",
  Q10: "Fully automated means HR events automatically trigger the correct Epic access change with no human intervention.",
  Q11: "Providers often have different onboarding paths than staff. Count how many steps still require a human to intervene.",
  Q12: "Consistent enforcement means IAM assigns the same role every time for the same job code — no exceptions, no manual overrides.",
  Q13: "SSO users authenticate through your identity provider rather than entering an Epic username and password directly.",
  Q14: "Native auth users log in directly to Epic with an Epic username and password, bypassing your SSO layer entirely.",
  Q15: "Fully enforced means no user can access Epic without completing MFA — no exceptions for service accounts or legacy workflows.",
  Q16: "Always means no Epic access is granted until training completion is verified in your LMS or ATAT.",
  Q17: "Aligned means the training assigned matches the actual Epic access and workflows for that role.",
  Q18: "Run an ATAT report or cross-reference your LMS with active Epic users. Any active user with incomplete required training counts.",
  Q19: "Access reviews require managers to affirm or remove user access. Quarterly is best practice for high-risk access.",
  Q20: "Anomalous access monitoring includes unusual login times, access outside a user normal patient population, or bulk record access.",
  Q21: "Comprehensive logging means you can answer who accessed what, when, from where — with reports available on demand.",
  Q22: "Clear ownership means there is a named person or team responsible for Epic Security decisions and accountability.",
  Q23: "Formal governance includes a defined process for access requests, approvals, reviews, and exceptions — documented and consistently followed.",
  Q24: "Formal process means access changes go through an approval workflow with documentation. Ad hoc means changes happen via email or verbal request.",
  Q25: "Fully aligned means HR terminations automatically trigger IAM deprovisioning which automatically disables Epic access — no manual handoffs.",
  Q26: "Reactive means the team spends most of its time on tickets and urgent fixes. Proactive means time is spent on improvement initiatives.",
  Q27: "Optimization initiatives include role cleanup, process improvement, governance program builds, and automation projects.",
  Q28: "Be honest about where the team actually operates day-to-day, not where you aspire to be.",
};

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
    if (!allAnswered) { setError('Please answer all questions before submitting.'); return; }
    setLoading(true); setError('');
    try {
      const responses = Object.entries(answers).map(([question_id, selected_answer]) => ({ question_id, selected_answer }));
      await submitResponses(uuid, responses);
      await runScoring(uuid);
      router.push(`/results?uuid=${uuid}&mode=external`);
    } catch (e: any) { setError(e?.response?.data?.detail || 'Submission failed.'); }
    setLoading(false);
  };

  const NavBar = () => (
    <div style={{ background: '#0F1F3D', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #2563EB, #0D9488)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <span style={{ color: 'white', fontWeight: '700', fontSize: '0.95rem', letterSpacing: '0.05em' }}>OAKWOLF</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Internal Assessment</span>
      </div>
      <button onClick={() => router.push('/internal/dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '0.4rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
        ← Dashboard
      </button>
    </div>
  );

  const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.75rem', marginBottom: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };
  const answerBtn = (selected: boolean): React.CSSProperties => ({
    width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '0.5rem',
    border: selected ? '1.5px solid #2563EB' : '1.5px solid #E5E3DE',
    background: selected ? '#EFF6FF' : 'white', color: selected ? '#1D4ED8' : '#374151',
    fontWeight: selected ? '600' : '400', fontSize: '0.9rem', cursor: 'pointer',
    transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
    display: 'flex', alignItems: 'center', gap: '0.75rem',
  });
  const dot = (selected: boolean): React.CSSProperties => ({
    width: '16px', height: '16px', borderRadius: '50%',
    border: selected ? '5px solid #2563EB' : '2px solid #D1D5DB',
    flexShrink: 0, transition: 'all 0.15s',
  });

  if (step === 'context') {
    return (
      <main style={{ minHeight: '100vh', background: '#FAF9F6' }}>
        <NavBar />
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: '#2563EB', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Step 1 of 2</p>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.8rem', color: '#0F1F3D', fontWeight: '400', margin: '0 0 0.5rem' }}>About Your Organization</h1>
            <p style={{ color: '#6B6977', fontSize: '0.875rem', margin: 0 }}>This helps contextualize results. None of these answers affect the score.</p>
          </div>
          <div style={{ width: '100%', height: '4px', background: '#E5E3DE', borderRadius: '99px', marginBottom: '2rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '5%', background: 'linear-gradient(90deg, #2563EB, #0D9488)', borderRadius: '99px' }} />
          </div>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
            {[
              { label: "Organization type", key: "org_type", options: ["Academic Medical Center","Community Health System","Integrated Delivery Network (IDN)","Regional Health System","Specialty Hospital System","Other"] },
              { label: "Number of hospitals", key: "hospital_count", options: ["1","2–5","6–10","11–20","20+"] },
              { label: "Total number of Epic users", key: "user_count", options: ["<500","500–2,000","2,000–5,000","5,000–10,000","10,000+"] },
              { label: "Internal Epic Security FTE team size", key: "epic_security_fte", options: ["0–1 (no dedicated team)","2–3","4–6","7–10","10+"] },
              { label: "Internal IAM FTE team size", key: "iam_fte", options: ["0–1 (no dedicated team)","2–3","4–6","7–10","10+"] },
              { label: "How long have you been live on Epic?", key: "epic_tenure", options: ["<1 year","1–3 years","3–7 years","7+ years"] },
              { label: "Epic hosting model", key: "epic_hosting", options: ["Epic-hosted (Nebula)","Self-hosted (on-premise)","Hybrid (mix of hosted and on-premise)","Cloud-hosted (non-Epic)","Unsure"] },
              { label: "IAM platform in use", key: "iam_platform", options: ["SailPoint","Entra ID / Azure AD","Okta","Homegrown / custom","No formal IAM platform"] },
              { label: "How is Epic Security managed organizationally?", key: "security_model", options: ["Fully centralized team","Mostly centralized with some local control","Hybrid (central + distributed)","Decentralized across regions/entities"] },
              { label: "Primary strategic focus", key: "primary_focus", options: ["Access Training Alignment (ATAT Optimization)","Audit Readiness & Compliance Improvement","Automated Provisioning (IAM Integration)","Break-the-Glass & Privileged Access Controls","End User (EMP) Record Optimization","External Access Security (EpicCare Link, etc.)","Identity Lifecycle Management (Joiner/Mover/Leaver)","M&A / Multi-Instance Security Alignment","Manual Provisioning Cleanup & Reduction","Preparing for Future IAM / Automation","Provider (SER) Record Standardization & Governance","RBAC Standardization & Optimization","Reducing Operational Burden on Security Team","Security Reporting & Visibility (metrics, dashboards)","Security Template / Sub-Template Rationalization","Stabilizing Post-IAM or Post-Epic Environment","User Access Governance & Certification Processes"] },
              { label: "Primary reason for reaching out", key: "strategic_focus", options: ["Audit / Compliance Findings (internal or external)","Epic Upgrade or Major Initiative (new modules, expansion)","Experiencing Access / Provisioning Issues","Exploring Automation Opportunities","General Benchmarking / Curiosity","Leadership Request / Executive Initiative","Mergers, Acquisitions, or Organizational Changes","Post-Go-Live Cleanup / Stabilization (Epic or IAM)","Preparing for Epic Implementation / Go-Live","Preparing for IAM / IGA Implementation (e.g., SailPoint, Imprivata)","Recently Completed IAM / IGA Go-Live (stabilization issues)","Resource Constraints / Team Bandwidth Challenges","Security Incident / Risk Concern"] },
              { label: "Current ticket backlog size", key: "ticket_backlog", options: ["0-10 tickets","11-25 tickets","26-50 tickets","51-100 tickets","100+ tickets","Unknown / not tracked"] },
              { label: "Average inbound requests / tickets per week", key: "tickets_per_week", options: ["Less than 10 per week","10-25 per week","26-50 per week","51-100 per week","100+ per week","Unknown / not tracked"] },
            ].map(({ label, key, options }) => (
              <div key={key} style={{ ...cardStyle, padding: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>{label}</label>
                <select style={{ width: '100%', border: '1.5px solid #E5E3DE', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#0F1F3D', background: 'white', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                  value={context[key] || ''} onChange={e => setContext(p => ({ ...p, [key]: e.target.value }))}>
                  <option value="">Select...</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: '0.85rem', padding: '0.75rem', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>All fields optional</span>
            <button onClick={handleContextNext} disabled={loading} style={{ background: loading ? '#E5E3DE' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: loading ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.875rem 2rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
              {loading ? 'Saving...' : 'Continue to Benchmark →'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAF9F6' }}>
      <NavBar />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: '#2563EB', textTransform: 'uppercase', margin: '0 0 4px' }}>Section {currentSection + 1} of {SECTIONS.length}</p>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.6rem', color: '#0F1F3D', fontWeight: '400', margin: 0 }}>{section.title}</h2>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#6B6977', fontWeight: '500' }}>{answeredCount} / {TOTAL_QUESTIONS}</span>
        </div>
        <div style={{ width: '100%', height: '4px', background: '#E5E3DE', borderRadius: '99px', marginBottom: '2rem', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2563EB, #0D9488)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
        </div>
        {section.questions.map(q => (
          <div key={q.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.75rem' }}>
              <p style={{ fontWeight: '500', color: '#0F1F3D', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, flex: 1 }}>{q.text}</p>
              {QUESTION_HINTS[q.id] && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button onClick={() => setActiveHint(activeHint === q.id ? null : q.id)}
                    style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1.5px solid #D1D5DB', background: activeHint === q.id ? '#EFF6FF' : 'white', color: activeHint === q.id ? '#2563EB' : '#9CA3AF', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>?</button>
                  {activeHint === q.id && (
                    <div style={{ position: 'absolute', right: 0, top: '30px', width: '280px', background: '#0F1F3D', borderRadius: '10px', padding: '0.875rem', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', lineHeight: '1.6', margin: 0 }}>{QUESTION_HINTS[q.id]}</p>
                      <div style={{ position: 'absolute', top: '-6px', right: '8px', width: '12px', height: '12px', background: '#0F1F3D', transform: 'rotate(45deg)' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
            {q.answers.map(answer => (
              <button key={answer} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: answer }))} style={answerBtn(answers[q.id] === answer)}>
                <span style={dot(answers[q.id] === answer)} />
                {answer}
              </button>
            ))}
          </div>
        ))}
        {error && <div style={{ color: '#DC2626', fontSize: '0.85rem', padding: '0.75rem', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', marginBottom: '1rem' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button onClick={() => currentSection > 0 && setCurrentSection(p => p - 1)} disabled={currentSection === 0}
            style={{ background: 'none', border: 'none', color: currentSection === 0 ? '#D1D5DB' : '#6B6977', fontWeight: '500', cursor: currentSection === 0 ? 'not-allowed' : 'pointer', padding: '0.75rem 1.25rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
            ← Back
          </button>
          {isLastSection ? (
            <button onClick={handleSubmit} disabled={loading || !allAnswered}
              style={{ background: loading || !allAnswered ? '#E5E3DE' : 'linear-gradient(135deg, #0D9488, #0F766E)', color: loading || !allAnswered ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.875rem 2rem', fontWeight: '600', cursor: loading || !allAnswered ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
              {loading ? 'Submitting...' : 'Submit Benchmark →'}
            </button>
          ) : (
            <button onClick={() => { setCurrentSection(p => p + 1); window.scrollTo(0, 0); }} disabled={!sectionAnswered}
              style={{ background: !sectionAnswered ? '#E5E3DE' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: !sectionAnswered ? '#9CA3AF' : 'white', border: 'none', borderRadius: '10px', padding: '0.875rem 2rem', fontWeight: '600', cursor: !sectionAnswered ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }}>
              Next Section →
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
