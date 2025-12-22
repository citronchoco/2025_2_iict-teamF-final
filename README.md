# 2025_2_iict-teamF-final
정보문화기술입문 F조 기말 프로젝트

## 개요
- 프로젝트명: 빛과 그림자의 정원
- 장르: 인터랙티브 미디어 아트 게임
- 기획 배경
    - 모티브: 인적이 끊겨 자연에 잠식당한 폐허의 이미지
    - 의도: 디지털 공간에서도 시간이 흐르고(이끼), 사용자의 행동(빛)에 따라 반응하는 살아있는 정원의 구현

## 플레이 방법
이 게임은 4단계의 시간(새벽-낮-황혼-밤)이 순환하는 동안, 빛으로 식물을 성장시키고 이끼의 잠식을 막아내는 인터랙티브 아트입니다.

### 조작 방법
**마우스**
* `Move` : 광원 이동
* `Right Click` : 씨앗 심기 (새로운 꽃 생성)

**키보드**
* <kbd>Spacebar</kbd> : 현재 화면 저장 & QR 생성
* <kbd>R</kbd>/<kbd>r</kbd> or <kbd>ㄱ</kbd> : 리셋 (게임 초기화)
* <kbd>ESC</kbd> : 강제 종료 (엔딩/스토리라인으로 이동)

---

## 시스템 아키텍처
본 프로젝트는 `p5.js`의 드로잉 루프를 기반으로 **상태 관리**와 **객체 지향** 구조를 채택하여 개발되었습니다.

### 1. 메인 컨트롤러
- **상태 관리 시스템**
  - Flow: Title ↔ Play ↔ Storyline ↔ Ending의 순환 구조
  - Scene Transition: 플레이 종료 시, 마지막 화면을 캡처하여 스토리라인의 배경으로 승계하는 연출 적용
- **환경 시스템**
  - Frame Count 기반으로 하루 사이클 구현
  - `lerpColor()`를 활용한 4단계(새벽, 낮, 황혼, 밤) 배경색 및 틴트(Tint) 실시간 보간

### 2. 객체 관리자
- **Lifecycle Management:**
  - `push()`와 `splice()`를 활용하여 식물과 이끼 객체의 생성 및 소멸을 동적으로 관리
  - 메모리 최적화를 위해 화면 밖으로 나가거나 수명이 다한 객체는 배열에서 즉시 제거
- **Interaction Logic:**
  - 광원(Player)과 이끼, 이끼와 식물 간의 거리(`dist`) 계산을 통한 실시간 충돌 감지

### 3. 게임 오브젝트
각 객체는 독립적인 클래스 파일로 모듈화되어, 중앙 컨트롤러에 의해 생성 및 관리됩니다.
- **Light.js: (Player & Input)** 마우스 좌표를 실시간으로 추적하며, 어두운 맵을 밝히고 이끼를 정화하는 인터랙션 담당
- **Moss.js: Enemy & Environment:** 시간 경과에 따라 스스로 증식하며 영역을 넓혀가는 자율 행동(Autonomous) 객체
- **Plant.js: Interactive Target:** 줄기-잎-꽃의 단계별 성장 시스템과 체력(HP)을 가지며, 파괴 시 물리 파편(Debris) 효과 생성

### 4. 서버 및 아카이빙
- **Supabase Storage:** 캡처된 Canvas 데이터를 Blob 형태로 변환하여 비동기(Async) 업로드
- **QR Code Generation:** 업로드 성공 시 반환된 URL을 `qrcode.js` 라이브러리와 연동하여 즉석에서 QR 코드 렌더링

---

## 기술적 구현 사항
### ① 공간 점유율 연산
- **Grid Algorithm:** 화면을 격자(Grid) 단위로 샘플링하여 이끼가 화면을 덮은 비율을 실시간으로 계산
- **Overgrow Trigger:** 이끼 점유율이 60%를 초과할 경우, '폭주 모드'가 발동되어 빈 공간(`emptySamplePositions`)을 추적해 확산 속도가 가속됨

### ② 빛과 그림자
- **Glow Effect:** `blendMode(ADD)`를 적용하여 어두운 배경 위 텍스처 RGB 값을 더하는 가산 혼합(Additive Blending) 방식의 발광 효과 구현
- **Particle System:** 광원 중심부에서 무작위 분포(`randomGaussian`)와 수명(`lifespan`)을 가진 입자를 지속 생성하여 일렁이는 듯한 동적 시각 연출

### ③ 절차적 생성
- **Recursive Growth:** 이끼는 부모 노드 좌표를 기준으로 자식 노드가 파생되는 재귀적 알고리즘을 통해 자연스러운 군집 형성
- **Randomized Assets:** 식물 생성 시 `preload`된 다양한 파츠(줄기, 잎, 꽃)를 무작위로 조합하여 매번 다른 형태의 개체 생성

---

## 사용 라이브러리 및 도구
- **Language:** JavaScript (ES6+)
- **Library/Framework:** [p5.js](https://p5js.org/)
- **Storage:** [Supabase](https://supabase.com/)
- **Utility:** [QRCode.js](https://davidshimjs.github.io/qrcodejs/)