export type UserRole = 'associate';

export interface User {
  _id: string;
  username: string;
  email: string;
  password?: string;
  createdAt: Date;
}

export interface Controls {
  type: 'probable_options' | 'single_select' | 'structured_form' | 'count_first';
  options: string[];
  fieldDefinitions: FieldDefinition[];
  isCompleted: boolean;
  values?: Record<string, unknown>;
  totalCards?: number;
  cardCount?: number;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  controls?: Controls;
}

export type IncidentStatus = 'Open' | 'Escalated' | 'Resolved';

export interface EscalationDetails {
  reason: string;
  priority: string;
  urgency: string;
  impact: string;
  supportGroup: string;
  description: string;
  createdFor?: string;
}

export interface ResolutionDetails {
  summary: string;
}

export interface Feedback {
  rating: number;
  comment: string;
  submittedAt: Date;
}

export interface Incident {
  _id: string;
  incidentId: string;
  userId: string;
  status: IncidentStatus;
  category: string;
  history: Message[];
  escalationDetails?: EscalationDetails;
  resolutionDetails?: ResolutionDetails;
  feedback?: Feedback;
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMResponse {
  response: string;
  user_probable_options: string[];
  input_card_variables: FieldDefinition[];
  needs_count_first: boolean;
  count_prompt: string;
  total_cards: number;
  should_escalate: boolean;
  escalation_data: EscalationDetails | null;
  should_resolve: boolean;
  category?: string;
}
