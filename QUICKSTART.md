# Quick Start Guide - IFC Extractor n8n Node

## Installation

### For n8n Cloud/Self-hosted
1. Download the package: `n8n-nodes-ifc-extractor-0.1.0.tgz`
2. In n8n, go to **Settings > Community Nodes**
3. Click **Install**
4. Enter the path to the .tgz file or upload it
5. Restart n8n

### For Local Development
```bash
# Clone this repository
git clone <repository-url>
cd n8n-ifc-extractor

# Install and build
npm install
npm run build

# Test the node
npm test

# Create package
npm run package
```

## Basic Usage

### 1. Get IFC File Information
```
[HTTP Request] → [IFC Extractor]
```
- **HTTP Request**: Download IFC file from URL
- **IFC Extractor**: 
  - Operation: "Get File Info"
  - Input Data Source: "Binary Data"

### 2. Extract Specific Elements
```
[Read Binary File] → [IFC Extractor]
```
- **Read Binary File**: Load local IFC file
- **IFC Extractor**:
  - Operation: "Extract by Type"
  - IFC Type: "IFCWALL" (or IFCDOOR, IFCWINDOW, etc.)
  - Input Data Source: "Binary Data"

### 3. Analyze Element Properties
```
[IFC Extractor: Extract Walls] → [IFC Extractor: Properties]
```
- **First IFC Extractor**: Get wall IDs
- **Second IFC Extractor**:
  - Operation: "Extract Properties" 
  - Element IDs: "123,456,789" (from previous step)

## Common IFC Types
- `IFCWALL` - Walls
- `IFCDOOR` - Doors
- `IFCWINDOW` - Windows
- `IFCSLAB` - Floors/Ceilings
- `IFCBEAM` - Beams
- `IFCCOLUMN` - Columns
- `IFCSPACE` - Rooms/Spaces

## Example Workflow

Import this example workflow into n8n:

```json
{
  "name": "IFC Processing Example",
  "nodes": [
    {
      "parameters": {
        "url": "https://example.com/sample.ifc",
        "options": {
          "response": {
            "responseFormat": "file"
          }
        }
      },
      "name": "Download IFC File",
      "type": "n8n-nodes-base.httpRequest"
    },
    {
      "parameters": {
        "operation": "getFileInfo",
        "inputDataSource": "binaryData"
      },
      "name": "Get File Info",
      "type": "n8n-nodes-ifc-extractor.ifcExtractor"
    }
  ],
  "connections": {
    "Download IFC File": {
      "main": [["Get File Info"]]
    }
  }
}
```

## Troubleshooting

### Node Not Appearing
1. Verify installation: Check if the package is in node_modules
2. Restart n8n completely
3. Check n8n logs for errors

### "Module not found" Errors
1. Ensure all dependencies are installed: `npm install`
2. Rebuild the project: `npm run build`
3. Check that web-ifc is properly installed

### Memory Issues with Large Files
1. Increase Node.js memory: `node --max-old-space-size=4096`
2. Process files in smaller chunks
3. Use "Get File Info" first to check file size

## Next Steps

1. **Read the full documentation**: `USAGE.md`
2. **Try the example workflows**: `examples/`
3. **Explore IFC file structure**: Start with "Get File Info"
4. **Build complex workflows**: Combine with other n8n nodes

## Support

- **Issues**: Report bugs in the repository
- **Questions**: Check the documentation or create an issue
- **Feature Requests**: Submit enhancement requests

---

**Happy Building! 🏗️**
