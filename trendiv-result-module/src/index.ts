import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';

// 데이터 타입 (분석 모듈과 동일)
interface AnalyzedReport {
  title: string;
  oneLineSummary: string;
  tags: string[];
  score: number;
  techStack?: string[];
  originalLink: string;
}

interface EmailData {
  date: string;
  count: number;
  articles: AnalyzedReport[];
}

export function composeEmailHtml(data: EmailData): string {
  console.log('🎨 이메일 HTML 생성 중...');

  // 1. 템플릿 파일 읽기
  const templatePath = path.join(__dirname, 'template.mjml');
  let mjmlTemplate = fs.readFileSync(templatePath, 'utf-8');

  // 2. MJML은 Handlebars 문법({{...}})을 지원하지 않으므로,
  //    직접 문자열을 조립해서 본문을 만듭니다.

  // 2-1. 기사 목록(Article List) HTML 조립
  const articlesHtml = data.articles
    .map(
      (article) => `
    <mj-section padding="20px">
      <mj-column background-color="#1e1e1e" border-radius="8px" padding="20px">
        <mj-text font-size="12px" font-weight="bold">
          <span style="background-color: #333; color: #4cc9f0; padding: 4px 8px; border-radius: 4px; margin-right: 8px;">SCORE ${
            article.score
          }/10</span>
          ${article.tags
            .map(
              (tag) =>
                `<span style="color: #888; margin-right: 5px;">#${tag}</span>`,
            )
            .join('')}
        </mj-text>
        <mj-text font-size="20px" font-weight="bold" color="#ffffff" padding-top="10px">
          <a href="${
            article.originalLink
          }" style="color: #ffffff; text-decoration: none;">${article.title}</a>
        </mj-text>
        <mj-text color="#bbbbbb" padding-top="10px">
          ${article.oneLineSummary}
        </mj-text>
        <mj-text font-size="12px" color="#666666" padding-top="15px">
          🛠 Stack: ${article.techStack?.join(', ') || 'General'}
        </mj-text>
        <mj-button background-color="#4895ef" color="white" href="${
          article.originalLink
        }" align="left" padding-top="20px" border-radius="6px">
          원문 읽기 →
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section><mj-column><mj-spacer height="20px" /></mj-column></mj-section>
  `,
    )
    .join('\n');

  // 2-2. 템플릿의 반복 구간({{...}})을 조립한 HTML로 교체
  // (단순 문자열 치환을 위해 템플릿을 조금 수정해야 하지만,
  //  여기서는 MJML의 <mj-raw> 태그 위치를 찾아 교체하는 방식을 씁니다)

  // 팁: 복잡한 치환 대신, 헤더/푸터만 남기고 중간을 통째로 갈아끼우는 게 편합니다.
  // 아래 코드는 위 template.mjml의 {{#each}} 부분을 실제 내용으로 바꿉니다.
  const finalMjml = mjmlTemplate
    .replace('{{date}}', data.date)
    .replace('{{count}}', data.count.toString())
    // 미리보기 텍스트
    .replace(
      '{{oneLineSummary}}',
      data.articles[0]?.oneLineSummary || '최신 트렌드',
    )
    // 본문 반복 구간 치환 (정규식으로 {{#each}} ~ {{/each}} 영역을 찾아서 교체)
    .replace(
      /<mj-raw>\s*{{#each articles}}[\s\S]*?{{\/each}}\s*<\/mj-raw>/,
      articlesHtml,
    );

  // 3. MJML -> HTML 변환
  const { html, errors } = mjml2html(finalMjml);

  if (errors.length > 0) {
    console.error('❌ MJML 변환 오류:', errors);
  }

  return html;
}

// 테스트 실행
if (require.main === module) {
  (async () => {
    try {
      // 테스트용 더미 데이터 로드 (아까 만든 analysis_result.json이 있다면 그걸 씀)
      const resultPath = path.resolve(
        __dirname,
        '../../trendiv-analysis-module/src/analysis_result.json',
      );
      let articles: AnalyzedReport[] = [];

      if (fs.existsSync(resultPath)) {
        const rawData = fs.readFileSync(resultPath, 'utf-8');
        // analysis_result.json 구조가 { original: ..., analysis: ... } 형태이므로 변환 필요
        const parsed = JSON.parse(rawData);
        articles = parsed.map((p: any) => ({
          ...p.analysis,
          originalLink: p.original.link,
        }));
      }

      const html = composeEmailHtml({
        date: new Date().toISOString().split('T')[0],
        count: articles.length,
        articles: articles,
      });

      const outputPath = path.join(__dirname, 'preview.html');
      fs.writeFileSync(outputPath, html);
      console.log(`✨ 이메일 HTML 생성 완료! (${outputPath})`);
      console.log('👉 파일을 브라우저에서 열어보세요!');
    } catch (e) {
      console.error(e);
    }
  })();
}
