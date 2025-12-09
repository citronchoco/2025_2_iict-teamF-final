class Seed {
    constructor(x, y, img) {
        this.x = x;
        this.y = y;
        this.img = img;
        this.speed = 4; // 떨어지는 속도
        this.size = 100; // 씨앗 이미지 크기
        this.landed = false;
        this.startTime = frameCount; // 생성 시점 기록
    }

    update() {
        if (!this.landed) {
            this.y += this.speed;
            // 바닥에 닿았는지 확인
            if (this.y >= height + this.size / 2) { 
                this.y = height + this.size / 2;
                this.landed = true;
                return true; 
            }
        }
        return false;
    }

    display() {
        push();
        imageMode(CENTER);
        // 착륙 후 잠시 후 사라지도록 투명도 조정 (선택 사항)
        let opacity = 255;
        if (this.landed && frameCount > this.startTime + 120) {
             opacity = map(frameCount, this.startTime + 120, this.startTime + 180, 255, 0);
        }
        tint(255, opacity);

        if (this.img) {
            image(this.img, this.x, this.y, this.size, this.size);
        } else {
            // 이미지가 없으면 임시로 작은 원으로 표시
            fill(139, 69, 19, opacity); 
            ellipse(this.x, this.y, this.size);
        }
        pop();
    }
}