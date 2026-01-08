/**
 * Shared Types for Trendiv Analysis Module
 */

export interface AnalysisResult {
  aiModel: string;
  score: number;
  reason: string;
  title_ko: string;
  oneLineSummary: string;
  keyPoints: string[];
  tags: string[];
  analyzedAt: string;
  content?: string;
}

export interface Trend {
  id: number;
  title: string;
  link: string;
  date: string;
  source: string;
  category: string;
  analysis_results?: AnalysisResult[];
  content?: string;
}

export interface PipelineResult extends AnalysisResult {
  id: number;
  originalLink: string;
  date: string;
}

export interface GeminiAnalysisResponse {
  score: number;
  reason: string;
  title_ko: string;
  oneLineSummary: string;
  keyPoints: string[];
  tags: string[];
}

export type ContentType = 'youtube' | 'webpage';

export interface ContentFetchResult {
  content: string;
  type: ContentType;
  source: 'transcript' | 'description' | 'webpage';
}
