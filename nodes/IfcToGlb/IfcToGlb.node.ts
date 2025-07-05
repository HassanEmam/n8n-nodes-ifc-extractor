import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import { IfcMeshExtractor } from './utils/ifcMeshExtractor';
import { GlbExporter } from './utils/glbExporter';
import { IIfcToGlbOptions, IConversionResult } from './types/interfaces';

export class IfcToGlb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IFC to GLB Converter',
		name: 'ifcToGlb',
		icon: 'file:ifc-to-glb.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["options"]}}',
		description: 'Convert IFC files to GLB (GLTF Binary) format with mesh and material data',
		defaults: {
			name: 'IFC to GLB',
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
						name: 'Convert to GLB',
						value: 'convert',
						description: 'Convert IFC file to GLB format',
						action: 'Convert IFC file to GLB format',
					},
				],
				default: 'convert',
			},
			{
				displayName: 'IFC Data Source',
				name: 'dataSource',
				type: 'options',
				options: [
					{
						name: 'Input Data',
						value: 'inputData',
						description: 'Use IFC data from input',
					},
					{
						name: 'Binary Property',
						value: 'binaryProperty',
						description: 'Use IFC data from a binary property',
					},
				],
				default: 'inputData',
				description: 'Where to get the IFC data from',
			},
			{
				displayName: 'Property Name',
				name: 'binaryPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						dataSource: ['binaryProperty'],
					},
				},
				default: 'data',
				description: 'Name of the binary property containing IFC data',
			},
			{
				displayName: 'Output Options',
				name: 'outputOptions',
				placeholder: 'Add Option',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Include Geometry',
						name: 'includeGeometry',
						type: 'boolean',
						default: true,
						description: 'Whether to include 3D geometry in the output',
					},
					{
						displayName: 'Include Materials',
						name: 'includeMaterials',
						type: 'boolean',
						default: true,
						description: 'Whether to include material information',
					},
					{
						displayName: 'Compression',
						name: 'compression',
						type: 'options',
						options: [
							{
								name: 'None',
								value: 'none',
							},
							{
								name: 'GZIP',
								value: 'gzip',
							},
							{
								name: 'Draco',
								value: 'draco',
							},
						],
						default: 'none',
						description: 'Compression method for the output',
					},
					{
						displayName: 'Precision',
						name: 'precision',
						type: 'number',
						default: 1,
						description: 'Geometric precision (lower values = higher compression)',
						typeOptions: {
							minValue: 0.001,
							maxValue: 1,
							numberStepSize: 0.001,
						},
					},
					{
						displayName: 'Output Format',
						name: 'outputFormat',
						type: 'options',
						options: [
							{
								name: 'GLB (Binary)',
								value: 'glb',
							},
							{
								name: 'GLTF (JSON)',
								value: 'gltf',
							},
						],
						default: 'glb',
						description: 'Output format for the 3D model',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const dataSource = this.getNodeParameter('dataSource', i) as string;
				const outputOptions = this.getNodeParameter('outputOptions', i, {}) as Partial<IIfcToGlbOptions>;

				// Get IFC data
				let ifcData: ArrayBuffer;
				console.log('=== Extracting IFC Data ===');
				console.log('Data source:', dataSource);
				console.log('Available binary properties:', Object.keys(items[i].binary || {}));
				console.log('Binary data structure:', items[i].binary);
				
				if (dataSource === 'binaryProperty') {
					const propertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					console.log('Looking for binary property:', propertyName);
					
					const binaryData = items[i].binary?.[propertyName];
					if (!binaryData) {
						console.error('Available properties:', Object.keys(items[i].binary || {}));
						throw new NodeOperationError(this.getNode(), `Binary property '${propertyName}' not found. Available properties: ${Object.keys(items[i].binary || {}).join(', ')}`);
					}
					console.log('Found binary data:', {
						mimeType: binaryData.mimeType,
						fileName: binaryData.fileName,
						dataLength: binaryData.data?.length || 0
					});
					
					// Convert base64 string to ArrayBuffer
					const binaryString = atob(binaryData.data);
					const bytes = new Uint8Array(binaryString.length);
					for (let j = 0; j < binaryString.length; j++) {
						bytes[j] = binaryString.charCodeAt(j);
					}
					ifcData = bytes.buffer;
				} else {
					// inputData mode - look for binary data in the main data property
					console.log('Looking for binary data in main data property');
					
					// Try different possible locations for the binary data
					let binaryData = items[i].binary?.data;
					
					// If not found in 'data', try other common property names
					if (!binaryData && items[i].binary) {
						const binary = items[i].binary;
						if (binary && typeof binary === 'object') {
							const binaryKeys = Object.keys(binary);
							console.log('Available binary keys:', binaryKeys);
							
							// Try common property names for file data
							for (const key of ['file', 'attachment', 'document', 'content']) {
								if (binary[key]) {
									console.log(`Found binary data in property: ${key}`);
									binaryData = binary[key];
									break;
								}
							}
							
							// If still not found, use the first available binary property
							if (!binaryData && binaryKeys.length > 0) {
								const firstKey = binaryKeys[0];
								console.log(`Using first available binary property: ${firstKey}`);
								binaryData = binary[firstKey];
							}
						}
					}
					
					if (!binaryData) {
						console.error('No binary data found. Item structure:', JSON.stringify(items[i], null, 2));
						throw new NodeOperationError(this.getNode(), 'No IFC data found in input. Make sure the HTTP Request node output format is set to "file".');
					}
					
					console.log('Found binary data:', {
						mimeType: binaryData.mimeType,
						fileName: binaryData.fileName,
						dataLength: binaryData.data?.length || 0
					});
					
					// Convert base64 string to ArrayBuffer
					const binaryString = atob(binaryData.data);
					const bytes = new Uint8Array(binaryString.length);
					for (let j = 0; j < binaryString.length; j++) {
						bytes[j] = binaryString.charCodeAt(j);
					}
					ifcData = bytes.buffer;
				}
				
				console.log('=== IFC Data Extracted Successfully ===');
				console.log('Final ArrayBuffer size:', ifcData.byteLength, 'bytes');

				// Set default options
				const options: IIfcToGlbOptions = {
					includeGeometry: outputOptions.includeGeometry ?? true,
					includeMaterials: outputOptions.includeMaterials ?? true,
					compression: outputOptions.compression ?? 'none',
					precision: outputOptions.precision ?? 1,
					outputFormat: outputOptions.outputFormat ?? 'glb',
				};

				if (operation === 'convert') {
					console.log('=== Starting IFC to GLB Node Execution ===');
					console.log('Data source:', dataSource);
					console.log('Input data size:', ifcData.byteLength, 'bytes');
					console.log('Options:', JSON.stringify(options, null, 2));
					
					const result = await convertIfcToGlb(ifcData, options);
					
					// Convert ArrayBuffer to base64 string for n8n
					const uint8Array = new Uint8Array(result.glbData);
					const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
					const base64Data = btoa(binaryString);
					
					console.log('=== IFC to GLB Node Execution Completed Successfully ===');
					console.log('Final result stats:', {
						meshCount: result.meshCount,
						vertexCount: result.vertexCount,
						fileSize: result.fileSize,
						materialCount: result.materials.length
					});
					
					returnData.push({
						binary: {
							data: {
								data: base64Data,
								mimeType: options.outputFormat === 'glb' ? 'model/gltf-binary' : 'model/gltf+json',
								fileName: `model.${options.outputFormat}`,
								fileSize: result.fileSize.toString(),
							},
						},
						json: {
							success: true,
							meshCount: result.meshCount,
							vertexCount: result.vertexCount,
							fileSize: result.fileSize,
							materialCount: result.materials.length,
							metadata: result.metadata,
						},
					});
				}
			} catch (error) {
				console.error('=== IFC to GLB Node Execution Failed ===');
				console.error('Error occurred in node execution:', error);
				console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
				
				if (this.continueOnFail()) {
					console.log('Continuing on fail - adding error to output');
					returnData.push({
						json: {
							success: false,
							error: error instanceof Error ? error.message : 'Unknown error',
							errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
							timestamp: new Date().toISOString(),
						},
					});
				} else {
					console.log('Not continuing on fail - throwing error');
					throw error;
				}
			}
		}

		return [returnData];
	}
}

async function convertIfcToGlb(ifcData: ArrayBuffer, options: IIfcToGlbOptions): Promise<IConversionResult> {
	const meshExtractor = new IfcMeshExtractor();
	const glbExporter = new GlbExporter();

	try {
		console.log('=== Starting IFC to GLB conversion ===');
		console.log(`Input data size: ${ifcData.byteLength} bytes`);
		console.log('Options:', JSON.stringify(options, null, 2));
		
		// Load IFC file
		console.log('Loading IFC file...');
		await meshExtractor.loadIfcFile(ifcData);
		console.log('IFC file loaded successfully');

		// Extract meshes and materials
		console.log('Extracting meshes and materials...');
		const [meshes, materials] = await Promise.all([
			meshExtractor.extractMeshes(),
			meshExtractor.extractMaterials(),
		]);
		console.log(`Extracted ${meshes.length} meshes and ${materials.length} materials`);

		if (meshes.length === 0) {
			console.warn('No geometry found in IFC file');
			throw new Error('No geometry found in IFC file - the file may be empty or contain only non-geometric elements');
		}

		// Convert to GLB
		console.log('Converting to GLB...');
		const result = await glbExporter.convertToGlb(meshes, materials, options);
		console.log(`GLB conversion completed. Output size: ${result.glbData.byteLength} bytes`);

		return result;
	} catch (error) {
		console.error('=== IFC to GLB conversion failed ===');
		console.error('Error details:', error);
		
		// Re-throw with enhanced error message
		const errorMessage = error instanceof Error ? error.message : 'Unknown error during conversion';
		throw new Error(`IFC to GLB conversion failed: ${errorMessage}`);
	} finally {
		// Clean up
		try {
			meshExtractor.dispose();
			glbExporter.dispose();
		} catch (cleanupError) {
			console.warn('Error during cleanup:', cleanupError);
		}
	}
}
