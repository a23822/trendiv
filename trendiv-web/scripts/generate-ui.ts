import { GoogleGenerativeAI } from '@google/generative-ai';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

// .env 로드
dotenv.config();

const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// -----------------------------------------------------------
// 🛠️ Figma API 헬퍼 함수
// -----------------------------------------------------------

function parseFigmaUrl(url: string) {
	const fileKeyMatch =
		url.match(/file\/([a-zA-Z0-9]+)/) || url.match(/design\/([a-zA-Z0-9]+)/);
	const nodeIdMatch = url.match(/node-id=([0-9%3A-]+)/);
	if (!fileKeyMatch || !nodeIdMatch) return null;
	return {
		fileKey: fileKeyMatch[1],
		nodeId: nodeIdMatch[1].replace('%3A', ':')
	};
}

async function getFigmaImage(
	fileKey: string,
	nodeId: string
): Promise<Buffer | null> {
	const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=2`;
	const res = await fetch(url, { headers: { 'X-Figma-Token': FIGMA_TOKEN! } });
	/* eslint-disable @typescript-eslint/no-explicit-any */
	const json: any = await res.json();
	const imageUrl = json.images?.[nodeId];
	if (!imageUrl) return null;
	const imgRes = await fetch(imageUrl);
	return Buffer.from(await imgRes.arrayBuffer());
}

async function getFigmaData(fileKey: string, nodeId: string) {
	const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`;
	const res = await fetch(url, { headers: { 'X-Figma-Token': FIGMA_TOKEN! } });
	const json: any = await res.json();
	const node = json.nodes?.[nodeId.replace(':', '%3A')]?.document;
	if (!node) return null;
	return simplifyNode(node);
}

function simplifyNode(node: any): any {
	const simple: any = { type: node.type, name: node.name };
	if (node.fills?.[0]?.color) {
		const { r, g, b } = node.fills[0].color;
		simple.color = `#${Math.round(r * 255)
			.toString(16)
			.padStart(2, '0')}${Math.round(g * 255)
			.toString(16)
			.padStart(2, '0')}${Math.round(b * 255)
			.toString(16)
			.padStart(2, '0')}`;
	}
	if (node.style) simple.style = node.style;
	if (node.layoutMode) {
		simple.layout = {
			mode: node.layoutMode,
			gap: node.itemSpacing,
			padding: node.paddingTop
		};
	}
	if (node.children) simple.children = node.children.map(simplifyNode);
	return simple;
}

// -----------------------------------------------------------
// 🚀 메인 로직
// -----------------------------------------------------------
async function main() {
	if (!FIGMA_TOKEN || !GEMINI_KEY) {
		console.error(
			'❌ API Key가 없습니다. .env 또는 GitHub Secrets를 확인하세요.'
		);
		process.exit(1);
	}

	// 1. Git Root 찾기 (모노레포 루트)
	const gitRoot = path.resolve(__dirname, '../../');

	// 2. 변경된 파일 찾기 (루트 기준 경로 반환됨)
	const output = execSync('git diff --name-only origin/main...HEAD', {
		cwd: gitRoot
	}).toString();

	// 3. 필터링: trendiv-web 내부의 _scaffold.svelte 파일만
	const scaffolds = output.split('\n').filter((line) => {
		const normalized = line.trim().replace(/\\/g, '/');
		return (
			normalized.includes('trendiv-web') &&
			normalized.endsWith('_scaffold.svelte')
		);
	});

	if (scaffolds.length === 0) {
		console.log('🤷 처리할 스캐폴딩 파일이 없습니다.');
		return;
	}

	const genAI = new GoogleGenerativeAI(GEMINI_KEY!);
	const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

	for (const gitPath of scaffolds) {
		// 절대 경로 변환
		const absolutePath = path.join(gitRoot, gitPath);
		if (!fs.existsSync(absolutePath)) continue;

		console.log(`🔥 Processing: ${gitPath}`);
		const content = fs.readFileSync(absolutePath, 'utf-8');

		const figmaMatch = content.match(
			/@figma:\s*(https:\/\/www\.figma\.com\/[^ \n]+)/
		);
		if (!figmaMatch) {
			console.log(`⚠️ 피그마 링크가 없습니다. 스킵.`);
			continue;
		}

		const { fileKey, nodeId } = parseFigmaUrl(figmaMatch[1])!;

		console.log(`   -> Fetching Figma Data...`);
		const imageBuffer = await getFigmaImage(fileKey, nodeId);
		const designSpec = await getFigmaData(fileKey, nodeId);

		const prompt = `
      너는 Svelte5 Runes & Tailwind CSS 전문가야.
      
      [자료 1: 이미지] 첨부된 이미지는 최종 UI야.
      [자료 2: 스펙] 아래 JSON은 정확한 디자인 값(색상, 폰트, 간격)이야. 이걸 준수해.
      ${JSON.stringify(designSpec, null, 2)}
      
      [자료 3: 코드] 아래는 개발자의 의도(변수, 로직)야. 이걸 유지하며 살을 붙여.
      ${content}
      
      [미션]
      위 3가지를 조합해 '_scaffold'가 빠진 파일명의 완성된 Svelte 코드를 작성해.
      설명 없이 코드만 출력해.
    `;

		const parts: any[] = [prompt];
		if (imageBuffer) {
			parts.push({
				inlineData: {
					data: imageBuffer.toString('base64'),
					mimeType: 'image/png'
				}
			});
		}

		console.log(`   -> AI Generating Code...`);
		const result = await model.generateContent(parts);
		let code = result.response.text();
		code = code
			.replace(/```(svelte|html|typescript)?/g, '')
			.replace(/```/g, '');

		const targetPath = absolutePath.replace('_scaffold.svelte', '.svelte');
		fs.writeFileSync(targetPath, code);
		console.log(`✅ Created: ${targetPath}`);
	}
}

main().catch(console.error);
