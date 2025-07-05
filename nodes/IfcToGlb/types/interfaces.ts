import { IDataObject } from 'n8n-workflow';

export interface IIfcToGlbOptions {
	includeGeometry: boolean;
	includeMaterials: boolean;
	compression: 'none' | 'gzip' | 'draco';
	precision: number;
	outputFormat: 'glb' | 'gltf';
}

export interface IGeometryData {
	vertices: Float32Array;
	indices: Uint32Array;
	normals?: Float32Array;
	colors?: Float32Array;
	materialId?: number;
}

export interface IMaterialData {
	id: number;
	name: string;
	color?: [number, number, number, number];
	diffuseColor?: [number, number, number, number];
	specularColor?: [number, number, number, number];
	transparency?: number;
}

export interface IMeshData {
	id: number;
	geometry: IGeometryData;
	material?: IMaterialData;
	name?: string;
	matrix?: number[];
}

export interface IConversionResult {
	glbData: ArrayBuffer;
	meshCount: number;
	vertexCount: number;
	fileSize: number;
	materials: IMaterialData[];
	metadata: IDataObject;
}

export interface IIfcToGlbNodeData extends IDataObject {
	ifcData: ArrayBuffer;
	options: IIfcToGlbOptions;
	result?: IConversionResult;
}
