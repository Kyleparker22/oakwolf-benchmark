export interface Question {
  id: string;
  text: string;
  domain: string;
  answers: string[];
}

export interface Section {
  title: string;
  questions: Question[];
}

export const SECTIONS: Section[] = [
  {
    title: "Provisioning & Lifecycle Automation",
    questions: [
      { id: "Q1", domain: "Provisioning", text: "What percentage of user provisioning is automated through IAM?", answers: ["75–100%","50–75%","25–50%","0–25%"] },
      { id: "Q2", domain: "Provisioning", text: "How are most users provisioned?", answers: ["Fully automated via IAM","Hybrid (IAM + manual)","Mostly manual","Fully manual"] },
      { id: "Q3", domain: "Provisioning", text: "How quickly are terminated users removed from Epic?", answers: ["<1 hour","Same day","1–3 days","3 days / unknown"] },
      { id: "Q4", domain: "Provisioning", text: "Do you have cases where users are disabled in AD but still active in Epic?", answers: ["Never","Rarely","Sometimes","Frequently"] },
    ]
  },
  {
    title: "RBAC & Security Class Design",
    questions: [
      { id: "Q5", domain: "RBAC", text: "On average, how many templates/roles does a user have?", answers: ["1","2–3","4–6","7+"] },
      { id: "Q6", domain: "RBAC", text: "How often is access granted via exceptions instead of standard roles?", answers: ["Rarely (<10%)","Occasionally (10–30%)","Frequently (30–60%)","Mostly (>60%)"] },
      { id: "Q7", domain: "RBAC", text: "How standardized is your role/template structure?", answers: ["Fully standardized","Mostly standardized","Somewhat inconsistent","Highly inconsistent"] },
      { id: "Q8", domain: "RBAC", text: "Do you have duplicate or overlapping roles/templates?", answers: ["None","Minimal","Moderate","Significant"] },
    ]
  },
  {
    title: "IAM Alignment",
    questions: [
      { id: "Q9",  domain: "IAM", text: "What percentage of users are managed through IAM?", answers: ["75–100%","50–75%","25–50%","0–25%"] },
      { id: "Q10", domain: "IAM", text: "Is user lifecycle (hire/transfer/terminate) fully automated?", answers: ["Fully automated","Mostly automated","Partially automated","Manual"] },
      { id: "Q11", domain: "IAM", text: "How are providers onboarded?", answers: ["Fully automated","Partially automated","Mostly manual","Fully manual"] },
      { id: "Q12", domain: "IAM", text: "Does IAM enforce role-based provisioning consistently?", answers: ["Always","Mostly","Sometimes","Rarely"] },
    ]
  },
  {
    title: "Authentication Controls",
    questions: [
      { id: "Q13", domain: "Authentication", text: "What percentage of users authenticate via SSO?", answers: ["75–100%","50–75%","25–50%","0–25%"] },
      { id: "Q14", domain: "Authentication", text: "Are there users authenticating directly through Epic (native auth)?", answers: ["None","Few","Some","Many"] },
      { id: "Q15", domain: "Authentication", text: "Is MFA enforced for Epic access?", answers: ["Fully enforced","Partially enforced","Limited use","Not enforced"] },
    ]
  },
  {
    title: "Training / ATAT Alignment",
    questions: [
      { id: "Q16", domain: "Training", text: "Is access granted only after training completion?", answers: ["Always","Mostly","Sometimes","Rarely"] },
      { id: "Q17", domain: "Training", text: "How aligned is training (ATAT) to actual job roles?", answers: ["Fully aligned","Mostly aligned","Partially aligned","Poorly aligned"] },
      { id: "Q18", domain: "Training", text: "Are there cases of users with access but no completed training?", answers: ["None","Rare","Some","Frequent"] },
    ]
  },
  {
    title: "Audit & Monitoring",
    questions: [
      { id: "Q19", domain: "Audit", text: "How often are access reviews conducted?", answers: ["Quarterly or more frequent","Bi-annually","Annually","Rarely / Never"] },
      { id: "Q20", domain: "Audit", text: "Do you have monitoring for anomalous or risky access?", answers: ["Advanced monitoring","Basic monitoring","Limited visibility","None"] },
      { id: "Q21", domain: "Audit", text: "How robust is your audit logging/reporting?", answers: ["Comprehensive","Good","Limited","Minimal"] },
    ]
  },
  {
    title: "SER & Governance",
    questions: [
      { id: "Q22", domain: "Governance", text: "Is there clear ownership of Epic Security/IAM?", answers: ["Clearly defined","Mostly defined","Somewhat unclear","No clear ownership"] },
      { id: "Q23", domain: "Governance", text: "Do you have a formal access governance structure?", answers: ["Fully established","Mostly established","Informal","None"] },
      { id: "Q24", domain: "Governance", text: "How are access changes managed?", answers: ["Formal governance process","Semi-structured","Ad hoc","No process"] },
      { id: "Q25", domain: "Governance", text: "How aligned are HR, IAM, and Epic workflows?", answers: ["Fully aligned","Mostly aligned","Some gaps","Highly disconnected"] },
    ]
  },
  {
    title: "Operational Posture",
    questions: [
      { id: "Q26", domain: "Operational", text: "How is your team's workload distributed?", answers: ["Mostly proactive / strategic","Balanced (maintenance + improvement)","Reactive with limited optimization","Mostly reactive (firefighting)"] },
      { id: "Q27", domain: "Operational", text: "How often does your team run optimization initiatives?", answers: ["Continuously","Regularly","Occasionally","Rarely"] },
      { id: "Q28", domain: "Operational", text: "How would you describe your operational maturity?", answers: ["Strategic / forward-looking","Stable","Strained","Firefighting"] },
    ]
  },
];
