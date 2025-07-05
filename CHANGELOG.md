# Changelog

All notable changes to this project will be documented in this file.

## [0.5.2] - 2025-07-05

### Fixed
- **WASM Path Resolution**: Enhanced WASM file path detection for web-ifc in various n8n deployment environments
- **Initialization Robustness**: Implemented multiple fallback strategies for web-ifc initialization:
  - Default initialization (no custom WASM path)
  - Module resolution-based path detection
  - Directory search with extended path list including Docker/container paths
  - CDN fallback for web environments
- **Error Handling**: Improved error messages and debugging information for WASM loading issues
- **Cross-Environment Support**: Added support for various deployment scenarios including:
  - Standard n8n installations
  - Docker containers
  - Cloud deployments
  - Custom n8n setups

### Changed
- Enhanced logging for better troubleshooting of WASM path issues
- Added directory content debugging for failed WASM path resolution

## [0.5.1] - 2025-07-05

### Fixed
- Improved WASM path handling for web-ifc in n8n environments
- Added dynamic path resolution and fallback logic

## [0.5.0] - 2025-07-05

### Added
- **GLB Analyzer Node**: New node for analyzing GLB files with detailed geometry properties
  - Volume calculations for each mesh
  - Face area measurements
  - Perimeter calculations
  - Surface orientations analysis
  - Dimensional measurements (width, height, depth)
  - Metadata extraction (vertex/face counts, materials)
- **Comprehensive Analysis Output**: JSON output with summary statistics and per-mesh details

## [0.4.0] - 2025-07-05

### Added
- **IFC to GLB Converter Node**: New node for converting IFC files to GLB (GLTF Binary) format
  - Mesh extraction with materials
  - Configurable precision and compression
  - Three.js integration for 3D processing
  - Binary GLB output for 3D visualization

## [0.3.0] - 2025-07-05

### Changed
- **Modular Architecture**: Refactored codebase into modular TypeScript structure
  - Separated extractors into individual classes
  - Added proper TypeScript interfaces
  - Improved code organization and maintainability

## [0.2.0] - 2025-07-05

### Added
- Element properties extraction with filtering
- Property-specific extraction operations
- Enhanced error handling

### Fixed
- SVG icon rendering issues
- Package structure improvements

## [0.1.2] - 2025-07-05

### Fixed
- SVG icon display issues in n8n interface

## [0.1.1] - 2025-07-05

### Added
- Initial release with basic IFC extraction functionality
- Support for extracting all elements, elements by type, and properties
- Integration with web-ifc library
