# 1. 베이스 이미지 선택 (이미 브라우저가 다 설치된 요리 도구 세트)
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

# 2. 작업 폴더 생성 (주방 도마 깔기)
WORKDIR /app

# 3. pnpm 설치 (요리 도구 준비)
# Node.js 표준 패키지 매니저 대신 우리는 pnpm을 씁니다.
RUN npm install -g pnpm

# 4. 프로젝트 설정 파일 복사 (재료 목록 확인)
# 소스 코드를 다 넣기 전에, '어떤 라이브러리가 필요한지' 먼저 확인합니다.
# (이 순서가 중요한 이유는 도커의 캐싱 기능을 이용해 빌드 속도를 높이기 위함입니다)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 5. 모든 모듈의 의존성 설치 (장보기)
# 모노레포 전체의 패키지를 한 번에 설치합니다.
# --frozen-lockfile: 버전이 맘대로 바뀌지 않게 락파일 그대로 설치
COPY trendiv-pipeline-controller/package.json ./trendiv-pipeline-controller/
COPY trendiv-scraper-module/package.json ./trendiv-scraper-module/
COPY trendiv-analysis-module/package.json ./trendiv-analysis-module/
COPY trendiv-result-module/package.json ./trendiv-result-module/
COPY trendiv-code-reviewer-module/package.json ./trendiv-code-reviewer-module/

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 6. 전체 소스 코드 복사 (재료 손질)
COPY . .

# 7. 빌드 실행 (이미지 생성 단계에서 미리 JS로 변환)
# trendiv-pipeline-controller만 빌드하거나, 모노레포 전체를 빌드합니다.
# 안전하게 전체 의존성을 고려하여 파이프라인 컨트롤러를 빌드합니다.
RUN pnpm --filter trendiv-pipeline-controller build

# 8. 포트 열기 (서빙 구멍 뚫기)
# Pipeline Controller (3000), Code Reviewer (3004)
EXPOSE 3000 3004

# 9. 실행 명령어 (요리 내가기)
# 기본적으로 파이프라인 컨트롤러를 실행합니다.
WORKDIR /app/trendiv-pipeline-controller
CMD ["pnpm", "start"]