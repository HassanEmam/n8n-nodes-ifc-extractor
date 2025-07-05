import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { 
	IGeometryProperties, 
	IMeshAnalysisResult, 
	IGlbAnalysisResult, 
	IGlbAnalysisOptions,
	IFaceAreas,
	IDimensions,
	IBoundingBox
} from '../types/interfaces';

export class GeometryAnalyzer {
	private loader: GLTFLoader;

	constructor() {
		this.loader = new GLTFLoader();
	}

	async analyzeGLBFile(glbData: ArrayBuffer, options: IGlbAnalysisOptions): Promise<IGlbAnalysisResult> {
		const startTime = Date.now();
		
		// Convert ArrayBuffer to Blob URL for GLTFLoader
		const blob = new Blob([glbData], { type: 'model/gltf-binary' });
		const url = URL.createObjectURL(blob);

		try {
			const gltf = await this.loadGLTF(url);
			const meshResults: IMeshAnalysisResult[] = [];
			
			// Analyze each mesh in the model
			gltf.scene.traverse((child: THREE.Object3D) => {
				if (child instanceof THREE.Mesh && child.geometry) {
					const meshAnalysis = this.analyzeMesh(child, options);
					if (meshAnalysis) {
						meshResults.push(meshAnalysis);
					}
				}
			});

			// Calculate summary statistics
			const summary = this.calculateSummary(meshResults);
			const processingTime = Date.now() - startTime;

			return {
				meshes: meshResults,
				summary,
				metadata: {
					analyzedAt: new Date().toISOString(),
					options,
					processingTimeMs: processingTime,
				},
			};
		} finally {
			// Clean up the blob URL
			URL.revokeObjectURL(url);
		}
	}

	private loadGLTF(url: string): Promise<any> {
		return new Promise((resolve, reject) => {
			this.loader.load(
				url,
				(gltf) => resolve(gltf),
				undefined,
				(error) => reject(error)
			);
		});
	}

	private analyzeMesh(mesh: THREE.Mesh, options: IGlbAnalysisOptions): IMeshAnalysisResult | null {
		try {
			const geometry = mesh.geometry.clone();
			const properties = this.computeGeometryProperties(geometry, options);

			const result: IMeshAnalysisResult = {
				name: mesh.name || 'Unnamed Mesh',
				...properties,
			};

			if (options.includeMetadata) {
				result.metadata = {
					vertexCount: geometry.attributes.position.count,
					faceCount: geometry.attributes.position.count / 3,
					materialName: Array.isArray(mesh.material) 
						? mesh.material[0]?.name || 'Multiple Materials'
						: mesh.material?.name || 'Default Material',
				};
			}

			return result;
		} catch (error) {
			console.warn(`Failed to analyze mesh ${mesh.name}:`, error);
			return null;
		}
	}

	private computeGeometryProperties(geometry: THREE.BufferGeometry, options: IGlbAnalysisOptions): IGeometryProperties {
		// Ensure geometry is in the right format
		if (geometry.index) {
			geometry = geometry.toNonIndexed();
		}
		geometry.computeVertexNormals();
		geometry.computeBoundingBox();

		const position = geometry.attributes.position;
		const faceCount = position.count / 3;

		const properties: IGeometryProperties = {
			volume: 0,
			faceAreas: {
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				front: 0,
				back: 0
			},
			facePerimeters: [],
			faceOrientations: [],
			boundingBox: {
				min: {
					x: geometry.boundingBox!.min.x,
					y: geometry.boundingBox!.min.y,
					z: geometry.boundingBox!.min.z
				},
				max: {
					x: geometry.boundingBox!.max.x,
					y: geometry.boundingBox!.max.y,
					z: geometry.boundingBox!.max.z
				}
			},
			dimensions: {
				width: geometry.boundingBox!.max.x - geometry.boundingBox!.min.x,
				height: geometry.boundingBox!.max.y - geometry.boundingBox!.min.y,
				depth: geometry.boundingBox!.max.z - geometry.boundingBox!.min.z
			}
		};

		// Process each face
		for (let i = 0; i < faceCount; i++) {
			const a = new THREE.Vector3().fromBufferAttribute(position, i * 3);
			const b = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 1);
			const c = new THREE.Vector3().fromBufferAttribute(position, i * 3 + 2);

			// Calculate face area using cross product
			const ab = b.clone().sub(a);
			const ac = c.clone().sub(a);
			const cross = new THREE.Vector3().crossVectors(ab, ac);
			const area = 0.5 * cross.length();

			// Calculate volume contribution (signed tetrahedron)
			if (options.includeVolume) {
				const volumeContribution = a.dot(b.clone().cross(c)) / 6;
				properties.volume += volumeContribution;
			}

			// Calculate perimeter
			if (options.includePerimeters) {
				const perimeter = a.distanceTo(b) + b.distanceTo(c) + c.distanceTo(a);
				properties.facePerimeters.push(Math.round(perimeter * Math.pow(10, options.precision)) / Math.pow(10, options.precision));
			}

			// Calculate face normal and orientation
			const normal = cross.clone().normalize();
			
			if (options.includeOrientations) {
				// Angle from horizontal plane (Y-axis)
				const horizontalVector = new THREE.Vector3(0, 1, 0);
				const angleFromHorizontal = THREE.MathUtils.radToDeg(
					Math.acos(Math.abs(normal.dot(horizontalVector)))
				);
				properties.faceOrientations.push(Math.round(angleFromHorizontal * Math.pow(10, options.precision)) / Math.pow(10, options.precision));
			}

			// Categorize face direction for area calculation
			if (options.includeAreas) {
				const axis = normal.clone();
				const threshold = 0.7; // More lenient threshold for face classification

				if (Math.abs(axis.y) > threshold) {
					if (axis.y > 0) properties.faceAreas.top += area;
					else properties.faceAreas.bottom += area;
				} else if (Math.abs(axis.x) > threshold) {
					if (axis.x > 0) properties.faceAreas.right += area;
					else properties.faceAreas.left += area;
				} else if (Math.abs(axis.z) > threshold) {
					if (axis.z > 0) properties.faceAreas.front += area;
					else properties.faceAreas.back += area;
				}
			}
		}

		// Ensure volume is positive and apply precision
		if (options.includeVolume) {
			properties.volume = Math.round(Math.abs(properties.volume) * Math.pow(10, options.precision)) / Math.pow(10, options.precision);
		}

		// Apply precision to face areas
		if (options.includeAreas) {
			const precision = Math.pow(10, options.precision);
			properties.faceAreas.top = Math.round(properties.faceAreas.top * precision) / precision;
			properties.faceAreas.bottom = Math.round(properties.faceAreas.bottom * precision) / precision;
			properties.faceAreas.left = Math.round(properties.faceAreas.left * precision) / precision;
			properties.faceAreas.right = Math.round(properties.faceAreas.right * precision) / precision;
			properties.faceAreas.front = Math.round(properties.faceAreas.front * precision) / precision;
			properties.faceAreas.back = Math.round(properties.faceAreas.back * precision) / precision;
		}

		// Apply precision to dimensions
		if (options.includeDimensions) {
			const precision = Math.pow(10, options.precision);
			properties.dimensions.width = Math.round(properties.dimensions.width * precision) / precision;
			properties.dimensions.height = Math.round(properties.dimensions.height * precision) / precision;
			properties.dimensions.depth = Math.round(properties.dimensions.depth * precision) / precision;
		}

		return properties;
	}

	private calculateSummary(meshResults: IMeshAnalysisResult[]) {
		const summary = {
			totalMeshes: meshResults.length,
			totalVolume: 0,
			totalSurfaceArea: 0,
			averageFaceOrientation: 0,
			overallDimensions: { width: 0, height: 0, depth: 0 } as IDimensions,
			overallBoundingBox: {
				min: { x: Infinity, y: Infinity, z: Infinity },
				max: { x: -Infinity, y: -Infinity, z: -Infinity }
			} as IBoundingBox,
		};

		let totalOrientations = 0;
		let orientationCount = 0;

		for (const mesh of meshResults) {
			// Sum volumes
			summary.totalVolume += mesh.volume;

			// Sum surface areas
			const faceAreas = mesh.faceAreas;
			summary.totalSurfaceArea += faceAreas.top + faceAreas.bottom + faceAreas.left + 
										faceAreas.right + faceAreas.front + faceAreas.back;

			// Calculate average orientation
			for (const orientation of mesh.faceOrientations) {
				totalOrientations += orientation;
				orientationCount++;
			}

			// Update overall bounding box
			if (mesh.boundingBox.min.x < summary.overallBoundingBox.min.x) {
				summary.overallBoundingBox.min.x = mesh.boundingBox.min.x;
			}
			if (mesh.boundingBox.min.y < summary.overallBoundingBox.min.y) {
				summary.overallBoundingBox.min.y = mesh.boundingBox.min.y;
			}
			if (mesh.boundingBox.min.z < summary.overallBoundingBox.min.z) {
				summary.overallBoundingBox.min.z = mesh.boundingBox.min.z;
			}
			if (mesh.boundingBox.max.x > summary.overallBoundingBox.max.x) {
				summary.overallBoundingBox.max.x = mesh.boundingBox.max.x;
			}
			if (mesh.boundingBox.max.y > summary.overallBoundingBox.max.y) {
				summary.overallBoundingBox.max.y = mesh.boundingBox.max.y;
			}
			if (mesh.boundingBox.max.z > summary.overallBoundingBox.max.z) {
				summary.overallBoundingBox.max.z = mesh.boundingBox.max.z;
			}
		}

		// Calculate average orientation
		summary.averageFaceOrientation = orientationCount > 0 ? totalOrientations / orientationCount : 0;

		// Calculate overall dimensions
		summary.overallDimensions = {
			width: summary.overallBoundingBox.max.x - summary.overallBoundingBox.min.x,
			height: summary.overallBoundingBox.max.y - summary.overallBoundingBox.min.y,
			depth: summary.overallBoundingBox.max.z - summary.overallBoundingBox.min.z,
		};

		return summary;
	}
}
