const fs = require('fs').promises;
const path = require('path');

async function testInvoicePDF() {
  try {
    // Import the TypeScript module using dynamic import
    const { generateInvoicePDF } = await import('../lib/generate-pdf.js');
    
    // Sample invoice data for testing
    const sampleInvoiceData = {
      invoiceNumber: 'TEST-001',
      invoiceDate: new Date().toLocaleDateString(),
      clientName: 'Test Client',
      clientAddress: '123 Test Street, Test City, Test State - 123456',
      clientGst: 'TESTGST1234567890',
      clientPhone: '9876543210',
      clientEmail: 'testclient@example.com',
      items: [
        {
          description: 'Red Bricks',
          hsnCode: '6904',
          quantity: 1000,
          rate: 10,
          amount: 10000,
          batches: [
            { location: 'Warehouse A', quantity: 500 },
            { location: 'Warehouse B', quantity: 500 }
          ]
        },
        {
          description: 'Cement',
          hsnCode: '2523',
          quantity: 10,
          rate: 350,
          amount: 3500
        }
      ],
      subtotal: 13500,
      cgstRate: 9,
      cgstAmount: 1215,
      sgstRate: 9,
      sgstAmount: 1215,
      totalAmount: 15930,
      isGst: true,
      paymentType: 'CASH',
      remarks: 'This is a test invoice',
      transportMode: 'Road',
      companyName: 'ABC Bricks & Co.',
      companyAddress: '456 Company Street, Business District, City - 654321',
      companyGst: 'ABCGST9876543210',
      companyPhone: '1234567890',
      companyEmail: 'contact@abcbricks.com',
      bankName: 'Test Bank',
      bankAccountNo: '1234567890',
      bankIfscCode: 'TEST0001234',
      bankBranch: 'Main Branch',
      includeBankDetails: true
    };

    console.log('Generating test invoice PDF...');
    
    // Generate the PDF
    const pdfBuffer = await generateInvoicePDF(sampleInvoiceData);
    
    // Save the PDF to a file
    const outputPath = path.join(process.cwd(), 'test-invoice.pdf');
    await fs.writeFile(outputPath, pdfBuffer);
    
    console.log(`Test invoice PDF generated successfully at: ${outputPath}`);
    console.log(`File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('Error generating test invoice PDF:', error);
  }
}

// Run the test function
testInvoicePDF(); 