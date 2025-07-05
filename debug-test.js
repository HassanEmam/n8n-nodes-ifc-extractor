// Quick test to understand the current issue
// This simulates what happens in n8n

const fs = require('fs');
const path = require('path');

// Simulate n8n binary data structure
function createMockN8nData(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    
    return {
        binary: {
            data: {
                data: base64Data,
                mimeType: 'application/octet-stream',
                fileName: path.basename(filePath)
            }
        }
    };
}

// Test with a small IFC file if you have one
const testFilePath = 'test.ifc'; // You would need to provide this

if (fs.existsSync(testFilePath)) {
    const mockData = createMockN8nData(testFilePath);
    console.log('Mock n8n data structure:');
    console.log('Binary keys:', Object.keys(mockData.binary));
    console.log('Data structure:', {
        hasData: !!mockData.binary.data,
        dataLength: mockData.binary.data?.data?.length,
        mimeType: mockData.binary.data?.mimeType,
        fileName: mockData.binary.data?.fileName
    });
    
    // Test base64 decoding
    try {
        const binaryString = atob(mockData.binary.data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
        }
        const arrayBuffer = bytes.buffer;
        
        console.log('Decoded ArrayBuffer size:', arrayBuffer.byteLength);
        
        // Check first few bytes
        const firstBytes = Array.from(new Uint8Array(arrayBuffer.slice(0, 20)))
            .map(b => String.fromCharCode(b)).join('');
        console.log('First 20 characters:', firstBytes);
        
    } catch (error) {
        console.error('Error decoding base64:', error);
    }
} else {
    console.log('Test IFC file not found. Create a test.ifc file to run this test.');
}

console.log('\nTo debug your workflow:');
console.log('1. Check that the HTTP Request node is set to responseFormat: "file"');
console.log('2. The IFC data should be in item.binary.data.data (base64 encoded)');
console.log('3. Look for the enhanced debug logs in the n8n console/logs');
