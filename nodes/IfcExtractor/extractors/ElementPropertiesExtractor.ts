// ============================================================================
// ELEMENT PROPERTIES EXTRACTOR
// ============================================================================

import * as WebIFC from 'web-ifc';
import { vectorToArray } from '../utils/helpers';
import { PropertySetExtractor } from './PropertySetExtractor';

/**
 * Handles extraction of element properties using IfcRelDefinesByProperties
 */
export class ElementPropertiesExtractor {
	private propertySetExtractor: PropertySetExtractor;

	constructor(private ifcApi: WebIFC.IfcAPI, private modelID: number) {
		this.propertySetExtractor = new PropertySetExtractor(ifcApi, modelID);
	}

	extract(elementID: number): { [key: string]: any } {
		const properties: any = {};
		
		try {
			// Find all IfcRelDefinesByProperties that reference this element
			const relDefinesByPropsIDs = this.ifcApi.GetLineIDsWithType(this.modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);
			const relArray = vectorToArray(relDefinesByPropsIDs);
			
			for (const relID of relArray) {
				try {
					const relation = this.ifcApi.GetLine(this.modelID, relID);
					
					// Check if this relation applies to our element
					const relatedObjects = relation.RelatedObjects || [];
					const isElementReferenced = relatedObjects.some((obj: any) => {
						return obj.value === elementID;
					});
					
					if (isElementReferenced && relation.RelatingPropertyDefinition) {
						const propDefID = relation.RelatingPropertyDefinition.value;
						const propertyDefinition = this.ifcApi.GetLine(this.modelID, propDefID);
						
						if (propertyDefinition.constructor.name === 'IfcPropertySet') {
							const propertySetData = this.propertySetExtractor.extract(propDefID);
							if (propertySetData && propertySetData.name) {
								properties[propertySetData.name] = propertySetData.properties;
							}
						}
					}
				} catch (error) {
					// Skip relations that can't be read
				}
			}
		} catch (error) {
			// Skip if we can't access properties
		}
		
		return properties;
	}
}
