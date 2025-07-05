import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { IMeshData, IMaterialData, IConversionResult, IIfcToGlbOptions } from '../types/interfaces';

export class GlbExporter {
	private scene: THREE.Scene;
	private materials: Map<number, THREE.Material>;
	private exporter: GLTFExporter;

	constructor() {
		this.scene = new THREE.Scene();
		this.materials = new Map();
		this.exporter = new GLTFExporter();
	}

	async convertToGlb(
		meshes: IMeshData[],
		materials: IMaterialData[],
		options: IIfcToGlbOptions
	): Promise<IConversionResult> {
		// Clear previous scene
		this.clearScene();
		
		// Create materials
		if (options.includeMaterials) {
			this.createMaterials(materials);
		}

		// Create meshes
		let totalVertexCount = 0;
		for (const meshData of meshes) {
			if (options.includeGeometry) {
				const mesh = this.createThreeMesh(meshData, options);
				if (mesh) {
					this.scene.add(mesh);
					totalVertexCount += meshData.geometry.vertices.length / 3;
				}
			}
		}

		// Export to GLB
		const gltfOptions = {
			binary: options.outputFormat === 'glb',
			embedImages: true,
			maxTextureSize: 4096,
			truncateDrawRange: true,
		};

		const glbData = await new Promise<ArrayBuffer>((resolve, reject) => {
			this.exporter.parse(
				this.scene,
				(result: any) => {
					if (result instanceof ArrayBuffer) {
						resolve(result);
					} else {
						// Convert JSON to ArrayBuffer if needed
						const jsonString = JSON.stringify(result);
						const buffer = new TextEncoder().encode(jsonString);
						resolve(buffer.buffer);
					}
				},
				(error: any) => reject(error),
				gltfOptions
			);
		});

		return {
			glbData,
			meshCount: meshes.length,
			vertexCount: totalVertexCount,
			fileSize: glbData.byteLength,
			materials,
			metadata: {
				generatedAt: new Date().toISOString(),
				options,
				threejsVersion: THREE.REVISION,
			},
		};
	}

	private createMaterials(materials: IMaterialData[]): void {
		for (const materialData of materials) {
			const material = new THREE.MeshStandardMaterial({
				name: materialData.name,
				color: materialData.color ? 
					new THREE.Color(materialData.color[0], materialData.color[1], materialData.color[2]) :
					new THREE.Color(0.7, 0.7, 0.7),
				transparent: materialData.transparency !== undefined,
				opacity: materialData.transparency !== undefined ? 
					1 - materialData.transparency : 1,
				side: THREE.DoubleSide,
			});

			this.materials.set(materialData.id, material);
		}
	}

	private createThreeMesh(meshData: IMeshData, options: IIfcToGlbOptions): THREE.Mesh | null {
		try {
			const geometry = new THREE.BufferGeometry();

			// Add position attribute
			geometry.setAttribute('position', new THREE.BufferAttribute(meshData.geometry.vertices, 3));

			// Add index attribute
			geometry.setIndex(new THREE.BufferAttribute(meshData.geometry.indices, 1));

			// Add normals if available
			if (meshData.geometry.normals) {
				geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.geometry.normals, 3));
			} else {
				geometry.computeVertexNormals();
			}

			// Add colors if available
			if (meshData.geometry.colors) {
				geometry.setAttribute('color', new THREE.BufferAttribute(meshData.geometry.colors, 4));
			}

			// Apply precision optimization
			if (options.precision < 1) {
				this.optimizeGeometry(geometry, options.precision);
			}

			// Get material
			let material: THREE.Material;
			if (meshData.material && this.materials.has(meshData.material.id)) {
				material = this.materials.get(meshData.material.id)!;
			} else {
				material = new THREE.MeshStandardMaterial({
					color: 0x888888,
					side: THREE.DoubleSide,
				});
			}

			const mesh = new THREE.Mesh(geometry, material);
			mesh.name = meshData.name || `Mesh_${meshData.id}`;

			// Apply transformation matrix if available
			if (meshData.matrix) {
				mesh.matrix.fromArray(meshData.matrix);
				mesh.matrixAutoUpdate = false;
			}

			return mesh;
		} catch (error) {
			console.warn(`Failed to create Three.js mesh for ${meshData.name}:`, error);
			return null;
		}
	}

	private optimizeGeometry(geometry: THREE.BufferGeometry, precision: number): void {
		// Simplify geometry based on precision
		const positionAttribute = geometry.getAttribute('position');
		if (positionAttribute) {
			const positions = positionAttribute.array as Float32Array;
			for (let i = 0; i < positions.length; i++) {
				positions[i] = Math.round(positions[i] / precision) * precision;
			}
			positionAttribute.needsUpdate = true;
		}
	}

	private clearScene(): void {
		// Remove all objects from scene
		while (this.scene.children.length > 0) {
			const child = this.scene.children[0];
			this.scene.remove(child);
			
			// Dispose of geometry and material
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose();
				if (Array.isArray(child.material)) {
					child.material.forEach((material: any) => material.dispose());
				} else {
					child.material.dispose();
				}
			}
		}

		// Clear materials map
		this.materials.clear();
	}

	dispose(): void {
		this.clearScene();
	}
}
