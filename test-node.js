#!/usr/bin/env node

// Simple test script to verify the IFC Extractor node loads correctly
const { IfcExtractor } = require('./dist/nodes/IfcExtractor/IfcExtractor.node.js');

console.log('Testing IFC Extractor Node...');

// Test node instantiation
try {
    const node = new IfcExtractor();
    console.log('✓ Node instantiated successfully');
    console.log('✓ Node name:', node.description.displayName);
    console.log('✓ Node type:', node.description.name);
    console.log('✓ Available operations:');
    
    const operationProperty = node.description.properties.find(p => p.name === 'operation');
    if (operationProperty && operationProperty.options) {
        operationProperty.options.forEach(op => {
            console.log(`  - ${op.name} (${op.value})`);
        });
    }
    
    console.log('\n✓ IFC Extractor node is ready for use!');
    console.log('\nTo install this node in n8n:');
    console.log('1. Build the project: npm run build');
    console.log('2. Pack the node: npm pack');
    console.log('3. Install in n8n: npm install <path-to-tarball>');
} catch (error) {
    console.error('✗ Error testing node:', error.message);
    process.exit(1);
}
