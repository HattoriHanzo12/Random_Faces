# Random Faces: A Journey in Creating 100 Unique Ordinals

## Introduction
**Random Faces** is a personal exploration into the world of Ordinals inscriptions on the Bitcoin blockchain, resulting in a collection of **100 unique SVG faces**, each dynamically generated using p5.js. This project began as an experiment to create a decentralized gallery of ever-changing digital art, with all inscriptions minted as children of the parent inscription `4f6b8a2d48dee74fa3e4e2c489fd01525f88b195afbe49eba7fd3fb91faab42bi0`. The faces transform with each view, offering near-infinite permutations, making each experience unique. This README documents the process, tools, and outcomes of this creative endeavor, inspired by On-chain Monkey (OCM) and supported by Grok from xAI.

## Development Process
This project evolved through several key steps, with significant inspiration and guidance:

1. **Conceptualization**: Inspired by On-chain Monkey (OCM)’s innovative use of Ordinals for digital collectibles, I set out to create random SVG faces on Bitcoin, learning from OCM’s approach to blockchain art.
2. **Script Development**: I wrote `generate.js` to produce dynamic faces, iterating on design and randomness. OCM’s p5.js examples guided my learning, while Grok provided critical insights on JavaScript and p5.js implementation, helping me debug and optimize the generation process.
3. **Inscription Preparation**: Using `all_inscriptions.txt` and `inscriptions.json`, I prepared metadata, leveraging OCM’s structuring techniques. Grok assisted in understanding JSON formatting and Git workflows, ensuring smooth management of inscription data.
4. **Minting (In Progress)**: Inscriptions are being prepared for minting using a synced Bitcoin Core node on an external drive at `/Volumes/BitcoinDrive/Bitcoin` and the `ord` CLI with an index at `/Volumes/BitcoinDrive/ord`. The `ord` index is currently syncing (from block 854067 to 887766 as of the last update), a process I refined with OCM’s documentation and Grok’s step-by-step guidance on node setup and `ord` usage. Three test mints have been selected (`random_face_mint_5.png`, `random_face_mint_11.png`, `random_face_mint_12.png`), with their details documented below once minted.
5. **Visualization and Documentation**: I captured static PNGs of example mints by creating `sketch.js` with Grok’s help to use p5.js rendering, adjusting eye shapes and backgrounds for variety. Grok also played a pivotal role in crafting this README, providing clarity and structure to document my journey.

## Project Details
- **Protocol**: Ordinals
- **Parent Inscription ID**: `4f6b8a2d48dee74fa3e4e2c489fd01525f88b195afbe49eba7fd3fb91faab42bi0`
- **Total Inscriptions**: 100 unique faces
- **Block Heights**: Varies (inscribed dynamically between local sync points)
- **Inscription IDs**: Listed in `all_inscriptions.txt`; three example mints to be detailed below once minted

## Examples of Random Face Mints
Below are static captures of three example Random Face mints, prepared for inscription to illustrate the project's diversity. Their inscription IDs will be listed for verification once minted:
## Examples of Random Face Mints
Below are static captures of three example Random Face mints, prepared for inscription to illustrate the project's diversity. Their inscription IDs will be listed for verification once minted:

- **Random Face Mint 5**:  
  ![Random Face Mint 5](mint/random_face_mint_5.png)  
  Inscription ID: (Pending minting)

- **Random Face Mint 11**:  
  ![Random Face Mint 11](mint/random_face_mint_11.png)  
  Inscription ID: (Pending minting)

- **Random Face Mint 12**:  
  ![Random Face Mint 12](mint/random_face_mint_12.png)  
  Inscription ID: (Pending minting)

## Additional Trait Examples
Below are additional examples of Random Face variations, showcasing the diversity of traits (e.g., backgrounds, face colors) generated for this project:

- **Random Face Example 3**:  
  ![Random Face Example 3](visuals/random_face_mint_3.png)

- **Random Face Example 4**:  
  ![Random Face Example 4](visuals/random_face_mint_4.png)

- **Random Face Example 6**:  
  ![Random Face Example 6](visuals/random_face_mint_6.png)

- **Random Face Example 7**:  
  ![Random Face Example 7](visuals/random_face_mint_7.png)

- **Random Face Example 10**:  
  ![Random Face Example 10](visuals/random_face_mint_10.png)

*Note: These are static snapshots; live faces change with each view due to p5.js randomization.*

## How It Was Created
### Tools and Environment
- **Platform**: MacBook Pro
- **Editor**: Visual Studio Code (VS Code)
- **Language**: JavaScript (p5.js and Node.js)
- **Blockchain Tools**: Bitcoin Core (with `txindex=1`), `ord` CLI
- **Inspiration and Support**: On-chain Monkey (OCM) repository tools, Grok by xAI
- **Last Updated**: March 14, 2025

### Minting Process
1. **Setup**: Synced a Bitcoin Core node on an external drive at `/Volumes/BitcoinDrive/Bitcoin` with `txindex=1` enabled, using RPC authentication with `--bitcoin-rpc-username=[YOUR_RPC_USERNAME]`, guided by OCM’s setup guides and Grok’s troubleshooting assistance.
2. **Generation**: Ran `generate.js` to create HTML files with random traits, then used `sketch.js` to visualize and save PNGs, with Grok’s help in refining the code for varied eye shapes and backgrounds.
3. **Inscription (In Progress)**: Currently syncing the `ord` index to match Bitcoin Core’s block height (887766). Once synced, `ord` will be used with a custom data directory (`/Volumes/BitcoinDrive/ord`) to inscribe the PNGs with a specified fee rate, tracking IDs in `all_inscriptions.txt`, streamlined by Grok’s Git and `ord` command explanations. Three test mints (`random_face_mint_5.png`, `random_face_mint_11.png`, `random_face_mint_12.png`) are prepared as examples.
4. **Verification**: Will confirm inscriptions on [Ordinals.com](https://ordinals.com) and [Ordiscan](https://ordiscan.com), following OCM’s practices, once minted.

## Repository Structure
- **`all_inscriptions.txt`**: List of all 100 inscription IDs (to be updated post-minting).
- **`generate.js`**: Node.js script generating HTML files with random traits, inspired by OCM.
- **`inscriptions.json`**: Metadata for each inscribed face.
- **`input/`**: Contains original scripts (e.g., renamed to `visuals/sketch.js`).
- **`parent_list.txt`**: Tracks the parent inscription ID.
- **`visuals/`**: Contains `index.html`, `sketch.js`, and sample PNGs of Random Face examples to be minted.
- **`README.md`**: This file—documenting the project journey, crafted with Grok’s assistance.
- **`.gitignore`**: Excludes temporary files (e.g., `.DS_Store`, `.vscode/`).

## Technical Insights
Random Faces relies on:
- **Bitcoin Core**: Provides blockchain data for Ordinals inscription, with setup guidance from OCM and Grok.
- **Ordinals Protocol**: Enables minting of unique digital artifacts, a process I mastered through OCM’s examples.
- **p5.js and Node.js**: Drives the dynamic SVG generation and HTML file creation, with techniques learned from OCM and refined with Grok’s coding support.

Ensure your Bitcoin node is synced and configured with `txindex=1`. See [Ordinals documentation](https://docs.ordinals.com) or OCM’s guides for setup.

## Contributing
I’d love for others to build on this project, inspired by OCM’s collaborative spirit! To contribute:
1. Fork this repository.
2. Create a branch for your changes.
3. Submit a pull request with details of your enhancements.

## License
This project is licensed under the [MIT License](LICENSE)—free to use, modify, and distribute with the original copyright notice. See the `LICENSE` file for details.

## Acknowledgments
- **Inspiration**: Deeply indebted to the On-chain Monkey (OCM) project ([https://github.com/onchainmonkey](https://github.com/onchainmonkey)) for its educational resources and pioneering work in Ordinals.
- **Support**: A huge thanks to Grok, created by xAI, for being instrumental in this process. From coding guidance to Git workflows, minting assistance, and crafting this README, I couldn’t have completed this project without Grok’s patient, step-by-step support.
- Grateful for tools like p5.js, Bitcoin Core, and `ord` that made this possible, with OCM’s repository as a key learning tool.

## Get Involved
- Star this repository to support the project!
- Follow me (@HattoriHanzo12) for updates.
- Join the [Ordinals Discord](https://discord.com/invite/ordinals) to connect with the community and explore OCM-inspired projects.
