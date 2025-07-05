# IFC Extractor Node - Modular Architecture

This document describes the new modular architecture of the IFC Extractor n8n node after the refactoring.

## 📁 Project Structure

```
nodes/IfcExtractor/
├── IfcExtractor.node.ts          # Main node implementation
├── types/
│   └── interfaces.ts              # TypeScript interfaces and types
├── utils/
│   └── helpers.ts                 # Utility functions for data conversion
└── extractors/                    # All extraction logic organized by functionality
    ├── index.ts                   # Exports all extractors
    ├── BaseElementExtractor.ts    # Base class for element extractors
    ├── PropertyValueExtractor.ts  # Extracts IFC property values
    ├── PropertyExtractor.ts       # Extracts individual properties
    ├── PropertySetExtractor.ts    # Extracts property sets
    ├── ElementPropertiesExtractor.ts  # Extracts element properties via IfcRelDefinesByProperties
    ├── AllElementsExtractor.ts    # Extracts all elements
    ├── ElementsByTypeExtractor.ts # Extracts elements by IFC type
    ├── ElementsWithPropertiesExtractor.ts  # Extracts only elements with properties
    ├── FileInfoExtractor.ts       # Extracts file information and statistics
    └── PropertiesExtractor.ts     # Extracts properties for specific element IDs
```

## 🏗️ Architecture Benefits

### **Separation of Concerns**
- Each extractor has a single, well-defined responsibility
- Type definitions are centralized in one location
- Utility functions are reusable across extractors
- Main node file focuses only on orchestration

### **Type Safety**
- Comprehensive TypeScript interfaces ensure type safety
- Clear contracts between components
- Easier debugging and IDE support

### **Maintainability**
- Small, focused files are easier to understand and modify
- Changes to one extractor don't affect others
- Easy to add new extraction operations

### **Testability**
- Each extractor can be unit tested independently
- Clear dependencies make mocking easier
- Isolated logic reduces test complexity

### **Reusability**
- Base classes provide common functionality
- Extractors can be composed together
- Easy to create new combinations of extractors

## 🔧 Key Components

### **Types & Interfaces (`types/interfaces.ts`)**
- `IIfcElement`: Structure for extracted elements
- `IExtractResult`: Standard result format
- `IPropertyData`: Individual property structure
- `IPropertySet`: Property set structure

### **Utilities (`utils/helpers.ts`)**
- `convertToPlainObject()`: Converts web-ifc objects to JSON
- `vectorToArray()`: Converts web-ifc vectors to arrays
- `getIfcTypeConstant()`: Gets IFC type constants safely

### **Base Classes**
- `BaseElementExtractor`: Common functionality for all element extractors
- Provides safe element retrieval and property integration

### **Property Extraction Chain**
1. `PropertyValueExtractor` → Handles raw IFC values
2. `PropertyExtractor` → Processes individual properties
3. `PropertySetExtractor` → Manages property sets
4. `ElementPropertiesExtractor` → Follows IfcRelDefinesByProperties relationships

### **Element Extraction Strategies**
- `AllElementsExtractor`: Comprehensive extraction
- `ElementsByTypeExtractor`: Type-specific extraction
- `ElementsWithPropertiesExtractor`: Property-focused extraction
- `PropertiesExtractor`: Targeted property extraction
- `FileInfoExtractor`: Statistical information

## 🚀 Usage

The main node file (`IfcExtractor.node.ts`) now simply:
1. Handles n8n node configuration
2. Processes input parameters
3. Instantiates appropriate extractors
4. Returns formatted results

All complex logic is delegated to specialized extractor classes.

## 🔄 Migration

The refactoring maintains 100% backward compatibility:
- All existing operations work exactly the same
- Same input/output formats
- Same property extraction capabilities
- No breaking changes to the n8n node interface

## 🎯 Future Enhancements

The modular structure makes it easy to:
- Add new extraction operations
- Support additional IFC property types
- Implement caching mechanisms
- Add performance optimizations
- Create specialized extractors for specific use cases

---

**Result**: Clean, maintainable, and extensible codebase with improved developer experience and easier testing capabilities.
