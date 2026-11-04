# 2026-11-04 Sites v2 배포 기록

사용자 승인: GitHub main 반영 + 기존 우리집 셰프 Sites의 D1 생성·마이그레이션·배포. 기존 공개 범위를 유지했습니다. 손잡고 계정·기존 Sondocs 기록은 변경하지 않았습니다.

## 배포 증거

- URL: https://urijip-chef.paradigmdragon.chatgpt.site/
- GitHub 기능 commit: `5c3bc381a01517fcc1746c96e5c5666e988e25af` (원격 main 재조회 일치).
- Sites 관리 소스 commit: `6ea35be7a57336fe17d9e4d9f27c81e18b7552a9`. GitHub `site/`의 작성 파일 63개를 기존 Sites 저장소에 반영, 기존 정적 빌드에서 Worker로 전환. 이전 소스는 Git 이력 보존.
- Site: `appgprj_6ad7e8bd459481918c7f3c1301afb0c1`
- Saved version 2: `appgprj_6ad7e8bd459481918c7f3c1301afb0c1~appgver_d3e1dd386eec8191a97744525d485509`
- Deployment: `appgdep_6aeb15a3f1988191b81e59359bc6fa43` — succeeded, has_mcp=true.
- Archive SHA256: `44e98f79a942c4cc6541a406a33302802cf9c4e107c26704a7a4122989832915`. 74 files, 1269760 bytes.
- DB: 배포 전 bindings/tables=[] → 배포 후 DB / chef_lots, chef_events. 두 테이블 실제 조회 rows=[], has_more=false. 실제 식재료·시험 재고를 운영에 넣지 않았습니다.
- 공식 배포가 마이그레이션을 처리했습니다. 운영 SQL 수동 실행·삭제·재생은 하지 않았습니다.

## 검증과 한계

Sites 관리 소스 checkout에서도 11개 로컬 검사, 타입검사, 공식 빌드·패키징 통과. D1 에뮬레이터에서 HTTP↔MCP 왕복·소유자 격리·동시성·중복 방지 검증. 이전 로컬 빌드 서버의 재시작 후 재고 유지 확인. 이는 운영 로그인·사용자 승인 검증을 대신하지 않습니다.

운영 서버의 외부 HTTP 점검은 홈·재고 API 모두 Cloudflare 403 / error 1010으로 차단됐습니다. 위조 신원 헤더를 넣은 읽기 요청도 같은 edge 차단이므로 앱 인증·ACL 통과 증거로 사용할 수 없습니다. 보호 설정은 변경하지 않았습니다.

브라우저 도구: Work 설정상 로컬 브라우저 비활성 + Mac 잠금. 실계정 로그인·화면 저장/수정·재접속·다른 계정 격리는 미검증입니다.

## 채팅 연결

Sites가 전용 MCP 플러그인 `plugin_asdk_app_sites_09a57bc70ce88191a835ae015384ca99`를 생성했습니다. endpoint/resource는 `https://urijip-chef.paradigmdragon.chatgpt.site/mcp`입니다. 별도 MCP 설정이나 대체 앱을 만들지 않습니다.

설치 안내 도구는 already_installed, 앱 권한 조회는 not_installed를 반환하여 설치·인증 상태가 불일치합니다. 공개 검색 결과는 0건이지만 생성된 개인 플러그인의 부재 증거는 아닙니다. 이 대화의 도구 목록에 inventory_*가 없어 실제 채팅 조회·수정은 실행하지 못했습니다.

다음 인수: 브라우저 사용 활성/잠금 해제 후 로그인 → 확인된 재료를 저장 전 사용자 확인 → 저장 후 화면 재조회 → 재접속 유지 → Plugins의 Personal/Created by you에서 우리집 셰프 연결 상태 확인 → 도구가 보이는 대화에서 같은 재고 조회. 충돌·익명·다른 소유자 접근 거부도 운영 경계에서 확인합니다. 기존 손잡고 플러그인과 자동 동기화는 별도 후속입니다.
