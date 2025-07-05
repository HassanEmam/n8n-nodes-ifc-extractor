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
				if (dataSource === 'binaryProperty') {
					const propertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binaryData = items[i].binary?.[propertyName];
					if (!binaryData) {
						throw new NodeOperationError(this.getNode(), `Binary property '${propertyName}' not found`);
					}
					// Convert base64 string to ArrayBuffer
					const binaryString = atob(binaryData.data);
					const bytes = new Uint8Array(binaryString.length);
					for (let j = 0; j < binaryString.length; j++) {
						bytes[j] = binaryString.charCodeAt(j);
					}
					ifcData = bytes.buffer;
				} else {
					// Assume input data contains IFC as ArrayBuffer
					const binaryData = items[i].binary?.data;
					if (!binaryData) {
						throw new NodeOperationError(this.getNode(), 'No IFC data found in input');
					}
					// Convert base64 string to ArrayBuffer
					const binaryString = atob(binaryData.data);
					const bytes = new Uint8Array(binaryString.length);
					for (let j = 0; j < binaryString.length; j++) {
						bytes[j] = binaryString.charCodeAt(j);
					}
					ifcData = bytes.buffer;
				}

				// Set default options
				const options: IIfcToGlbOptions = {
					includeGeometry: outputOptions.includeGeometry ?? true,
					includeMaterials: outputOptions.includeMaterials ?? true,
					compression: outputOptions.compression ?? 'none',
					precision: outputOptions.precision ?? 1,
					outputFormat: outputOptions.outputFormat ?? 'glb',
				};

				if (operation === 'convert') {
					const result = await convertIfcToGlb(ifcData, options);
					
					// Convert ArrayBuffer to base64 string for n8n
					const uint8Array = new Uint8Array(result.glbData);
					const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
					const base64Data = btoa(binaryString);
					
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
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error instanceof Error ? error.message : 'Unknown error',
						},
					});
				} else {
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
		// Load IFC file
		await meshExtractor.loadIfcFile(ifcData);

		// Extract meshes and materials
		const [meshes, materials] = await Promise.all([
			meshExtractor.extractMeshes(),
			meshExtractor.extractMaterials(),
		]);

		if (meshes.length === 0) {
			throw new Error('No geometry found in IFC file');
		}

		// Convert to GLB
		const result = await glbExporter.convertToGlb(meshes, materials, options);

		return result;
	} finally {
		// Clean up
		meshExtractor.dispose();
		glbExporter.dispose();
	}
}
