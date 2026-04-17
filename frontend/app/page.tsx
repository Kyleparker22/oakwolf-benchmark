'use client';
import { useRouter } from 'next/navigation';
import { createAssessment } from '@/lib/api';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const startBenchmark = async () => {
    setLoading(true);
    try {
      const assessment = await createAssessment('external');
      router.push(`/assessment?uuid=${assessment.assessment_uuid}`);
    } catch (e) {
      alert('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F1F3D 0%, #1A3260 60%, #0F1F3D 100%)', position: 'relative', overflow: 'hidden' }}>

      {/* Background decorations */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Nav */}
      <nav style={{ padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #2563EB, #0D9488)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <img src="/oakwolf-logo.jpg" alt="Oakwolf Group" style={{ height: '180px' }} />
        </div>
        <a href="https://oakwolfgroup.com" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textDecoration: 'none' }}>oakwolfgroup.com</a>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 3rem 2rem', position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

        {/* Left — copy */}
        <div>
          <div style={{ display: 'inline-block', background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '99px', padding: '0.35rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#93C5FD', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Epic Security & IAM Benchmark
          </div>

          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '3.2rem', color: 'white', fontWeight: '400', lineHeight: '1.15', marginBottom: '1.25rem' }}>
            How mature is your<br />
            <span style={{ fontStyle: 'italic', color: '#60A5FA' }}>Epic Security</span><br />
            environment?
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.8', marginBottom: '1rem', fontSize: '1rem' }}>
            Complete Oakwolf's 28-question benchmark and receive an instant maturity score across 8 domains — provisioning, RBAC, IAM, authentication, governance, audit, training, and operational posture.
          </p>

          {/* Value statement */}
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '2.5rem', letterSpacing: '0.02em' }}>
            "Capable of being Strategic. Willing to be Tactical. Committed to being Practical."
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button
              onClick={startBenchmark}
              disabled={loading}
              style={{ padding: '1rem 2.5rem', background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
            >
              {loading ? 'Starting...' : 'Start Free Benchmark →'}
            </button>
            <button
              onClick={() => router.push('/retake')}
              style={{ padding: '1rem 2rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              View Previous Results
            </button>
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {[['28', 'Questions'], ['8', 'Domains'], ['5', 'Maturity Levels'], ['~8 min', 'To complete']].map(([num, label]) => (
              <div key={label}>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#60A5FA', fontFamily: 'DM Serif Display, serif' }}>{num}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — credentials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* About Oakwolf */}
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.75rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: '#0D9488', textTransform: 'uppercase', marginBottom: '0.75rem' }}>About Oakwolf</p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: '1.8', margin: 0 }}>
              Oakwolf Group is a healthcare IT consulting firm specializing in Epic Security, IAM, and enterprise platform optimization. We work with health systems nationwide to close the gap between where their security programs are and where they need to be — with a focus on post-go-live maturity, not just implementation.
            </p>
          </div>

          {/* What we do */}
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.75rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', color: '#0D9488', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Our Epic Security Work</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                'Role design and RBAC standardization across complex IDNs',
                'IAM integration with SailPoint, Entra ID, and Okta',
                'Automated provisioning and lifecycle management',
                'Access governance program design and implementation',
                'Audit readiness and access review program build-out',
                'Epic Security team assessments and capability uplift',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #0D9488)', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.825rem', margin: 0, lineHeight: '1.5' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmark note */}
          <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', margin: 0, lineHeight: '1.6' }}>
              This benchmark is based on Oakwolf's proprietary Epic Security Maturity Model, developed through engagements across health systems of all sizes and types. Results are confidential and used only to deliver your report.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 3rem', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ textAlign: 'center', fontFamily: 'DM Serif Display, serif', fontStyle: 'italic', fontSize: '1.3rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.03em', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          "Capable of being Strategic. Willing to be Tactical. Committed to being Practical."
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', margin: 0 }}>© 2026 Oakwolf Group. All rights reserved.</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', margin: 0 }}>Results are confidential. Contact information is only collected to deliver your report.</p>
        </div>
      </div>
    </main>
  );
}
