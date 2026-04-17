'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const FTE_QUESTIONS = [
  { id: 'fte1', text: 'How many dedicated Epic Security FTEs do you have relative to your Epic user population?', answers: [{ text: '0-1 FTEs for any size org (critically understaffed)', score: 1 },{ text: '1-2 FTEs for under 2,000 users or 2-3 for 2,000-5,000 users', score: 4 },{ text: '3-5 FTEs for mid-size or 5-8 for large (adequate)', score: 7 },{ text: 'Fully staffed with dedicated leads, analysts, and IAM specialists', score: 10 }] },
  { id: 'fte2', text: 'What percentage of your team time is spent on reactive work vs proactive improvement?', answers: [{ text: 'Mostly reactive - 80%+ of time on tickets and urgent issues', score: 1 },{ text: 'Majority reactive - about 60-70% reactive', score: 4 },{ text: 'Balanced - roughly 50/50 reactive vs proactive', score: 7 },{ text: 'Mostly proactive - team has capacity for strategic improvement', score: 10 }] },
  { id: 'fte3', text: 'How automated is your provisioning and lifecycle management?', answers: [{ text: 'Fully manual - all access requests handled by the team', score: 1 },{ text: 'Partial automation - IAM handles some workflows, manual for most', score: 4 },{ text: 'Mostly automated - IAM handles 50-75% of lifecycle events', score: 7 },{ text: 'Highly automated - 75%+ of provisioning and lifecycle is automated', score: 10 }] },
  { id: 'fte4', text: 'How does your team handle access reviews and certification?', answers: [{ text: 'No formal access reviews - ad hoc or never conducted', score: 1 },{ text: 'Annual reviews only - typically painful and incomplete', score: 4 },{ text: 'Semi-annual reviews with reasonable completion rates', score: 7 },{ text: 'Quarterly reviews with structured process and high completion rate', score: 10 }] },
  { id: 'fte5', text: 'What is your team depth of Epic Security expertise?', answers: [{ text: 'Limited - team is generalist IT, Epic Security is a secondary responsibility', score: 1 },{ text: 'Moderate - some dedicated Epic Security knowledge but gaps remain', score: 4 },{ text: 'Good - team has solid Epic Security knowledge with some specialization', score: 7 },{ text: 'Deep - team includes true SMEs in RBAC, IAM integration, and governance', score: 10 }] },
  { id: 'fte6', text: 'How does your team manage role design and RBAC governance?', answers: [{ text: 'No formal governance - roles accumulate with no cleanup process', score: 1 },{ text: 'Informal process - some effort but no structured program', score: 4 },{ text: 'Defined process - role review happens but inconsistently', score: 7 },{ text: 'Formal governance - structured RBAC program with regular optimization', score: 10 }] },
  { id: 'fte7', text: 'How many unresolved access-related tickets does your team carry week over week?', answers: [{ text: '50+ tickets - team is in constant firefighting mode', score: 1 },{ text: '25-50 tickets - backlog is persistent and growing', score: 4 },{ text: '10-25 tickets - manageable but still reactive', score: 7 },{ text: 'Under 10 tickets - team operates proactively, backlog is minimal', score: 10 }] },
  { id: 'fte8', text: 'How aligned is your Epic Security team with IAM and HR processes?', answers: [{ text: 'Siloed - Epic Security, IAM, and HR operate independently', score: 1 },{ text: 'Loosely connected - occasional coordination but no formal process', score: 4 },{ text: 'Mostly aligned - regular touchpoints and some shared processes', score: 7 },{ text: 'Fully aligned - Epic Security, IAM, and HR operate as an integrated program', score: 10 }] },
  { id: 'fte9', text: 'How does your team approach post-go-live optimization and cleanup?', answers: [{ text: 'No structured approach - issues accumulate over time', score: 1 },{ text: 'Reactive cleanup - address issues when they become urgent', score: 4 },{ text: 'Periodic initiatives - occasional cleanup projects', score: 7 },{ text: 'Continuous improvement - structured optimization program in place', score: 10 }] },
  { id: 'fte10', text: 'Does your team have the capacity to lead strategic Epic Security initiatives?', answers: [{ text: 'No - fully consumed by day-to-day operations', score: 1 },{ text: 'Rarely - strategic work happens occasionally between fires', score: 4 },{ text: 'Sometimes - team can lead initiatives with some support', score: 7 },{ text: 'Yes - team has dedicated capacity for strategic improvement', score: 10 }] },
];

const VENDOR_QUESTIONS = [
  { id: 'v1', text: 'Does your current Epic Security vendor lead with a structured assessment before prescribing solutions?', answers: [{ text: 'No - they started work immediately without a structured assessment', score: 1 },{ text: 'Minimal - brief discovery call but no formal current-state evaluation', score: 4 },{ text: 'Partial - some assessment activity but not comprehensive', score: 7 },{ text: 'Yes - formal assessment of current state before any recommendations', score: 10 }], oakwolf: 'Oakwolf leads every engagement with a structured assessment - current state, gap analysis, prioritized roadmap - before any implementation work begins.' },
  { id: 'v2', text: 'How does your vendor staff engagements - do they send a resume pile for you to sort through, or do they precisely match consultants to the role?', answers: [{ text: 'Resume pile - we receive a stack of candidates and have to figure out who is actually capable', score: 1 },{ text: 'Mostly resume pile with some vetting - still significant client effort to evaluate', score: 4 },{ text: 'Some pre-vetting - vendor narrows the field but we still evaluate fit ourselves', score: 7 },{ text: 'Precise matching - consultant is assessed across technical, functional, consultative, and mentorship capabilities before being engaged on your project', score: 10 }], oakwolf: 'Oakwolf does not send resume piles. Every consultant is assessed across four dimensions - technical depth, functional Epic knowledge, consultative approach, and mentorship capability - so the right person is placed on the right engagement from day one. Your managers and directors should not have to sort through a stack of resumes to figure out who is actually capable.' },
  { id: 'v3', text: 'Does your vendor have deep expertise in both Epic Security AND IAM - not just one?', answers: [{ text: 'Epic Security only - limited IAM depth', score: 1 },{ text: 'IAM focused - limited Epic-specific knowledge', score: 4 },{ text: 'Good Epic Security knowledge with some IAM capability', score: 7 },{ text: 'Deep in both - bridges Epic Security and IAM teams effectively', score: 10 }], oakwolf: 'Oakwolf has deep expertise in both Epic Security (RBAC, SER, EMP, templates) and IAM (SailPoint, Imprivata, Entra ID, AD integrations). Most firms know one or the other.' },
  { id: 'v4', text: 'How does your vendor demonstrate value before asking for a project commitment?', answers: [{ text: 'Sales call only - no upfront value before a statement of work', score: 1 },{ text: 'Generic demo or capabilities presentation', score: 4 },{ text: 'Some preliminary analysis or findings shared', score: 7 },{ text: 'Free targeted working session - immediate expertise and insights, no obligation', score: 10 }], oakwolf: 'Oakwolf offers free targeted SME working sessions - pressure testing architecture, sharing real-world patterns, and providing immediate value before any commitment.' },
  { id: 'v5', text: 'Does your vendor bring pattern recognition from multiple Epic environments, or treat yours as unique?', answers: [{ text: 'Treats each engagement as unique - no cross-client insights', score: 1 },{ text: 'Some patterns shared but limited cross-environment experience', score: 4 },{ text: 'Good cross-client experience - able to benchmark against peers', score: 7 },{ text: 'Strong pattern recognition - predicts where problems lead before they escalate', score: 10 }], oakwolf: 'Oakwolf has seen RBAC drift, template sprawl, and manual provisioning failures across dozens of Epic environments. We bring predictive insight - we know where your issues lead if left unaddressed.' },
  { id: 'v6', text: 'Does your vendor focus on post-go-live optimization or primarily implementation?', answers: [{ text: 'Implementation focused - post-go-live support is minimal', score: 1 },{ text: 'Mostly implementation - some stabilization support', score: 4 },{ text: 'Balanced - supports both implementation and optimization', score: 7 },{ text: 'Post-go-live specialists - stabilization, cleanup, and governance is their core', score: 10 }], oakwolf: 'Oakwolf focuses heavily on post-go-live reality - stabilization, cleanup, optimization, and governance. This is where real problems surface (6-18 months post go-live) and where most firms fade.' },
  { id: 'v7', text: 'Does your vendor align recommendations to your problems or to Epic modules and features?', answers: [{ text: 'Module-oriented - recommendations organized around Epic features', score: 1 },{ text: 'Mix - some problem framing but often module-centric', score: 4 },{ text: 'Mostly problem-oriented - good alignment to business outcomes', score: 7 },{ text: 'Issue-oriented - fully aligned to executive pain and business outcomes', score: 10 }], oakwolf: 'Oakwolf organizes around problems and outcomes - not modules. Why IAM implementations fail in Epic. Why reporting environments drift. Why Lumens breaks post go-live.' },
  { id: 'v8', text: 'How accountable is your vendor leadership to your engagement outcomes?', answers: [{ text: 'Low accountability - work managed by project managers, not leaders', score: 1 },{ text: 'Moderate - leadership involved at kickoff and major milestones', score: 4 },{ text: 'Good - regular leadership involvement', score: 7 },{ text: 'High - direct access to leadership, fast decisions, high ownership', score: 10 }], oakwolf: 'Oakwolf operates as a lean, senior, high-accountability firm. Clients get direct access to leadership - not bureaucratic escalation paths.' },
  { id: 'v9', text: 'Are your vendor recommendations based on real implementations or generic best practices?', answers: [{ text: 'Mostly theoretical - recommendations based on certifications and frameworks', score: 1 },{ text: 'Mix - some field experience but heavy reliance on generic best practices', score: 4 },{ text: 'Mostly field-tested - recommendations grounded in real experience', score: 7 },{ text: 'Fully field-tested - every recommendation grounded in real Epic environments', score: 10 }], oakwolf: 'Every Oakwolf recommendation is based on real implementations, real failures, and real recovery efforts - not generic best practices from a framework document.' },
  { id: 'v10', text: 'How does your vendor Epic Security depth compare to what you actually need?', answers: [{ text: 'Significant gap - vendor lacks depth in critical areas like RBAC, IAM integration, or governance', score: 1 },{ text: 'Some gaps - adequate for basic work but limited for complex issues', score: 4 },{ text: 'Good match - covers most needs with some limitations', score: 7 },{ text: 'Strong match - deep expertise across RBAC, IAM, governance, and Epic-specific security', score: 10 }], oakwolf: 'Oakwolf brings deep expertise across SER/EMP/RBAC design, template governance, SailPoint/Imprivata/AD integrations, ATAT alignment, and Epic Security governance frameworks.' },
];

const fmt = (n: number) => '$' + (n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? Math.round(n/1000)+'K' : n.toLocaleString());
const col = (n: number) => n >= 85 ? '#0D9488' : n >= 70 ? '#2563EB' : n >= 50 ? '#D97706' : n >= 30 ? '#EA580C' : '#DC2626';

// ── Vendor Turnover Cost Calculator ──────────────────────────────────────
function TurnoverCalculator() {
  const [billRate, setBillRate] = useState('');
  const [numConsultants, setNumConsultants] = useState('1');
  const [rampWeeks, setRampWeeks] = useState('6');

  const rate = parseFloat(billRate) || 0;
  const count = parseInt(numConsultants) || 1;
  const ramp = parseInt(rampWeeks) || 6;
  const hoursPerWeek = 40;

  const cost3mo = rate * hoursPerWeek * 13 * count;
  const cost6mo = rate * hoursPerWeek * 26 * count;
  const cost12mo = rate * hoursPerWeek * 52 * count;
  const rampCost = rate * hoursPerWeek * ramp * count;
  const productiveAfterRamp3 = Math.max(0, 13 - ramp);
  const productiveAfterRamp6 = Math.max(0, 26 - ramp);
  const wastedRampPct = Math.round((ramp / 13) * 100);

  const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #E5E3DE', borderRadius: '8px', padding: '0.625rem 0.875rem', fontSize: '0.9rem', color: '#0F1F3D', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: 'white' };

  return (
    <div style={{ background: 'linear-gradient(135deg, #1A1A2E, #16213E)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem' }}>
      <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.2rem', color: 'white', fontWeight: '400', margin: '0 0 0.5rem' }}>Wrong-Fit Consultant Cost Calculator</h3>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
        Enter your current bill rate to see exactly how much you are spending — and how much is wasted on ramp time and misaligned delivery — when you have the wrong consultant on your team.
      </p>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Bill Rate / hr</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6B6977', fontSize: '0.9rem' }}>$</span>
            <input style={{ ...inp, paddingLeft: '1.5rem' }} type="number" placeholder="175" value={billRate} onChange={e => setBillRate(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Number of Consultants</label>
          <input style={inp} type="number" min="1" max="20" value={numConsultants} onChange={e => setNumConsultants(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Ramp Time (weeks)</label>
          <select style={{ ...inp, appearance: 'auto' as any }} value={rampWeeks} onChange={e => setRampWeeks(e.target.value)}>
            {['2','3','4','6','8','10','12'].map(w => <option key={w} value={w}>{w} weeks</option>)}
          </select>
        </div>
      </div>

      {rate > 0 ? (
        <>
          {/* Cost bars */}
          <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Total billing cost at {count} consultant{count > 1 ? 's' : ''} x 40 hrs/week</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: '3 Months', total: cost3mo, rampWks: Math.min(ramp, 13), totalWks: 13, color: '#F59E0B' },
              { label: '6 Months', total: cost6mo, rampWks: Math.min(ramp, 26), totalWks: 26, color: '#EF4444' },
              { label: '12 Months', total: cost12mo, rampWks: Math.min(ramp, 52), totalWks: 52, color: '#8B5CF6' },
            ].map(bar => {
              const rampCostBar = rate * hoursPerWeek * bar.rampWks * count;
              const rampPct = Math.round((bar.rampWks / bar.totalWks) * 100);
              return (
                <div key={bar.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: '700', color: bar.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{bar.label}</p>
                  <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'white', margin: '0 0 0.75rem', fontFamily: 'DM Serif Display, serif' }}>{fmt(bar.total)}</p>
                  {/* Stacked bar */}
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: `${rampPct}%`, background: '#EF4444', borderRadius: '99px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                    <span style={{ color: '#EF4444', fontWeight: '600' }}>Ramp: {fmt(rampCostBar)} ({rampPct}%)</span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>Only {bar.totalWks - bar.rampWks} productive weeks</p>
                </div>
              );
            })}
          </div>

          {/* Key insight */}
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1.1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'white', margin: '0 0 4px', fontWeight: '600' }}>
              At ${billRate}/hr, you spend {fmt(rampCost)} on ramp time alone before getting a single productive hour.
            </p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: '1.6' }}>
              Oakwolf consultants are pre-assessed across technical, functional, consultative, and mentorship dimensions before engagement — meaning they are productive from week one, not week {rampWeeks}. The ramp cost above represents money spent waiting for the right person to arrive.
            </p>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', margin: 0 }}>Enter your bill rate above to see the cost breakdown</p>
        </div>
      )}
    </div>
  );
}

// ── FTE Staffing Analyzer ─────────────────────────────────────────────────
function FTEAnalyzer({ answers }: { answers: Record<string, number> }) {
  const [fteCount, setFteCount] = useState('');
  const [userCount, setUserCount] = useState('');
  const [weeklyTickets, setWeeklyTickets] = useState('');

  const ftes = parseFloat(fteCount) || 0;
  const users = parseInt(userCount) || 0;
  const tickets = parseInt(weeklyTickets) || 0;

  // Staffing ratios based on Oakwolf field data:
  // Fully manual: ~1 FTE per 1,500 users
  // Some automation (25%): ~1 FTE per 3,000 users
  // Optimized (~50% automation): ~1 FTE per 5,000 users
  // Fully/Highly Automated (75%+): ~1 FTE per 8,000-10,000 users
  const automationScore = answers['fte3'] || 1;
  const usersPerFTE = automationScore >= 10 ? 9000 : automationScore >= 7 ? 5000 : automationScore >= 4 ? 3000 : 1500;
  const automationLabel = automationScore >= 10 ? 'Fully Automated (75%+)' : automationScore >= 7 ? 'Optimized (~50% automation)' : automationScore >= 4 ? 'Some Automation (25%)' : 'Fully Manual';
  const recFTELow = Math.max(1, Math.ceil(users / (usersPerFTE * 1.1)));
  const recFTEHigh = Math.max(1, Math.ceil(users / (usersPerFTE * 0.9)));
  const staffingGap = ftes > 0 ? recFTELow - ftes : 0;
  const isUnderstaffed = ftes > 0 && ftes < recFTELow;
  const isOverloaded = tickets > 0 && ftes > 0 && (tickets / ftes) > 20;

  // Reactive vs proactive score from answers
  const reactiveScore = answers['fte2'] || 0;
  const reactiveLabel = reactiveScore <= 1 ? '80%+' : reactiveScore <= 4 ? '60-70%' : reactiveScore <= 7 ? '~50%' : '<30%';
  const strategicHoursPerWeek = ftes > 0 ? Math.round(ftes * 40 * (reactiveScore >= 7 ? 0.5 : reactiveScore >= 4 ? 0.35 : 0.15)) : 0;

  const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #E5E3DE', borderRadius: '8px', padding: '0.625rem 0.875rem', fontSize: '0.9rem', color: '#0F1F3D', fontFamily: 'DM Sans, sans-serif', outline: 'none', background: 'white' };

  return (
    <div style={{ background: 'white', border: '1px solid #E5E3DE', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.2rem', color: '#0F1F3D', fontWeight: '400', margin: '0 0 0.5rem' }}>Staffing Gap Analysis</h3>
      <p style={{ fontSize: '0.82rem', color: '#6B6977', marginBottom: '1.5rem', lineHeight: '1.6' }}>Enter your actual numbers to see how your team stacks up against recommended staffing models for your organization size.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Current Epic Security FTEs</label>
          <input style={inp} type="number" placeholder="e.g. 3" value={fteCount} onChange={e => setFteCount(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Total Epic Users</label>
          <input style={inp} type="number" placeholder="e.g. 4000" value={userCount} onChange={e => setUserCount(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#6B6977', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Weekly Tickets / Requests</label>
          <input style={inp} type="number" placeholder="e.g. 45" value={weeklyTickets} onChange={e => setWeeklyTickets(e.target.value)} />
        </div>
      </div>

      {ftes > 0 && users > 0 ? (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {/* Staffing ratio */}
          <div style={{ background: isUnderstaffed ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${isUnderstaffed ? '#FECACA' : '#BBF7D0'}`, borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <p style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0F1F3D', margin: '0 0 2px' }}>Staffing Ratio Assessment</p>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>Recommended: {recFTELow}–{recFTEHigh} FTEs for {users.toLocaleString()} users ({automationLabel}) · You have: {ftes} FTEs</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: isUnderstaffed ? '#FEE2E2' : '#DCFCE7', color: isUnderstaffed ? '#DC2626' : '#16A34A', fontSize: '0.78rem', fontWeight: '700', padding: '0.3rem 0.75rem', borderRadius: '99px' }}>
                {isUnderstaffed ? `${Math.abs(staffingGap)} FTE gap` : 'Adequately staffed'}
              </span>
            </div>
          </div>

          {/* Ticket load */}
          {tickets > 0 && ftes > 0 && (
            <div style={{ background: isOverloaded ? '#FFF7ED' : '#F0FDF4', border: `1px solid ${isOverloaded ? '#FED7AA' : '#BBF7D0'}`, borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <p style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0F1F3D', margin: '0 0 2px' }}>Weekly Ticket Load</p>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>{Math.round(tickets / ftes)} tickets per FTE per week · Healthy target: under 15 per FTE</p>
              </div>
              <span style={{ background: isOverloaded ? '#FEF3C7' : '#DCFCE7', color: isOverloaded ? '#D97706' : '#16A34A', fontSize: '0.78rem', fontWeight: '700', padding: '0.3rem 0.75rem', borderRadius: '99px' }}>
                {isOverloaded ? 'Team is overloaded' : 'Manageable load'}
              </span>
            </div>
          )}

          {/* Strategic capacity */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1rem 1.25rem' }}>
            <p style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0F1F3D', margin: '0 0 2px' }}>Estimated Strategic Capacity</p>
            <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0 0 0.75rem' }}>Based on your reactive/proactive ratio ({reactiveLabel} reactive), your team has approximately:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[
                { label: 'Total team hours/week', value: `${ftes * 40}`, color: '#0F1F3D' },
                { label: 'Hours on reactive work', value: `${Math.round(ftes * 40 * (reactiveScore >= 7 ? 0.5 : reactiveScore >= 4 ? 0.65 : 0.85))}`, color: '#EF4444' },
                { label: 'Strategic hours/week', value: `${strategicHoursPerWeek}`, color: '#2563EB' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'white', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: '700', color: stat.color, margin: '0 0 2px', fontFamily: 'DM Serif Display, serif' }}>{stat.value}</p>
                  <p style={{ fontSize: '0.68rem', color: '#6B7280', margin: 0, lineHeight: '1.4' }}>{stat.label}</p>
                </div>
              ))}
            </div>
            {strategicHoursPerWeek < 20 && (
              <p style={{ fontSize: '0.78rem', color: '#1D4ED8', margin: '0.75rem 0 0', lineHeight: '1.6', fontStyle: 'italic' }}>
                With fewer than 20 strategic hours per week across the team, meaningful improvement initiatives are difficult to sustain. Oakwolf can provide the strategic capacity your team needs without adding permanent headcount.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#F9FAFB', borderRadius: '10px' }}>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>Enter your FTE count and user population above to see your staffing analysis</p>
        </div>
      )}
    </div>
  );
}

function VendorBenchmarkContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sourceUuid = params.get('uuid') || '';
  const [mode, setMode] = useState<'select'|'fte'|'vendor'|'results'>('select');
  const [benchmarkType, setBenchmarkType] = useState<'fte'|'vendor'>('fte');
  const [answers, setAnswers] = useState<Record<string,number>>({});
  const [currentQ, setCurrentQ] = useState(0);

  const questions = benchmarkType === 'fte' ? FTE_QUESTIONS : VENDOR_QUESTIONS;
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalQ) * 100);
  const currentQuestion = questions[currentQ];
  const allAnswered = answeredCount === totalQ;
  const totalScore = Object.values(answers).reduce((a,b) => a+b, 0);
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

  // Contradiction detection for vendor benchmark
  const vendorContradictions: {title: string; explanation: string}[] = [];
  if (benchmarkType === 'vendor') {
    const s = (id: string) => answers[id] || 0;
    // Assessment-first vs immediate start
    if (s('v1') <= 4 && s('v9') >= 7) vendorContradictions.push({ title: 'Recommendations strong but assessment skipped', explanation: 'Strong recommendations are claimed but no formal assessment was conducted. Good recommendations without a structured current-state evaluation are often based on assumptions rather than evidence.' });
    // SME delivery vs resume pile
    if (s('v2') <= 4 && s('v8') >= 7) vendorContradictions.push({ title: 'Leadership accountable but staffing is resume pile', explanation: 'Leadership accountability is reported as high but consultant placement relies on resume piles. True accountability requires knowing exactly who is being placed and why — resume piles undermine this.' });
    // Field-tested but no pattern recognition
    if (s('v9') >= 7 && s('v5') <= 4) vendorContradictions.push({ title: 'Field-tested recommendations but limited pattern recognition', explanation: 'Field-tested recommendations are claimed alongside limited cross-environment pattern recognition. These should be correlated — experience across environments is what makes recommendations truly field-tested.' });
  }

  // Contradiction detection for FTE benchmark
  const fteContradictions: {title: string; explanation: string}[] = [];
  if (benchmarkType === 'fte') {
    const s = (id: string) => answers[id] || 0;
    if (s('fte3') >= 7 && s('fte7') <= 4) fteContradictions.push({ title: 'High automation claimed but large ticket backlog', explanation: 'High lifecycle automation is reported but the team carries a large weekly ticket backlog. Mature automation should significantly reduce inbound tickets. This may indicate automation is partial or limited to certain workflows.' });
    if (s('fte2') >= 7 && s('fte7') <= 4) fteContradictions.push({ title: 'Mostly proactive team but high ticket volume', explanation: 'The team is reported as mostly proactive but carries a heavy ticket backlog. These are inconsistent — a team with proactive capacity typically has ticket volume under control.' });
    if (s('fte5') >= 7 && s('fte6') <= 4) fteContradictions.push({ title: 'Deep expertise but no RBAC governance', explanation: 'Deep Epic Security expertise is claimed but RBAC governance is informal or absent. Teams with genuine depth in Epic Security understand that RBAC governance is foundational — its absence suggests expertise may be concentrated in individuals rather than embedded in programs.' });
    if (s('fte8') >= 7 && s('fte3') <= 4) fteContradictions.push({ title: 'Strong IAM alignment but low automation', explanation: 'Strong alignment between Epic Security, IAM, and HR is reported but lifecycle automation is low. Full alignment should enable automation — if the processes are aligned but still manual, the integration is conceptual rather than technical.' });
  }

  const allContradictions = benchmarkType === 'vendor' ? vendorContradictions : fteContradictions;

  const handleSelect = (qId: string, score: number) => {
    setAnswers(prev => ({ ...prev, [qId]: score }));
    if (currentQ < totalQ - 1) setTimeout(() => setCurrentQ(p => p+1), 300);
  };

  const startBenchmark = (type: 'fte'|'vendor') => {
    setBenchmarkType(type);
    setAnswers({});
    setCurrentQ(0);
    setMode(type);
  };

  if (mode === 'select') {
    return (
      <main style={{ minHeight:'100vh', background:'#FAF9F6', padding:'2rem 1rem' }}>
        <div style={{ maxWidth:'700px', margin:'0 auto' }}>
          <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'#6B6977', cursor:'pointer', fontSize:'0.875rem', marginBottom:'2rem', fontFamily:'DM Sans, sans-serif', padding:0 }}>Back to Results</button>
          <div style={{ background:'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius:'20px', padding:'2.5rem', marginBottom:'1.5rem', textAlign:'center' }}>
            <p style={{ fontSize:'0.72rem', fontWeight:'700', letterSpacing:'0.12em', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', marginBottom:'0.75rem' }}>Oakwolf Competitive Intelligence</p>
            <h1 style={{ fontFamily:'DM Serif Display, serif', fontSize:'2rem', color:'white', fontWeight:'400', margin:'0 0 0.75rem' }}>How capable is your current setup?</h1>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.9rem', margin:0, lineHeight:'1.7' }}>Benchmark your internal team or current Epic Security vendor against Oakwolf in under 5 minutes.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'16px', padding:'2rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', cursor:'pointer' }} onClick={() => startBenchmark('fte')}>
              <div style={{ width:'48px', height:'48px', background:'#EFF6FF', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.25rem', color:'#0F1F3D', fontWeight:'400', margin:'0 0 0.5rem' }}>Internal Team Benchmark</h2>
              <p style={{ fontSize:'0.85rem', color:'#6B6977', lineHeight:'1.6', margin:'0 0 1.5rem' }}>10 questions evaluating your internal Epic Security team capacity, automation, expertise, and strategic capability.</p>
              <div style={{ background:'linear-gradient(135deg, #2563EB, #1D4ED8)', color:'white', borderRadius:'8px', padding:'0.625rem 1.25rem', textAlign:'center', fontWeight:'600', fontSize:'0.875rem' }}>Start Team Benchmark</div>
            </div>
            <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'16px', padding:'2rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', cursor:'pointer' }} onClick={() => startBenchmark('vendor')}>
              <div style={{ width:'48px', height:'48px', background:'#F0FDF4', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.25rem', color:'#0F1F3D', fontWeight:'400', margin:'0 0 0.5rem' }}>Vendor Benchmark</h2>
              <p style={{ fontSize:'0.85rem', color:'#6B6977', lineHeight:'1.6', margin:'0 0 1.5rem' }}>10 questions evaluating your current Epic Security vendor against Oakwolf methodology, SME depth, and delivery standards.</p>
              <div style={{ background:'linear-gradient(135deg, #0D9488, #0F766E)', color:'white', borderRadius:'8px', padding:'0.625rem 1.25rem', textAlign:'center', fontWeight:'600', fontSize:'0.875rem' }}>Start Vendor Benchmark</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (mode === 'results') {
    return (
      <main style={{ minHeight:'100vh', background:'#FAF9F6', padding:'2rem 1rem' }}>
        <div style={{ maxWidth:'760px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <p style={{ fontSize:'0.72rem', fontWeight:'700', letterSpacing:'0.1em', color:'#6B6977', textTransform:'uppercase' }}>{benchmarkType === 'fte' ? 'Internal Team' : 'Vendor'} Assessment Results</p>
          </div>

          {/* Score */}
          <div style={{ background:'linear-gradient(135deg, #0F1F3D, #1A3260)', borderRadius:'20px', padding:'2.5rem', marginBottom:'1.5rem', textAlign:'center' }}>
            <div style={{ fontSize:'5rem', fontWeight:'700', color:scoreInfo.color, lineHeight:1, marginBottom:'0.25rem', fontFamily:'DM Serif Display, serif' }}>{pctScore}</div>
            <div style={{ color:'rgba(255,255,255,0.4)', marginBottom:'1rem', fontSize:'0.9rem' }}>out of 100</div>
            <div style={{ display:'inline-block', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'99px', padding:'0.5rem 1.5rem', color:'white', fontWeight:'600', marginBottom:'1rem' }}>{scoreInfo.label}</div>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.875rem', margin:0 }}>{scoreInfo.desc}</p>
          </div>

          {/* Question-by-question scorecard */}
          <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'16px', padding:'1.75rem', marginBottom:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.2rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'1.25rem' }}>Dimension Scorecard</h3>
            {questions.map((q, i) => {
              const score = answers[q.id] || 0;
              const pct = (score / 10) * 100;
              const c = score >= 7 ? '#0D9488' : score >= 4 ? '#D97706' : '#DC2626';
              const label = score >= 7 ? 'Strong' : score >= 4 ? 'Moderate' : 'Gap';
              return (
                <div key={q.id} style={{ marginBottom: i < questions.length - 1 ? '1rem' : 0, paddingBottom: i < questions.length - 1 ? '1rem' : 0, borderBottom: i < questions.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', marginBottom:'6px' }}>
                    <p style={{ fontSize:'0.82rem', color:'#374151', margin:0, flex:1, lineHeight:'1.5' }}>{q.text}</p>
                    <span style={{ background: score >= 7 ? '#DCFCE7' : score >= 4 ? '#FEF3C7' : '#FEE2E2', color: c, fontSize:'0.68rem', fontWeight:'700', padding:'0.2rem 0.5rem', borderRadius:'99px', flexShrink:0, whiteSpace:'nowrap' }}>{label}</span>
                  </div>
                  <div style={{ height:'5px', background:'#F3F4F6', borderRadius:'99px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:c, borderRadius:'99px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contradictions section */}
          {allContradictions.length > 0 && (
            <div style={{ background:'white', border:'1.5px solid #FDE68A', borderRadius:'16px', padding:'1.75rem', marginBottom:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
                <div style={{ width:'32px', height:'32px', background:'#FEF3C7', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                </div>
                <div>
                  <h3 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.1rem', color:'#0F1F3D', fontWeight:'400', margin:'0 0 2px' }}>Inconsistent Answers Detected</h3>
                  <p style={{ fontSize:'0.78rem', color:'#6B6977', margin:0 }}>Some of your answers appear inconsistent with each other. These are worth examining more closely.</p>
                </div>
              </div>
              {allContradictions.map((c, i) => (
                <div key={i} style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'8px', padding:'0.875rem', marginBottom: i < allContradictions.length-1 ? '0.5rem' : 0 }}>
                  <p style={{ fontWeight:'600', fontSize:'0.85rem', color:'#92400E', margin:'0 0 4px' }}>{c.title}</p>
                  <p style={{ fontSize:'0.8rem', color:'#6B7280', lineHeight:'1.6', margin:0 }}>{c.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {/* FTE-specific: Staffing analyzer */}
          {benchmarkType === 'fte' && <FTEAnalyzer answers={answers} />}

          {/* Vendor-specific: Turnover calculator */}
          {benchmarkType === 'vendor' && <TurnoverCalculator />}

          {/* Vendor-specific: Red flags */}
          {benchmarkType === 'vendor' && weakAreas.length > 0 && (
            <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'16px', padding:'1.75rem', marginBottom:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.2rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'0.5rem' }}>Red Flags Identified</h3>
              <p style={{ fontSize:'0.82rem', color:'#6B6977', marginBottom:'1.25rem' }}>These are warning signs in your current vendor relationship that warrant attention.</p>
              {weakAreas.map((q) => (
                <div key={q.id} style={{ padding:'1rem', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'10px', marginBottom:'0.75rem' }}>
                  <p style={{ fontWeight:'600', fontSize:'0.875rem', color:'#0F1F3D', margin:'0 0 4px' }}>{q.text}</p>
                  {'oakwolf' in q && (
                    <div style={{ marginTop:'0.5rem', padding:'0.625rem 0.875rem', background:'#EFF6FF', borderRadius:'8px', borderLeft:'3px solid #2563EB' }}>
                      <p style={{ fontSize:'0.78rem', color:'#1D4ED8', margin:0, lineHeight:'1.6' }}><strong>How Oakwolf approaches this:</strong> {(q as any).oakwolf}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* FTE-specific: What good looks like */}
          {benchmarkType === 'fte' && (
            <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'16px', padding:'1.75rem', marginBottom:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.2rem', color:'#0F1F3D', fontWeight:'400', marginBottom:'1.25rem' }}>What a High-Performing Team Looks Like</h3>
              {[
                { icon:'⚡', title:'Automation-first lifecycle', desc:'75%+ of provisioning and lifecycle events are handled automatically by IAM. The team reviews exceptions, not every ticket.' },
                { icon:'🎯', title:'Mostly proactive capacity', desc:'Less than 30% of team time on reactive work. Strategic initiatives — role cleanup, governance, optimization — have dedicated capacity.' },
                { icon:'📋', title:'Quarterly access reviews', desc:'Structured certification process with high completion rates, not annual fire drills.' },
                { icon:'🔗', title:'HR, IAM, and Epic aligned', desc:'Joiner/Mover/Leaver events flow automatically from HR through IAM to Epic with no manual handoffs.' },
                { icon:'📉', title:'Ticket backlog under 10/FTE/week', desc:'Team is ahead of the work, not buried in it. Backlog is managed, not growing.' },
              ].map(item => (
                <div key={item.title} style={{ display:'flex', gap:'0.875rem', marginBottom:'0.875rem', alignItems:'flex-start' }}>
                  <span style={{ fontSize:'1.25rem', flexShrink:0 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontWeight:'600', fontSize:'0.875rem', color:'#0F1F3D', margin:'0 0 2px' }}>{item.title}</p>
                    <p style={{ fontSize:'0.8rem', color:'#6B7280', margin:0, lineHeight:'1.6' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
              <div style={{ marginTop:'1.25rem', padding:'1rem', background:'#EFF6FF', borderRadius:'10px', borderLeft:'3px solid #2563EB' }}>
                <p style={{ fontSize:'0.82rem', color:'#1D4ED8', margin:0, lineHeight:'1.6' }}>
                  <strong>Where Oakwolf helps:</strong> If your team does not have the bandwidth to reach this state on their own, Oakwolf can provide the senior Epic Security capacity to drive improvement initiatives without adding permanent headcount.
                </p>
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ background:'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius:'20px', padding:'2rem', textAlign:'center', marginBottom:'1rem' }}>
            <h2 style={{ fontFamily:'DM Serif Display, serif', fontSize:'1.4rem', color:'white', fontWeight:'400', marginBottom:'0.75rem' }}>{pctScore < 70 ? 'Ready to close these gaps?' : 'Want to see how Oakwolf compares?'}</h2>
            <p style={{ color:'rgba(255,255,255,0.7)', marginBottom:'1.5rem', fontSize:'0.875rem', lineHeight:'1.6' }}>Schedule a no-obligation working session with Oakwolf. We will share patterns from similar health systems and give you immediate value.</p>
            <a href="mailto:kparker@oakwolfgroup.com?subject=Benchmark Results - Scheduling Discussion" style={{ display:'inline-block', background:'white', color:'#2563EB', fontWeight:'700', padding:'0.875rem 2rem', borderRadius:'10px', textDecoration:'none', fontSize:'0.9rem' }}>Schedule a Free Working Session</a>
          </div>
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <button onClick={() => setMode('select')} style={{ flex:1, padding:'0.875rem', background:'white', border:'1.5px solid #E5E3DE', borderRadius:'10px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans, sans-serif', color:'#374151' }}>Try the Other Benchmark</button>
            <button onClick={() => router.back()} style={{ flex:1, padding:'0.875rem', background:'white', border:'1.5px solid #0F1F3D', borderRadius:'10px', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans, sans-serif', color:'#0F1F3D' }}>Back to My Report</button>
          </div>
        </div>
      </main>
    );
  }

  // Questions view
  return (
    <main style={{ minHeight:'100vh', background:'#FAF9F6', padding:'0' }}>
      <div style={{ background:'#0F1F3D', padding:'1rem 2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'28px', height:'28px', background:'linear-gradient(135deg, #2563EB, #0D9488)', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ color:'white', fontWeight:'600', fontSize:'0.9rem' }}>OAKWOLF</span>
          <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.8rem' }}>{benchmarkType === 'fte' ? 'Internal Team Benchmark' : 'Vendor Benchmark'}</span>
        </div>
        <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.8rem' }}>{answeredCount} / {totalQ}</span>
      </div>
      <div style={{ maxWidth:'680px', margin:'0 auto', padding:'2rem 1.5rem' }}>
        <div style={{ marginBottom:'1.5rem' }}>
          <p style={{ fontSize:'0.7rem', fontWeight:'700', letterSpacing:'0.1em', color:'#2563EB', textTransform:'uppercase', margin:'0 0 4px' }}>Question {currentQ+1} of {totalQ}</p>
          <div style={{ width:'100%', height:'4px', background:'#E5E3DE', borderRadius:'99px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg, #2563EB, #0D9488)', borderRadius:'99px', transition:'width 0.4s ease' }} />
          </div>
        </div>
        <div style={{ background:'white', border:'1px solid #E5E3DE', borderRadius:'16px', padding:'1.75rem', marginBottom:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ fontWeight:'500', color:'#0F1F3D', fontSize:'1rem', lineHeight:'1.6', margin:'0 0 1.5rem' }}>{currentQuestion.text}</p>
          {currentQuestion.answers.map((answer, i) => {
            const selected = answers[currentQuestion.id] === answer.score;
            return (
              <button key={i} onClick={() => handleSelect(currentQuestion.id, answer.score)}
                style={{ width:'100%', textAlign:'left', padding:'0.875rem 1rem', borderRadius:'10px', marginBottom:'0.5rem', border:selected?'1.5px solid #2563EB':'1.5px solid #E5E3DE', background:selected?'#EFF6FF':'white', color:selected?'#1D4ED8':'#374151', fontWeight:selected?'600':'400', fontSize:'0.875rem', cursor:'pointer', fontFamily:'DM Sans, sans-serif', display:'flex', alignItems:'center', gap:'0.75rem', transition:'all 0.15s' }}>
                <span style={{ width:'16px', height:'16px', borderRadius:'50%', border:selected?'5px solid #2563EB':'2px solid #D1D5DB', flexShrink:0 }} />
                {answer.text}
              </button>
            );
          })}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <button onClick={() => currentQ > 0 && setCurrentQ(p => p-1)} disabled={currentQ === 0}
            style={{ background:'none', border:'none', color:currentQ===0?'#D1D5DB':'#6B6977', fontWeight:'500', cursor:currentQ===0?'not-allowed':'pointer', padding:'0.75rem 1.25rem', fontFamily:'DM Sans, sans-serif' }}>
            Back
          </button>
          {currentQ === totalQ-1 ? (
            <button onClick={() => setMode('results')} disabled={!allAnswered}
              style={{ background:!allAnswered?'#E5E3DE':'linear-gradient(135deg, #0D9488, #0F766E)', color:!allAnswered?'#9CA3AF':'white', border:'none', borderRadius:'10px', padding:'0.875rem 2rem', fontWeight:'600', cursor:!allAnswered?'not-allowed':'pointer', fontFamily:'DM Sans, sans-serif' }}>
              See My Results
            </button>
          ) : (
            <button onClick={() => setCurrentQ(p => p+1)} disabled={!answers[currentQuestion.id]}
              style={{ background:!answers[currentQuestion.id]?'#E5E3DE':'linear-gradient(135deg, #2563EB, #1D4ED8)', color:!answers[currentQuestion.id]?'#9CA3AF':'white', border:'none', borderRadius:'10px', padding:'0.875rem 2rem', fontWeight:'600', cursor:!answers[currentQuestion.id]?'not-allowed':'pointer', fontFamily:'DM Sans, sans-serif' }}>
              Next
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VendorBenchmarkPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>Loading...</div>}>
      <VendorBenchmarkContent />
    </Suspense>
  );
}
