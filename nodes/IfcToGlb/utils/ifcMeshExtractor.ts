import * as WebIFC from 'web-ifc';
import * as path from 'path';
import * as fs from 'fs';
import { IMeshData, IGeometryData, IMaterialData } from '../types/interfaces';

export class IfcMeshExtractor {
	private api: WebIFC.IfcAPI;
	private modelId: number | null = null;

	constructor() {
		this.api = new WebIFC.IfcAPI();
		// Don't set WASM path in constructor - let it be handled during initialization
	}

	private findWebIfcWasmPath(): string {
		// Try different possible locations for the web-ifc WASM files
		const possiblePaths = [
			// Direct module resolution first
			this.tryResolveWebIfcPath(),
			// n8n specific paths - most likely locations
			'/usr/lib/node_modules/n8n/node_modules/web-ifc/',
			'/home/node/.n8n/nodes/node_modules/n8n-nodes-ifc-extractor/node_modules/web-ifc/',
			'/home/node/.n8n/nodes/node_modules/web-ifc/',
			'/opt/n8n/node_modules/web-ifc/',
			// Docker and containerized paths
			'/usr/local/lib/node_modules/web-ifc/',
			'/app/node_modules/web-ifc/',
			// Relative paths from current location
			path.resolve(__dirname, '../../../node_modules/web-ifc/'),
			path.resolve(__dirname, '../../../../node_modules/web-ifc/'),
			path.resolve(__dirname, '../../../../../node_modules/web-ifc/'),
			path.resolve(__dirname, '../../../../../../node_modules/web-ifc/'),
			// Current working directory paths
			path.resolve(process.cwd(), 'node_modules/web-ifc/'),
			path.resolve(process.cwd(), '../node_modules/web-ifc/'),
			// Global node_modules
			'/usr/lib/node_modules/web-ifc/',
			'/usr/local/lib/node_modules/web-ifc/',
			// Fallback paths
			'node_modules/web-ifc/',
			'./node_modules/web-ifc/',
		];

		// Log environment info for debugging
		console.log('WASM Path Detection - Environment Info:');
		console.log(`  __dirname: ${__dirname}`);
		console.log(`  process.cwd(): ${process.cwd()}`);
		console.log(`  __filename: ${__filename}`);

		// Return the first path that contains the WASM file
		for (const testPath of possiblePaths) {
			if (testPath && this.checkWasmExists(testPath)) {
				console.log(`Found web-ifc WASM files at: ${testPath}`);
				return testPath;
			}
		}

		// If none found, log available paths for debugging
		console.warn('Could not find web-ifc WASM files in any of these paths:');
		possiblePaths.filter(p => p).forEach(p => {
			if (p) {
				try {
					console.warn(`  - ${p} (exists: ${fs.existsSync(p)})`);
				} catch (e) {
					console.warn(`  - ${p} (error checking: ${e})`);
				}
			}
		});
		
		// Try to list what's actually in some key directories
		this.debugDirectoryContents();
		
		// Use a relative fallback
		return './node_modules/web-ifc/';
	}

	private tryResolveWebIfcPath(): string | null {
		try {
			const webIfcPackageJson = require.resolve('web-ifc/package.json');
			const webIfcDir = path.dirname(webIfcPackageJson);
			return webIfcDir + '/';
		} catch (error) {
			return null;
		}
	}

	private checkWasmExists(testPath: string): boolean {
		try {
			const wasmFile = path.join(testPath, 'web-ifc.wasm');
			const nodeWasmFile = path.join(testPath, 'web-ifc-node.wasm');
			return fs.existsSync(wasmFile) || fs.existsSync(nodeWasmFile);
		} catch (error) {
			return false;
		}
	}

	private debugDirectoryContents(): void {
		const dirsToCheck = [
			'/usr/lib/node_modules/',
			'/usr/local/lib/node_modules/',
			'/home/node/.n8n/nodes/node_modules/',
			process.cwd(),
			path.dirname(__filename),
		];

		console.log('Directory contents for debugging:');
		dirsToCheck.forEach(dir => {
			try {
				if (fs.existsSync(dir)) {
					const contents = fs.readdirSync(dir).slice(0, 10); // First 10 items
					console.log(`  ${dir}: ${contents.join(', ')}`);
				} else {
					console.log(`  ${dir}: (does not exist)`);
				}
			} catch (e) {
				console.log(`  ${dir}: (error reading: ${e})`);
			}
		});
	}

	async loadIfcFile(ifcData: ArrayBuffer): Promise<void> {
		try {
			console.log('Initializing web-ifc API...');
			
			// Try multiple initialization approaches
			let initSuccess = false;
			const errors: string[] = [];

			// Approach 1: Default initialization (no custom WASM path)
			try {
				console.log('Trying default initialization...');
				this.api = new WebIFC.IfcAPI();
				await this.api.Init();
				initSuccess = true;
				console.log('web-ifc API initialized successfully with default approach');
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				errors.push(`Default init failed: ${errorMsg}`);
				console.warn('Default initialization failed:', errorMsg);
			}

			// Approach 2: Try with module resolution WASM path
			if (!initSuccess) {
				try {
					console.log('Trying module resolution WASM path...');
					this.api = new WebIFC.IfcAPI();
					const webIfcPath = this.tryResolveWebIfcPath();
					if (webIfcPath) {
						console.log(`Setting WASM path to: ${webIfcPath}`);
						this.api.SetWasmPath(webIfcPath);
						await this.api.Init();
						initSuccess = true;
						console.log(`web-ifc API initialized with module resolution path: ${webIfcPath}`);
					} else {
						errors.push('Module resolution failed: could not resolve web-ifc path');
					}
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : 'Unknown error';
					errors.push(`Module resolution init failed: ${errorMsg}`);
					console.warn('Module resolution initialization failed:', errorMsg);
				}
			}

			// Approach 3: Try with searched WASM path
			if (!initSuccess) {
				try {
					console.log('Trying searched WASM path...');
					this.api = new WebIFC.IfcAPI();
					const wasmPath = this.findWebIfcWasmPath();
					console.log(`Setting searched WASM path to: ${wasmPath}`);
					this.api.SetWasmPath(wasmPath);
					await this.api.Init();
					initSuccess = true;
					console.log(`web-ifc API initialized with searched path: ${wasmPath}`);
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : 'Unknown error';
					errors.push(`Searched path init failed: ${errorMsg}`);
					console.warn('Searched path initialization failed:', errorMsg);
				}
			}

			// Approach 4: Try with CDN fallback (for web environments)
			if (!initSuccess) {
				try {
					console.log('Trying CDN fallback...');
					this.api = new WebIFC.IfcAPI();
					this.api.SetWasmPath('https://unpkg.com/web-ifc@0.0.57/');
					await this.api.Init();
					initSuccess = true;
					console.log('web-ifc API initialized with CDN fallback');
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : 'Unknown error';
					errors.push(`CDN fallback init failed: ${errorMsg}`);
					console.warn('CDN fallback initialization failed:', errorMsg);
				}
			}

			if (!initSuccess) {
				const fullError = `Failed to initialize web-ifc API after trying all approaches. Errors: ${errors.join('; ')}`;
				console.error(fullError);
				throw new Error(fullError);
			}
			
			const uint8Array = new Uint8Array(ifcData);
			console.log(`Loading IFC file with ${uint8Array.length} bytes...`);
			
			// Log first few bytes to help with debugging
			const firstBytes = Array.from(uint8Array.slice(0, 20)).map(b => String.fromCharCode(b)).join('');
			console.log(`First 20 characters of file: "${firstBytes}"`);
			
			// Check if it looks like an IFC file
			const ifcHeader = new TextDecoder().decode(uint8Array.slice(0, 100));
			console.log(`File header: ${ifcHeader.substring(0, 100)}`);
			
			if (!ifcHeader.includes('ISO-10303') && !ifcHeader.includes('IFC')) {
				console.warn('File does not appear to be a valid IFC file based on header');
			}
			
			try {
				console.log('Attempting to open IFC model...');
				console.log(`File size: ${uint8Array.length} bytes`);
				console.log(`First 50 bytes as hex: ${Array.from(uint8Array.slice(0, 50)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
				
				this.modelId = this.api.OpenModel(uint8Array);
				console.log(`OpenModel returned ID: ${this.modelId} (type: ${typeof this.modelId})`);
				
				// Check for obvious failures first
				if (this.modelId === null || this.modelId === undefined || this.modelId === -1) {
					const debugInfo = {
						modelId: this.modelId,
						modelIdType: typeof this.modelId,
						fileSize: uint8Array.length,
						firstBytes: firstBytes,
						header: ifcHeader.substring(0, 50),
						wasmInitialized: !!this.api
					};
					console.error('Model loading definitely failed (null/undefined/-1) - Debug info:', debugInfo);
					throw new Error(`Model loading failed: ${this.modelId}. Web-ifc could not parse the IFC file.`);
				}
				
				// For other values (including 0), try to validate by checking if we can get data
				let modelValidated = false;
				let lineCount = 0;
				
				try {
					console.log(`Attempting to validate model with ID ${this.modelId}...`);
					const allLines = this.api.GetAllLines(this.modelId);
					lineCount = allLines.size();
					console.log(`Model validation: Found ${lineCount} lines in IFC model`);
					
					if (lineCount > 0) {
						modelValidated = true;
						console.log(`Model ID ${this.modelId} is valid - contains ${lineCount} lines`);
					} else {
						console.warn(`Model ID ${this.modelId} appears empty (0 lines)`);
					}
				} catch (validationError) {
					console.error('Model validation failed:', validationError);
					
					// Try to get more detailed error information for debugging
					try {
						const textContent = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array.slice(0, 1000));
						console.log(`First 1000 chars as text: "${textContent}"`);
						
						// Check for common file issues
						const hasProperEnding = textContent.includes('END-ISO-10303-21');
						const hasDataSection = textContent.includes('DATA;');
						const hasEnditSection = textContent.includes('ENDSEC;');
						
						console.log(`File structure check - Proper ending: ${hasProperEnding}, Data section: ${hasDataSection}, Endsec: ${hasEnditSection}`);
						
					} catch (textError) {
						console.warn('Could not decode file as text for debugging:', textError);
					}
				}
				
				// Final decision: if we couldn't validate the model, consider it failed
				if (!modelValidated) {
					const debugInfo = {
						modelId: this.modelId,
						modelIdType: typeof this.modelId,
						fileSize: uint8Array.length,
						lineCount: lineCount,
						firstBytes: firstBytes,
						header: ifcHeader.substring(0, 50),
						wasmInitialized: !!this.api
					};
					console.error('Model validation failed - treating as invalid - Debug info:', debugInfo);
					this.modelId = null;
					throw new Error(`Model ID ${this.modelId} could not be validated. No data could be extracted from the IFC file.`);
				}
				
			} catch (modelError) {
				const errorMsg = modelError instanceof Error ? modelError.message : 'Unknown error';
				console.error('Failed to open/validate IFC model:', errorMsg);
				this.modelId = null;
				throw new Error(`Failed to open IFC model: ${errorMsg}`);
			}
		} catch (error) {
			console.error('Failed to load IFC file:', error);
			this.modelId = null;
			throw new Error(`Failed to initialize web-ifc or load IFC file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async extractMeshes(): Promise<IMeshData[]> {
		if (this.modelId === null || this.modelId === undefined) {
			const errorMsg = `No valid IFC model loaded. Model ID: ${this.modelId}. Call loadIfcFile() first.`;
			console.error(errorMsg);
			throw new Error(errorMsg);
		}

		console.log(`=== Starting mesh extraction for model ID: ${this.modelId} ===`);
		const meshes: IMeshData[] = [];
		
		// First, let's see what types of entities we have in the model
		try {
			const allLines = this.api.GetAllLines(this.modelId);
			console.log(`Total lines in model: ${allLines.size()}`);
			
			// Check for common IFC geometric entities
			const geometricTypes = [
				'IFCGEOMETRICREPRESENTATIONITEM',
				'IFCEXTRUDEDAREASOLID',
				'IFCTRIANGULATEDFACESET',
				'IFCPOLYGONALFACESET',
				'IFCFACETEDBREP',
				'IFCSHELLBASEDSURFACEMODEL',
				'IFCMANIFOLDSOLIDBREP',
				'IFCADVANCEDBREP',
				'IFCCSGSOLID',
				'IFCSWEPTAREASOLID',
				'IFCSWEPTDISCSOLID',
				'IFCBOOLEANRESULT',
			];
			
			for (const typeName of geometricTypes) {
				try {
					const typeId = (WebIFC as any)[typeName] as number;
					if (typeId !== undefined) {
						const entities = this.api.GetLineIDsWithType(this.modelId, typeId);
						console.log(`Found ${entities.size()} entities of type ${typeName} (ID: ${typeId})`);
						
						// Try the direct geometry approach for these entities
						for (let i = 0; i < entities.size(); i++) {
							const entityId = entities.get(i);
							try {
								console.log(`Attempting to get geometry for ${typeName} entity ${entityId}...`);
								const geometry = this.api.GetGeometry(this.modelId, entityId);
								if (geometry && geometry.GetVertexDataSize() > 0) {
									console.log(`Found geometry data: ${geometry.GetVertexDataSize()} vertex bytes, ${geometry.GetIndexDataSize()} index bytes`);
									const meshData = this.extractMeshFromGeometry(geometry, entityId);
									if (meshData) {
										meshes.push(meshData);
										console.log(`Successfully extracted mesh from ${typeName} entity ${entityId}`);
									}
								} else {
									console.log(`No geometry data for ${typeName} entity ${entityId}`);
								}
							} catch (geomError) {
								console.warn(`Failed to get geometry for ${typeName} entity ${entityId}:`, geomError);
							}
						}
					}
				} catch (typeError) {
					console.warn(`Type ${typeName} not available or error:`, typeError);
				}
			}
			
			// Alternative approach: Try LoadAllGeometry
			if (meshes.length === 0) {
				console.log('No meshes found with direct approach, trying LoadAllGeometry...');
				try {
					const allGeometry = this.api.LoadAllGeometry(this.modelId);
					console.log(`LoadAllGeometry returned ${allGeometry.size()} geometry items`);
					
					for (let i = 0; i < allGeometry.size(); i++) {
						const flatMesh = allGeometry.get(i);
						console.log(`Processing FlatMesh ${i}: expressID=${flatMesh.expressID}, geometries=${flatMesh.geometries.size()}`);
						
						// Convert FlatMesh to our IMeshData format using PlacedGeometry
						for (let j = 0; j < flatMesh.geometries.size(); j++) {
							const placedGeom = flatMesh.geometries.get(j);
							if (placedGeom) {
								console.log(`Converting placed geometry ${j} with transformation`);
								try {
									// Extract geometry data from PlacedGeometry
									const meshData = this.extractMeshFromPlacedGeometry(placedGeom, flatMesh.expressID);
									if (meshData) {
										meshes.push(meshData);
										console.log(`Successfully converted FlatMesh placed geometry ${j}`);
									}
								} catch (placedGeomError) {
									console.warn(`Failed to convert placed geometry ${j}:`, placedGeomError);
								}
							}
						}
					}
				} catch (loadAllError) {
					console.error('LoadAllGeometry failed:', loadAllError);
				}
			}
			
		} catch (extractionError) {
			console.error('Error during mesh extraction:', extractionError);
		}

		console.log(`=== Mesh extraction completed: ${meshes.length} meshes found ===`);
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

	private extractMeshFromPlacedGeometry(placedGeom: WebIFC.PlacedGeometry, id: number): IMeshData | null {
		try {
			// PlacedGeometry contains vertex data directly in a flat array
			const vertexArray = placedGeom.flatTransformation;
			
			if (!vertexArray || vertexArray.length === 0) {
				console.log(`No vertex data in placed geometry for ID ${id}`);
				return null;
			}
			
			console.log(`PlacedGeometry ID ${id}: ${vertexArray.length} total values in flat array`);
			
			// The flat transformation contains vertices in groups
			// Each vertex typically has 6 values: x, y, z, nx, ny, nz (position + normal)
			const valuesPerVertex = 6;
			const vertexCount = Math.floor(vertexArray.length / valuesPerVertex);
			
			if (vertexCount < 3) {
				console.log(`Insufficient vertices (${vertexCount}) for ID ${id}`);
				return null;
			}
			
			console.log(`Extracting ${vertexCount} vertices from placed geometry ID ${id}`);
			
			const vertices = new Float32Array(vertexCount * 3);
			const normals = new Float32Array(vertexCount * 3);
			
			for (let i = 0; i < vertexCount; i++) {
				const baseIndex = i * valuesPerVertex;
				const vertexIndex = i * 3;
				
				// Position
				vertices[vertexIndex] = vertexArray[baseIndex];
				vertices[vertexIndex + 1] = vertexArray[baseIndex + 1];
				vertices[vertexIndex + 2] = vertexArray[baseIndex + 2];
				
				// Normal (if available)
				if (baseIndex + 5 < vertexArray.length) {
					normals[vertexIndex] = vertexArray[baseIndex + 3];
					normals[vertexIndex + 1] = vertexArray[baseIndex + 4];
					normals[vertexIndex + 2] = vertexArray[baseIndex + 5];
				} else {
					// Default normal pointing up if not available
					normals[vertexIndex] = 0;
					normals[vertexIndex + 1] = 0;
					normals[vertexIndex + 2] = 1;
				}
			}
			
			// Create indices for triangulation (assuming triangular faces)
			const indexCount = Math.floor(vertexCount / 3) * 3;
			const indices = new Uint32Array(indexCount);
			for (let i = 0; i < indexCount; i++) {
				indices[i] = i;
			}
			
			const geometryData: IGeometryData = {
				vertices,
				indices,
				normals,
			};
			
			console.log(`Successfully created mesh from PlacedGeometry ID ${id}: ${vertexCount} vertices, ${indices.length} indices`);
			
			return {
				id,
				geometry: geometryData,
				name: `PlacedMesh_${id}`,
			};
		} catch (error) {
			console.warn(`Failed to process placed geometry data for ID ${id}:`, error);
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
