// ============================================================================
// PROPERTY SET EXTRACTOR
// ============================================================================

import * as WebIFC from 'web-ifc';
import { IPropertySet } from '../types/interfaces';
import { PropertyExtractor } from './PropertyExtractor';

/**
 * Handles extraction of property sets
 */
export class PropertySetExtractor {
	private propertyExtractor: PropertyExtractor;

	constructor(private ifcApi: WebIFC.IfcAPI, private modelID: number) {
		this.propertyExtractor = new PropertyExtractor(ifcApi, modelID);
	}

	extract(propertySetID: number): IPropertySet | null {
		try {
			const propertySet = this.ifcApi.GetLine(this.modelID, propertySetID);
			
			if (propertySet.constructor.name !== 'IfcPropertySet') {
				return null;
			}
			
			const result: IPropertySet = {
				id: propertySetID,
				name: propertySet.Name ? propertySet.Name.value : 'Unknown',
				description: propertySet.Description ? propertySet.Description.value : null,
				properties: {}
			};
			
			// Extract individual properties
			if (propertySet.HasProperties) {
				const properties = propertySet.HasProperties;
				
				for (let i = 0; i < properties.length; i++) {
					try {
						const propID = properties[i].value;
						const property = this.ifcApi.GetLine(this.modelID, propID);
						const propertyData = this.propertyExtractor.extract(propID, property);
						
						if (propertyData && propertyData.name) {
							result.properties[propertyData.name] = propertyData;
						}
					} catch (error) {
						// Skip properties that can't be read
					}
				}
			}
			
			return result;
		} catch (error) {
			return null;
		}
	}
}
