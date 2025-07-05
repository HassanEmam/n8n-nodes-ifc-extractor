// ============================================================================
// ALL ELEMENTS EXTRACTOR
// ============================================================================

import { IExtractResult } from '../types/interfaces';
import { vectorToArray } from '../utils/helpers';
import { BaseElementExtractor } from './BaseElementExtractor';

/**
 * Extracts all elements from the IFC file
 */
export class AllElementsExtractor extends BaseElementExtractor {
	extract(includeProperties: boolean = false): IExtractResult {
		const elements: any[] = [];
		let totalProcessed = 0;

		try {
			const allLines = this.ifcApi.GetAllLines(this.modelID);
			const lineArray = vectorToArray(allLines);

			for (const elementID of lineArray) {
				const element = this.safeGetElement(elementID);
				if (element) {
					const elementData = this.createElementData(elementID, element, includeProperties);
					elements.push(elementData);
					totalProcessed++;
				}
			}
		} catch (error) {
			return {
				error: `Error extracting all elements: ${error instanceof Error ? error.message : 'Unknown error'}`,
				totalElements: 0,
				elementsWithProperties: 0,
				elements: [],
			};
		}

		const elementsWithProperties = includeProperties 
			? elements.filter(el => el.hasProperties).length 
			: 0;

		return {
			totalElements: elements.length,
			elementsWithProperties,
			elements,
		};
	}
}
