import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import * as WebIFC from 'web-ifc';
import { readFileSync } from 'fs';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface IIfcElement {
	id: number;
	type: string;
	data: any;
	properties?: any;
	hasProperties?: boolean;
}

interface IExtractResult {
	totalElements?: number;
	elementsWithProperties?: number;
	count?: number;
	type?: string;
	totalProcessed?: number;
	filterTypes?: string[];
	elements: IIfcElement[];
	typeStatistics?: { [key: string]: number };
	requestedIds?: number[];
	results?: any[];
	error?: string;
}

interface IPropertyData {
	id: number;
	type: string;
	name: string;
	description: string | null;
	value: any;
	unit: any;
}

interface IPropertySet {
	id: number;
	name: string;
	description: string | null;
	properties: { [key: string]: IPropertyData };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converts web-ifc objects to plain objects for JSON serialization
 */
function convertToPlainObject(obj: any): any {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (typeof obj !== 'object') {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(item => convertToPlainObject(item));
	}

	// Handle web-ifc Vector objects
	if (obj.size && typeof obj.size === 'function' && obj.get && typeof obj.get === 'function') {
		const array = [];
		for (let i = 0; i < obj.size(); i++) {
			array.push(convertToPlainObject(obj.get(i)));
		}
		return array;
	}

	const result: any = {};
	
	try {
		// Get all enumerable properties
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				const value = obj[key];
				if (typeof value !== 'function' && value !== undefined) {
					result[key] = convertToPlainObject(value);
				}
			}
		}

		// Also check for properties that might not be enumerable
		const propertyNames = Object.getOwnPropertyNames(obj);
		for (const key of propertyNames) {
			if (!result.hasOwnProperty(key)) {
				try {
					const value = obj[key];
					if (typeof value !== 'function' && value !== undefined) {
						result[key] = convertToPlainObject(value);
					}
				} catch (error) {
					// Skip properties that can't be accessed
				}
			}
		}
	} catch (error) {
		return obj.toString ? obj.toString() : String(obj);
	}

	return result;
}

/**
 * Converts web-ifc Vector to Array
 */
function vectorToArray(vector: any): number[] {
	const array: number[] = [];
	for (let i = 0; i < vector.size(); i++) {
		array.push(vector.get(i));
	}
	return array;
}

/**
 * Gets IFC type constant from string
 */
function getIfcTypeConstant(ifcType: string): number {
	const ifcTypeConstant = (WebIFC as any)[ifcType];
	if (!ifcTypeConstant) {
		throw new Error(`Unknown IFC type: ${ifcType}`);
	}
	return ifcTypeConstant;
}

// ============================================================================
// PROPERTY EXTRACTION CLASSES
// ============================================================================

/**
 * Handles extraction of property values from IFC value objects
 */
class PropertyValueExtractor {
	static extract(valueObj: any): any {
		if (!valueObj) return null;
		
		try {
			if (valueObj.value !== undefined) {
				return valueObj.value;
			}
			
			if (valueObj.constructor && valueObj.constructor.name) {
				switch (valueObj.constructor.name) {
					case 'IfcText':
					case 'IfcLabel':
					case 'IfcIdentifier':
						return valueObj.value || valueObj.toString();
						
					case 'IfcReal':
					case 'IfcInteger':
					case 'IfcNumber':
						return parseFloat(valueObj.value) || valueObj.value;
						
					case 'IfcBoolean':
						return valueObj.value === 'T' || valueObj.value === true;
						
					case 'IfcLogical':
						return valueObj.value === 'T' ? true : valueObj.value === 'F' ? false : null;
						
					default:
						return convertToPlainObject(valueObj);
				}
			}
			
			return convertToPlainObject(valueObj);
		} catch (error) {
			return valueObj ? valueObj.toString() : null;
		}
	}
}

/**
 * Handles extraction of individual properties
 */
class PropertyExtractor {
	constructor(private ifcApi: WebIFC.IfcAPI, private modelID: number) {}

	extract(propertyID: number, property: any): IPropertyData | null {
		try {
			const result: IPropertyData = {
				id: propertyID,
				type: property.constructor.name,
				name: property.Name ? property.Name.value : 'Unknown',
				description: property.Description ? property.Description.value : null,
				value: null,
				unit: null
			};
			
			switch (property.constructor.name) {
				case 'IfcPropertySingleValue':
					this.extractSingleValue(property, result);
					break;
					
				case 'IfcPropertyEnumeratedValue':
					this.extractEnumeratedValue(property, result);
					break;
					
				case 'IfcPropertyListValue':
					this.extractListValue(property, result);
					break;
					
				case 'IfcPropertyBoundedValue':
					this.extractBoundedValue(property, result);
					break;
					
				case 'IfcPropertyTableValue':
					this.extractTableValue(property, result);
					break;
					
				default:
					result.value = convertToPlainObject(property);
					break;
			}
			
			return result;
		} catch (error) {
			return null;
		}
	}

	private extractSingleValue(property: any, result: IPropertyData): void {
		if (property.NominalValue) {
			result.value = PropertyValueExtractor.extract(property.NominalValue);
		}
		if (property.Unit) {
			result.unit = PropertyValueExtractor.extract(property.Unit);
		}
	}

	private extractEnumeratedValue(property: any, result: IPropertyData): void {
		if (property.EnumerationValues) {
			result.value = property.EnumerationValues.map((val: any) => PropertyValueExtractor.extract(val));
		}
	}

	private extractListValue(property: any, result: IPropertyData): void {
		if (property.ListValues) {
			result.value = property.ListValues.map((val: any) => PropertyValueExtractor.extract(val));
		}
	}

	private extractBoundedValue(property: any, result: IPropertyData): void {
		result.value = {
			upperBound: property.UpperBoundValue ? PropertyValueExtractor.extract(property.UpperBoundValue) : null,
			lowerBound: property.LowerBoundValue ? PropertyValueExtractor.extract(property.LowerBoundValue) : null,
			setPoint: property.SetPointValue ? PropertyValueExtractor.extract(property.SetPointValue) : null
		};
	}

	private extractTableValue(property: any, result: IPropertyData): void {
		result.value = {
			definingValues: property.DefiningValues ? property.DefiningValues.map((val: any) => PropertyValueExtractor.extract(val)) : null,
			definedValues: property.DefinedValues ? property.DefinedValues.map((val: any) => PropertyValueExtractor.extract(val)) : null
		};
	}
}

/**
 * Handles extraction of property sets
 */
class PropertySetExtractor {
	constructor(private ifcApi: WebIFC.IfcAPI, private modelID: number) {}

	extract(propertySetID: number): IPropertySet | null {
		try {
			const propertySet = this.ifcApi.GetLine(this.modelID, propertySetID);
			
			if (propertySet.constructor.name !== 'IfcPropertySet') {
				return null;
			}
			
			const result: IPropertySet = {
				id: propertySetID,
				name: propertySet.Name ? propertySet.Name.value : 'Unknown',
				description: propertySet.Description ? propertySet.Description.value : null,
				properties: {}
			};
			
			if (propertySet.HasProperties) {
				const propertyExtractor = new PropertyExtractor(this.ifcApi, this.modelID);
				const properties = propertySet.HasProperties;
				
				for (let i = 0; i < properties.length; i++) {
					try {
						const propID = properties[i].value;
						const property = this.ifcApi.GetLine(this.modelID, propID);
						const propertyData = propertyExtractor.extract(propID, property);
						
						if (propertyData && propertyData.name) {
							result.properties[propertyData.name] = propertyData;
						}
					} catch (error) {
						// Skip properties that can't be read
					}
				}
			}
			
			return result;
		} catch (error) {
			return null;
		}
	}
}

/**
 * Handles extraction of element properties using IfcRelDefinesByProperties
 */
class ElementPropertiesExtractor {
	constructor(private ifcApi: WebIFC.IfcAPI, private modelID: number) {}

	extract(elementID: number): { [key: string]: any } {
		const properties: { [key: string]: any } = {};
		
		try {
			const relDefinesByPropsIDs = this.ifcApi.GetLineIDsWithType(this.modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);
			const relArray = vectorToArray(relDefinesByPropsIDs);
			
			for (const relID of relArray) {
				try {
					const relation = this.ifcApi.GetLine(this.modelID, relID);
					
					if (this.isElementReferenced(relation, elementID) && relation.RelatingPropertyDefinition) {
						const propDefID = relation.RelatingPropertyDefinition.value;
						const propertyDefinition = this.ifcApi.GetLine(this.modelID, propDefID);
						
						if (propertyDefinition.constructor.name === 'IfcPropertySet') {
							const propertySetExtractor = new PropertySetExtractor(this.ifcApi, this.modelID);
							const propertySetData = propertySetExtractor.extract(propDefID);
							
							if (propertySetData && propertySetData.name) {
								properties[propertySetData.name] = propertySetData.properties;
							}
						}
					}
				} catch (error) {
					// Skip relations that can't be read
				}
			}
		} catch (error) {
			// Skip if we can't access properties
		}
		
		return properties;
	}

	private isElementReferenced(relation: any, elementID: number): boolean {
		const relatedObjects = relation.RelatedObjects || [];
		return relatedObjects.some((obj: any) => obj.value === elementID);
	}
}

// ============================================================================
// ELEMENT EXTRACTION CLASSES
// ============================================================================

/**
 * Base class for element extraction operations
 */
abstract class BaseElementExtractor {
	constructor(protected ifcApi: WebIFC.IfcAPI, protected modelID: number) {}

	protected createElementData(elementID: number, element: any, includeProperties: boolean = false): IIfcElement {
		const jsonElement = convertToPlainObject(element);
		const elementData: IIfcElement = {
			id: elementID,
			type: element.constructor.name,
			data: jsonElement,
		};

		if (includeProperties) {
			const propertiesExtractor = new ElementPropertiesExtractor(this.ifcApi, this.modelID);
			const properties = propertiesExtractor.extract(elementID);
			elementData.properties = properties;
			elementData.hasProperties = Object.keys(properties).length > 0;
		}

		return elementData;
	}

	protected safeGetElement(elementID: number): any | null {
		try {
			return this.ifcApi.GetLine(this.modelID, elementID);
		} catch (error) {
			return null;
		}
	}
}

/**
 * Extracts all elements from the IFC file
 */
class AllElementsExtractor extends BaseElementExtractor {
	extract(includeProperties: boolean = false): IExtractResult {
		const allElements: IIfcElement[] = [];
		const lines = this.ifcApi.GetAllLines(this.modelID);
		const lineArray = vectorToArray(lines);

		for (const lineID of lineArray) {
			const element = this.safeGetElement(lineID);
			if (element) {
				const elementData = this.createElementData(lineID, element, includeProperties);
				allElements.push(elementData);
			}
		}

		const result: IExtractResult = {
			totalElements: allElements.length,
			elements: allElements,
		};

		if (includeProperties) {
			result.elementsWithProperties = allElements.filter(el => el.hasProperties).length;
		}

		return result;
	}
}

/**
 * Extracts elements by specific IFC type
 */
class ElementsByTypeExtractor extends BaseElementExtractor {
	extract(ifcType: string, includeProperties: boolean = false): IExtractResult {
		const elements: IIfcElement[] = [];
		
		try {
			const ifcTypeConstant = getIfcTypeConstant(ifcType);
			const elementIDs = this.ifcApi.GetLineIDsWithType(this.modelID, ifcTypeConstant);
			const elementArray = vectorToArray(elementIDs);

			for (const elementID of elementArray) {
				const element = this.safeGetElement(elementID);
				if (element) {
					const elementData = this.createElementData(elementID, element, includeProperties);
					elementData.type = ifcType; // Override with the requested type
					elements.push(elementData);
				}
			}
		} catch (error) {
			return {
				type: ifcType,
				count: 0,
				elementsWithProperties: 0,
				elements: [],
				error: `Error extracting elements by type: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}

		const result: IExtractResult = {
			type: ifcType,
			count: elements.length,
			elements,
		};

		if (includeProperties) {
			result.elementsWithProperties = elements.filter(el => el.hasProperties).length;
		}

		return result;
	}
}

/**
 * Extracts only elements that have properties
 */
class ElementsWithPropertiesExtractor extends BaseElementExtractor {
	extract(filterTypes: string[] = []): IExtractResult {
		const elements: IIfcElement[] = [];
		let totalProcessed = 0;
		
		try {
			if (filterTypes.length > 0) {
				this.extractByFilteredTypes(filterTypes, elements, totalProcessed);
			} else {
				this.extractAllWithProperties(elements, totalProcessed);
			}
		} catch (error) {
			return {
				error: `Error extracting elements with properties: ${error instanceof Error ? error.message : 'Unknown error'}`,
				totalProcessed: 0,
				elementsWithProperties: 0,
				filterTypes: filterTypes,
				elements: [],
			};
		}

		return {
			totalProcessed: totalProcessed,
			elementsWithProperties: elements.length,
			filterTypes: filterTypes,
			elements: elements,
		};
	}

	private extractByFilteredTypes(filterTypes: string[], elements: IIfcElement[], totalProcessed: number): void {
		for (const ifcType of filterTypes) {
			try {
				const ifcTypeConstant = getIfcTypeConstant(ifcType);
				const elementIDs = this.ifcApi.GetLineIDsWithType(this.modelID, ifcTypeConstant);
				const elementArray = vectorToArray(elementIDs);

				for (const elementID of elementArray) {
					const element = this.safeGetElement(elementID);
					if (element) {
						const elementData = this.createElementData(elementID, element, true);
						
						if (elementData.hasProperties) {
							elements.push(elementData);
						}
						totalProcessed++;
					}
				}
			} catch (error) {
				// Skip types that can't be processed
			}
		}
	}

	private extractAllWithProperties(elements: IIfcElement[], totalProcessed: number): void {
		const lines = this.ifcApi.GetAllLines(this.modelID);
		const lineArray = vectorToArray(lines);

		for (const lineID of lineArray) {
			const element = this.safeGetElement(lineID);
			if (element) {
				const elementData = this.createElementData(lineID, element, true);
				
				if (elementData.hasProperties) {
					elements.push(elementData);
				}
				totalProcessed++;
			}
		}
	}
}

/**
 * Extracts file information and statistics
 */
class FileInfoExtractor extends BaseElementExtractor {
	extract(): IExtractResult {
		const allLines = this.ifcApi.GetAllLines(this.modelID);
		const lineArray = vectorToArray(allLines);
		const typeStats: { [key: string]: number } = {};

		for (const lineID of lineArray) {
			const element = this.safeGetElement(lineID);
			if (element) {
				const typeName = element.constructor.name;
				typeStats[typeName] = (typeStats[typeName] || 0) + 1;
			}
		}

		return {
			totalElements: lineArray.length,
			typeStatistics: typeStats,
			elements: [],
		};
	}
}

/**
 * Extracts properties for specific element IDs
 */
class PropertiesExtractor extends BaseElementExtractor {
	extract(elementIds: number[]): IExtractResult {
		const results: any[] = [];

		for (const elementId of elementIds) {
			const element = this.safeGetElement(elementId);
			if (element) {
				const jsonElement = convertToPlainObject(element);
				
				results.push({
					id: elementId,
					type: element.constructor.name,
					element: jsonElement,
					properties: jsonElement,
				});
			} else {
				results.push({
					id: elementId,
					error: `Could not extract properties: Element not found`,
				});
			}
		}

		return {
			requestedIds: elementIds,
			results,
			elements: [],
		};
	}
}
// ============================================================================
// MAIN NODE CLASS
// ============================================================================

export class IfcExtractor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IFC Extractor',
		name: 'ifcExtractor',
		icon: 'file:ifc.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Extract information from IFC files using web-ifc',
		defaults: {
			name: 'IFC Extractor',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Extract All Elements',
						value: 'extractAll',
						description: 'Extract all elements from the IFC file',
						action: 'Extract all elements from the IFC file',
					},
					{
						name: 'Extract by Type',
						value: 'extractByType',
						description: 'Extract elements by specific IFC type',
						action: 'Extract elements by specific IFC type',
					},
					{
						name: 'Extract Elements with Properties',
						value: 'extractWithProperties',
						description: 'Extract elements and automatically resolve their properties',
						action: 'Extract elements with resolved properties',
					},
					{
						name: 'Extract Properties',
						value: 'extractProperties',
						description: 'Extract properties for specific elements',
						action: 'Extract properties for specific elements',
					},
					{
						name: 'Get File Info',
						value: 'getFileInfo',
						description: 'Get basic information about the IFC file',
						action: 'Get basic information about the IFC file',
					},
				],
				default: 'extractAll',
			},
			{
				displayName: 'Include Properties',
				name: 'includeProperties',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['extractAll', 'extractByType'],
					},
				},
				default: true,
				description: 'Whether to automatically resolve and include element properties',
			},
			{
				displayName: 'IFC Type',
				name: 'ifcType',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['extractByType'],
					},
				},
				default: 'IFCWALL',
				placeholder: 'IFCWALL',
				description: 'The IFC type to extract (e.g., IFCWALL, IFCDOOR, IFCWINDOW)',
			},
			{
				displayName: 'Filter Elements',
				name: 'filterElements',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['extractWithProperties'],
					},
				},
				default: '',
				placeholder: 'IFCWALL,IFCDOOR,IFCWINDOW',
				description: 'Comma-separated list of IFC types to include (leave empty for all)',
			},
			{
				displayName: 'Element IDs',
				name: 'elementIds',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['extractProperties'],
					},
				},
				default: '',
				placeholder: '123,456,789',
				description: 'Comma-separated list of element IDs to extract properties for',
			},
			{
				displayName: 'Input Data Source',
				name: 'inputDataSource',
				type: 'options',
				options: [
					{
						name: 'Binary Data',
						value: 'binaryData',
						description: 'Use binary data from previous node',
					},
					{
						name: 'File Path',
						value: 'filePath',
						description: 'Specify file path directly',
					},
				],
				default: 'binaryData',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						inputDataSource: ['binaryData'],
					},
				},
				description: 'Name of the binary property that contains the IFC file data',
			},
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						inputDataSource: ['filePath'],
					},
				},
				description: 'Path to the IFC file',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Initialize web-ifc
		const ifcApi = new WebIFC.IfcAPI();
		await ifcApi.Init();

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const inputDataSource = this.getNodeParameter('inputDataSource', i) as string;

				let ifcData: Uint8Array;

				// Get IFC data based on input source
				if (inputDataSource === 'binaryData') {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					ifcData = new Uint8Array(buffer);
				} else {
					const filePath = this.getNodeParameter('filePath', i) as string;
					const buffer = readFileSync(filePath);
					ifcData = new Uint8Array(buffer);
				}

				// Open the IFC file
				const modelID = ifcApi.OpenModel(ifcData);

				let result: IExtractResult = { elements: [] };

				switch (operation) {
					case 'extractAll':
						const includePropsAll = this.getNodeParameter('includeProperties', i, true) as boolean;
						const allElementsExtractor = new AllElementsExtractor(ifcApi, modelID);
						result = allElementsExtractor.extract(includePropsAll);
						break;

					case 'extractByType':
						const ifcType = this.getNodeParameter('ifcType', i) as string;
						const includePropsType = this.getNodeParameter('includeProperties', i, true) as boolean;
						const typeExtractor = new ElementsByTypeExtractor(ifcApi, modelID);
						result = typeExtractor.extract(ifcType, includePropsType);
						break;

					case 'extractWithProperties':
						const filterElements = this.getNodeParameter('filterElements', i, '') as string;
						const elementTypes = filterElements ? filterElements.split(',').map(type => type.trim()).filter(type => type) : [];
						const propertiesExtractor = new ElementsWithPropertiesExtractor(ifcApi, modelID);
						result = propertiesExtractor.extract(elementTypes);
						break;

					case 'getFileInfo':
						const fileInfoExtractor = new FileInfoExtractor(ifcApi, modelID);
						result = fileInfoExtractor.extract();
						break;

					case 'extractProperties':
						const elementIds = this.getNodeParameter('elementIds', i) as string;
						const ids = elementIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
						const propExtractor = new PropertiesExtractor(ifcApi, modelID);
						result = propExtractor.extract(ids);
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
							itemIndex: i,
						});
				}

				// Close the model
				ifcApi.CloseModel(modelID);

				returnData.push({
					json: {
						operation,
						result,
						...items[i].json,
					},
					binary: items[i].binary,
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error occurred',
							...items[i].json,
						},
						binary: items[i].binary,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}


