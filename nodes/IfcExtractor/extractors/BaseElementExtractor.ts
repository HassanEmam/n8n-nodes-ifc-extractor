// ============================================================================
// BASE ELEMENT EXTRACTOR
// ============================================================================

import * as WebIFC from 'web-ifc';
import { IIfcElement } from '../types/interfaces';
import { convertToPlainObject } from '../utils/helpers';
import { ElementPropertiesExtractor } from './ElementPropertiesExtractor';

/**
 * Base class for element extraction operations
 */
export abstract class BaseElementExtractor {
	protected elementPropertiesExtractor: ElementPropertiesExtractor;

	constructor(protected ifcApi: WebIFC.IfcAPI, protected modelID: number) {
		this.elementPropertiesExtractor = new ElementPropertiesExtractor(ifcApi, modelID);
	}

	protected createElementData(elementID: number, element: any, includeProperties: boolean = false): IIfcElement {
		const jsonElement = convertToPlainObject(element);
		
		const elementData: IIfcElement = {
			id: elementID,
			type: element.constructor.name,
			data: jsonElement,
		};

		if (includeProperties) {
			const properties = this.elementPropertiesExtractor.extract(elementID);
			elementData.properties = properties;
			elementData.hasProperties = Object.keys(properties).length > 0;
		}

		return elementData;
	}

	protected safeGetElement(elementID: number): any | null {
		try {
			return this.ifcApi.GetLine(this.modelID, elementID);
		} catch (error) {
			return null;
		}
	}
}
