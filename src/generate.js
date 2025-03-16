const fs = require("fs");

for (let i = 1; i <= 100; i++) {
    const bgR = Math.floor(Math.random() * 255);
    const bgG = Math.floor(Math.random() * 255);
    const bgB = Math.floor(Math.random() * 255);
    const headSize = Math.random() * 150 + 100; // 100-250
    const eyeSize = Math.random() * 30 + 30; // 30-60
    const pupilSize = Math.random() * 10 + 8; // 8-18
    const mouthWidth = Math.random() * 60 + 40; // 40-100
    const headColor = Math.floor(Math.random() * 255);

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Inscription ${i} - Random Variant</title>
    </head>
    <body>
        <input type="hidden" id="bgR" value="${bgR}">
        <input type="hidden" id="bgG" value="${bgG}">
        <input type="hidden" id="bgB" value="${bgB}">
        <input type="hidden" id="headSize" value="${headSize}">
        <input type="hidden" id="eyeSize" value="${eyeSize}">
        <input type="hidden" id="pupilSize" value="${pupilSize}">
        <input type="hidden" id="mouthWidth" value="${mouthWidth}">
        <input type="hidden" id="headColor" value="${headColor}">
        <script src="https://cdn.jsdelivr.net/npm/p5@1.4.2/lib/p5.js"></script>
        <script>
        function setup() {
            createCanvas(400, 400);
            const bgR = parseInt(document.getElementById("bgR").value);
            const bgG = parseInt(document.getElementById("bgG").value);
            const bgB = parseInt(document.getElementById("bgB").value);
            const headSize = parseFloat(document.getElementById("headSize").value);
            const eyeSize = parseFloat(document.getElementById("eyeSize").value);
            const pupilSize = parseFloat(document.getElementById("pupilSize").value);
            const mouthWidth = parseFloat(document.getElementById("mouthWidth").value);
            const headColor = parseInt(document.getElementById("headColor").value);
            background(bgR, bgG, bgB);
            drawFace(200, 200, headSize, headColor, eyeSize, pupilSize, mouthWidth, 0);
        }

        function drawFace(x, y, headSize, headColor, eyeSize, pupilSize, mouthWidth, depth) {
            if (depth > 2) return;
            fill(headColor, 150, 100);
            ellipse(x, y, headSize, headSize);
            fill(0);
            ellipse(x - headSize / 4, y - headSize / 8, eyeSize, eyeSize);
            ellipse(x + headSize / 4, y - headSize / 8, eyeSize, eyeSize);
            fill(255);
            ellipse(x - headSize / 4, y - headSize / 8, pupilSize, pupilSize);
            ellipse(x + headSize / 4, y - headSize / 8, pupilSize, pupilSize);
            noFill();
            stroke(0);
            arc(x, y + headSize / 8, mouthWidth, headSize / 4, 0, PI);
            drawFace(x, y + headSize / 2, headSize * 0.5, headColor, eyeSize * 0.5, pupilSize * 0.5, mouthWidth * 0.5, depth + 1);
        }
        </script>
    </body>
    </html>
    `;

    const minifiedHtml = html.replace(/\s+/g, '').replace(/>\s+</g, '><');
    fs.writeFileSync(`inscription_${i}_compressed.html`, minifiedHtml);
}

console.log("Generated 100 compressed HTML files!");