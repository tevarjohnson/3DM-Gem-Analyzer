# 3DM Gem Analyzer

A web-based tool for analyzing and visualizing diamond measurements from 3DM files. This application provides a modern interface for viewing 3D models and extracting detailed diamond measurements.

## Features

- 3D model visualization with interactive controls
- Automatic diamond measurement extraction
- Detailed summary of diamond sizes and counts
- Support for various diamond shapes (round, emerald, etc.)
- Modern, responsive user interface

## Technology Stack

- Three.js for 3D rendering
- Rhino3dm.js for .3dm file parsing
- Tailwind CSS for styling
- Pure JavaScript (No framework dependencies)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/tevarjohnson/3DM-Gem-Analyzer.git
   ```

2. Open `3dm-analyzer.html` in a web browser

3. Upload a .3dm file containing diamond meshes
   - Ensure mesh names contain "diamond" for proper detection
   - Supported shapes: round, emerald, and custom shapes

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

## Requirements

- Modern web browser with WebGL support
- Internet connection (for loading required libraries)
- .3dm files with properly named diamond meshes

## License

MIT License
