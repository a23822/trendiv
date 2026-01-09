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
	category: string;
	analysis_results?: AnalysisResult[];
	represent_result?: AnalysisResult | null;
	content?: string;
}

export interface Bookmark {
	id: number;
	user_id: string;
	article_url: string;
	article_title: string;
	article_image?: string;
	article_source?: string;
	article_date?: string;
	created_at: string;
}
