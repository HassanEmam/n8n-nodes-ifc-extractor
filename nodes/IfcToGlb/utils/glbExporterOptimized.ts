import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { IMeshData, IMaterialData, IConversionResult, IIfcToGlbOptions } from '../types/interfaces';

// Simple Node.js polyfills for Three.js GLTFExporter (minimal approach)
if (typeof global !== 'undefined' && typeof (globalThis as any).window === 'undefined') {
	// Only add essential polyfills that GLTFExporter actually needs
	if (!(global as any).FileReader) {
		(global as any).FileReader = class FileReader {
			result: string | ArrayBuffer | null = null;
			readyState: number = 2; // Always DONE
			onload: ((event: any) => void) | null = null;
			
			readAsArrayBuffer(blob: any) {
				// For GLTFExporter, just trigger onload immediately
				this.result = new ArrayBuffer(0);
				setTimeout(() => {
					if (this.onload) {
						this.onload({ target: this });
					}
				}, 0);
			}
		};
	}
	
	if (!(global as any).Blob) {
		(global as any).Blob = class Blob {
			constructor(chunks: any[] = [], options: any = {}) {}
			arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
		};
	}
	
	if (!(global as any).URL) {
		(global as any).URL = {
			createObjectURL: () => 'blob:nodeurl',
			revokeObjectURL: () => {},
		};
	}
}

export class GlbExporter {
	private exporter: GLTFExporter;

	constructor() {
		this.exporter = new GLTFExporter();
	}

	async convertToGlb(
		meshes: IMeshData[],
		materials: IMaterialData[],
		options: IIfcToGlbOptions
	): Promise<IConversionResult> {
		console.log(`Starting GLB conversion with ${meshes.length} meshes...`);
		
		try {
			// Create a combined scene with optimized geometry
			const combinedObject = this.createOptimizedScene(meshes, materials, options);
			
			console.log(`Created optimized scene with ${combinedObject.children.length} objects`);
			
			// Export with timeout to prevent hanging
			const glbData = await this.exportWithTimeout(combinedObject, options, 30000); // 30 second timeout
			
			const result: IConversionResult = {
				glbData,
				meshCount: meshes.length,
				vertexCount: meshes.reduce((sum, mesh) => sum + (mesh.geometry.vertices.length / 3), 0),
				fileSize: glbData.byteLength,
				materials,
				metadata: {
					generatedAt: new Date().toISOString(),
					options,
					threejsVersion: THREE.REVISION,
				},
			};
			
			console.log(`GLB conversion completed: ${result.fileSize} bytes, ${result.vertexCount} vertices`);
			return result;
			
		} catch (error) {
			console.error('GLB conversion failed:', error);
			throw error;
		}
	}

	private createOptimizedScene(
		meshes: IMeshData[],
		materials: IMaterialData[],
		options: IIfcToGlbOptions
	): THREE.Object3D {
		console.log('Creating optimized scene...');
		
		// Create a root object to hold everything
		const rootObject = new THREE.Object3D();
		rootObject.name = 'IFC_Model';
		
		// Create material map
		const materialMap = new Map<number, THREE.Material>();
		
		// Create materials first
		if (options.includeMaterials && materials.length > 0) {
			for (const materialData of materials) {
				const material = new THREE.MeshStandardMaterial({
					name: materialData.name,
					color: materialData.color ? 
						new THREE.Color(materialData.color[0], materialData.color[1], materialData.color[2]) :
						new THREE.Color(0.7, 0.7, 0.7),
					side: THREE.DoubleSide,
				});
				materialMap.set(materialData.id, material);
			}
		}
		
		// Default material
		const defaultMaterial = new THREE.MeshStandardMaterial({
			color: 0x888888,
			name: 'DefaultMaterial',
			side: THREE.DoubleSide,
		});
		
		// Group meshes by material to enable batching
		const meshGroups = new Map<THREE.MeshStandardMaterial, IMeshData[]>();
		
		for (const meshData of meshes) {
			if (!options.includeGeometry) continue;
			
			let material = defaultMaterial;
			if (meshData.material && materialMap.has(meshData.material.id)) {
				material = materialMap.get(meshData.material.id)! as THREE.MeshStandardMaterial;
			}
			
			if (!meshGroups.has(material)) {
				meshGroups.set(material, []);
			}
			meshGroups.get(material)!.push(meshData);
		}
		
		console.log(`Grouped ${meshes.length} meshes into ${meshGroups.size} material groups`);
		
		// Create batched geometry for each material group
		let objectCount = 0;
		for (const [material, groupMeshes] of meshGroups) {
			if (groupMeshes.length === 0) continue;
			
			// Limit batch size to prevent memory issues
			const batchSize = Math.min(100, groupMeshes.length);
			
			for (let i = 0; i < groupMeshes.length; i += batchSize) {
				const batchMeshes = groupMeshes.slice(i, i + batchSize);
				const batchObject = this.createBatchedMesh(batchMeshes, material, objectCount);
				
				if (batchObject) {
					rootObject.add(batchObject);
					objectCount++;
				}
			}
		}
		
		console.log(`Created ${objectCount} batched objects`);
		return rootObject;
	}

	private createBatchedMesh(
		meshes: IMeshData[],
		material: THREE.MeshStandardMaterial,
		batchIndex: number
	): THREE.Mesh | null {
		if (meshes.length === 0) return null;
		
		try {
			// For small batches, create individual meshes
			if (meshes.length === 1) {
				return this.createSingleMesh(meshes[0], material);
			}
			
			// For larger batches, try to merge geometry
			const geometries: THREE.BufferGeometry[] = [];
			
			for (const meshData of meshes) {
				const geometry = this.createGeometry(meshData);
				if (geometry) {
					geometries.push(geometry);
				}
			}
			
			if (geometries.length === 0) return null;
			
			// Use Three.js BufferGeometryUtils.mergeGeometries if available
			let mergedGeometry: THREE.BufferGeometry;
			if (geometries.length === 1) {
				mergedGeometry = geometries[0];
			} else {
				// Simple merge by combining attributes manually
				mergedGeometry = this.mergeGeometries(geometries);
			}
			
			const mesh = new THREE.Mesh(mergedGeometry, material);
			mesh.name = `Batch_${batchIndex}`;
			
			// Dispose individual geometries to free memory
			geometries.forEach(geom => {
				if (geom !== mergedGeometry) {
					geom.dispose();
				}
			});
			
			return mesh;
			
		} catch (error) {
			console.warn(`Failed to create batched mesh for batch ${batchIndex}:`, error);
			return null;
		}
	}

	private createSingleMesh(meshData: IMeshData, material: THREE.MeshStandardMaterial): THREE.Mesh | null {
		try {
			const geometry = this.createGeometry(meshData);
			if (!geometry) return null;
			
			const mesh = new THREE.Mesh(geometry, material);
			mesh.name = meshData.name || `Mesh_${meshData.id}`;
			
			return mesh;
		} catch (error) {
			console.warn(`Failed to create mesh for ${meshData.name}:`, error);
			return null;
		}
	}

	private createGeometry(meshData: IMeshData): THREE.BufferGeometry | null {
		try {
			const geometry = new THREE.BufferGeometry();
			
			// Add position attribute
			geometry.setAttribute('position', new THREE.BufferAttribute(meshData.geometry.vertices, 3));
			
			// Add index attribute
			geometry.setIndex(new THREE.BufferAttribute(meshData.geometry.indices, 1));
			
			// Add normals
			if (meshData.geometry.normals && meshData.geometry.normals.length > 0) {
				geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.geometry.normals, 3));
			} else {
				geometry.computeVertexNormals();
			}
			
			// Add colors if available
			if (meshData.geometry.colors && meshData.geometry.colors.length > 0) {
				geometry.setAttribute('color', new THREE.BufferAttribute(meshData.geometry.colors, 4));
			}
			
			return geometry;
		} catch (error) {
			console.warn(`Failed to create geometry for mesh ${meshData.id}:`, error);
			return null;
		}
	}

	private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
		// Simple geometry merging implementation
		const merged = new THREE.BufferGeometry();
		
		let totalVertices = 0;
		let totalIndices = 0;
		
		// Calculate total size
		for (const geometry of geometries) {
			const positionAttr = geometry.getAttribute('position');
			const indexAttr = geometry.getIndex();
			
			if (positionAttr) totalVertices += positionAttr.count;
			if (indexAttr) totalIndices += indexAttr.count;
		}
		
		// Create merged arrays
		const mergedPositions = new Float32Array(totalVertices * 3);
		const mergedNormals = new Float32Array(totalVertices * 3);
		const mergedIndices = new Uint32Array(totalIndices);
		
		let vertexOffset = 0;
		let indexOffset = 0;
		let vertexCount = 0;
		
		// Merge geometries
		for (const geometry of geometries) {
			const positionAttr = geometry.getAttribute('position');
			const normalAttr = geometry.getAttribute('normal');
			const indexAttr = geometry.getIndex();
			
			if (!positionAttr || !indexAttr) continue;
			
			// Copy positions
			mergedPositions.set(positionAttr.array as Float32Array, vertexOffset * 3);
			
			// Copy normals
			if (normalAttr) {
				mergedNormals.set(normalAttr.array as Float32Array, vertexOffset * 3);
			}
			
			// Copy indices with vertex offset
			const indices = indexAttr.array as Uint32Array;
			for (let i = 0; i < indices.length; i++) {
				mergedIndices[indexOffset + i] = indices[i] + vertexCount;
			}
			
			vertexOffset += positionAttr.count;
			indexOffset += indices.length;
			vertexCount += positionAttr.count;
		}
		
		// Set attributes
		merged.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
		merged.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));
		merged.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
		
		return merged;
	}

	private async exportWithTimeout(
		object: THREE.Object3D,
		options: IIfcToGlbOptions,
		timeoutMs: number
	): Promise<ArrayBuffer> {
		const gltfOptions = {
			binary: options.outputFormat === 'glb',
			embedImages: true,
			maxTextureSize: 4096,
			truncateDrawRange: true,
			includeCustomExtensions: false, // Simplify for better compatibility
		};
		
		return new Promise<ArrayBuffer>((resolve, reject) => {
			// Set up timeout
			const timeout = setTimeout(() => {
				reject(new Error(`GLB export timed out after ${timeoutMs}ms`));
			}, timeoutMs);
			
			try {
				this.exporter.parse(
					object,
					(result: any) => {
						clearTimeout(timeout);
						
						if (result instanceof ArrayBuffer) {
							console.log(`GLB export successful: ${result.byteLength} bytes`);
							resolve(result);
						} else {
							// Handle glTF JSON format
							const jsonString = JSON.stringify(result);
							const buffer = new TextEncoder().encode(jsonString);
							console.log(`GLTF export successful: ${buffer.byteLength} bytes`);
							resolve(buffer.buffer);
						}
					},
					(error: any) => {
						clearTimeout(timeout);
						console.error('GLTFExporter parse error:', error);
						reject(new Error(`GLB export failed: ${error.message || error}`));
					},
					gltfOptions
				);
			} catch (error) {
				clearTimeout(timeout);
				console.error('GLTFExporter setup error:', error);
				reject(new Error(`GLB export setup failed: ${error instanceof Error ? error.message : error}`));
			}
		});
	}

	dispose(): void {
		// Clean up any resources
	}
}
