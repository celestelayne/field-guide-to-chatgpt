export type Topic = {
  id: string;
  label: string;
};

export type Conversation = {
  id: string;
  title: string;
  date: string; // ISO 8601
  topicIds: string[]; // multi-label — a conversation can span topics
  messages: number;
  model: string | null;
  /** Opening user message, truncated. Enough to recognise the conversation. */
  opening: string;
};

export type FieldMapData = {
  topics: Topic[];
  conversations: Conversation[];
};
