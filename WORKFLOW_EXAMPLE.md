# Example Workflow: Complete IFC Analysis Pipeline

This example demonstrates how to use all three nodes together to create a complete BIM analysis pipeline.

## Workflow Steps

1. **HTTP Request** → Download IFC file from URL
2. **IFC Extractor** → Extract element information
3. **IFC to GLB Converter** → Convert to 3D format
4. **GLB Analyzer** → Calculate detailed geometry properties
5. **Code** → Combine and process results
6. **Write Binary File** → Save GLB for visualization
7. **Spreadsheet File** → Export analysis results

## Example n8n Workflow JSON

```json
{
  "meta": {
    "instanceId": "12345"
  },
  "nodes": [
    {
      "parameters": {
        "url": "https://example.com/sample-building.ifc",
        "options": {}
      },
      "name": "Download IFC File",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [140, 240]
    },
    {
      "parameters": {
        "operation": "extractAll",
        "dataSource": "inputData",
        "options": {
          "includeProperties": true
        }
      },
      "name": "Extract IFC Elements",
      "type": "n8n-nodes-ifc-extractor.ifcExtractor",
      "typeVersion": 1,
      "position": [340, 240]
    },
    {
      "parameters": {
        "dataSource": "inputData",
        "outputOptions": {
          "includeGeometry": true,
          "includeMaterials": true,
          "compression": "none",
          "precision": 1,
          "outputFormat": "glb"
        }
      },
      "name": "Convert to GLB",
      "type": "n8n-nodes-ifc-extractor.ifcToGlb",
      "typeVersion": 1,
      "position": [540, 240]
    },
    {
      "parameters": {
        "glbFile": "data",
        "analysisOptions": {
          "includeVolume": true,
          "includeAreas": true,
          "includePerimeters": true,
          "includeOrientations": true,
          "includeDimensions": true,
          "includeMetadata": true,
          "precision": 3
        },
        "outputFormat": "detailed"
      },
      "name": "Analyze Geometry",
      "type": "n8n-nodes-ifc-extractor.glbAnalyzer",
      "typeVersion": 1,
      "position": [740, 240]
    },
    {
      "parameters": {
        "jsCode": "// Combine IFC data with geometry analysis\nconst ifcData = $input.first().json;\nconst glbAnalysis = $input.last().json;\n\n// Create comprehensive building report\nconst report = {\n  building: {\n    totalElements: ifcData.elements?.length || 0,\n    elementsByType: {},\n    totalVolume: glbAnalysis.summary.totalVolume,\n    totalSurfaceArea: glbAnalysis.summary.totalSurfaceArea,\n    dimensions: glbAnalysis.summary.overallDimensions\n  },\n  elements: [],\n  analysis: glbAnalysis\n};\n\n// Group elements by type\nif (ifcData.elements) {\n  ifcData.elements.forEach(element => {\n    const type = element.type;\n    if (!report.building.elementsByType[type]) {\n      report.building.elementsByType[type] = 0;\n    }\n    report.building.elementsByType[type]++;\n  });\n}\n\n// Match IFC elements with geometry analysis\nif (glbAnalysis.meshes) {\n  glbAnalysis.meshes.forEach((mesh, index) => {\n    const element = {\n      name: mesh.name,\n      volume: mesh.volume,\n      surfaceArea: Object.values(mesh.faceAreas).reduce((a, b) => a + b, 0),\n      dimensions: mesh.dimensions,\n      orientations: {\n        averageAngle: mesh.faceOrientations.reduce((a, b) => a + b, 0) / mesh.faceOrientations.length,\n        horizontalFaces: mesh.faceOrientations.filter(angle => angle < 30).length,\n        verticalFaces: mesh.faceOrientations.filter(angle => angle > 60).length\n      },\n      metadata: mesh.metadata\n    };\n    report.elements.push(element);\n  });\n}\n\nreturn [{\n  json: report\n}];"
      },
      "name": "Process Results",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [940, 240]
    }
  ],
  "connections": {
    "Download IFC File": {
      "main": [[{"node": "Extract IFC Elements", "type": "main", "index": 0}]]
    },
    "Extract IFC Elements": {
      "main": [[{"node": "Convert to GLB", "type": "main", "index": 0}]]
    },
    "Convert to GLB": {
      "main": [[{"node": "Analyze Geometry", "type": "main", "index": 0}]]
    },
    "Analyze Geometry": {
      "main": [[{"node": "Process Results", "type": "main", "index": 0}]]
    }
  }
}
```

## Expected Output

The workflow will produce a comprehensive building analysis report:

```json
{
  "building": {
    "totalElements": 1247,
    "elementsByType": {
      "IFCWALL": 156,
      "IFCDOOR": 24,
      "IFCWINDOW": 48,
      "IFCSLAB": 12,
      "IFCBEAM": 89,
      "IFCCOLUMN": 32
    },
    "totalVolume": 2847.65,
    "totalSurfaceArea": 15623.42,
    "dimensions": {
      "width": 45.0,
      "height": 12.5,
      "depth": 32.0
    }
  },
  "elements": [
    {
      "name": "Wall_001",
      "volume": 2.456,
      "surfaceArea": 47.7,
      "dimensions": {"width": 5.0, "height": 2.5, "depth": 0.2},
      "orientations": {
        "averageAngle": 67.5,
        "horizontalFaces": 2,
        "verticalFaces": 4
      },
      "metadata": {
        "vertexCount": 48,
        "faceCount": 16,
        "materialName": "Concrete"
      }
    }
  ]
}
```

## Use Cases

This complete pipeline can be used for:

- **Quantity Takeoff**: Calculate material volumes and areas
- **Cost Estimation**: Use surface areas for finish calculations  
- **Energy Analysis**: Surface areas and orientations for thermal modeling
- **Quality Control**: Verify dimensions and detect anomalies
- **3D Visualization**: GLB files for web viewers
- **Compliance Checking**: Dimensional verification against standards

## Performance Considerations

- Large IFC files (>100MB) may require workflow splitting
- Use streaming for very large datasets
- Consider caching converted GLB files
- Monitor memory usage for complex geometry analysis
