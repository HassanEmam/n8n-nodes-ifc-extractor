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
						name: 'Get File Info',
						value: 'getFileInfo',
						description: 'Get basic information about the IFC file',
						action: 'Get basic information about the IFC file',
					},
					{
						name: 'Extract Properties',
						value: 'extractProperties',
						description: 'Extract properties for specific elements',
						action: 'Extract properties for specific elements',
					},
				],
				default: 'extractAll',
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

				let result: any = {};

				switch (operation) {
					case 'extractAll':
						result = extractAllElements(ifcApi, modelID);
						break;

					case 'extractByType':
						const ifcType = this.getNodeParameter('ifcType', i) as string;
						result = extractElementsByType(ifcApi, modelID, ifcType);
						break;

					case 'getFileInfo':
						result = getFileInfo(ifcApi, modelID);
						break;

					case 'extractProperties':
						const elementIds = this.getNodeParameter('elementIds', i) as string;
						const ids = elementIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
						result = extractProperties(ifcApi, modelID, ids);
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

function extractAllElements(ifcApi: WebIFC.IfcAPI, modelID: number) {
	const allElements: any[] = [];
	const lines = ifcApi.GetAllLines(modelID);
	
	// Convert Vector to Array for iteration
	const lineArray: number[] = [];
	for (let i = 0; i < lines.size(); i++) {
		lineArray.push(lines.get(i));
	}

	for (const lineID of lineArray) {
		try {
			const element = ifcApi.GetLine(modelID, lineID);
			allElements.push({
				id: lineID,
				type: element.constructor.name,
				data: element,
			});
		} catch (error) {
			// Skip elements that can't be read
		}
	}

	return {
		totalElements: allElements.length,
		elements: allElements,
	};
}

function extractElementsByType(ifcApi: WebIFC.IfcAPI, modelID: number, ifcType: string) {
	const elements: any[] = [];
	
	try {
		// Get the IFC type constant
		const ifcTypeConstant = (WebIFC as any)[ifcType];
		if (!ifcTypeConstant) {
			throw new Error(`Unknown IFC type: ${ifcType}`);
		}

		const elementIDs = ifcApi.GetLineIDsWithType(modelID, ifcTypeConstant);
		
		// Convert Vector to Array for iteration
		const elementArray: number[] = [];
		for (let i = 0; i < elementIDs.size(); i++) {
			elementArray.push(elementIDs.get(i));
		}

		for (const elementID of elementArray) {
			try {
				const element = ifcApi.GetLine(modelID, elementID);
				elements.push({
					id: elementID,
					type: ifcType,
					data: element,
				});
			} catch (error) {
				// Skip elements that can't be read
			}
		}
	} catch (error) {
		return {
			type: ifcType,
			count: 0,
			elements: [],
			error: `Error extracting elements by type: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}

	return {
		type: ifcType,
		count: elements.length,
		elements,
	};
}

function getFileInfo(ifcApi: WebIFC.IfcAPI, modelID: number) {
	const allLines = ifcApi.GetAllLines(modelID);
	
	// Convert Vector to Array for iteration
	const lineArray: number[] = [];
	for (let i = 0; i < allLines.size(); i++) {
		lineArray.push(allLines.get(i));
	}
	
	const typeStats: { [key: string]: number } = {};

	// Count elements by type
	for (const lineID of lineArray) {
		try {
			const element = ifcApi.GetLine(modelID, lineID);
			const typeName = element.constructor.name;
			typeStats[typeName] = (typeStats[typeName] || 0) + 1;
		} catch (error) {
			// Skip elements that can't be read
		}
	}

	return {
		totalElements: lineArray.length,
		typeStatistics: typeStats,
	};
}

function extractProperties(ifcApi: WebIFC.IfcAPI, modelID: number, elementIds: number[]) {
	const results: any[] = [];

	for (const elementId of elementIds) {
		try {
			const element = ifcApi.GetLine(modelID, elementId);
			
			// Extract properties from the element itself
			const properties = {
				...element,
				// Add any additional property extraction logic here
			};

			results.push({
				id: elementId,
				type: element.constructor.name,
				element,
				properties,
			});
		} catch (error) {
			results.push({
				id: elementId,
				error: `Could not extract properties: ${error instanceof Error ? error.message : 'Unknown error'}`,
			});
		}
	}

	return {
		requestedIds: elementIds,
		results,
	};
}
