# n8n-nodes-ifc-extractor

This is an n8n community node that allows you to extract information from IFC (Industry Foundation Classes) files using the web-ifc library. IFC files are commonly used in Building Information Modeling (BIM) and construction industry.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-ifc-extractor` in **Enter npm package name**.
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes.
5. Select **Install**.

After installation, the **IFC Extractor** node will be available in your n8n instance.

## Operations

### Extract All Elements
Extracts all elements from the IFC file and returns them with their types and data. Optionally includes resolved properties from property sets.

### Extract by Type
Extracts only elements of a specific IFC type (e.g., IFCWALL, IFCDOOR, IFCWINDOW, etc.). Optionally includes resolved properties from property sets.

### Extract Elements with Properties
Specialized operation that extracts elements and automatically resolves their properties using IFC relationships (IfcRelDefinesByProperties). Returns only elements that have properties attached.

### Get File Info
Returns basic information about the IFC file, including total element count and statistics by type.

### Extract Properties
Extracts detailed properties for specific elements by their IDs.

## Configuration

### Input Data Source
- **Binary Data**: Use binary data from a previous node (e.g., from HTTP Request or Read Binary File nodes)
- **File Path**: Specify a direct file path to the IFC file

### Parameters
- **Include Properties**: Whether to automatically resolve and include element properties (for Extract All/By Type operations)
- **IFC Type**: When using "Extract by Type", specify the IFC entity type (e.g., IFCWALL, IFCDOOR)
- **Filter Elements**: When using "Extract Elements with Properties", specify comma-separated IFC types to include (leave empty for all)
- **Element IDs**: When using "Extract Properties", provide comma-separated element IDs
- **Binary Property**: Name of the binary property containing the IFC data (default: "data")
- **File Path**: Direct path to the IFC file when using file path input

## Property Resolution

The node can automatically resolve element properties by following IFC relationships:

- **IfcRelDefinesByProperties**: Links elements to property sets
- **IfcPropertySet**: Contains groups of properties
- **IfcPropertySingleValue**: Individual property values
- **IfcPropertyEnumeratedValue**: Properties with enumerated values
- **IfcPropertyListValue**: Properties with multiple values
- **IfcPropertyBoundedValue**: Properties with upper/lower bounds

Properties are organized by property set name and include:
- Property name and description
- Property value (with proper type conversion)
- Property units (when available)
- Property type information

## Usage Examples

### Example 1: Extract All Walls from an IFC File
1. Use **HTTP Request** node to download an IFC file
2. Connect to **IFC Extractor** node
3. Set operation to "Extract by Type"
4. Set IFC Type to "IFCWALL"
5. Set Input Data Source to "Binary Data"

### Example 2: Get File Statistics
1. Use **Read Binary File** node to read a local IFC file
2. Connect to **IFC Extractor** node
3. Set operation to "Get File Info"
4. Set Input Data Source to "Binary Data"

### Example 3: Extract Properties for Specific Elements
1. First run "Extract All Elements" or "Extract by Type" to get element IDs
2. Use another **IFC Extractor** node
3. Set operation to "Extract Properties"
4. Enter the element IDs you want to analyze

## Common IFC Types

Here are some common IFC entity types you can extract:

- `IFCWALL` - Walls
- `IFCDOOR` - Doors  
- `IFCWINDOW` - Windows
- `IFCSLAB` - Slabs (floors, ceilings)
- `IFCBEAM` - Beams
- `IFCCOLUMN` - Columns
- `IFCSTAIR` - Stairs
- `IFCRAILING` - Railings
- `IFCFURNISHINGELEMENT` - Furniture
- `IFCSPACE` - Spaces/rooms
- `IFCBUILDING` - Building information
- `IFCBUILDINGSTOREY` - Building stories/floors

## Output

The node returns JSON data with the following structure:

```json
{
  "operation": "extractByType",
  "result": {
    "type": "IFCWALL",
    "count": 25,
    "elements": [
      {
        "id": 123,
        "type": "IFCWALL",
        "data": { /* IFC element data */ }
      }
    ]
  }
}
```

## Error Handling

The node includes comprehensive error handling:
- Invalid IFC files will return an error message
- Missing elements will be skipped with warnings
- Unknown IFC types will return an error
- Network issues when fetching files will be caught

Enable "Continue on Fail" in the node settings to handle errors gracefully in your workflow.

## Requirements

- n8n version 0.174.0 or higher
- Node.js version 16 or higher
- Sufficient memory for processing large IFC files

## Limitations

- Large IFC files may require significant memory and processing time
- Some proprietary IFC extensions may not be fully supported
- Binary data size is limited by n8n's configuration

## Contributing

If you encounter issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

MIT License - see LICENSE file for details.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [web-ifc library](https://github.com/ThatOpen/engine_web-ifc)
- [IFC specification](https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/)
# n8n-nodes-ifc-extractor
