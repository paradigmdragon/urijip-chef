# 우리집 셰프 동적 서버 MVP 후보

기존 `web/` 시연을 보존하고 공식 Sites Vinext starter로 구성했습니다. 2026-11-04 사용자 승인으로 Sites v2에 배포했습니다. 실계정 로그인·저장·채팅 연결 인수는 대기 중입니다. [배포 결과](../docs/DEPLOYMENT-2026-11-04.md)를 참고하세요.

## 실행과 검사

공식 starter 기준 Node >=22.13.0. 이번 실제 실행은 Node 25.7.0 / macOS / 로컬 workerd+D1 에뮬레이터였습니다.

```sh
cd site
npm ci
npm test
npx tsc --noEmit
npm run build
```

`npm test`는 운영 DB를 사용하지 않습니다. SQLite 임시 파일 재열기 등을 포함한 5건과 Miniflare의 실제 D1 바인딩을 통한 API/MCP·격리·동시성·페이지·프로토콜 검사 6건을 수행합니다. 가상 사용자가 제공하는 헤더는 테스트용이며 실제 ChatGPT 인증 검증이 아닙니다.

로컬 빌드 미리보기는 `.openai/hosting.json`의 DB 바인딩을 사용합니다. 최초 실행 때만 로컬 마이그레이션을 순서대로 적용하세요. 반복 재생하지 않습니다.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tense_smasher.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_premium_wither.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_atomic_inventory.sql
npm start -- --port 8789
```

별도 터미널에서 `node scripts/smoke-local.mjs`를 실행하면 loopback에서만 가상 사용자·시험 재고로 등록→MCP 조회/수정→HTTP 재조회를 확인합니다. 서버 종료·재시작 후 `node scripts/smoke-local.mjs --read-only`로 유지 여부를 확인할 수 있습니다. 이 검사는 로그인 버튼 조작이나 실계정 OAuth 검증을 대신하지 않습니다.

macOS 캐시/설정 권한이 제한되면 기존 전역 디렉터리를 고치지 말고 명령 환경의 `npm_config_cache`, `XDG_CONFIG_HOME`을 작업용 임시 경로로 지정합니다. 파일 감시 한도에는 `CHOKIDAR_USEPOLLING=1`을 해당 프로세스에만 적용할 수 있습니다.

## 실제 구현

- 기존 크림·세이지 디자인과 5개 메뉴 재사용. 수동 재료 추가/수정, 검색, 재고·이력 페이지, 저장 전 현재/변경 내용 비교, 저장 후 별도 재조회.
- 유통기한·소비기한 분리, 미확인은 null. 확인된 내용만 저장. 수량 0도 소비 정정으로 기록하며 기존 lot는 보존.
- 서버가 전달받은 Sites 사용자 ID로 모든 쿼리 범위 제한. 클라이언트 owner 필드 거부. 익명 API 거부, 브라우저 쓰기 동일 Origin 검사, private/no-store.
- 재고와 이벤트 2개 테이블. 이벤트 insert와 trigger의 재고 반영을 한 SQLite 트랜잭션으로 처리. 오래된 버전은 trigger에서 거부. 사용자별 operationId 유일성과 payload hash로 중복 반영 방지.
- `/mcp`: 공식 Sites 2026-07-28 `server/discover`, `tools/list`, `tools/call`. 도구: inventory_list/history/preview_write/apply_write. 삭제·임의 프록시·다른 사용자 지정 도구 없음.
- apply는 preview의 본문 hash와 confirmed=true를 요구. MCP 사용 AI는 전후 내용을 보여주고 사용자 승인 후 호출해야 합니다. confirmed 필드만으로 인간 승인을 기술적으로 증명하지는 않으며 실제 플랫폼의 도구 승인·동의 흐름도 확인해야 합니다.

## 아직 하지 않은 것

실제 계정 로그인·MCP 설치/동의·계정 격리, 기존 손잡고 계정 연결/Sondocs 이관·동기화, 사진 AI/OCR/상품 API/가족 설정/레시피/가격/알림. R2도 선언하지 않았습니다. 기능 준비 상태를 화면에 표시했습니다.

공식 Sites dispatch가 신원 헤더를 검증·전달한다는 계약에 의존합니다. 별도 공개 Worker로 직접 노출하지 마세요. 운영 인수에서 익명 요청에 위조된 신원 헤더를 보낸 경우도 개인 데이터 접근이 거부되는지 검증해야 합니다. 새 로그인/세션 서버를 만들지 않습니다.

## 승인된 배포 범위 (2026-11-04)

기존 사이트 `appgprj_6ad7e8bd459481918c7f3c1301afb0c1`, 공개 범위 보존, 기존 저장소/사진/손잡고 Sondocs 보존. 새 D1의 chef_lots/chef_events 생성과 위 3개 마이그레이션 적용, 정적 시연에서 동적 서버로 전환, 자체 MCP 도구 공개·연결 준비가 변경 범위입니다. 단순 코드 되돌리기로 DB를 지우지 않습니다. 실제 데이터가 생긴 이후에는 스키마를 삭제하지 않고 별도 복구 절차를 검토합니다.

GitHub 후보 반영과 Sites 관리 소스 동기화·운영 배포는 별도입니다. 원격 소스 재조회·파일별 비교 후 공식 Sites source workflow로 정확 소스/빌드를 저장·게시해야 합니다. 이 로컬 빌드만으로 배포 성공을 주장하지 않습니다.
