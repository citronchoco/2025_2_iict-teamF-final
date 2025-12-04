let overBg;
let whiteOblique;
let overDescript;


function preload() {
 overBg = loadImage(`assets/background/tfour.jpg`)
 whiteOblique = loadFont(`assets/font/LeferiPointWhiteOblique.ttf`)
}


function setup() {
 createCanvas(1024, 768);
}


function draw() {
 drawOver();
}

function drawOver() {
 image(overBg, 0, 0, 1024, 768)
 
 // 종료 텍스트 표시
 overDescript = `PRESS    R    TO RESTART`
 
 textSize(40)
 fill(255)
 textFont(whiteOblique)
 textAlign(CENTER, CENTER)
 text(overDescript, 512, 384)

 fill(220, 220, 220, 100)
 stroke(235, 217, 148)
 ellipse(449, 391, 90, 90)
}