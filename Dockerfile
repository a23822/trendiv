# 1. 베이스 이미지: Node.js 20버전이 깔린 리눅스를 씁니다.
# (Playwright를 쓰려면 브라우저 호환성이 좋은 이미지가 필요합니다)
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# 2. 작업 폴더 설정: 컨테이너 내부의 /app 폴더에서 일하겠다.
WORKDIR /app

# 3. 패키지 관리자(pnpm) 설치
RUN npm install -g pnpm

# 4. 프로젝트 파일 복사 (내 컴퓨터 -> 도커 컨테이너)
# (모든 모듈을 다 복사해야 서로 import가 가능합니다)
COPY . .

# 5. 의존성 설치 (각 폴더 들어가서 설치)
RUN cd trendiv-pipeline-controller && pnpm install
RUN cd trendiv-scraper-module && pnpm install
RUN cd trendiv-analysis-module && pnpm install
RUN cd trendiv-result-module && pnpm install

# 6. Playwright 브라우저 설치 (스크래퍼, 분석 모듈용)
RUN npx playwright install chromium
RUN npx playwright install-deps

# 7. 실행 명령어 (컨트롤러를 실행하면 됨)
# 작업 디렉토리를 컨트롤러로 이동
WORKDIR /app/trendiv-pipeline-controller

# 서버 실행 (포트 3000)
EXPOSE 3000
CMD ["npx", "ts-node", "src/index.ts"]