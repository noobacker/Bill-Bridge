import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatCurrency, formatQuantity } from '@/lib/utils';

// Define styles for the PDF document
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: 40,
    backgroundColor: '#fff',
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
    paddingBottom: 10,
  },
  companyDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
    backgroundColor: 'transparent',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  companyAddress: {
    fontSize: 10,
    color: '#666',
  },
  invoiceDetails: {
    flex: 1,
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  invoiceInfo: {
    fontSize: 10,
  },
  billingInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 5,
    marginBottom: 30,
  },
  billingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#007bff'
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 5,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  tableHeaderCell: {
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    alignItems: 'center',
  },
  tableCell: {
    padding: 8,
    flex: 1,
  },
  descriptionCell: { flex: 3 },
  hsnCell: { flex: 1.5 },
  qtyCell: { flex: 1, textAlign: 'right' },
  rateCell: { flex: 1.5, textAlign: 'right' },
  amountCell: { flex: 1.5, textAlign: 'right', fontWeight: 'bold' },
  batchDetails: {
    fontSize: 9,
    color: '#666',
    paddingLeft: 10,
    marginTop: 4,
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 30,
  },
  totalsContainer: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {},
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#007bff',
    marginTop: 5,
    paddingTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 10,
  },
});

export interface InvoiceItem {
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
  batches?: Array<{
    location: string;
    quantity: number;
  }>;
}

export interface InvoiceTemplateProps {
  invoiceNumber: string;
  invoiceDate: string;
  clientName: string;
  clientAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalAmount: number;
  isGst: boolean;
  paymentType: string;
  remarks?: string;
  transportMode?: string;
  companyName: string;
  companyAddress: string;
  companyGst?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
}

// Create the InvoiceContent component for the page content
const InvoiceContent: React.FC<InvoiceTemplateProps> = ({
  invoiceNumber,
  invoiceDate,
  clientName,
  clientAddress,
  items,
  subtotal,
  cgstRate,
  cgstAmount,
  sgstRate,
  sgstAmount,
  totalAmount,
  isGst,
  paymentType,
  remarks,
  transportMode,
  companyName,
  companyAddress,
  companyGst,
  companyPhone,
  companyEmail,
  companyLogo,
}) => (
  <Page size="A4" style={styles.page}>
    {/* Header */}
    <View style={styles.header}>
      <View style={styles.companyDetails}>
        {companyLogo && (
          <Image 
            src={companyLogo} 
            style={styles.logo}
          />
        )}
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.companyAddress}>{companyAddress}</Text>
          {companyGst && <Text style={styles.companyAddress}>GSTIN: {companyGst}</Text>}
          {companyPhone && <Text style={styles.companyAddress}>Phone: {companyPhone}</Text>}
          {companyEmail && <Text style={styles.companyAddress}>Email: {companyEmail}</Text>}
        </View>
      </View>
      <View style={styles.invoiceDetails}>
        <Text style={styles.invoiceTitle}>INVOICE</Text>
        <Text style={styles.invoiceInfo}>Invoice #: {invoiceNumber}</Text>
        <Text style={styles.invoiceInfo}>Date: {invoiceDate}</Text>
        <Text style={styles.invoiceInfo}>Payment Type: {paymentType}</Text>
      </View>
    </View>

    {/* Billing Info */}
    <View style={styles.billingInfo}>
      <Text style={styles.billingTitle}>Bill To:</Text>
      <Text>{clientName}</Text>
      {clientAddress && <Text>{clientAddress}</Text>}
    </View>
    
    {/* Items Table */}
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.descriptionCell]}>Description</Text>
        <Text style={[styles.tableHeaderCell, styles.hsnCell]}>HSN Code</Text>
        <Text style={[styles.tableHeaderCell, styles.qtyCell]}>Quantity</Text>
        <Text style={[styles.tableHeaderCell, styles.rateCell]}>Rate</Text>
        <Text style={[styles.tableHeaderCell, styles.amountCell]}>Amount</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.tableRow}>
          <View style={[styles.tableCell, styles.descriptionCell]}>
            <Text>{item.description}</Text>
            {item.batches && item.batches.length > 0 && (
              <View style={styles.batchDetails}>
                {item.batches.map((batch, i) => (
                   <Text key={i}>{`- ${batch.location}: ${formatQuantity(batch.quantity)}`}</Text>
                ))}
              </View>
            )}
          </View>
          <Text style={[styles.tableCell, styles.hsnCell]}>{item.hsnCode}</Text>
          <Text style={[styles.tableCell, styles.qtyCell]}>{formatQuantity(item.quantity)}</Text>
          <Text style={[styles.tableCell, styles.rateCell]}>{formatCurrency(item.rate)}</Text>
          <Text style={[styles.tableCell, styles.amountCell]}>{formatCurrency(item.amount)}</Text>
        </View>
      ))}
    </View>
    
    {/* Totals */}
    <View style={styles.totals}>
      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
        </View>
        {isGst ? (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>CGST ({cgstRate}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(cgstAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SGST ({sgstRate}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(sgstAmount)}</Text>
            </View>
          </>
        ) : (
           <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST</Text>
              <Text style={styles.totalValue}>Not Applicable</Text>
            </View>
        )}
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text style={[styles.totalLabel, {fontWeight: 'bold'}]}>Total Amount</Text>
          <Text style={[styles.totalValue, {fontSize: 14}]}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>
    </View>
    
    {/* Footer */}
    <View style={styles.footer} fixed>
      {remarks && <Text>Remarks: {remarks}</Text>}
      {transportMode && <Text>Transport Mode: {transportMode}</Text>}
      <Text style={{ marginTop: 5 }}>Thank you for your business!</Text>
    </View>
  </Page>
);

// Export the Document component that wraps the content
export const InvoiceTemplate = (props: InvoiceTemplateProps) => (
  <Document>
    <InvoiceContent {...props} />
  </Document>
);