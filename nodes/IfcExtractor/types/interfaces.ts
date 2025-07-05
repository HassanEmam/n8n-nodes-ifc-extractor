// ============================================================================
// TYPE DEFINITIONS AND INTERFACES
// ============================================================================

export interface IIfcElement {
	id: number;
	type: string;
	data: any;
	properties?: any;
	hasProperties?: boolean;
}

export interface IExtractResult {
	totalElements?: number;
	elementsWithProperties?: number;
	count?: number;
	type?: string;
	totalProcessed?: number;
	filterTypes?: string[];
	elements: IIfcElement[];
	typeStatistics?: { [key: string]: number };
	requestedIds?: number[];
	results?: any[];
	error?: string;
}

export interface IPropertyData {
	id: number;
	type: string;
	name: string;
	description: string | null;
	value: any;
	unit: any;
}

export interface IPropertySet {
	id: number;
	name: string;
	description: string | null;
	properties: { [key: string]: IPropertyData };
}
