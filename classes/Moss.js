
//  이끼(Moss) 객체를 생성하는 설계도
//    - 역할: 화면 가장자리에서 생성되어 안쪽으로 부유하며 움직임
//    - 특징: 펄린 노이즈를 사용하여 자연스럽게 흔들리며 이동
//    - 상호작용: 추후 빛(Light)이나 식물(Plant)과 닿았을 때의 로직이 추가될 예정


class Moss {
    // 생성자 (Constructor)
    // new Moss()를 호출할 때 가장 먼저 실행되는 '초기화' 함수
    constructor(img) {
        this.img = img;
        
        // 물리 변수 초기화 (Vector 사용)
        this.pos = createVector(0, 0);  // 현재 위치 (x, y)
        this.vel = createVector(0, 0);  // 이동 속도 (매 프레임 위치에 더해짐)
        this.acc = createVector(0, 0);  // 가속도 (매 프레임 속도에 더해짐, 자연스러운 움직임용)
        
        // 크기 및 규격 설정
        // 이끼 1단계: 80x80, 2단계: 100x100
        this.level = 1;      // 현재 성장 단계
        this.width = 80;     // 가로 크기
        this.height = 80;    // 세로 크기

        // 히트박스 설정
        // 이미지는 투명한 여백이 있으므로, 실제 크기의 60%만 충돌 영역으로 설정
        this.hitboxScale = 0.6; 
        
        this.angle = 0; // 이미지 회전 각도

        // 펄린 노이즈(Perlin Noise) 변수
        // 각 이끼마다 서로 다른 움직임을 갖도록 랜덤한 시작값을 부여
        this.xOff = random(1000); 
        this.yOff = random(1000); 

        // 생성과 동시에 화면 가장자리 중 한 곳으로 위치
        this.spawnAtEdge();
    }

    // 스폰 (Spawn)
    // 이끼를 화면의 상, 하, 좌, 우 가장자리 중 한 곳에 랜덤 배치
    spawnAtEdge() {
        let edge = floor(random(4));
        
        // 화면 밖 여유 공간 (생성되자마자 보이지 않고, 화면 밖에서 스르륵 들어오게 함)
        let buffer = max(this.width, this.height); 

        if (edge === 0) { 
            // 위쪽 생성 위치는 X축 랜덤, Y축은 화면 위(-buffer)
            this.pos.x = random(width);
            this.pos.y = -buffer;
            this.vel = createVector(random(-1, 1), random(1, 3)); // 아래로 내려오는 속도
        
        } else if (edge === 1) { 
            // 오른쪽 생성
            this.pos.x = width + buffer;
            this.pos.y = random(height);
            this.vel = createVector(random(-3, -1), random(-1, 1)); // 왼쪽으로 가는 속도
        
        } else if (edge === 2) { 
            // 아래쪽 생성
            this.pos.x = random(width);
            this.pos.y = height + buffer;
            this.vel = createVector(random(-1, 1), random(-3, -1)); // 위로 올라가는 속도
        
        } else { 
            // 왼쪽 생성
            this.pos.x = -buffer;
            this.pos.y = random(height);
            this.vel = createVector(random(1, 3), random(-1, 1)); // 오른쪽으로 가는 속도
        }
    }

    // 성장 (Grow)
    // 외부 조건(시간 경과 등) 충족되면 이끼의 크기 키움
    grow() {
        if (this.level < 2) {
            this.level++;
            this.width = 100;
            this.height = 100;
        }
    }

    // 업데이트 (Update)
    // 매 프레임 이끼의 위치와 상태 갱신
    update() {
        // noise() 값은 0~1 사이이므로, 이를 -0.05 ~ 0.05 사이의 미세한 힘으로 변환
        let nX = map(noise(this.xOff), 0, 1, -0.05, 0.05);
        let nY = map(noise(this.yOff), 0, 1, -0.05, 0.05);
        
        this.acc.add(nX, nY);   // 가속도에 힘 추가
        this.vel.add(this.acc); // 속도에 가속도 추가
        this.vel.limit(2);      // 속도 제한
        this.pos.add(this.vel); // 위치에 속도 추가

        // 가속도는 매 프레임 초기화
        this.acc.mult(0); 
        
        // 노이즈 오프셋을 조금씩 이동시켜 다음 프레임엔 다른 값을 얻음
        this.xOff += 0.01;
        this.yOff += 0.01;
        
        // 이동하는 방향(Velocity)을 바라보도록 이미지 회전 각도 설정
        this.angle = this.vel.heading();
    }

    // 화면 이탈 확인 (Optimization)
    // 이끼가 화면 밖으로 완전히 나갔는지 검사
    isOffScreen() {
        let buffer = max(this.width, this.height) * 2;
        return (this.pos.x < -buffer || this.pos.x > width + buffer ||
                this.pos.y < -buffer || this.pos.y > height + buffer);
    }

    // 충돌 감지 (Collision)
    checkCollision(target) {
        if (!target) return false;
        
        // (내 반지름 + 상대 반지름)보다 (두 점 사이의 거리)가 가까우면 충돌
        let myRadius = ((this.width + this.height) / 4) * this.hitboxScale;
        let targetRadius = (target.size ? target.size / 2 : 10); // 상대방 사이즈가 없으면 기본값 10
        
        let d = dist(this.pos.x, this.pos.y, target.x, target.y);
        
        return d < (myRadius + targetRadius);
    }

    // 렌더링 (Display)
    // 계산된 위치와 회전값을 바탕으로 화면에 이미지 그리기
    display() {
        push(); // [스타일 격리 시작] 이 객체의 설정이 다른 객체에 영향을 주지 않도록 함
        
        translate(this.pos.x, this.pos.y); // 기준점을 이끼의 위치로 이동
        rotate(this.angle);                // 이동 방향만큼 회전
        imageMode(CENTER);                 // 이미지의 중심을 기준점으로 설정
        
        // 이미지 출력
        image(this.img, 0, 0, this.width, this.height);

        // [디버그 모드] 개발용 히트박스 표시 (D키를 눌렀을 때만 보임)
        if (typeof debugMode !== 'undefined' && debugMode) {
            rectMode(CENTER);
            noFill();           // 채우기 없음
            stroke(255, 0, 0);  // 빨간색 테두리
            strokeWeight(2);    // 선 두께 2
            
            // 실제 충돌 판정 크기만큼 사각형 그리기
            rect(0, 0, this.width * this.hitboxScale, this.height * this.hitboxScale);
        }

        pop();
    }
}