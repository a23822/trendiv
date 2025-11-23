<script lang="ts">
  let email = '';
  let statusMessage = '';
  let isSuccess = false;
  let isLoading = false;

  async function subscribe() {
    if (!email) return;
    
    isLoading = true;
    statusMessage = 'AI 파이프라인에 등록 중...';
    isSuccess = false;

    try {
      // 백엔드 API 호출
      const response = await fetch('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok) {
        isSuccess = true;
        statusMessage = '✅ 구독 완료! 매주 월요일, 최신 웹 트렌드가 도착합니다.';
        email = ''; // 입력창 초기화
      } else {
        isSuccess = false;
        statusMessage = `⚠️ 오류: ${result.error}`;
      }
    } catch (error) {
      isSuccess = false;
      statusMessage = '❌ 서버 연결 실패. (백엔드가 실행 중인지 확인하세요)';
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="container">
  <div class="hero">
    <div class="badge">Weekly Web Trends</div>
    <h1>Trendiv <span style="font-size: 0.6em; color: #888;">(트렌디브)</span></h1>
    <p class="description">
      CSS, HTML 최신 트렌드와 iOS 버그 이슈를<br>
      <strong>&lt;div&gt;</strong> 단위로 분석해 드립니다.
    </p>

    <div class="input-group">
      <input 
        type="email" 
        bind:value={email} 
        placeholder="developer@example.com" 
        disabled={isLoading}
        on:keydown={(e) => e.key === 'Enter' && subscribe()}
      />
      <button on:click={subscribe} disabled={isLoading}>
        {isLoading ? '처리 중...' : '무료 구독하기'}
      </button>
    </div>

    {#if statusMessage}
      <p class="status-msg {isSuccess ? 'success' : 'error'}">
        {statusMessage}
      </p>
    {/if}
  </div>
</main>

<style>
  /* 간단한 스타일링 (다크 모드 느낌) */
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: #111;
    color: #fff;
  }
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    text-align: center;
  }
  .hero {
    max-width: 600px;
    padding: 2rem;
  }
  .badge {
    background-color: #333;
    color: #4cc9f0;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    display: inline-block;
    margin-bottom: 1rem;
    font-weight: bold;
  }
  h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    background: linear-gradient(to right, #4cc9f0, #4895ef);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .description {
    color: #aaa;
    line-height: 1.6;
    margin-bottom: 2rem;
  }
  .highlight {
    color: #fff;
    font-weight: bold;
  }
  .input-group {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  input {
    padding: 12px 20px;
    border-radius: 8px;
    border: 1px solid #333;
    background: #222;
    color: #fff;
    width: 250px;
    font-size: 1rem;
  }
  button {
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    background: #4895ef;
    color: white;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  button:hover {
    background: #4cc9f0;
  }
  button:disabled {
    background: #555;
    cursor: not-allowed;
  }
  .status-msg {
    margin-top: 1.5rem;
    font-weight: 500;
  }
  .success { color: #4cc9f0; }
  .error { color: #ff4d4d; }
</style>