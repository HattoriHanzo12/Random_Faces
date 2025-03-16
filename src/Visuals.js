function setup() {
    createCanvas(400, 400);

    // Read values from the HTML inputs
    const bgR = parseInt(document.getElementById("bgR").value);
    const bgG = parseInt(document.getElementById("bgG").value);
    const bgB = parseInt(document.getElementById("bgB").value);
    const headSize = parseFloat(document.getElementById("headSize").value);
    const eyeSize = parseFloat(document.getElementById("eyeSize").value);
    const pupilSize = parseFloat(document.getElementById("pupilSize").value);
    const mouthWidth = parseFloat(document.getElementById("mouthWidth").value);
    const headColor = parseInt(document.getElementById("headColor").value);

    // Set the background color
    background(bgR, bgG, bgB);

    // Draw the face recursively
    drawFace(200, 200, headSize, headColor, eyeSize, pupilSize, mouthWidth, 0);
}

function drawFace(x, y, headSize, headColor, eyeSize, pupilSize, mouthWidth, depth) {
    if (depth > 2) return; // Base case to stop recursion

    // Draw the head
    fill(headColor, 150, 100);
    ellipse(x, y, headSize, headSize);

    // Draw eyes
    fill(0);
    ellipse(x - headSize / 4, y - headSize / 8, eyeSize, eyeSize); // Left eye
    ellipse(x + headSize / 4, y - headSize / 8, eyeSize, eyeSize); // Right eye

    // Draw pupils
    fill(255);
    ellipse(x - headSize / 4, y - headSize / 8, pupilSize, pupilSize);
    ellipse(x + headSize / 4, y - headSize / 8, pupilSize, pupilSize);

    // Draw mouth
    noFill();
    stroke(0);
    arc(x, y + headSize / 8, mouthWidth, headSize / 4, 0, PI);

    // Recursive call: Draw a smaller face inside
    drawFace(x, y + headSize / 2, headSize * 0.5, headColor, eyeSize * 0.5, pupilSize * 0.5, mouthWidth * 0.5, depth + 1);
}