# IFC Extractor n8n Node - Usage Guide

## Overview

The IFC Extractor is a custom n8n community node that allows you to extract information from IFC (Industry Foundation Classes) files using the web-ifc library. This node is perfect for Building Information Modeling (BIM) workflows and construction industry automation.

## Installation

### Option 1: Install from npm (when published)
```bash
npm install n8n-nodes-ifc-extractor
```

### Option 2: Install locally
1. Clone or download this repository
2. Build the project:
   ```bash
   npm install
   npm run build
   ```
3. Pack the node:
   ```bash
   npm pack
   ```
4. Install in your n8n instance:
   ```bash
   npm install ./n8n-nodes-ifc-extractor-0.1.0.tgz
   ```

### Option 3: Install via n8n Community Nodes
1. Go to **Settings > Community Nodes** in your n8n instance
2. Click **Install**
3. Enter `n8n-nodes-ifc-extractor` (when published)
4. Click **Install**

## Node Configuration

### Operations

#### 1. Extract All Elements
Extracts all elements from the IFC file with their types and basic information.

**Use Case**: Getting a complete overview of all objects in an IFC file.

**Output Example**:
```json
{
  "operation": "extractAll",
  "result": {
    "totalElements": 1250,
    "elements": [
      {
        "id": 123,
        "type": "IfcWall",
        "data": { /* Full IFC element data */ }
      }
    ]
  }
}
```

#### 2. Extract by Type
Extracts only elements of a specific IFC type.

**Parameters**:
- **IFC Type**: The IFC entity type to extract (e.g., IFCWALL, IFCDOOR, IFCWINDOW)

**Common IFC Types**:
- `IFCWALL` - Walls
- `IFCDOOR` - Doors
- `IFCWINDOW` - Windows
- `IFCSLAB` - Slabs (floors, ceilings)
- `IFCBEAM` - Beams
- `IFCCOLUMN` - Columns
- `IFCSTAIR` - Stairs
- `IFCRAILING` - Railings
- `IFCSPACE` - Spaces/rooms
- `IFCBUILDING` - Building information
- `IFCBUILDINGSTOREY` - Building stories/floors

**Output Example**:
```json
{
  "operation": "extractByType",
  "result": {
    "type": "IFCWALL",
    "count": 45,
    "elements": [
      {
        "id": 234,
        "type": "IFCWALL",
        "data": { /* Wall-specific data */ }
      }
    ]
  }
}
```

#### 3. Get File Info
Returns basic statistics about the IFC file.

**Use Case**: Quick analysis of file structure and element counts.

**Output Example**:
```json
{
  "operation": "getFileInfo",
  "result": {
    "totalElements": 1250,
    "typeStatistics": {
      "IfcWall": 45,
      "IfcDoor": 28,
      "IfcWindow": 67,
      "IfcSlab": 12
    }
  }
}
```

#### 4. Extract Properties
Extracts detailed properties for specific elements by their IDs.

**Parameters**:
- **Element IDs**: Comma-separated list of element IDs (e.g., "123,456,789")

**Use Case**: Getting detailed information about specific elements identified in previous operations.

**Output Example**:
```json
{
  "operation": "extractProperties",
  "result": {
    "requestedIds": [123, 456],
    "results": [
      {
        "id": 123,
        "type": "IfcWall",
        "element": { /* Element data */ },
        "properties": { /* Detailed properties */ }
      }
    ]
  }
}
```

### Input Data Source

#### Binary Data (Recommended)
Use binary data from a previous node (e.g., HTTP Request, Read Binary File).

**Configuration**:
- **Binary Property**: Name of the binary property containing IFC data (default: "data")

#### File Path
Specify a direct file path to the IFC file on the server.

**Configuration**:
- **File Path**: Absolute path to the IFC file

## Workflow Examples

### Example 1: Process IFC File from URL

```json
[HTTP Request] → [IFC Extractor]
```

**HTTP Request Node**:
- URL: `https://example.com/building.ifc`
- Response Format: File

**IFC Extractor Node**:
- Operation: Get File Info
- Input Data Source: Binary Data
- Binary Property: data

### Example 2: Extract All Walls from Local File

```json
[Read Binary File] → [IFC Extractor] → [Filter Walls] → [Process Results]
```

**Read Binary File Node**:
- File Path: `/path/to/building.ifc`

**IFC Extractor Node**:
- Operation: Extract by Type
- IFC Type: IFCWALL
- Input Data Source: Binary Data

### Example 3: Multi-Stage Analysis

```json
[HTTP Request] → [IFC Extractor: File Info] → [IFC Extractor: Extract Walls] → [IFC Extractor: Wall Properties]
```

This workflow:
1. Downloads an IFC file
2. Gets basic file statistics
3. Extracts all walls
4. Gets detailed properties for specific walls

### Example 4: Batch Processing Multiple IFC Files

```json
[Schedule Trigger] → [Read File List] → [HTTP Request (Batch)] → [IFC Extractor] → [Database Insert]
```

## Error Handling

The node includes comprehensive error handling:

- **Invalid IFC Files**: Returns error message with details
- **Missing Elements**: Skips problematic elements and continues processing
- **Unknown IFC Types**: Returns specific error about the invalid type
- **Network Issues**: Handles download failures gracefully

**Enable "Continue on Fail"** in the node settings to handle errors gracefully in your workflow.

## Performance Considerations

- **Large Files**: IFC files can be very large. Consider memory limits.
- **Element Count**: Extracting all elements from large files may take time.
- **Network**: Downloading large IFC files may require timeout adjustments.

## Best Practices

1. **Start Small**: Begin with "Get File Info" to understand the file structure.
2. **Filter Early**: Use "Extract by Type" to work with specific element types.
3. **Batch Properties**: Extract properties for multiple elements in one operation.
4. **Error Handling**: Always enable "Continue on Fail" for production workflows.
5. **Memory Management**: Process large files in chunks when possible.

## Troubleshooting

### Common Issues

1. **"Cannot find module 'web-ifc'"**
   - Solution: Ensure the node is properly installed with all dependencies

2. **"Unknown IFC type: IFCXXX"**
   - Solution: Check that the IFC type name is correct and supported

3. **"Could not read IFC file"**
   - Solution: Verify the file is a valid IFC format and not corrupted

4. **Memory errors with large files**
   - Solution: Process files in smaller chunks or increase Node.js memory limit

### Debug Tips

1. Use "Get File Info" first to understand the file structure
2. Enable detailed logging in n8n to see error details
3. Test with smaller IFC files first
4. Verify file integrity before processing

## Advanced Usage

### Custom Property Extraction

You can extend the node to extract specific properties by modifying the `extractProperties` function in the source code.

### Integration with Other Nodes

- **Database Nodes**: Store extracted data in PostgreSQL, MongoDB, etc.
- **HTTP Request**: Send data to external BIM systems
- **Spreadsheet**: Export to Excel or Google Sheets
- **Webhook**: Trigger external processes with extracted data

## Support and Contribution

- Report issues: Create an issue in the repository
- Feature requests: Submit enhancement requests
- Contributions: Pull requests are welcome

## License

MIT License - see LICENSE file for details.
