// ============================================================================
// PROPERTY EXTRACTOR
// ============================================================================

import * as WebIFC from 'web-ifc';
import { IPropertyData } from '../types/interfaces';
import { PropertyValueExtractor } from './PropertyValueExtractor';

/**
 * Handles extraction of individual properties
 */
export class PropertyExtractor {
	constructor(private ifcApi: WebIFC.IfcAPI, private modelID: number) {}

	extract(propertyID: number, property: any): IPropertyData | null {
		try {
			const result: IPropertyData = {
				id: propertyID,
				type: property.constructor.name,
				name: property.Name ? property.Name.value : 'Unknown',
				description: property.Description ? property.Description.value : null,
				value: null,
				unit: null
			};
			
			// Handle different property types
			switch (property.constructor.name) {
				case 'IfcPropertySingleValue':
					if (property.NominalValue) {
						result.value = PropertyValueExtractor.extract(property.NominalValue);
					}
					if (property.Unit) {
						result.unit = PropertyValueExtractor.extract(property.Unit);
					}
					break;
					
				case 'IfcPropertyEnumeratedValue':
					if (property.EnumerationValues) {
						result.value = property.EnumerationValues.map((val: any) => PropertyValueExtractor.extract(val));
					}
					break;
					
				case 'IfcPropertyListValue':
					if (property.ListValues) {
						result.value = property.ListValues.map((val: any) => PropertyValueExtractor.extract(val));
					}
					break;
					
				case 'IfcPropertyBoundedValue':
					result.value = {
						upperBound: property.UpperBoundValue ? PropertyValueExtractor.extract(property.UpperBoundValue) : null,
						lowerBound: property.LowerBoundValue ? PropertyValueExtractor.extract(property.LowerBoundValue) : null,
						setPoint: property.SetPointValue ? PropertyValueExtractor.extract(property.SetPointValue) : null
					};
					break;
					
				case 'IfcPropertyTableValue':
					result.value = {
						definingValues: property.DefiningValues ? property.DefiningValues.map((val: any) => PropertyValueExtractor.extract(val)) : null,
						definedValues: property.DefinedValues ? property.DefinedValues.map((val: any) => PropertyValueExtractor.extract(val)) : null
					};
					break;
					
				default:
					// For other property types, convert the whole object
					result.value = property;
					break;
			}
			
			return result;
		} catch (error) {
			return null;
		}
	}
}
