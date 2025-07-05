// ============================================================================
// PROPERTIES EXTRACTOR
// ============================================================================

import { IExtractResult } from '../types/interfaces';
import { convertToPlainObject } from '../utils/helpers';
import { BaseElementExtractor } from './BaseElementExtractor';

/**
 * Extracts properties for specific element IDs
 */
export class PropertiesExtractor extends BaseElementExtractor {
	extract(elementIds: number[]): IExtractResult {
		const results: any[] = [];

		for (const elementId of elementIds) {
			const element = this.safeGetElement(elementId);
			
			if (element) {
				const jsonElement = convertToPlainObject(element);
				const properties = this.elementPropertiesExtractor.extract(elementId);

				results.push({
					id: elementId,
					type: element.constructor.name,
					element: jsonElement,
					properties,
				});
			} else {
				results.push({
					id: elementId,
					error: `Could not extract properties: Element not found`,
				});
			}
		}

		return {
			requestedIds: elementIds,
			results,
			elements: [],
		};
	}
}
