import { IDataObject } from 'n8n-workflow';

export interface IFaceAreas {
	top: number;
	bottom: number;
	left: number;
	right: number;
	front: number;
	back: number;
}

export interface IDimensions {
	width: number;
	height: number;
	depth: number;
}

export interface IBoundingBox {
	min: { x: number; y: number; z: number };
	max: { x: number; y: number; z: number };
}

export interface IGeometryProperties {
	volume: number;
	faceAreas: IFaceAreas;
	facePerimeters: number[];
	faceOrientations: number[];
	boundingBox: IBoundingBox;
	dimensions: IDimensions;
}

export interface IMeshAnalysisResult {
	name: string;
	volume: number;
	faceAreas: IFaceAreas;
	facePerimeters: number[];
	faceOrientations: number[];
	boundingBox: IBoundingBox;
	dimensions: IDimensions;
	metadata?: {
		vertexCount: number;
		faceCount: number;
		materialName?: string;
	};
}

export interface IGlbAnalysisOptions {
	includeVolume: boolean;
	includeAreas: boolean;
	includePerimeters: boolean;
	includeOrientations: boolean;
	includeDimensions: boolean;
	includeMetadata: boolean;
	precision: number;
}

export interface IGlbAnalysisResult {
	meshes: IMeshAnalysisResult[];
	summary: {
		totalMeshes: number;
		totalVolume: number;
		totalSurfaceArea: number;
		averageFaceOrientation: number;
		overallDimensions: IDimensions;
		overallBoundingBox: IBoundingBox;
	};
	metadata: {
		analyzedAt: string;
		options: IGlbAnalysisOptions;
		processingTimeMs: number;
	};
}

export interface IGlbAnalyzerNodeData extends IDataObject {
	glbData: ArrayBuffer;
	options: IGlbAnalysisOptions;
	result?: IGlbAnalysisResult;
}
