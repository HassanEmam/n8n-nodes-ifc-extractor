# Changelog

All notable changes to this project will be documented in this file.

## [0.5.7] - 2025-01-09

### Fixed
- **Model ID Validation**: Fixed issue where valid IFC models returning modelId 0 were incorrectly rejected
  - Changed validation logic to check model data availability instead of rejecting modelId 0 outright
  - ModelId -1 (documented failure value) is still immediately rejected
  - Only reject models where no data can be extracted via GetAllLines()
  - Based on web-ifc documentation indicating -1 as failure, not 0
- **Binary Data Handling**: Enhanced binary data extraction to handle both base64 encoded and raw text data
  - Added detection for different data formats (base64 vs text)
  - Fixed issue where HTTP Request nodes downloading IFC files as text/plain were causing parsing failures
  - Enhanced debug logging to show data format and conversion process
  - Properly handle both binary and text data sources from different n8n node outputs

### Enhanced
- **Debug Information**: Added comprehensive logging for model validation and data processing
- **Error Messages**: Improved error messages to better indicate the actual cause of model loading failures

## [0.5.6] - 2025-01-09

### Fixed
- **Binary Data Handling**: Improved binary data extraction to handle both base64 encoded and raw text data
  - Added detection for different data formats (base64 vs text)
  - Fixed issue where HTTP Request nodes downloading IFC files as text/plain were causing parsing failures
  - Enhanced debug logging to show data format and conversion process
  - Properly handle both binary and text data sources from different n8n node outputs

### Enhanced
- **Debug Information**: Added more detailed logging for binary data processing and format detection

## [0.5.5] - 2025-01-09

### Fixed
- **TypeScript Compatibility**: Fixed TypeScript build errors caused by incompatible zod dependency
  - Added package override to force zod 1.11.17 which is compatible with TypeScript 4.8.4
  - Resolved 119 TypeScript compilation errors related to modern const type parameters
  - Build now compiles successfully without errors

### Enhanced
- **Debug Logging**: Enhanced debug output for IFC file loading and WASM path detection
- **Binary Data Extraction**: Improved binary data extraction logic to handle various n8n property structures
- **Error Messages**: Better error messages for model loading failures with detailed debug information

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
