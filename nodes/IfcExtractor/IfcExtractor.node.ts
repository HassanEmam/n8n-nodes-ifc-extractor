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

// Import types and interfaces
import { IExtractResult } from './types/interfaces';

// Import extractors
import {
	AllElementsExtractor,
	ElementsByTypeExtractor,
	ElementsWithPropertiesExtractor,
	FileInfoExtractor,
	PropertiesExtractor,
} from './extractors';

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
				placeholder: '/path/to/file.ifc',
				displayOptions: {
					show: {
						inputDataSource: ['filePath'],
					},
				},
				description: 'Path to the IFC file on the filesystem',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const inputDataSource = this.getNodeParameter('inputDataSource', i) as string;

				// Get IFC file data
				let ifcData: Uint8Array;

				if (inputDataSource === 'binaryData') {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					ifcData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				} else {
					const filePath = this.getNodeParameter('filePath', i) as string;
					if (!filePath) {
						throw new NodeOperationError(this.getNode(), 'File path is required when using file path input');
					}
					const fileBuffer = readFileSync(filePath);
					ifcData = new Uint8Array(fileBuffer);
				}

				// Initialize web-ifc
				const ifcApi = new WebIFC.IfcAPI();
				await ifcApi.Init();

				const modelID = ifcApi.OpenModel(ifcData);

				let result: IExtractResult;

				// Execute the selected operation
				switch (operation) {
					case 'extractAll': {
						const includeProperties = this.getNodeParameter('includeProperties', i, true) as boolean;
						const extractor = new AllElementsExtractor(ifcApi, modelID);
						result = extractor.extract(includeProperties);
						break;
					}

					case 'extractByType': {
						const ifcType = this.getNodeParameter('ifcType', i) as string;
						const includeProperties = this.getNodeParameter('includeProperties', i, true) as boolean;
						const extractor = new ElementsByTypeExtractor(ifcApi, modelID);
						result = extractor.extract(ifcType.toUpperCase(), includeProperties);
						break;
					}

					case 'extractWithProperties': {
						const filterElements = this.getNodeParameter('filterElements', i, '') as string;
						const filterTypes = filterElements
							? filterElements.split(',').map(type => type.trim().toUpperCase()).filter(type => type)
							: [];
						const extractor = new ElementsWithPropertiesExtractor(ifcApi, modelID);
						result = extractor.extract(filterTypes);
						break;
					}

					case 'extractProperties': {
						const elementIdsStr = this.getNodeParameter('elementIds', i) as string;
						const elementIds = elementIdsStr
							.split(',')
							.map(id => parseInt(id.trim(), 10))
							.filter(id => !isNaN(id));
						const extractor = new PropertiesExtractor(ifcApi, modelID);
						result = extractor.extract(elementIds);
						break;
					}

					case 'getFileInfo': {
						const extractor = new FileInfoExtractor(ifcApi, modelID);
						result = extractor.extract();
						break;
					}

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				// Close the model to free memory
				ifcApi.CloseModel(modelID);

				returnData.push({
					json: {
						operation,
						...result,
					},
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error occurred',
						},
					});
				} else {
					throw new NodeOperationError(this.getNode(), error instanceof Error ? error.message : 'Unknown error occurred');
				}
			}
		}

		return [returnData];
	}
}
