const fs = require("fs");

for (let i = 1; i <= 129; i++) {
  const bgR = Math.floor(Math.random() * 255);
  const bgG = Math.floor(Math.random() * 255);
  const bgB = Math.floor(Math.random() * 255);
  const headSize = Math.random() * 150 + 100; // 100-250
  const eyeSize = Math.random() * 30 + 30; // 30-60
  const pupilSize = Math.random() * 10 + 8; // 8-18
  const mouthWidth = Math.random() * 60 + 40; // 40-100
  const headColor = Math.floor(Math.random() * 255);

  const html = `
  <html>
    <body>
      <input type="hidden" id="bgR" value="${bgR}">
      <input type="hidden" id="bgG" value="${bgG}">
      <input type="hidden" id="bgB" value="${bgB}">
      <input type="hidden" id="headSize" value="${headSize}">
      <input type="hidden" id="eyeSize" value="${eyeSize}">
      <input type="hidden" id="pupilSize" value="${pupilSize}">
      <input type="hidden" id="mouthWidth" value="${mouthWidth}">
      <input type="hidden" id="headColor" value="${headColor}">
      <script src="/content/145a8210e26bdc25ba5375084e03539cb1d634df7c4e75dea8a2d6eeaeed2f35i0"></script>
    </body>
  </html>
  `;

  fs.writeFileSync(`inscription_${i}.html`, html);
}
console.log("Generated 129 HTML files!");
