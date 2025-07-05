// ============================================================================
// ELEMENTS WITH PROPERTIES EXTRACTOR
// ============================================================================

import { IExtractResult } from '../types/interfaces';
import { vectorToArray, getIfcTypeConstant } from '../utils/helpers';
import { BaseElementExtractor } from './BaseElementExtractor';

/**
 * Extracts only elements that have properties
 */
export class ElementsWithPropertiesExtractor extends BaseElementExtractor {
	extract(filterTypes: string[] = []): IExtractResult {
		const elements: any[] = [];
		let totalProcessed = 0;

		try {
			if (filterTypes.length > 0) {
				// Extract specific types with properties
				for (const ifcType of filterTypes) {
					try {
						const ifcTypeConstant = getIfcTypeConstant(ifcType);
						const elementIDs = this.ifcApi.GetLineIDsWithType(this.modelID, ifcTypeConstant);
						const elementArray = vectorToArray(elementIDs);

						for (const elementID of elementArray) {
							const element = this.safeGetElement(elementID);
							if (element) {
								const elementData = this.createElementData(elementID, element, true);
								
								// Only include elements that have properties
								if (elementData.hasProperties) {
									elements.push(elementData);
								}
								totalProcessed++;
							}
						}
					} catch (error) {
						// Skip types that can't be processed
					}
				}
			} else {
				// Extract all elements but only keep those with properties
				const lines = this.ifcApi.GetAllLines(this.modelID);
				const lineArray = vectorToArray(lines);

				for (const lineID of lineArray) {
					const element = this.safeGetElement(lineID);
					if (element) {
						const elementData = this.createElementData(lineID, element, true);
						
						// Only include elements that have properties
						if (elementData.hasProperties) {
							elements.push(elementData);
						}
						totalProcessed++;
					}
				}
			}
		} catch (error) {
			return {
				error: `Error extracting elements with properties: ${error instanceof Error ? error.message : 'Unknown error'}`,
				totalProcessed: 0,
				elementsWithProperties: 0,
				filterTypes: filterTypes,
				elements: [],
			};
		}

		return {
			totalProcessed: totalProcessed,
			elementsWithProperties: elements.length,
			filterTypes: filterTypes,
			elements: elements,
		};
	}
}
