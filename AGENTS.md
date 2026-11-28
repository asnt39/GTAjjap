# Harborline 작업 지침

아래 원칙을 모든 Harborline 업데이트에 적용한다.

## 저장소와 Production 배포

- 변경 사항을 기존 GitHub 저장소 `asnt39/Harborline`의 `main` 브랜치에 반영한다.
- 해당 커밋을 기존 Vercel 프로젝트 `harborline`의 Production에 배포한다. `main`의 Git 연동 배포 상태를 확인하고, 새 Vercel 프로젝트를 생성하지 않는다.
- 고정 운영 URL은 https://playharborline.vercel.app/ 이다. 도메인 연결을 유지하고 이전 주소 `https://harborline-six.vercel.app/`에서 고정 운영 URL로 이어지는 리디렉션을 보존한다.

## PWA와 저장 데이터

- 설치된 PWA가 재설치 없이 업데이트되어야 한다. 앱 셸이나 캐시 대상 자산을 변경할 때 서비스 워커와 캐시 갱신을 함께 점검한다. 필요한 경우 캐시 버전을 갱신하고 Harborline의 오래된 캐시만 정리한다.
- 기존 플레이어의 저장 데이터와 저장 키를 보존한다. 저장 형식을 변경해야 하면 기존 저장을 읽고 진행 상황을 유지할 수 있도록 호환 처리 또는 마이그레이션을 구현한다.
- PWA 동작이나 저장 로직을 변경한 경우, 이전 버전이 설치되고 저장 데이터가 있는 상태에서 재설치 없이 업데이트되며 기존 진행 상황을 계속 불러올 수 있는지 확인한다.

## 배포 검증과 완료 보고

- Vercel Production 배포의 커밋이 GitHub `main`에 반영한 커밋과 일치하는지 확인한다.
- 배포가 준비되면 고정 운영 URL을 직접 열어 최신 버전이 제공되는지 확인한다. 이전 주소에서도 리디렉션을 따라가 같은 버전이 제공되는지 확인한다.
- 완료 보고에 고정 운영 URL, GitHub 커밋, Vercel Production 배포 결과, 운영 URL과 관련 PWA 및 저장 데이터 검증 결과를 포함한다.
