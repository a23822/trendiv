export interface Trend {
	id: number;
	title: string;
	link: string;
	summary: string;
	oneLineSummary: string;
	tags: string[];
	score: number;
	date: string;
	source: string;
	keyPoints?: string[];
	reason?: string;
}
