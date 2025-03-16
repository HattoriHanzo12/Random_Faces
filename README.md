# Random_Faces Project

## Overview
This project creates unique Random Faces as PNG inscriptions on the Bitcoin blockchain using the Ordinals protocol. The faces are generated with random backgrounds, colors, eye shapes (circular or oval), and smile heights using p5.js.

## Workflow
1. **Generate PNGs**:
   - Use the `sketch.js` code in the [p5.js web editor](https://editor.p5js.org/) to generate `random_face_mint_1.png` and `random_face_mint_2.png`.
   - Run the code to download the PNG files to your computer.
   - Move the PNGs to the `visuals/` folder in this project.

2. **Inscribe PNGs**:
   - Use the UniSat wallet ([https://unisat.io/](https://unisat.io/)) to inscribe the PNGs on the Bitcoin blockchain.
   - Set the fee rate to 10 sat/vB and note the inscription IDs.

3. **Update Documentation**:
   - Add the inscription IDs to `parent_list.txt` and this `README.md`.

## Inscriptions
- **Parent Logic (Visuals.js) (Optional - no longer used for rendering)**:  
Inscription ID: 1783d64438889e7c632f0e402186cdcaa778d7b06b08de7dfb18d3fb76c2c9c4i0
- **Random Face Mint 1 (PNG)**:  
![Random Face Mint 1](visuals/random_face_mint_1.png)  
Inscription ID: 0373d422950c4085f7e23f5ae2860e31bd25ae73cfba27b3faeecf11495f1aa1i0
- **Random Face Mint 2 (PNG)**:  
![Random Face Mint 2](visuals/random_face_mint_2.png)  
Inscription ID: 8a8583c22b2f411bb3a05a8be51f0cb361b48d8693f9f139bd6cd78a67e1e1edi0
## Files
- `sketch.js`: p5.js code to generate random face PNGs.
- `visuals/random_face_mint_1.png`: First inscribed random face.
- `visuals/random_face_mint_2.png`: Second inscribed random face.
- `JS_generate.js`: Optional script for generating HTML files (not currently used).
- `parent_list.txt`: Tracks inscription IDs.
- `.gitignore`: Ignores temporary files.
- `LICENSE`: Project license.
- `src/Visuals/`: Contains `Visuals.js` (optional legacy file).

## Getting Started
1. Install the [p5.js web editor](https://editor.p5js.org/) or use a local p5.js setup.
2. Run `sketch.js` to generate new PNGs.
3. Inscribe the PNGs using UniSat and update the IDs here.

## Contributors
- HattoriHanzo12
- Grok

## License
This project is licensed under the [MIT License](LICENSE).
