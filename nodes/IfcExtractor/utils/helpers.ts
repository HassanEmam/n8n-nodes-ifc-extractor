// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

import * as WebIFC from 'web-ifc';

/**
 * Converts web-ifc objects to plain objects for JSON serialization
 */
export function convertToPlainObject(obj: any): any {
	if (obj === null || obj === undefined) {
		return obj;
	}

	// Handle primitive types
	if (typeof obj !== 'object') {
		return obj;
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		return obj.map(item => convertToPlainObject(item));
	}

	// Handle web-ifc Vector objects
	if (obj.size && typeof obj.size === 'function' && obj.get && typeof obj.get === 'function') {
		const array = [];
		for (let i = 0; i < obj.size(); i++) {
			array.push(convertToPlainObject(obj.get(i)));
		}
		return array;
	}

	// Handle regular objects
	const result: any = {};
	
	try {
		// Get all enumerable properties
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				const value = obj[key];
				// Skip functions and undefined values
				if (typeof value !== 'function' && value !== undefined) {
					result[key] = convertToPlainObject(value);
				}
			}
		}

		// Also check for properties that might not be enumerable
		const propertyNames = Object.getOwnPropertyNames(obj);
		for (const key of propertyNames) {
			if (!result.hasOwnProperty(key)) {
				try {
					const value = obj[key];
					if (typeof value !== 'function' && value !== undefined) {
						result[key] = convertToPlainObject(value);
					}
				} catch (error) {
					// Skip properties that can't be accessed
				}
			}
		}
	} catch (error) {
		// If we can't iterate properties, return a string representation
		return obj.toString ? obj.toString() : String(obj);
	}

	return result;
}

/**
 * Converts web-ifc Vector to Array
 */
export function vectorToArray(vector: any): number[] {
	const array: number[] = [];
	for (let i = 0; i < vector.size(); i++) {
		array.push(vector.get(i));
	}
	return array;
}

/**
 * Gets IFC type constant from string
 */
export function getIfcTypeConstant(ifcType: string): number {
	const ifcTypeConstant = (WebIFC as any)[ifcType];
	if (!ifcTypeConstant) {
		throw new Error(`Unknown IFC type: ${ifcType}`);
	}
	return ifcTypeConstant;
}
