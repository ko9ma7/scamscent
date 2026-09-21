import { intelRecords, shortenerHosts } from './data/intel.js';
import { samples } from './data/samples.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const el = {
  input: $('#scan-input'),
  charCount: $('#char-count'),
  detectedType: $('#detected-type'),
  scanButton: $('#scan-button'),
  clearInput: $('#clear-input'),
  saveHistory: $('#save-history'),
  resultsCard: $('#results-card'),
  emptyState: $('#result-empty-state'),
  loadingState: $('#result-loading-state'),
  loadingMessage: $('#loading-message'),
  resultContent: $('#result-content'),
  intelSearch: $('#intel-search'),
  intelList: $('#intel-list'),
  intelCount: $('#intel-count'),
  historyList: $('#history-list'),
  clearHistory: $('#clear-history'),
  themeToggle: $('#theme-toggle'),
  mobileMenuButton: $('#mobile-menu-button'),
  mobileMenu: $('#mobile-menu'),
  methodDialog: $('#method-dialog'),
  toastRegion: $('#toast-region')
};

const HISTORY_KEY = 'scamscent:history:v1';
const THEME_KEY = 'scamscent:theme:v1';
const MAX_HISTORY = 12;

const signalRules = [
  {
    id: 'urgency',
    title: '시간 압박·긴급성을 강조함',
    description: '생각하거나 별도로 확인할 시간을 줄이는 표현이 감지됐습니다.',
    points: 14,
    severity: 'amber',
    regex: /(긴급|즉시|지금\s*당장|오늘\s*안에|몇\s*시간\s*내|마지막\s*경고|계정.{0,8}(정지|잠금|삭제)|반송|urgent|immediately|act\s*now|within\s*\d+\s*hours?|last\s*warning|suspend(ed|ed)?|account\s*(locked|closed))/i
  },
  {
    id: 'payment',
    title: '결제·송금을 요구함',
    description: '예상하지 못한 비용이나 송금 요구는 별도 채널로 확인하는 것이 좋습니다.',
    points: 18,
    severity: 'red',
    regex: /(결제|송금|입금|수수료|재배송비|벌금|미납|카드\s*결제|wire\s*transfer|payment|pay\s*(now|fee)|fee|invoice|overdue)/i
  },
  {
    id: 'hard-payment',
    title: '추적·취소가 어려운 결제 수단을 요구함',
    description: '기프트카드·암호화폐 등은 사기에서 자주 악용되는 결제 방식입니다.',
    points: 26,
    severity: 'red',
    regex: /(기프트\s*카드|상품권|문화상품권|비트코인|암호화폐|코인\s*지갑|gift\s*card|bitcoin|crypto(currency)?|usdt|ethereum)/i
  },
  {
    id: 'credentials',
    title: '민감한 계정·금융 정보를 요구함',
    description: '비밀번호, 카드정보, 보안코드 등을 메시지 링크에서 입력하라는 요청은 특히 주의해야 합니다.',
    points: 24,
    severity: 'red',
    regex: /(비밀번호|패스워드|카드\s*(번호|정보)|cvv|cvc|주민등록번호|주민번호|계좌\s*비밀번호|password|card\s*(number|information|details)|social\s*security|ssn)/i
  },
  {
    id: 'otp',
    title: '인증번호·보안코드 공유를 요구함',
    description: '일회용 인증번호는 본인 확인용이므로 타인에게 전달하지 않는 것이 원칙입니다.',
    points: 24,
    severity: 'red',
    regex: /(인증번호|인증\s*코드|보안\s*코드|otp|one[- ]time\s*(password|code)|verification\s*code)/i
  },
  {
    id: 'remote',
    title: '원격제어 프로그램 설치를 유도함',
    description: '상대방이 화면이나 기기를 직접 제어할 수 있게 만드는 요구는 매우 높은 위험 신호입니다.',
    points: 30,
    severity: 'red',
    regex: /(원격\s*(지원|제어)|화면\s*공유|anydesk|teamviewer|rustdesk|quickassist|remote\s*(access|desktop|support))/i
  },
  {
    id: 'threat',
    title: '불이익·처벌을 위협함',
    description: '계정 폐쇄, 법적 조치, 체포, 벌금 등을 앞세워 즉각 행동을 유도하는 패턴입니다.',
    points: 18,
    severity: 'amber',
    regex: /(체포|구속|법적\s*조치|고소|벌금|서비스\s*중단|계정\s*폐쇄|arrest|legal\s*action|lawsuit|penalty|fine|account\s*termination)/i
  },
  {
    id: 'reward',
    title: '과도한 보상·당첨을 제안함',
    description: '예상하지 못한 당첨, 고수익, 환급을 미끼로 개인정보나 선결제를 요구하는지 확인하세요.',
    points: 16,
    severity: 'amber',
    regex: /(당첨|경품|무료\s*지급|고수익|원금\s*보장|환급금|상금|winner|won\s+a|prize|guaranteed\s*return|refund\s*waiting)/i
  },
  {
    id: 'secrecy',
    title: '주변에 알리지 말라고 요구함',
    description: '가족·은행·회사 등 제3자의 확인을 차단하려는 표현은 주의 신호입니다.',
    points: 16,
    severity: 'amber',
    regex: /(비밀로|아무에게도\s*말|은행에\s*말하지|직원에게\s*알리지|keep\s*this\s*secret|do\s*not\s*tell|don['’]?t\s*tell)/i
  }
];

const loadingMessages = ['문장 패턴을 분석하는 중…', 'URL 구조를 확인하는 중…', '사전 조사 DB와 대조하는 중…', '행동 권고를 정리하는 중…'];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function extractUrls(text) {
  const matches = text.match(/(?:https?:\/\/|www\.)[^\s<>"'`]+|\b[a-z0-9][a-z0-9.-]+\.(?:com|net|org|io|co|kr|me|info|biz|app|dev|xyz|site|online|shop|top|live|link|click|example)(?:\/[^^\s<>"'`]*)?/gi) || [];
  return [...new Set(matches.map(raw => raw.replace(/[),.;!?\]}]+$/g, '')))];
}

function parseUrl(raw) {
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^www\./i, '')}`;
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function detectInputType(text) {
  const trimmed = text.trim();
  if (!trimmed) return '입력 대기 중';
  const urls = extractUrls(trimmed);
  if (urls.length === 1 && normalizeWhitespace(trimmed).length <= urls[0].length + 18) return 'URL / 도메인';
  if (/^(from|to|subject):/im.test(trimmed) || /보낸\s*사람|제목\s*:/i.test(trimmed)) return '이메일 / 메시지';
  if (urls.length) return `메시지 + URL ${urls.length}개`;
  return '문자 / 메시지';
}

function findIntel(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return intelRecords.find(record => record.host === host) || null;
}

function isIpv4(host) {
  const parts = host.split('.');
  return parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function analyzeUrl(rawUrl) {
  const url = parseUrl(rawUrl);
  if (!url) return { rawUrl, invalid: true, signals: [], host: null, intel: null, facts: {} };

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const signals = [];
  const push = (id, title, description, points, severity = 'amber') => signals.push({ id, title, description, points, severity });

  if (url.protocol === 'http:') push('plain-http', '암호화되지 않은 HTTP 링크', '로그인·결제·개인정보 입력을 요구하는 페이지라면 HTTPS 여부를 특히 확인하세요.', 8, 'amber');
  if (shortenerHosts.has(host)) push('short-url', '단축 URL을 사용함', '최종 목적지 주소가 바로 보이지 않아 실제 이동 도메인을 확인하기 어렵습니다.', 14, 'amber');
  if (isIpv4(host)) push('ip-host', '도메인 대신 IP 주소를 사용함', '일반 소비자 서비스가 숫자 IP 주소로 로그인·결제를 요구하는 경우 추가 확인이 필요합니다.', 20, 'red');
  if (host.startsWith('xn--') || host.includes('.xn--')) push('punycode', 'Punycode/국제화 도메인이 감지됨', '정상적인 국제화 도메인일 수도 있지만, 유사문자 피싱에 악용될 수 있어 실제 표기를 확인해야 합니다.', 18, 'red');
  if (/(secure|verify|verification|login|signin|account|support|wallet|payment|billing|update|confirm)/i.test(host)) push('bait-hostwords', '도메인에 신뢰 유도 키워드가 포함됨', '“secure”, “verify”, “login” 같은 단어는 정상 서비스에서도 쓰이지만 브랜드 사칭 도메인에서도 자주 보입니다.', 9, 'amber');
  if ((host.match(/-/g) || []).length >= 3) push('hyphen-heavy', '도메인에 하이픈이 과도하게 많음', '브랜드명을 조합해 그럴듯한 주소를 만드는 패턴인지 확인하세요.', 7, 'amber');
  const hostParts = host.split('.');
  if (hostParts.length >= 5) push('deep-subdomain', '하위 도메인 단계가 매우 깊음', '주소 앞부분에 익숙한 브랜드명을 넣어 실제 등록 도메인을 숨기는 형태인지 확인하세요.', 8, 'amber');
  if (url.username || url.password) push('url-credentials', 'URL에 사용자정보 표기 문법이 포함됨', '@ 앞부분을 정상 도메인처럼 보이게 만드는 혼동 패턴일 수 있습니다.', 18, 'red');
  if (url.port && !['80','443'].includes(url.port)) push('odd-port', '비표준 네트워크 포트를 사용함', '일반 사용자 대상 로그인·결제 서비스에서 낯선 포트를 쓰는 이유가 있는지 확인하세요.', 10, 'amber');

  const suspiciousTlds = ['zip','mov','click','top','xyz','live','link'];
  const tld = hostParts.at(-1);
  if (suspiciousTlds.includes(tld)) push('tld-caution', '추가 확인이 필요한 도메인 확장자', `.${tld} 자체가 위험하다는 뜻은 아니지만, 메시지 링크라면 서비스의 공식 도메인인지 다시 확인하세요.`, 5, 'amber');

  return {
    rawUrl,
    invalid: false,
    url,
    host,
    signals,
    intel: findIntel(host),
    facts: {
      host,
      protocol: url.protocol.replace(':','').toUpperCase(),
      path: url.pathname || '/',
      shortener: shortenerHosts.has(host),
      known: Boolean(findIntel(host))
    }
  };
}

function getRisk(score) {
  if (score >= 75) return { key: 'critical', label: '매우 높음', className: 'risk-critical' };
  if (score >= 50) return { key: 'high', label: '높음', className: 'risk-high' };
  if (score >= 25) return { key: 'medium', label: '주의', className: 'risk-medium' };
  return { key: 'low', label: '낮음', className: 'risk-low' };
}

function dedupeSignals(signals) {
  const map = new Map();
  signals.forEach(signal => {
    if (!map.has(signal.id)) map.set(signal.id, signal);
  });
  return [...map.values()];
}

function buildAction(signals, urlAnalyses, risk) {
  const ids = new Set(signals.map(s => s.id));
  if (ids.has('remote')) return '원격제어 앱을 설치하지 말고 통화를 종료하세요. 금융기관·기관을 사칭했다면 공식 대표번호를 직접 찾아 별도로 확인하세요.';
  if (ids.has('credentials') || ids.has('otp')) return '링크에서 비밀번호·카드정보·인증번호를 입력하지 마세요. 해당 서비스의 공식 앱이나 직접 입력한 공식 주소에서 계정 상태를 확인하세요.';
  if (ids.has('hard-payment') || ids.has('payment')) return '송금이나 결제를 멈추고, 청구 주체의 공식 연락처를 별도로 찾아 요청이 실제인지 확인하세요.';
  if (urlAnalyses.some(a => a.signals.some(s => s.id === 'short-url'))) return '단축 링크를 바로 열지 말고 최종 목적지 도메인을 확인하세요. 중요한 안내라면 공식 앱이나 홈페이지에서 직접 같은 알림이 있는지 확인하세요.';
  if (risk.key === 'low') return '뚜렷한 위험 신호는 적게 감지됐지만 안전을 보증하는 결과는 아닙니다. 돈·계정·개인정보와 관련된 요청이면 공식 채널로 한 번 더 확인하세요.';
  return '메시지 안 링크를 바로 누르지 말고, 발신자를 별도 채널로 확인한 뒤 공식 홈페이지나 앱에서 같은 요청이 있는지 확인하세요.';
}

function analyze(text) {
  const clean = text.trim();
  const textSignals = signalRules.filter(rule => rule.regex.test(clean)).map(rule => ({
    id: rule.id, title: rule.title, description: rule.description, points: rule.points, severity: rule.severity
  }));

  const urls = extractUrls(clean);
  const urlAnalyses = urls.map(analyzeUrl);
  const urlSignals = urlAnalyses.flatMap(item => item.signals);
  const invalidUrls = urlAnalyses.filter(item => item.invalid);
  if (invalidUrls.length) {
    urlSignals.push({ id: 'invalid-url', title: 'URL 형식을 완전히 해석하지 못함', description: '링크가 잘렸거나 비정상적인 형식일 수 있습니다. 주소를 다시 확인하세요.', points: 6, severity: 'amber' });
  }

  let signals = dedupeSignals([...textSignals, ...urlSignals]);
  let score = Math.min(100, signals.reduce((sum, signal) => sum + signal.points, 0));

  // Multiple independent red flags compound risk, but this is still not a probability.
  const redCount = signals.filter(s => s.severity === 'red').length;
  if (redCount >= 2) score = Math.min(100, score + 8);
  if (urls.length >= 3) {
    signals = dedupeSignals([...signals, { id:'many-links', title:'링크가 여러 개 포함됨', description:'여러 외부 링크로 이동을 유도하는 메시지는 각 목적지를 개별 확인하세요.', points:5, severity:'amber' }]);
    score = Math.min(100, score + 5);
  }

  const risk = getRisk(score);
  const intelHits = urlAnalyses.filter(a => a.intel).map(a => a.intel);
  const action = buildAction(signals, urlAnalyses, risk);

  return {
    score,
    risk,
    signals: signals.sort((a,b) => b.points - a.points),
    urlAnalyses,
    intelHits,
    action,
    inputType: detectInputType(clean),
    checkedAt: new Date().toISOString()
  };
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('ko-KR', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(iso));
  } catch { return ''; }
}

function renderResult(result, options = {}) {
  const { score, risk, signals, urlAnalyses, intelHits, action } = result;
  const primaryUrl = urlAnalyses?.find(item => !item.invalid) || null;
  const signalHtml = signals.length ? signals.map(signal => `
    <div class="signal-item">
      <span class="signal-icon ${signal.severity}">${signal.severity === 'red' ? '!' : '•'}</span>
      <div class="signal-copy"><strong>${escapeHtml(signal.title)}</strong><p>${escapeHtml(signal.description)}</p></div>
      <span class="signal-points">+${signal.points}</span>
    </div>
  `).join('') : `<div class="no-signals">뚜렷한 자동 위험 신호가 감지되지 않았습니다. 그래도 중요한 요청은 공식 채널로 별도 확인하세요.</div>`;

  const intelHtml = intelHits?.length ? `
    <div class="intel-hit">
      <div class="intel-hit-top"><strong>사전 조사 DB 일치</strong><span>${escapeHtml(intelHits[0].host)}</span></div>
      <p><strong>${escapeHtml(intelHits[0].title)}</strong> · ${escapeHtml(intelHits[0].summary)}</p>
    </div>` : (primaryUrl ? `
    <div class="intel-hit" style="background:var(--surface-2);border-color:var(--border)">
      <div class="intel-hit-top"><strong>사전 조사 DB</strong><span style="color:var(--muted)">일치 없음</span></div>
      <p>현재 정적 조사 DB에 등록되지 않은 도메인입니다. 등록되지 않았다는 사실은 안전 신호가 아닙니다.</p>
    </div>` : '');

  const factsHtml = primaryUrl ? `
    <div class="result-section">
      <div class="result-section-title"><h4>URL 확인</h4><span>주소 구조 기준</span></div>
      <div class="domain-facts">
        <div class="domain-fact"><span>호스트</span><strong>${escapeHtml(primaryUrl.facts.host)}</strong></div>
        <div class="domain-fact"><span>프로토콜</span><strong>${escapeHtml(primaryUrl.facts.protocol)}</strong></div>
        <div class="domain-fact"><span>단축 URL</span><strong>${primaryUrl.facts.shortener ? '예' : '아니오'}</strong></div>
        <div class="domain-fact"><span>조사 DB</span><strong>${primaryUrl.facts.known ? '등록됨' : '등록 없음'}</strong></div>
      </div>
    </div>` : '';

  const savedLabel = options.saved ? '저장된 검사 결과' : options.shared ? '공유된 결과 요약' : '분석 완료';
  el.resultContent.innerHTML = `
    <div class="result-content-inner">
      <div class="result-header">
        <div class="result-heading-row">
          <div><h3>${savedLabel}</h3><p>${escapeHtml(result.inputType || '검사 결과')} · ${formatDate(result.checkedAt)}</p></div>
          <div class="result-tools">
            <button type="button" id="copy-result" aria-label="결과 요약 복사" title="결과 요약 복사">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
            </button>
            <button type="button" id="share-result" aria-label="결과 요약 공유" title="민감한 원문 없이 결과 요약 공유">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="6" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="19" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.3 10.8 7.4-4.5M8.3 13.2l7.4 4.5" stroke="currentColor" stroke-width="1.8"/></svg>
            </button>
          </div>
        </div>
        <div class="result-risk">
          <div class="risk-summary ${risk.className}">
            <div><p class="risk-kicker">위험 신호 수준</p><strong>${escapeHtml(risk.label)}</strong></div>
            <div class="risk-score"><span>${score}</span>/100</div>
          </div>
          <p class="result-caveat">점수는 사기 확률이 아니라, 감지된 위험 신호의 누적 강도를 나타냅니다.</p>
        </div>
        ${intelHtml}
      </div>
      <div class="result-section">
        <div class="result-section-title"><h4>감지된 위험 신호</h4><span>${signals.length}개</span></div>
        <div class="signal-list">${signalHtml}</div>
      </div>
      ${factsHtml}
      <div class="result-section">
        <div class="result-section-title"><h4>추천 행동</h4><span>다음 단계</span></div>
        <div class="action-box"><span>→</span><div><strong>지금 이렇게 하세요</strong><p>${escapeHtml(action)}</p></div></div>
      </div>
      <div class="result-bottom-note">ScamScent는 실시간 악성코드 검사·WHOIS·서버 평판 조회를 수행하지 않습니다. 금전 피해가 이미 발생했다면 금융기관 및 관련 기관에 즉시 별도 문의하세요.</div>
    </div>`;

  el.emptyState.hidden = true;
  el.loadingState.hidden = true;
  el.resultContent.hidden = false;
  el.resultsCard.classList.remove('result-empty');

  $('#copy-result')?.addEventListener('click', () => copyResultSummary(result));
  $('#share-result')?.addEventListener('click', () => shareResult(result));
}

function copyResultSummary(result) {
  const lines = [
    `ScamScent 위험 신호 분석: ${result.risk.label} (${result.score}/100)`,
    ...result.signals.slice(0, 5).map(s => `- ${s.title}`),
    `추천 행동: ${result.action}`,
    '※ 자동 위험 신호 분석이며 안전/사기를 확정하지 않습니다.'
  ];
  navigator.clipboard?.writeText(lines.join('\n')).then(() => toast('복사 완료', '결과 요약을 클립보드에 복사했습니다.')).catch(() => fallbackCopy(lines.join('\n')));
}

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select();
  document.execCommand('copy'); area.remove(); toast('복사 완료', '결과 요약을 클립보드에 복사했습니다.');
}

async function shareResult(result) {
  const primaryHost = result.urlAnalyses?.find(a => a.host)?.host || '';
  const url = new URL(location.href);
  url.hash = 'scanner';
  url.searchParams.set('share', '1');
  url.searchParams.set('score', String(result.score));
  url.searchParams.set('risk', result.risk.key);
  url.searchParams.set('signals', String(result.signals.length));
  if (primaryHost) url.searchParams.set('host', primaryHost);

  const shareData = { title: 'ScamScent 검사 결과', text: `위험 신호 수준: ${result.risk.label} (${result.score}/100)`, url: url.toString() };
  if (navigator.share) {
    try { await navigator.share(shareData); return; } catch (error) { if (error?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url.toString()); toast('공유 링크 복사', '원문 없이 결과 요약만 포함한 링크를 복사했습니다.'); }
  catch { fallbackCopy(url.toString()); }
}

function showLoading() {
  el.emptyState.hidden = true;
  el.resultContent.hidden = true;
  el.loadingState.hidden = false;
  el.scanButton.classList.add('is-loading');
  el.scanButton.disabled = true;
  let index = 0;
  el.loadingMessage.textContent = loadingMessages[0];
  const timer = setInterval(() => { index = (index + 1) % loadingMessages.length; el.loadingMessage.textContent = loadingMessages[index]; }, 280);
  return () => clearInterval(timer);
}

function saveToHistory(text, result) {
  if (!el.saveHistory.checked) return;
  const history = getHistory();
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    preview: normalizeWhitespace(text).slice(0, 180),
    result: {
      score: result.score,
      risk: result.risk,
      signals: result.signals,
      urlAnalyses: result.urlAnalyses.map(a => ({ invalid:a.invalid, host:a.host, intel:a.intel, facts:a.facts })),
      intelHits: result.intelHits,
      action: result.action,
      inputType: result.inputType,
      checkedAt: result.checkedAt
    }
  };
  history.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  renderHistory();
}

function getHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    el.historyList.innerHTML = `<div class="history-empty">저장된 검사 기록이 없습니다. 검사기의 “최근 검사 기록 저장”을 켜고 분석하면 여기에 표시됩니다.</div>`;
    return;
  }
  el.historyList.innerHTML = history.map(item => `
    <article class="history-item" data-id="${escapeHtml(item.id)}">
      <div class="history-risk ${escapeHtml(item.result.risk.key)}">${item.result.score}</div>
      <div class="history-copy"><strong>${escapeHtml(item.preview || '저장된 검사')}</strong><p>${escapeHtml(item.result.risk.label)} · ${item.result.signals.length}개 신호 · ${formatDate(item.result.checkedAt)}</p></div>
      <div class="history-actions"><button type="button" data-action="view">결과 보기</button><button type="button" data-action="delete">삭제</button></div>
    </article>
  `).join('');

  $$('.history-item').forEach(itemEl => {
    const id = itemEl.dataset.id;
    $('[data-action="view"]', itemEl).addEventListener('click', () => {
      const item = getHistory().find(entry => entry.id === id);
      if (!item) return;
      renderResult(item.result, { saved: true });
      $('#scanner').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('[data-action="delete"]', itemEl).addEventListener('click', () => {
      const next = getHistory().filter(entry => entry.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      renderHistory(); toast('기록 삭제', '선택한 검사 기록을 이 브라우저에서 삭제했습니다.');
    });
  });
}

function renderIntel(query = '') {
  const q = query.trim().toLowerCase();
  const list = intelRecords.filter(record => !q || record.host.includes(q) || record.title.toLowerCase().includes(q) || record.tags.some(tag => tag.toLowerCase().includes(q)));
  el.intelCount.textContent = String(intelRecords.length);
  if (!list.length) {
    el.intelList.innerHTML = `<div class="intel-empty">“${escapeHtml(query)}”와 일치하는 사전 조사 레코드가 없습니다. DB에 없다는 것은 안전하다는 뜻이 아닙니다.</div>`;
    return;
  }
  el.intelList.innerHTML = list.map(record => `
    <article class="intel-card">
      <div class="intel-card-top"><div><div class="intel-domain">${escapeHtml(record.host)}</div><div class="intel-reviewed">마지막 검토 ${escapeHtml(record.reviewedAt)}</div></div><span class="intel-badge">${record.confidence === 'demo-record' ? '데모' : '조사됨'}</span></div>
      <p><strong>${escapeHtml(record.title)}</strong><br>${escapeHtml(record.summary)}</p>
      <div class="intel-tags">${record.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    </article>`).join('');
}

function toast(title, message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.innerHTML = `<span class="toast-icon">✓</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
  el.toastRegion.append(node);
  setTimeout(() => node.remove(), 3600);
}

async function runScan() {
  const text = el.input.value.trim();
  if (!text) {
    toast('입력이 필요합니다', '검사할 문자, 이메일 또는 URL을 붙여넣어 주세요.');
    el.input.focus();
    return;
  }
  const stopLoading = showLoading();
  const minDelay = new Promise(resolve => setTimeout(resolve, 720));
  const result = analyze(text);
  await minDelay;
  stopLoading();
  el.scanButton.classList.remove('is-loading');
  el.scanButton.disabled = false;
  renderResult(result);
  saveToHistory(text, result);
}

function updateInputMeta() {
  el.charCount.textContent = String(el.input.value.length);
  el.detectedType.textContent = detectInputType(el.input.value);
}

function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'system';
  document.documentElement.dataset.theme = saved;
  updateThemeButton(saved);
  el.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'system';
    const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    updateThemeButton(next);
    toast('테마 변경', next === 'system' ? '시스템 설정을 따릅니다.' : `${next === 'dark' ? '다크' : '라이트'} 모드로 변경했습니다.`);
  });
}

function updateThemeButton(theme) {
  const labels = { system:'시스템 테마 사용 중', light:'라이트 모드 사용 중', dark:'다크 모드 사용 중' };
  el.themeToggle.title = `${labels[theme]} · 클릭하여 변경`;
  el.themeToggle.setAttribute('aria-label', el.themeToggle.title);
}

function setupMenu() {
  el.mobileMenuButton.addEventListener('click', () => {
    const open = !el.mobileMenu.hasAttribute('hidden');
    if (open) el.mobileMenu.setAttribute('hidden',''); else el.mobileMenu.removeAttribute('hidden');
    el.mobileMenuButton.setAttribute('aria-expanded', String(!open));
    el.mobileMenuButton.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
  });
  $$('a', el.mobileMenu).forEach(link => link.addEventListener('click', () => {
    el.mobileMenu.setAttribute('hidden',''); el.mobileMenuButton.setAttribute('aria-expanded','false');
  }));
}

function setupDialog() {
  const open = () => {
    if (typeof el.methodDialog.showModal === 'function') el.methodDialog.showModal();
    else el.methodDialog.setAttribute('open','');
  };
  $('#open-method-modal').addEventListener('click', open);
  $('#footer-method-button').addEventListener('click', open);
  el.methodDialog.addEventListener('click', event => {
    if (event.target === el.methodDialog) el.methodDialog.close();
  });
}

function loadSharedSummary() {
  const params = new URLSearchParams(location.search);
  if (params.get('share') !== '1') return;
  const score = Math.max(0, Math.min(100, Number(params.get('score') || 0)));
  const risk = getRisk(score);
  const count = Math.max(0, Math.min(99, Number(params.get('signals') || 0)));
  const host = (params.get('host') || '').slice(0, 160);
  const fakeSignals = Array.from({length: Math.min(count, 6)}, (_, i) => ({ id:`shared-${i}`, title: i === 0 ? '원문 없이 공유된 결과입니다' : '공유 링크에는 세부 신호가 포함되지 않습니다', description: '민감한 메시지 원문을 URL에 넣지 않기 위해 요약 정보만 전달했습니다.', points: 0, severity: 'amber' }));
  const result = {
    score,
    risk,
    signals: fakeSignals,
    urlAnalyses: host ? [{ host, invalid:false, intel:findIntel(host), facts:{host,protocol:'—',shortener:shortenerHosts.has(host),known:Boolean(findIntel(host))} }] : [],
    intelHits: host && findIntel(host) ? [findIntel(host)] : [],
    action: '공유된 점수만으로 판단하지 말고, 원문을 직접 확인하거나 ScamScent에서 다시 검사하세요.',
    inputType: '민감한 원문이 제외된 공유 요약',
    checkedAt: new Date().toISOString()
  };
  renderResult(result, { shared: true });
  setTimeout(() => $('#scanner').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

el.input.addEventListener('input', updateInputMeta);
el.input.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') runScan();
});
el.scanButton.addEventListener('click', runScan);
el.clearInput.addEventListener('click', () => { el.input.value = ''; updateInputMeta(); el.input.focus(); });
$$('.sample-chip').forEach(button => button.addEventListener('click', () => {
  const sample = samples.find(item => item.id === button.dataset.sample);
  if (!sample) return;
  el.input.value = sample.text; updateInputMeta(); el.input.focus(); toast('예시 불러오기', `${sample.label} 예시를 입력했습니다.`);
}));
el.intelSearch.addEventListener('input', () => renderIntel(el.intelSearch.value));
el.clearHistory.addEventListener('click', () => {
  if (!getHistory().length) { toast('삭제할 기록 없음', '현재 브라우저에 저장된 검사 기록이 없습니다.'); return; }
  localStorage.removeItem(HISTORY_KEY); renderHistory(); toast('기록 전체 삭제', '이 브라우저의 검사 기록을 모두 삭제했습니다.');
});

$('#year').textContent = String(new Date().getFullYear());
setupTheme();
setupMenu();
setupDialog();
renderIntel();
renderHistory();
updateInputMeta();
loadSharedSummary();
