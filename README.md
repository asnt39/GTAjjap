# HARBORLINE

Player & Living City is a third-person exploration and driving game in a fictional working harbor. The first district joins Breakwater Avenue, Market Crossing and West Quay. Buildings, signage, the container terminal, vessels and street layout were authored for the game.

## Run

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. Use `npm run build` to generate the static site in `dist/`. Assets ship with the game. The renderer requires WebGL 2.

## Controls

Walk with WASD or the up/down arrows. Tap Shift to toggle running. The pause menu also offers hold-to-run. Press Space to jump on foot and F to punch. Drag or use left/right arrows to turn the camera. Scroll to change camera distance. Read nearby signs with E, open the map with M and pause with Escape. On touch screens, use the stick for walking or push it to the edge to run. Drag the open view to look around and use the jump and attack buttons. Sound starts muted.

## Project layout

The Three.js scene and input loop live in `src/main.js`. The street, architecture, harbor and animated character have separate modules. World geometry registers static colliders with the movement system in `src/navigation.js`. The navigation module also defines the interactive locations used by the map and field signage. Discovered signs use the original `harborline.visits.v1` key. Completing the optional First Drive uses a separate `harborline.firstDrive.v2` key.

Approach either side of the Touring parked east of spawn and press E to enter. W accelerates, S brakes and then reverses, A/D steer, and Space applies the handbrake. Stop before pressing E to exit. Touch driving uses the stick for steering and separate pedal buttons. Enable the existing sound control for engine and road audio. Start the optional First Drive route from the pause menu.

The 120 Hz bicycle model and oriented footprint collision tests are in `src/driving.js`. The wheel and brake-light rig in `src/touring.js` reuses the original Touring mesh. Run `node tests/driving.mjs` to check dynamics, exit safety and the route. The single-player scene has no server requirement.

Five residents share the Rocketbox geometry and source clips, each with an independent skeleton and a local wardrobe variant. Approach one and press E to speak. Their movement and reactions are in `src/residents.js`; the timed hand contact and health rules are in `src/melee.js`. The sprint preference uses `harborline.runMode.v3`. Run `node tests/footwork.mjs` and `node tests/living-city.mjs` for the on-foot and resident checks.

## 비공개 멀티플레이

개발 환경에서 `npm ci`를 실행한 뒤, 두 터미널에서 `npm run dev`와 `npm run rooms`를 각각 실행한다. 브라우저에서 게임을 열고 **일시 정지 → 비공개 멀티플레이 → 방 만들기**를 선택한다. 다른 브라우저에서 같은 서버 주소와 12자리 초대 코드를 입력한다. 일반 로컬 개발 주소는 `ws://localhost:8787/harborline`이다. 방은 최대 4명이며 방장이 나가면 접속 중인 플레이어 한 명에게 방장 표시가 넘어간다. 연결이 끊기면 최대 약 25초 동안 자리와 식별자를 유지한다. 서버가 연결 종료를 감지하면 운전석을 비우며, 재접속 시 도보로 복귀한다. 방을 나가면 입장 직전의 싱글플레이 위치와 차량 상태로 돌아간다.

인터넷에서 친구들과 접속하려면 별도의 Node.js 프로세스를 계속 실행할 수 있는 호스트와 `/harborline` 경로로 WebSocket 업그레이드를 전달하는 TLS 프록시가 필요하다. HTTPS 게임 페이지는 `wss://` 주소를 사용한다. `HARBORLINE_ORIGINS`에는 실제 게임 페이지의 오리진을 쉼표로 구분해 넣고, 필요하면 서버의 바인딩 주소와 포트를 `HARBORLINE_HOST`, `PORT`로 설정한다. 프런트엔드 기본 연결 주소는 `VITE_HARBORLINE_WS`를 빌드할 때 지정하거나 게임 메뉴에서 입력할 수 있다. 방 코드는 접속할 친구에게만 공유한다. 방 상태는 서버 메모리에 저장되며 서버를 재시작하면 초기화된다. NPC와 전투는 각 클라이언트에서만 계산하며 First Drive는 싱글플레이에서 진행한다.

Touring은 균형형이며, Sprint는 가속과 조향이 빠르고, Dock Van은 가속과 조향이 느린 대신 카메라가 더 높고 멀다. Sprint와 Dock Van은 대로 서쪽의 기존 주차 공간에 있다. 좌우에서 접근해 E 또는 화면의 버튼을 누르면 문을 열고 탑승한다. 정차 후 안전한 쪽으로 하차할 수 있다.

`src/vehicles.js`의 차량 ID와 스폰 설정은 서버와 클라이언트에서 공유한다. 로컬 충돌과 주행은 `src/driving.js`에서 계산하고, 방 서버가 운전석 소유권과 입력 범위를 확인한다. 서버는 월드 지형, NPC, 전투 전체를 시뮬레이션하지 않으므로 공개 매칭용 안티치트로 사용할 수 없다. `node tests/rooms.mjs`는 별도 WebSocket 연결로 4인 제한, 위치·차량 복제, 점유 충돌, 재접속 및 트래픽 제한을 검사한다.

## Attribution

Open the pause menu's credits or inspect the notices under `public/assets/` for original sources, license conditions and adaptations. The included Three.js distribution is MIT licensed. Font licenses accompany the local Barlow font files.

## 현재 진행 상황

2026-11-19 기준 HARBORLINE은 Three.js와 Vite를 사용하는 싱글플레이 항구 도시 프로토타입이다. 현재 배포 버전은 Sites 버전 6이며 이 저장소의 게임 소스 기준 커밋은 `5c2c9006e889d46b659610f9a378287a71a48ff1`이다. 운영 주소는 https://harborline-docklands.asnt1.chatgpt.site 이다.

- 도로, 부두, 상점, 차량, 하늘과 수면을 포함하는 항구 구역과 충돌, 지도, 안내판, 설정을 구현했다.
- 걷기, 달리기 전환, 점프, 카메라와 터치 조작을 지원한다.
- Touring 차량 탑승, 주행, 후진, 충돌, 하차 및 짧은 First Drive 미션을 지원한다.
- 주민 5명, 이동·대화, 주먹 공격, 피격·도주·반격 및 체력과 복귀 처리가 있다.
- 설치 매니페스트, 192/512 아이콘, 서비스 워커를 추가했다. 아이콘만 캐시하며 게임 전체 오프라인 실행은 지원하지 않는다.

### 테스트와 알려진 제한

`npm run build`, `node tests/footwork.mjs`, `node tests/driving.mjs`, `node tests/living-city.mjs`가 통과했다. 이전 Chromium 자동화에서는 NPC 대화·공격·반격, 운전·하차, 모바일 멀티터치 에뮬레이션을 확인했다. 실제 갤럭시 기기와 삼성 인터넷에서의 성능·멀티터치·PWA 설치 및 서비스 워커 업데이트는 아직 검증하지 않았다.

PWA 배포 직후 일부 아이콘 요청이 간헐적으로 HTML을 반환했다. 서비스 워커는 PNG 응답만 캐시하도록 처리했으며 최종 HTTP 점검에서 두 아이콘 모두 PNG로 응답했다. 운영 환경의 응답 일관성은 추가 확인이 필요하다. 자동 품질 조정은 유지하지만 실제 모바일 GPU의 프레임 안정성은 미검증이다.

## 앞으로의 방향

1. 갤럭시 스마트폰과 태블릿의 삼성 인터넷·Chrome에서 설치, 독립 실행, 멀티터치, 저장 유지 및 업데이트를 검증하고 발견된 문제를 수정한다.
2. 도시 탐험, 이동·전투·차량 조작과 NPC 행동을 실제 플레이와 성능 측정에 맞춰 다듬는다.
3. 기존 그래픽과 저장 데이터를 보존하면서 NPC 행동, 교통 및 짧은 스토리 미션을 단계적으로 확장한다.
4. 경찰 추격과 전투 확장을 검토한다. 비공개 멀티플레이의 인터넷 운영에는 별도 방 서버가 필요하다.

`.openai/hosting.json`은 기존 Sites 프로젝트의 배포 설정이다. 다른 호스팅에 사용할 때는 대상 배포 설정을 별도로 검토해야 한다. 저장 데이터는 브라우저의 기존 localStorage 키를 사용한다.
