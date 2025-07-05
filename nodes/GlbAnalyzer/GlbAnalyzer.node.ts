import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	NodeConnectionType,
} from 'n8n-workflow';

import { GeometryAnalyzer } from './utils/geometryAnalyzer';
import { IGlbAnalysisOptions } from './types/interfaces';

function getGlbDataFromInput(item: INodeExecutionData, fieldName: string): ArrayBuffer {
	const data = item.json[fieldName];
	
	if (!data) {
		throw new Error(`GLB data not found in field '${fieldName}'`);
	}

	// Handle different input formats
	if (data instanceof ArrayBuffer) {
		return data;
	}

	if (typeof data === 'string') {
		// Assume base64 encoded data
		try {
			const binaryString = atob(data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			return bytes.buffer;
		} catch (error) {
			throw new Error(
				`Failed to decode base64 GLB data: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	if (typeof data === 'object' && data && 'data' in data && Array.isArray((data as any).data)) {
		// Handle Buffer-like objects
		return new Uint8Array((data as any).data).buffer;
	}

	throw new Error(
		`Unsupported GLB data format. Expected ArrayBuffer, base64 string, or Buffer object`
	);
}

export class GlbAnalyzer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GLB Analyzer',
		name: 'glbAnalyzer',
		icon: 'file:glb-analyzer.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["property"]}}',
		description: 'Analyze GLB files and calculate detailed geometry properties for building elements',
		defaults: {
			name: 'GLB Analyzer',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'GLB File',
				name: 'glbFile',
				type: 'string',
				default: '',
				placeholder: 'Select field containing GLB file data',
				description: 'Field containing the GLB file data (as ArrayBuffer or base64 string)',
				required: true,
			},
			{
				displayName: 'Analysis Options',
				name: 'analysisOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Volume Calculation',
						name: 'includeVolume',
						type: 'boolean',
						default: true,
						description: 'Whether to calculate the volume of each element',
					},
					{
						displayName: 'Include Face Areas',
						name: 'includeAreas',
						type: 'boolean',
						default: true,
						description: 'Whether to calculate the area of all faces (top, bottom, left, right, front, back)',
					},
					{
						displayName: 'Include Face Perimeters',
						name: 'includePerimeters',
						type: 'boolean',
						default: true,
						description: 'Whether to calculate the perimeter of each face',
					},
					{
						displayName: 'Include Face Orientations',
						name: 'includeOrientations',
						type: 'boolean',
						default: true,
						description: 'Whether to calculate the orientation angle from horizontal plane for each face',
					},
					{
						displayName: 'Include Dimensions',
						name: 'includeDimensions',
						type: 'boolean',
						default: true,
						description: 'Whether to calculate the width, height, and depth dimensions',
					},
					{
						displayName: 'Include Metadata',
						name: 'includeMetadata',
						type: 'boolean',
						default: true,
						description: 'Whether to include additional metadata like vertex count and material information',
					},
					{
						displayName: 'Precision (Decimal Places)',
						name: 'precision',
						type: 'number',
						default: 3,
						description: 'Number of decimal places for calculations',
						typeOptions: {
							minValue: 0,
							maxValue: 6,
						},
					},
				],
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'Detailed (Individual Meshes + Summary)',
						value: 'detailed',
					},
					{
						name: 'Summary Only',
						value: 'summary',
					},
					{
						name: 'Meshes Only',
						value: 'meshes',
					},
				],
				default: 'detailed',
				description: 'Choose what to include in the output',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const glbFieldName = this.getNodeParameter('glbFile', i) as string;
				const analysisOptions = this.getNodeParameter('analysisOptions', i, {}) as any;
				const outputFormat = this.getNodeParameter('outputFormat', i) as string;

				// Get GLB data from input
				const glbData = getGlbDataFromInput(items[i], glbFieldName);
				
				// Set up analysis options with defaults
				const options: IGlbAnalysisOptions = {
					includeVolume: analysisOptions.includeVolume ?? true,
					includeAreas: analysisOptions.includeAreas ?? true,
					includePerimeters: analysisOptions.includePerimeters ?? true,
					includeOrientations: analysisOptions.includeOrientations ?? true,
					includeDimensions: analysisOptions.includeDimensions ?? true,
					includeMetadata: analysisOptions.includeMetadata ?? true,
					precision: analysisOptions.precision ?? 3,
				};

				// Perform analysis
				const analyzer = new GeometryAnalyzer();
				const result = await analyzer.analyzeGLBFile(glbData, options);

				// Format output based on selected format
				let outputData: any;
				switch (outputFormat) {
					case 'summary':
						outputData = {
							summary: result.summary,
							metadata: result.metadata,
						};
						break;
					case 'meshes':
						outputData = {
							meshes: result.meshes,
							metadata: result.metadata,
						};
						break;
					case 'detailed':
					default:
						outputData = result;
						break;
				}

				returnData.push({
					json: outputData,
					pairedItem: { item: i },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
