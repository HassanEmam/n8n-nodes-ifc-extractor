// ============================================================================
// ELEMENTS BY TYPE EXTRACTOR
// ============================================================================

import { IExtractResult } from '../types/interfaces';
import { vectorToArray, getIfcTypeConstant } from '../utils/helpers';
import { BaseElementExtractor } from './BaseElementExtractor';

/**
 * Extracts elements by specific IFC type
 */
export class ElementsByTypeExtractor extends BaseElementExtractor {
	extract(ifcType: string, includeProperties: boolean = false): IExtractResult {
		const elements: any[] = [];

		try {
			const ifcTypeConstant = getIfcTypeConstant(ifcType);
			const elementIDs = this.ifcApi.GetLineIDsWithType(this.modelID, ifcTypeConstant);
			const elementArray = vectorToArray(elementIDs);

			for (const elementID of elementArray) {
				const element = this.safeGetElement(elementID);
				if (element) {
					const elementData = this.createElementData(elementID, element, includeProperties);
					elements.push(elementData);
				}
			}
		} catch (error) {
			return {
				type: ifcType,
				count: 0,
				elementsWithProperties: 0,
				elements: [],
				error: `Error extracting elements by type: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}

		const elementsWithProperties = includeProperties 
			? elements.filter(el => el.hasProperties).length 
			: 0;

		return {
			type: ifcType,
			count: elements.length,
			elementsWithProperties,
			elements,
		};
	}
}
