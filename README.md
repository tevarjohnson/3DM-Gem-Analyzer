# 3DM Gem Analyzer

A web-based tool for analyzing and visualizing diamond measurements from 3DM files. This application provides a modern interface for viewing 3D models and extracting detailed diamond measurements.

## Features

- 3D model visualization with interactive controls
- Automatic diamond measurement extraction
- Detailed summary of diamond sizes and counts
- Support for various diamond shapes (round, emerald, etc.)
- Modern, responsive user interface
- Offline-capable after initial setup

## Technology Stack

- Three.js for 3D rendering
- Rhino3dm.js for .3dm file parsing
- Tailwind CSS for styling
- Pure JavaScript (No framework dependencies)
- NPM for dependency management

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tevarjohnson/3DM-Gem-Analyzer.git
   cd 3DM-Gem-Analyzer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start a local server. You can use Python's built-in server:
   ```bash
   python -m http.server 8000
   ```
   Or any other local server of your choice.

4. Open `http://localhost:8000` in your web browser

## Usage

1. Click the file input button to select a .3dm file
2. The model will be displayed in the 3D viewer on the left
3. Use mouse controls to interact with the 3D model:
   - Left click + drag to rotate
   - Right click + drag to pan
   - Scroll to zoom
4. Diamond measurements and statistics will appear in the right panel

## Diamond Detection

The analyzer looks for meshes with names containing "diamond" and automatically:
- Calculates dimensions (width, height, depth)
- Determines shape based on name
- Groups similar sizes
- Provides total count and individual measurements

## Development

### Project Structure
```
3DM-Gem-Analyzer/
├── index.html          # Main HTML file
├── static/
│   └── js/
│       └── 3dm-analyzer.js  # Main JavaScript file
├── package.json         # NPM dependencies
└── README.md
```

### Dependencies
All dependencies are managed through npm:
- three.js (^0.158.0)
- rhino3dm (^8.4.0)
- es-module-shims (^1.8.2)

### Local Development
1. Make changes to the HTML or JavaScript files
2. Refresh your browser to see changes
3. No build step required

## Requirements

- Modern web browser with WebGL support
- Node.js and npm for dependency installation
- Local server for development

## License

MIT License
