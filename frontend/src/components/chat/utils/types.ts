export interface Source {
  modelId: string;
  collectionName: string;
  filename: string;
  source?: string;
  similarity: number;
}

export interface MongoDBId {
  $oid: string;
}

export interface MongoDBDate {
  $date: string;
}

export interface MessageFile {
  name: string;
  data: string;
  mediaType: string;
  size: number;
  content?: string;
}

export interface Message {
  id: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: { $date: string };
  images?: { data: string; mediaType: string }[];
  files?: MessageFile[];
  sources?: Source[];
  isImageGeneration?: boolean;
  isComplete?: boolean;
  isEdited?: boolean;
  error?: boolean;
  modelId?: string;
  loading?: boolean;
}

export interface ChatHistory {
  _id: MongoDBId;
  userId: string;
  modelId: string;
  collectionName: string;
  chatname: string;
  messages: Message[];
  updatedAt: MongoDBDate;
  createdAt: MongoDBDate;
  sources: Source[];
  __v: number;
}

export interface Model {
  id: string;
  name: string;
  modelType: 'official' | 'personal' | 'department';
  department?: string;
  createdBy?: string;
}

export interface Usage {
  dailyTokens: number;
  tokenLimit: number;
  remainingTokens: number;
} 