# Changelog

All notable changes to this project will be documented in this file.

## [0.6.1] - 2025-07-05

### Fixed
- **GLB Export Performance**: Major optimization to prevent hanging during GLB conversion
  - Implemented mesh batching to group meshes by material (max 100 meshes per batch)
  - Added geometry merging to reduce the number of objects processed by GLTFExporter
  - Added 30-second timeout to prevent infinite hanging
  - Simplified Node.js polyfills to reduce complexity and potential conflicts
  - Based approach on proven ifc2gltf example using optimized Three.js workflow

### Enhanced
- **Memory Management**: Improved memory usage during GLB export
  - Disposed individual geometries after merging to free memory
  - Batch processing to prevent overwhelming the GPU/memory
  - Optimized material grouping to reduce draw calls

### Technical
- **Architecture**: Completely rewrote GLB exporter for better performance
  - Removed complex scene management in favor of direct object export
  - Implemented geometry batching based on Three.js best practices
  - Added comprehensive error handling and timeout mechanisms

## [0.6.0] - 2025-07-05ngelog

All notable changes to this project will be documented in this file.

## [0.6.1] - 2025-07-05

### Fixed
- **GLB Export Hanging Issue**: Resolved workflow getting stuck at GLB conversion step
  - Added 60-second timeout to prevent infinite hanging during GLB export
  - Implemented mesh batching (max 100 meshes per batch) to handle large scenes efficiently
  - Enhanced FileReader polyfill with proper async behavior using setTimeout
  - Added comprehensive logging throughout GLB export process for debugging
  - Added performance warnings for scenes with >1M vertices

### Enhanced
- **Large Scene Handling**: Optimized for processing 660+ meshes without hanging
  - Batch processing to prevent memory issues with large numbers of meshes
  - Progress logging during mesh processing
  - Better error handling with try-catch around GLTFExporter.parse

## [0.6.0] - 2025-07-05

### Fixed
- **GLB Export in Node.js Environment**: Fixed critical "FileReader is not defined" error in GLB conversion
  - Added Node.js polyfills for browser APIs (FileReader, Blob, URL.createObjectURL) required by Three.js GLTFExporter
  - Implemented compatible FileReader class with readAsArrayBuffer and readAsDataURL methods
  - Added Blob polyfill with proper arrayBuffer() method implementation
  - GLB export now works correctly in n8n/Docker/Node.js environments

### Confirmed Working
- **Mesh Extraction**: Confirmed successful extraction of 660+ meshes from IFC files
  - StreamAllMeshes implementation working as expected
  - All geometry extraction strategies functioning properly
  - Ready for complete IFC to GLB conversion pipeline

## [0.5.9] - 2025-07-05

### Enhanced
- **Geometry Extraction**: Implemented official web-ifc StreamAllMeshes approach for robust mesh extraction
  - Added StreamAllMeshes with geometryExpressID-based geometry extraction (following official web-ifc examples)
  - Implemented createMeshFromArrays method to properly handle vertex/index data conversion
  - Enhanced multiple fallback strategies: direct entity search, StreamAllMeshes, and product entity search
  - Improved WASM path detection for various deployment environments (Docker, n8n cloud, local)

### Fixed
- **TypeScript Compilation**: Fixed null check errors in mesh extraction pipeline
  - Resolved geometryExpressID null checking in StreamAllMeshes callback
  - Added proper type guards for safer geometry processing
- **Build System**: Successfully built and packaged version 0.5.9
  - All TypeScript compilation errors resolved
  - Package ready for npm publication and n8n installation

## [0.5.8] - 2025-01-09

### Enhanced
- **Mesh Extraction**: Significantly improved geometry extraction to handle various IFC geometric entities
  - Added support for multiple IFC geometry types: IFCEXTRUDEDAREASOLID, IFCTRIANGULATEDFACESET, IFCPOLYGONALFACESET, IFCFACETEDBREP, and more
  - Implemented LoadAllGeometry fallback for comprehensive geometry extraction
  - Added PlacedGeometry support for transformed meshes from FlatMesh objects
  - Enhanced logging to show entity types found and extraction progress
  - Better error handling for geometry extraction failures

### Fixed
- **Geometry Detection**: Fixed issue where IFC files with valid geometry were not being processed
  - Changed from only looking for IFCGEOMETRICREPRESENTATIONITEM to checking multiple geometry types
  - Added fallback to LoadAllGeometry API when direct geometry extraction fails
  - Improved mesh data extraction from various IFC geometry representations

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
