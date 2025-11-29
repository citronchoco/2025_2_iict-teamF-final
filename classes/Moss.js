class Moss {
    constructor(img) {
        // 속성 초기화
        this.img = img;                 // preload 이미지 객체
        this.pos = createVector(0, 0);  // 위치
        this.vel = createVector(0, 0);  // 속도
        this.acc = createVector(0, 0);  // 가속도
        
        // 크기 및 히트박스 설정
        this.size = 60;          // 이미지 크기
        this.hitboxScale = 0.7;  // 히트박스 비율
        this.angle = 0;          // 회전 각도

        // 펄린 노이즈 오프셋
        this.xOff = random(1000); 
        this.yOff = random(1000); 

        // 생성 시 위치 설정
        this.spawnAtEdge();
    }

    // 화면 4면 가장자리에서 랜덤 스폰
    spawnAtEdge() {
        let edge = floor(random(4)); // 0:상, 1:우, 2:하, 3:좌

        if (edge === 0) { // 위
            this.pos.x = random(width);
            this.pos.y = -this.size;
            this.vel = createVector(random(-1, 1), random(1, 3));
        } else if (edge === 1) { // 오른쪽
            this.pos.x = width + this.size;
            this.pos.y = random(height);
            this.vel = createVector(random(-3, -1), random(-1, 1));
        } else if (edge === 2) { // 아래
            this.pos.x = random(width);
            this.pos.y = height + this.size;
            this.vel = createVector(random(-1, 1), random(-3, -1));
        } else { // 왼쪽
            this.pos.x = -this.size;
            this.pos.y = random(height);
            this.vel = createVector(random(1, 3), random(-1, 1));
        }
    }

    update() {
        // 펄린 노이즈 이동
        let nX = map(noise(this.xOff), 0, 1, -0.05, 0.05);
        let nY = map(noise(this.yOff), 0, 1, -0.05, 0.05);
        
        this.acc.add(nX, nY);
        this.vel.add(this.acc);
        this.vel.limit(2);
        this.pos.add(this.vel);

        this.acc.mult(0); 
        this.xOff += 0.01;
        this.yOff += 0.01;
        
        this.angle = this.vel.heading();
    }

    display() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle);
        imageMode(CENTER);
        
        image(this.img, 0, 0, this.size, this.size);

        // 디버그 모드 (D)
        if (typeof debugMode !== 'undefined' && debugMode) {
            rectMode(CENTER);
            noFill();
            stroke(255, 0, 0);
            strokeWeight(2);
            rect(0, 0, this.size * this.hitboxScale, this.size * this.hitboxScale);
        }
        pop();
    }
}