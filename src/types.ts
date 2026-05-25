export interface TranscriptEntity {
  id: string;
  originalText: string;
  translatedText: string;
  isFinal: boolean;
  timestamp: number;
  detectedLanguage?: string;
  translations?: { language: string; text: string }[];
}

export interface SavedSession {
  id: string;
  timestamp: number;
  transcripts: TranscriptEntity[];
  title: string;
}
