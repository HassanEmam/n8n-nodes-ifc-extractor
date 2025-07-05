// ============================================================================
// FILE INFO EXTRACTOR
// ============================================================================

import { IExtractResult } from '../types/interfaces';
import { vectorToArray } from '../utils/helpers';
import { BaseElementExtractor } from './BaseElementExtractor';

/**
 * Extracts file information and statistics
 */
export class FileInfoExtractor extends BaseElementExtractor {
	extract(): IExtractResult {
		try {
			const allLines = this.ifcApi.GetAllLines(this.modelID);
			const lineArray = vectorToArray(allLines);
			
			const typeStats: { [key: string]: number } = {};

			// Count elements by type
			for (const lineID of lineArray) {
				const element = this.safeGetElement(lineID);
				if (element) {
					const typeName = element.constructor.name;
					typeStats[typeName] = (typeStats[typeName] || 0) + 1;
				}
			}

			return {
				totalElements: lineArray.length,
				typeStatistics: typeStats,
				elements: [],
			};
		} catch (error) {
			return {
				error: `Error getting file info: ${error instanceof Error ? error.message : 'Unknown error'}`,
				totalElements: 0,
				typeStatistics: {},
				elements: [],
			};
		}
	}
}
