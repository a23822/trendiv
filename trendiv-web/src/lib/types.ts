export interface AnalysisResult {
	aiModel: string;
	score: number;
	reason: string;
	title_ko: string;
	oneLineSummary: string;
	keyPoints: string[];
	tags: string[];
	analyzedAt: string;
}

export interface Trend {
	id: number;
	title: string;
	link: string;
	date: string;
	source: string;

	analysis_results?: AnalysisResult[];
}
