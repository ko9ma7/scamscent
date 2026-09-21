export const intelRecords = [
  {
    host: 'bit.ly',
    category: 'url-shortener',
    confidence: 'known-service',
    title: 'URL 단축 서비스',
    summary: 'bit.ly 자체가 사기 사이트라는 뜻은 아닙니다. 다만 최종 목적지를 숨길 수 있어 피싱 메시지에서 추가 확인이 필요합니다.',
    action: '링크를 누르기 전 최종 목적지 도메인을 확인하세요.',
    reviewedAt: '2026-09-01',
    tags: ['단축 URL', '목적지 확인 필요']
  },
  {
    host: 'tinyurl.com',
    category: 'url-shortener',
    confidence: 'known-service',
    title: 'URL 단축 서비스',
    summary: 'TinyURL은 정상적인 단축 서비스지만, 링크 목적지를 가릴 수 있어 사기 탐지에서는 주의 신호로 취급합니다.',
    action: '중요한 계정·결제 안내라면 공식 앱이나 공식 홈페이지에서 직접 확인하세요.',
    reviewedAt: '2026-09-01',
    tags: ['단축 URL', '리디렉션']
  },
  {
    host: 't.co',
    category: 'url-shortener',
    confidence: 'known-service',
    title: '소셜 플랫폼 링크 래퍼',
    summary: 't.co는 X에서 사용하는 링크 래퍼입니다. 링크 출처가 정상이어도 최종 목적지 도메인은 별도로 확인해야 합니다.',
    action: '브라우저 주소창의 최종 도메인이 기대한 서비스와 일치하는지 확인하세요.',
    reviewedAt: '2026-09-01',
    tags: ['리디렉션', '최종 도메인 확인']
  },
  {
    host: 'github.com',
    category: 'official-domain',
    confidence: 'known-service',
    title: '널리 알려진 공식 서비스 도메인',
    summary: '이 도메인 자체는 널리 알려진 서비스의 공식 도메인입니다. 단, 개별 페이지·다운로드·사용자 콘텐츠까지 안전하다는 의미는 아닙니다.',
    action: '로그인·다운로드 전 페이지 경로와 요청 내용을 함께 확인하세요.',
    reviewedAt: '2026-09-01',
    tags: ['공식 도메인', '콘텐츠 별도 확인']
  },
  {
    host: 'google.com',
    category: 'official-domain',
    confidence: 'known-service',
    title: '널리 알려진 공식 서비스 도메인',
    summary: '도메인 철자가 정확하다면 Google의 공식 도메인입니다. 비슷하게 생긴 철자나 하위 도메인 위장은 별도 위험 신호입니다.',
    action: '주소창 전체 도메인을 확인하고, 로그인 요청은 공식 앱/사이트에서 직접 여는 것이 안전합니다.',
    reviewedAt: '2026-09-01',
    tags: ['공식 도메인', '유사 철자 주의']
  },
  {
    host: 'paypal.com',
    category: 'official-domain',
    confidence: 'known-service',
    title: '결제 서비스 공식 도메인',
    summary: 'paypal.com은 PayPal의 공식 도메인입니다. 다만 메시지 안의 링크 표기와 실제 이동 주소가 다를 수 있으므로 목적지를 확인해야 합니다.',
    action: '결제·계정 경고는 링크 대신 공식 사이트를 직접 입력해 확인하세요.',
    reviewedAt: '2026-09-01',
    tags: ['공식 도메인', '결제 관련']
  },
  {
    host: 'example.com',
    category: 'reserved-example',
    confidence: 'known-service',
    title: '문서 예시용 예약 도메인',
    summary: 'example.com은 문서와 테스트를 위해 예약된 예시 도메인입니다. 실제 상거래 서비스 주소로 쓰이는 도메인이 아닙니다.',
    action: '실제 결제·로그인 안내에서 이 주소가 보인다면 문맥을 다시 확인하세요.',
    reviewedAt: '2026-09-01',
    tags: ['예시 도메인', '테스트']
  },
  {
    host: 'secure-paypal-login.example',
    category: 'synthetic-scam-pattern',
    confidence: 'demo-record',
    title: '데모용 피싱 패턴',
    summary: '공식 브랜드명을 도메인 앞부분에 넣어 신뢰를 유도하는 전형적 형태를 설명하기 위한 합성 예시입니다.',
    action: '브랜드명이 보여도 실제 등록 도메인이 무엇인지 확인하세요.',
    reviewedAt: '2026-09-01',
    tags: ['데모', '브랜드 사칭 패턴']
  }
];

export const shortenerHosts = new Set(['bit.ly','tinyurl.com','t.co','goo.gl','ow.ly','is.gd','buff.ly','cutt.ly','rb.gy','rebrand.ly']);
