import * as WebIFC from 'web-ifc';
import { IMeshData, IGeometryData, IMaterialData } from '../types/interfaces';

export class IfcMeshExtractor {
	private api: WebIFC.IfcAPI;
	private modelId: number | null = null;

	constructor() {
		this.api = new WebIFC.IfcAPI();
		this.api.SetWasmPath('node_modules/web-ifc/');
	}

	async loadIfcFile(ifcData: ArrayBuffer): Promise<void> {
		await this.api.Init();
		const uint8Array = new Uint8Array(ifcData);
		this.modelId = this.api.OpenModel(uint8Array);
	}

	async extractMeshes(): Promise<IMeshData[]> {
		if (!this.modelId) {
			throw new Error('No IFC model loaded');
		}

		const meshes: IMeshData[] = [];
		
		// Get all geometric representation items
		const geometries = this.api.GetLineIDsWithType(this.modelId, WebIFC.IFCGEOMETRICREPRESENTATIONITEM);
		
		for (const geometryId of geometries) {
			try {
				const geometry = this.api.GetGeometry(this.modelId, geometryId);
				if (geometry && geometry.GetVertexDataSize() > 0) {
					const meshData = this.extractMeshFromGeometry(geometry, geometryId);
					if (meshData) {
						meshes.push(meshData);
					}
				}
			} catch (error) {
				console.warn(`Failed to extract geometry for ID ${geometryId}:`, error);
			}
		}

		return meshes;
	}

	private extractMeshFromGeometry(geometry: WebIFC.IfcGeometry, id: number): IMeshData | null {
		try {
			const vertexData = this.api.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
			const indexData = this.api.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());

			if (vertexData.length === 0 || indexData.length === 0) {
				return null;
			}

			// Extract vertices (every 6 floats: x, y, z, nx, ny, nz)
			const vertices = new Float32Array(vertexData.length / 2);
			const normals = new Float32Array(vertexData.length / 2);
			
			for (let i = 0; i < vertexData.length; i += 6) {
				const vertexIndex = (i / 6) * 3;
				// Position
				vertices[vertexIndex] = vertexData[i];
				vertices[vertexIndex + 1] = vertexData[i + 1];
				vertices[vertexIndex + 2] = vertexData[i + 2];
				// Normal
				normals[vertexIndex] = vertexData[i + 3];
				normals[vertexIndex + 1] = vertexData[i + 4];
				normals[vertexIndex + 2] = vertexData[i + 5];
			}

			const geometryData: IGeometryData = {
				vertices,
				indices: new Uint32Array(indexData),
				normals,
			};

			return {
				id,
				geometry: geometryData,
				name: `Mesh_${id}`,
			};
		} catch (error) {
			console.warn(`Failed to process geometry data for ID ${id}:`, error);
			return null;
		}
	}

	async extractMaterials(): Promise<IMaterialData[]> {
		if (!this.modelId) {
			return [];
		}

		const materials: IMaterialData[] = [];
		
		try {
			// Get all material definitions
			const materialIds = this.api.GetLineIDsWithType(this.modelId, WebIFC.IFCMATERIAL);
			
			for (const materialId of materialIds) {
				const material = this.api.GetLine(this.modelId, materialId);
				if (material) {
					const materialData: IMaterialData = {
						id: materialId,
						name: material.Name?.value || `Material_${materialId}`,
					};
					
					// Try to get color information
					const colorIds = this.api.GetLineIDsWithType(this.modelId, WebIFC.IFCCOLOURRGB);
					for (const colorId of colorIds) {
						const color = this.api.GetLine(this.modelId, colorId);
						if (color) {
							materialData.color = [
								color.Red?.value || 0.5,
								color.Green?.value || 0.5,
								color.Blue?.value || 0.5,
								1.0
							];
							break;
						}
					}
					
					materials.push(materialData);
				}
			}
		} catch (error) {
			console.warn('Failed to extract materials:', error);
		}

		return materials;
	}

	getModelInfo(): { vertexCount: number; meshCount: number } {
		if (!this.modelId) {
			return { vertexCount: 0, meshCount: 0 };
		}

		const geometries = this.api.GetLineIDsWithType(this.modelId, WebIFC.IFCGEOMETRICREPRESENTATIONITEM);
		return {
			meshCount: geometries.size(),
			vertexCount: 0, // Will be calculated during extraction
		};
	}

	dispose(): void {
		if (this.modelId !== null) {
			this.api.CloseModel(this.modelId);
		}
	}
}
