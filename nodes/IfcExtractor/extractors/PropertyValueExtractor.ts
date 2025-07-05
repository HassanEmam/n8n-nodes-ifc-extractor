// ============================================================================
// PROPERTY VALUE EXTRACTOR
// ============================================================================

import { convertToPlainObject } from '../utils/helpers';

/**
 * Handles extraction of property values from IFC value objects
 */
export class PropertyValueExtractor {
	static extract(valueObj: any): any {
		if (!valueObj) return null;
		
		try {
			// Handle different value types
			if (valueObj.value !== undefined) {
				return valueObj.value;
			}
			
			// Handle objects with specific value properties
			if (valueObj.constructor && valueObj.constructor.name) {
				switch (valueObj.constructor.name) {
					case 'IfcText':
					case 'IfcLabel':
					case 'IfcIdentifier':
						return valueObj.value || valueObj.toString();
						
					case 'IfcReal':
					case 'IfcInteger':
					case 'IfcNumber':
						return parseFloat(valueObj.value) || valueObj.value;
						
					case 'IfcBoolean':
						return valueObj.value === 'T' || valueObj.value === true;
						
					case 'IfcLogical':
						return valueObj.value === 'T' ? true : valueObj.value === 'F' ? false : null;
						
					default:
						return convertToPlainObject(valueObj);
				}
			}
			
			return convertToPlainObject(valueObj);
		} catch (error) {
			return valueObj ? valueObj.toString() : null;
		}
	}
}
