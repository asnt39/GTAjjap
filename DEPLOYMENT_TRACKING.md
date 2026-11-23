# HARBORLINE — 배포 버전과 Git 소스 추적

> 점검일: 2026-11-23 (KST)
>
> 이 문서는 **이미 검증된 사실 / 과거 기록 또는 PR에 적힌 주장 / 검증되지 않은 사항**을 분리한다. GitHub의 브랜치나 PR이 존재한다는 사실은 해당 기능이 Sites 운영 게임에 배포되었다는 뜻이 아니다.

## 운영 사이트와 배포 연결 상태

- 사이트: https://harborline-docklands.asnt1.chatgpt.site
- Sites 프로젝트 ID: `appgprj_6afdc2e584688191a2f5a396e6296a5e` ([기존 배포 설정](../.openai/hosting.json))
- 이번 점검에서 **Sites 배포 버전/빌드 매니페스트를 직접 조회하지 못했다**. 따라서 **현재 운영 빌드의 고유 소스 SHA는 미확정**이다. GitHub에서 가장 앞선 브랜치 SHA나 `main` SHA를 임의로 운영 버전의 소스로 기입하지 않는다.

| 버전 | 출처에 기록된 소스 커밋 | 현재 확인 수준 | 비고 |
| --- | --- | --- | --- |
| Sites v6 | [`5c2c9006e889d46b659610f9a378287a71a48ff1`](https://github.com/asnt39/GTAjjap/commit/5c2c9006e889d46b659610f9a378287a71a48ff1) | **과거 기록** | 2026-11-19 당시 README에 남은 배포/소스 연결. 현재 운영 버전이라는 뜻이 아님 |
| Sites v9 | [`dcabd32d227a39e2d5eb67eb85ee651906c3c5bc`](https://github.com/asnt39/GTAjjap/commit/dcabd32d227a39e2d5eb67eb85ee651906c3c5bc) | **과거 내부 배포 보고** | 2026-11-20 이전 HARBORLINE 프로젝트 기록에 v9 통합 배포 소스로 명시됨. 현 사이트를 재검증한 것은 아님 |
| Sites v14 | [`73c71d478d436bdbb412e27e8966597813c1bf52`](https://github.com/asnt39/GTAjjap/commit/73c71d478d436bdbb412e27e8966597813c1bf52) | **PR 작성자의 진술** | [PR #6](https://github.com/asnt39/GTAjjap/pull/6) 본문이 "Based on live Sites v14 (73c71d4)"라고 명시. 실제 Sites 배포 메타데이터로 독립 검증하지 않음 |
| Sites v19 | **미확인** | **사용자가 언급한 최신 버전, 소스 연결 보류** | 해당 버전의 배포 ID, 정확한 SHA, 빌드 파일 지문을 확인하지 못함. `main` 또는 최신 기능 브랜치를 v19로 단정하지 않음 |

## 현재 GitHub 소스 상태

2026-11-23 조회 기준 `main` HEAD는 [`dcabd32`](https://github.com/asnt39/GTAjjap/commit/dcabd32d227a39e2d5eb67eb85ee651906c3c5bc)이다. 이 SHA는 **GitHub 기본 브랜치의 코드 기준점**이며 v19의 배포 증거는 아니다.

| 브랜치 / PR | HEAD | `main` 대비 | 주요 변경 (코드 작성 여부; 배포 증거 아님) |
| --- | --- | --- | --- |
| [`feature/tide-market`](https://github.com/asnt39/GTAjjap/tree/feature/tide-market) / [PR #5](https://github.com/asnt39/GTAjjap/pull/5) | `44e77cf` | 6 commits ahead | 시장 구역, 실내, 로딩/대화 개선 |
| [`integration/online-tide-market`](https://github.com/asnt39/GTAjjap/tree/integration/online-tide-market) | `73c71d4` | 11 commits ahead | 도시·온라인 연결 기반 및 이동/게임플레이 개선 |
| [`feature/online-hosting`](https://github.com/asnt39/GTAjjap/tree/feature/online-hosting) / [PR #4](https://github.com/asnt39/GTAjjap/pull/4) | `bb4bf34` | 9 commits ahead | Render용 방 서버/연결 변경 |
| [`feature/police-custody-chase`](https://github.com/asnt39/GTAjjap/tree/feature/police-custody-chase) | `d88d8f0` | 13 commits ahead | 경찰차 추격 및 체포·수감 처리 |
| [`feature/npc-district-life`](https://github.com/asnt39/GTAjjap/tree/feature/npc-district-life) | `940623b` | 14 commits ahead | NPC 순찰·실내 방문·인사 |
| [`feature/harbor-equipment-art`](https://github.com/asnt39/GTAjjap/tree/feature/harbor-equipment-art) / [PR #6](https://github.com/asnt39/GTAjjap/pull/6) | `77d97ae` | 13 commits ahead | 장비·전투·차량 모델 및 환경 에셋 |

- 현재 PR #4 및 #5는 **Draft/open**, PR #6은 **open/미병합** 상태다.
- 각 브랜치는 서로 선행 커밋을 공유할 수 있다. 위 커밋 개수를 독립 기능 개수로 더하지 말 것.
- 위 코드가 실제 v19에 포함됐는지는 **Sites 배포 빌드와의 대조 없이는 결정할 수 없다**.
- 저장소 README의 "현재 배포 v6" 문구는 과거 날짜의 기록으로, 현행 운영 버전 상태와 혼동하지 말 것.

## 멀티플레이 서버 (프런트엔드와 별개)

Render `harborline-rooms` Web Service는 2026-11-23 조회 시 생성 상태가 유지되며 최신 배포 `dep-dbvr2f2fngtc73a7chh0`가 **live**로 기록되어 있다. 배포 소스는 `feature/online-hosting`의 [`bb4bf34`](https://github.com/asnt39/GTAjjap/commit/bb4bf34d64d3d6052923dcb5e2128b674ef2b5a4)다.

**서버 live와 운영 게임의 실제 멀티플레이 연결, WSS 핸드셰이크, 2~4명 동시 플레이 성공은 별도 문제**이며 현재 검증하지 않았다.

## v19 연결을 완료할 때 필요한 검증

1. 기존 Sites 프로젝트에서 **실제 공개 v19**의 배포 ID, 배포 시각, 빌드 소스 SHA/브랜치 또는 저장된 소스 스냅샷을 확인한다. 확인 가능한 UI/로그가 없으면 확인 불가로 남긴다.
2. 소스 SHA가 직접 나오지 않을 경우, v19의 배포 산출물(`index.html`, JS/CSS 에셋 등)과 후보 커밋에서 `npm ci && npm run build`로 만든 산출물을 같은 환경에서 비교한다. **바이트 해시 일치/빌드 옵션과 환경변수**를 기록하고, 단순한 화면 유사성만으로 소스 동일성을 주장하지 않는다.
3. v19의 소스와 배포가 확인된 뒤, 위 표에 **배포 ID·확인 시각·정확한 40자리 SHA·검증 방식·근거 링크**를 추가한다.
4. v19에 포함된 기능과 미반영된 기능을 확인할 때는 기준 커밋의 **실제 파일·커밋 계보와 운영 기능 검증**을 함께 사용한다.
5. `main`을 v19에 맞추는 병합/태그/배포 작업은 **후속 단계**로 분리한다. 검증되지 않은 브랜치를 병합하거나 운영 배포를 트리거하지 않는다.

## 이 기록 작업의 범위

- GitHub의 기존 게임 코드, 정적 에셋, 저장 키, `main`, Render/Sites 운영 설정을 변경하지 않았다.
- 문서 수정은 별도 검토 브랜치/PR에서만 수행한다. 실제 v19 SHA를 모르는 상태에서 배포 태그를 새로 만들지 않는다.
