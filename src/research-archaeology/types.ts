export type EvidenceAuthor = 'user' | 'assistant' | 'tool';

export type Evidence = {
  conversationId: string;
  messageId: string;
  excerpt: string;
  author: EvidenceAuthor;
  createdAt: string;
};

export type EvidenceBackedItem = {
  id?: string;
  text: string;
  confidence: number;
  evidence: Evidence[];
};

export type TimelineEvent = {
  text: string;
  annotation: string;
  createdAt: string;
  evidence: Evidence[];
};

export type SourceConversation = {
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type ArchaeologyReport = {
  schemaVersion: 1;
  reviewStatus: 'draft' | 'reviewed';
  idea: {
    id: string;
    title: string;
    scope: string;
  };
  checkpoint: EvidenceBackedItem;
  findings: EvidenceBackedItem[];
  decisions: EvidenceBackedItem[];
  rejectedDirections: EvidenceBackedItem[];
  openQuestions: EvidenceBackedItem[];
  timeline: TimelineEvent[];
  sources: SourceConversation[];
};
