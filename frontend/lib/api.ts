import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface Assessment {
  id: number;
  assessment_uuid: string;
  user_type: string;
  report_type: string;
  client_name?: string;
  status: string;
  overall_score_10?: number;
  overall_score_100?: number;
  maturity_level?: string;
  created_at: string;
}

export interface OrgContext {
  org_type?: string;
  hospital_count?: string;
  user_count?: string;
  sites?: string;
  community_connect?: string;
  mna_activity?: string;
  epic_instances?: string;
  security_model?: string;
  iam_alignment?: string;
  team_size?: string;
  iam_platform?: string;
  epic_tenure?: string;
  lifecycle_stage?: string;
  strategic_focus?: string;
  security_priority?: string;
}

export interface QuestionResponse {
  question_id: string;
  selected_answer: string;
  source?: string;
}

export interface DomainScore {
  domain_name: string;
  raw_points: number;
  max_points: number;
  normalized_score: number;
  weight: number;
  weighted_contribution: number;
}

export interface Finding {
  title: string;
  severity: string;
  explanation: string;
  business_impact: string;
  visibility_scope: string;
  source_rule: string;
}

export interface ScoreResult {
  assessment_uuid: string;
  overall_score_10: number;
  overall_score_100: number;
  maturity_level: string;
  domain_scores: DomainScore[];
  findings: Finding[];
}

export interface Lead {
  first_name: string;
  last_name: string;
  title: string;
  organization: string;
  email: string;
  phone?: string;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const createAssessment = async (user_type: 'internal' | 'external', client_name?: string) => {
  const res = await api.post('/assessments', { user_type, client_name });
  return res.data as Assessment;
};

export const saveContext = async (uuid: string, context: OrgContext) => {
  const res = await api.post(`/assessments/${uuid}/context`, context);
  return res.data;
};

export const submitResponses = async (uuid: string, responses: QuestionResponse[]) => {
  const res = await api.post(`/assessments/${uuid}/responses`, { responses });
  return res.data;
};

export const runScoring = async (uuid: string) => {
  const res = await api.post(`/assessments/${uuid}/score`);
  return res.data as ScoreResult;
};

export const submitLead = async (uuid: string, lead: Lead) => {
  const res = await api.post(`/assessments/${uuid}/lead`, lead);
  return res.data;
};

export const getResults = async (uuid: string, mode: 'internal' | 'external' = 'external') => {
  const res = await api.get(`/assessments/${uuid}/results?mode=${mode}`);
  return res.data;
};
