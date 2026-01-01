// This is a placeholder for PDF generation
// You can replace this with your own implementation

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import path from "path";
import fs from "fs/promises";

// Define the invoice data structure
export interface InvoiceItem {
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  isService?: boolean;
  batches?: Array<{
    location: string;
    quantity: number;
  }>;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  clientName: string;
  clientAddress?: string;
  clientGst?: string; // Added client GST
  clientPhone?: string; // Added client Phone
  clientEmail?: string; // Added client Email
  items: InvoiceItem[];
  subtotal: number;
  cgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
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
  bankName: string;
  bankAccountNo: string;
  bankIfscCode: string;
  accountHolderName?: string;
  bankBranch?: string;
  includeBankDetails: boolean;
  logoUrl?: string;
  upiId?: string;
  vehicleNumber?: string;
  sgstRate: number;
  igstRate: number;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a new jsPDF instance
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      // Set document properties
      doc.setProperties({
        title: `Invoice-${data.invoiceNumber}`,
        subject: "Invoice",
        author: data.companyName,
        creator: "Invoice System",
      });
      
      // Set default font
      doc.setFont("helvetica");
      
      // Define margins
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const contentWidth = pageWidth - 2 * margin;
      
      // Try to load and add the company logo
      let logoPath = data.logoUrl
        ? path.join(process.cwd(), "public", data.logoUrl)
        : path.join(process.cwd(), "public/images/default_logo.png");
      let logoData, logoBase64;
      try {
        logoData = await fs.readFile(logoPath);
        logoBase64 = `data:image/${
          logoPath.endsWith(".png") ? "png" : "jpeg"
        };base64,${logoData.toString("base64")}`;
      } catch (logoError) {
        // fallback to default_logo.png
        logoPath = path.join(process.cwd(), "public/images/default_logo.png");
        logoData = await fs.readFile(logoPath);
        logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
      }
        
        // Add logo to the PDF with compression - now on the right side
        // Add a white background rectangle first
      
      
      
        //   doc.setFillColor(255, 255, 255);
      // doc.rect(pageWidth - margin - 42, margin - 7, 44, 44, "F");
      
      
      
        // Then add the logo on top with increased size
      doc.addImage(
        logoBase64,
        logoPath.endsWith(".png") ? "PNG" : "JPEG",
        pageWidth - margin - 40,
        margin - 5,
        40,
        40,
        undefined,
        "FAST"
      );
        
        // Company details remain on the left
      doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 123, 255); // #007bff
        doc.text(data.companyName, margin, margin + 10);
      doc.setFont("helvetica", "normal");
      
      // Add company details - improved layout (now all left-aligned)
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0); // Changed from grey to black
      let companyDetailsY = margin + 16;
      
      // Handle company address with proper wrapping
      if (data.companyAddress) {
        const addressLines = doc.splitTextToSize(
          data.companyAddress,
          contentWidth * 0.5
        );
        doc.text(addressLines, margin, companyDetailsY);
        companyDetailsY += addressLines.length * 5;
      }

      if (data.companyGst) {
        const label = "GSTIN: ";
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, companyDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(
          data.companyGst,
          margin + doc.getTextWidth(label),
          companyDetailsY
        );
        companyDetailsY += 5;
      }
      if (data.companyPhone) {
        const label = "Phone: ";
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, companyDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(
          data.companyPhone,
          margin + doc.getTextWidth(label),
          companyDetailsY
        );
        companyDetailsY += 5;
      }
      
      //EMAIL
      // if (data.companyEmail) {
      //   const label = "Email: ";
      //   doc.setFont("helvetica", "bold");
      //   doc.text(label, margin, companyDetailsY);
      //   doc.setFont("helvetica", "normal");
      //   doc.text(
      //     data.companyEmail,
      //     margin + doc.getTextWidth(label),
      //     companyDetailsY
      //   );
      // }
      //EMAIL



      // Add horizontal line
      doc.setDrawColor(0, 123, 255); // #007bff
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 35, pageWidth - margin, margin + 35);
      
      // Add client details with improved layout
      let clientDetailsY = margin + 45;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 123, 255); // #007bff
      doc.text("Bill To:", margin, clientDetailsY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      // Add invoice title and details - now positioned to the right of "Bill To:" and right-aligned
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 123, 255); // #007bff - matching Bill To color
      doc.text("Invoice Details:", pageWidth - margin, clientDetailsY, {
        align: "right",
      });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      
      // Keep only labels bold, not values
      const invoiceNumLabel = "Invoice #: ";
      const dateLabel = "Date: ";
      
      // Calculate label widths for right alignment
      const invoiceNumLabelWidth = doc.getTextWidth(invoiceNumLabel);
      const dateLabelWidth = doc.getTextWidth(dateLabel);
      
      // Calculate positions for right-aligned text
      const valuesX = pageWidth - margin;
      const invoiceNumX = valuesX - doc.getTextWidth(data.invoiceNumber);
      const dateX = valuesX - doc.getTextWidth(data.invoiceDate);
      
      // Draw labels in bold
      doc.setFont("helvetica", "bold");
      doc.text(
        invoiceNumLabel,
        invoiceNumX - invoiceNumLabelWidth,
        clientDetailsY + 8
      );
      doc.text(dateLabel, dateX - dateLabelWidth, clientDetailsY + 14);
      
      // Draw values in normal font
      doc.setFont("helvetica", "normal");
      doc.text(data.invoiceNumber, invoiceNumX, clientDetailsY + 8);
      doc.text(data.invoiceDate, dateX, clientDetailsY + 14);
      
      clientDetailsY += 6;
      doc.setFontSize(11);
      doc.text(data.clientName, margin, clientDetailsY);
      clientDetailsY += 5;
      
      doc.setFontSize(10);
      if (data.clientGst) {
        const label = "GSTIN: ";
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, clientDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(
          data.clientGst,
          margin + doc.getTextWidth(label),
          clientDetailsY
        );
        clientDetailsY += 5;
      }
      if (data.clientPhone) {
        const label = "Phone: ";
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, clientDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(
          data.clientPhone,
          margin + doc.getTextWidth(label),
          clientDetailsY
        );
        clientDetailsY += 5;
      }
      if (data.clientEmail) {
        const label = "Email: ";
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, clientDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(
          data.clientEmail,
          margin + doc.getTextWidth(label),
          clientDetailsY
        );
        clientDetailsY += 5;
      }
      if (data.clientAddress) {
        // Use multi-line for address with proper wrapping
        const maxWidth = contentWidth * 0.5;
        const addressLines = doc.splitTextToSize(data.clientAddress, maxWidth);
        doc.text(addressLines, margin, clientDetailsY);
        clientDetailsY += addressLines.length * 5;
      }

      // Prepare items table
      const tableStartY = clientDetailsY + 10; // Adjusted based on dynamic client details
      const tableColumns = [
        { header: "Description", dataKey: "description" },
        { header: "HSN Code", dataKey: "hsnCode" },
        { header: "Quantity", dataKey: "quantity" },
        { header: "Rate", dataKey: "rate" },
        { header: "Amount", dataKey: "amount" },
        { header: "GST\n(cgst + sgst)", dataKey: "gst" },
        { header: "Total", dataKey: "total" },
      ];
      
      let totalQuantity = 0;
      let totalBaseAmount = 0;
      let totalGstAmount = 0;
      let totalWithGst = 0;
      
      const tableRows = data.items.map((item) => {
        let description = item.description;

        let cgstRate =
          item.cgstRate !== undefined ? item.cgstRate : data.cgstRate;
        let sgstRate =
          item.sgstRate !== undefined ? item.sgstRate : data.sgstRate;
        let igstRate =
          item.igstRate !== undefined ? item.igstRate : data.igstRate;

        const cgstAmount = data.isGst ? (item.amount * cgstRate) / 100 : 0;
        const sgstAmount = data.isGst ? (item.amount * sgstRate) / 100 : 0;
        const igstAmount = data.isGst ? (item.amount * igstRate) / 100 : 0;
        const itemGstAmount = cgstAmount + sgstAmount + igstAmount;
        const totalAmount = item.amount + itemGstAmount;
        
        totalQuantity += item.quantity;
        totalBaseAmount += item.amount;
        totalGstAmount += itemGstAmount;
        totalWithGst += totalAmount;
        
        return {
          description,
          hsnCode: item.hsnCode,
          quantity: item.quantity.toLocaleString("en-IN"),
          rate: formatCurrency(item.rate),
          amount: formatCurrency(item.amount),
          gst: data.isGst
            ? `${cgstRate + sgstRate + igstRate}%\n(${formatCurrency(itemGstAmount)})`
            : "N/A",
          total: formatCurrency(totalAmount),
        };
      });
      
      if (tableRows.length > 0) {
        tableRows.push({
          description: "Total",
          hsnCode: "",
          quantity: "",
          rate: "",
          amount: formatCurrency(totalBaseAmount),
          gst: formatCurrency(totalGstAmount),
          total: formatCurrency(totalWithGst),
        });
      }
      
      autoTable(doc, {
        head: [tableColumns.map((col) => col.header)],
        body: tableRows.map((row) =>
          tableColumns.map((col) => row[col.dataKey as keyof typeof row])
        ),
        startY: tableStartY,
        margin: { left: margin, right: margin },
        theme: "striped",
        styles: {
          fontSize: 9,
          cellPadding: 2,
          valign: "middle",
        },
        headStyles: {
          fillColor: [0, 123, 255],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          description: { cellWidth: 45 },
          hsnCode: { cellWidth: 18, halign: "center" },
          quantity: { cellWidth: 18, halign: "right" },
          rate: { cellWidth: 20, halign: "right" },
          amount: { cellWidth: 22, halign: "right" },
          gst: { cellWidth: 22, halign: "center" },
          total: { cellWidth: 25, halign: "right" },
        },
        didParseCell: function (data) {
          if (data.column.dataKey === "description") {
            data.cell.styles.fontSize = 8;
          }
          if (data.row.index === tableRows.length - 1) {
            // Total row
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        didDrawCell: function (data) {
          if (data.column.dataKey === "gst" && data.row.index === -1) {
            const cell = data.cell;
            doc.setFillColor(0, 123, 255);
            doc.rect(cell.x, cell.y, cell.width, cell.height, "F");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text("GST", cell.x + cell.width / 2, cell.y + 4, {
              align: "center",
            });
            doc.setFontSize(7);
            doc.text("(CGST + SGST + IGST)", cell.x + cell.width / 2, cell.y + 8, {
              align: "center",
            });
          }
        },
        didDrawPage: (pageData: any) => {
          const footerY = pageHeight - margin;
          doc.setDrawColor(222, 226, 230);
          doc.setLineWidth(0.1);
          doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text("Thank you for your business!", pageWidth / 2, footerY - 1, {
            align: "center",
          });
        },
      });
      
      let tableEndY = (doc as any).lastAutoTable.finalY;
      
      if (data.remarks || data.transportMode) {
        tableEndY += 8;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (data.remarks) {
          doc.setFont("helvetica", "bold");
          doc.text("Remarks :", margin, tableEndY);
          doc.setFont("helvetica", "normal");
          const labelWidth = doc.getTextWidth("Remarks :");
          const valueX = margin + labelWidth + 2;
          const valueWidth = contentWidth - (valueX - margin);
          const remarkLines = doc.splitTextToSize(data.remarks, valueWidth);
          doc.text(remarkLines, valueX, tableEndY);
          tableEndY += remarkLines.length * 4 + 2;
        }
        if (data.transportMode) {
          doc.setFont("helvetica", "bold");
          doc.text("Transport Mode :", margin, tableEndY);
          doc.setFont("helvetica", "normal");
          const labelWidth = doc.getTextWidth("Transport Mode :");
          const valueX = margin + labelWidth + 2;
          doc.text(data.transportMode, valueX, tableEndY);
          tableEndY += 4 + 2;
        }
      }
      
      const totalsX = pageWidth - margin - 80;
      let totalsY = tableEndY + 10;
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Subtotal:", totalsX, totalsY);
      doc.setFont("helvetica", "normal");
      doc.text(formatCurrency(data.subtotal), pageWidth - margin, totalsY, {
        align: "right",
      });
      totalsY += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text("Total GST:", totalsX, totalsY);
      doc.setFont("helvetica", "normal");
      doc.text(formatCurrency(totalGstAmount), pageWidth - margin, totalsY, {
        align: "right",
      });
      totalsY += 6;
      
      doc.setDrawColor(0, 123, 255);
      doc.setLineWidth(0.5);
      doc.line(totalsX, totalsY, pageWidth - margin, totalsY);
      totalsY += 4;
      
      doc.setFont("helvetica", "bold");
      doc.text("Total Amount:", totalsX, totalsY + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(
        formatCurrency(totalBaseAmount + totalGstAmount),
        pageWidth - margin,
        totalsY + 2,
        { align: "right" }
      );

      const finalLineY = totalsY + 6;
      doc.setDrawColor(0, 123, 255);
      doc.setLineWidth(0.5);
      doc.line(totalsX, finalLineY, pageWidth - margin, finalLineY);

      if (
        data.includeBankDetails &&
        data.bankName &&
        data.bankAccountNo &&
        data.bankIfscCode
      ) {
        let bankDetailsY = finalLineY + 25;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 123, 255);
        doc.text(" Bank Details:", margin, bankDetailsY);
        bankDetailsY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        const bankNameLabelText = "Bank Name",
          ifscLabelText = "IFSC Code",
          accNoLabelText = "Account No",
          accHolderLabelText = "Account Holder";
        doc.setFont("helvetica", "bold");
        const maxLabelWidth = Math.max(
          doc.getTextWidth(bankNameLabelText),
          doc.getTextWidth(ifscLabelText),
          doc.getTextWidth(accNoLabelText),
          doc.getTextWidth(accHolderLabelText)
        );
        const colonX = margin + maxLabelWidth;
        const valueX = colonX + doc.getTextWidth(" : ") + 2;

        doc.text(bankNameLabelText, margin, bankDetailsY);
        doc.text(":", colonX, bankDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(data.bankName, valueX, bankDetailsY);
        bankDetailsY += 5;
        
        doc.setFont("helvetica", "bold");
        doc.text(ifscLabelText, margin, bankDetailsY);
        doc.text(":", colonX, bankDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(data.bankIfscCode, valueX, bankDetailsY);
        bankDetailsY += 5;
        
        doc.setFont("helvetica", "bold");
        doc.text(accNoLabelText, margin, bankDetailsY);
        doc.text(":", colonX, bankDetailsY);
        doc.setFont("helvetica", "normal");
        doc.text(data.bankAccountNo, valueX, bankDetailsY);
        bankDetailsY += 5;
        
        if (data.accountHolderName) {
          doc.setFont("helvetica", "bold");
          doc.text(accHolderLabelText, margin, bankDetailsY);
          doc.text(":", colonX, bankDetailsY);
          doc.setFont("helvetica", "normal");
          doc.text(data.accountHolderName, valueX, bankDetailsY);
        }
      }
      
      const sealSignY = pageHeight - margin - 35;
      const sealSignX = pageWidth - margin - 50;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10).setTextColor(0, 0, 0);
      doc.text(
        `For ${data.companyName || "Bill Bridge"}`,
        sealSignX,
        sealSignY,
        { align: "center" }
      );
      doc.setFont("helvetica", "normal");
      doc.text("(Authorized Signatory)", sealSignX, sealSignY + 15, {
        align: "center",
      });

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      resolve(pdfBuffer);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      reject(error);
    }
  });
}

export async function generateInvoicePDFBox(
  data: InvoiceData
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const margin = 8;
      const borderGap = 4;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const contentWidth = pageWidth - 2 * margin;
      const contentHeight = pageHeight - 2 * margin;

      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, contentWidth, contentHeight, "S");

      let x0 = margin + borderGap;
      let y = margin + borderGap;
      let innerWidth = contentWidth - 2 * borderGap;
      const lineThickness = 0.2;

      let logoPath = data.logoUrl
        ? path.join(process.cwd(), "public", data.logoUrl)
        : path.join(process.cwd(), "public/images/default_logo.png");
      let logoData, logoBase64;
      try {
        logoData = await fs.readFile(logoPath);
        logoBase64 = `data:image/${
          logoPath.endsWith(".png") ? "png" : "jpeg"
        };base64,${logoData.toString("base64")}`;
      } catch (logoError) {
        try {
          logoPath = path.join(process.cwd(), "public/images/default_logo.png");
          logoData = await fs.readFile(logoPath);
          logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
        } catch (defaultLogoError) {
          logoBase64 = "";
        }
      }

      if (logoBase64) {
        doc.setFillColor(255, 255, 255);
        doc.rect(x0, y, 28, 28, "F");
        doc.addImage(
          logoBase64,
          logoPath.endsWith(".png") ? "PNG" : "JPEG",
          x0,
          y,
          28,
          28,
          undefined,
          "FAST"
        );
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(data.companyName, x0 + 34, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      let companyInfoY = y + 12;
      const companyInfoLabels = {
        gstin: "GSTIN: ",
        phone: "Phone: ",
        email: "Email: ",
      };
      if (data.companyAddress) {
        const addressLines = doc.splitTextToSize(
          data.companyAddress,
          innerWidth - 40
        );
        doc.text(addressLines, x0 + 34, companyInfoY);
        companyInfoY += addressLines.length * 4.5;
      }
      if (data.companyGst) {
        doc.setFont("helvetica", "bold");
        doc.text(companyInfoLabels.gstin, x0 + 34, companyInfoY);
        doc.setFont("helvetica", "normal");
        doc.text(
          data.companyGst,
          x0 + 34 + doc.getTextWidth(companyInfoLabels.gstin),
          companyInfoY
        );
        companyInfoY += 4.5;
      }
      if (data.companyPhone) {
        doc.setFont("helvetica", "bold");
        doc.text(companyInfoLabels.phone, x0 + 34, companyInfoY);
        doc.setFont("helvetica", "normal");
        doc.text(
          data.companyPhone,
          x0 + 34 + doc.getTextWidth(companyInfoLabels.phone),
          companyInfoY
        );
        companyInfoY += 4.5;
      }
      if (data.companyEmail && data.companyEmail !== "Email") {
        doc.setFont("helvetica", "bold");
        doc.text(companyInfoLabels.email, x0 + 34, companyInfoY);
        doc.setFont("helvetica", "normal");
        doc.text(
          data.companyEmail,
          x0 + 34 + doc.getTextWidth(companyInfoLabels.email),
          companyInfoY
        );
      }

      y = Math.max(y + 30, companyInfoY + 2);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(lineThickness);
      doc.line(x0, y, x0 + innerWidth, y);

      let sectionY = y + 4;
      const billToColW = innerWidth * 0.6;
      const invoiceDetailsColW = innerWidth * 0.4;
      const colSeparatorX = x0 + billToColW;
      const billToGap = 2;

      let tempY = 0;
      const lineH = 4.5;
      if (data.clientName) tempY += lineH + billToGap;
      if (data.clientAddress) {
        const addressLines = doc.splitTextToSize(
          data.clientAddress,
          billToColW - 6 - doc.getTextWidth("Address: ")
        );
        tempY += addressLines.length * lineH + billToGap;
      }
      if (data.clientGst) tempY += lineH + billToGap;
      if (data.clientPhone) tempY += lineH + billToGap;
      if (data.clientEmail) tempY += lineH + billToGap;

      const billToContentHeight = tempY;
      const invDetailsForHeight = [
        [`Invoice #:`, data.invoiceNumber],
        [`Date:`, data.invoiceDate],
        [`Payment:`, data.paymentType],
        data.vehicleNumber ? [`Vehicle No.:`, data.vehicleNumber] : null,
        data.transportMode ? [`Transportation:`, data.transportMode] : null,
      ].filter((item) => item !== null) as [string, string][];
      const invoiceDetailsHeight =
        invDetailsForHeight.length * lineH +
        (invDetailsForHeight.length > 0 ? invDetailsForHeight.length - 1 : 0) *
          billToGap;

      const sectionHeight =
        Math.max(billToContentHeight, invoiceDetailsHeight) + 6 + 4;

      doc.setFillColor(240, 240, 240);
      doc.rect(x0, sectionY, billToColW, 6, "F");
      doc.rect(colSeparatorX, sectionY, invoiceDetailsColW, 6, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text("Bill To", x0 + 2, sectionY + 4);
      doc.text("Invoice Details", colSeparatorX + 2, sectionY + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      let currentBillToY = sectionY + 9;
      const clientInfoLabels = {
        gstin: "GSTIN: ",
        phone: "Phone: ",
        email: "Email: ",
        address: "Address: ",
      };

      if (data.clientName) {
        doc.text(`Name: ${data.clientName}`, x0 + 3, currentBillToY);
        currentBillToY += 4.5 + billToGap;
      }
      if (data.clientAddress) {
        doc.setFont("helvetica", "bold");
        doc.text(clientInfoLabels.address, x0 + 3, currentBillToY);
        doc.setFont("helvetica", "normal");
        const addressLines = doc.splitTextToSize(
          data.clientAddress,
          billToColW - 6 - doc.getTextWidth(clientInfoLabels.address)
        );
        doc.text(
          addressLines,
          x0 + 3 + doc.getTextWidth(clientInfoLabels.address),
          currentBillToY
        );
        currentBillToY += addressLines.length * 4.5 + billToGap;
      }

      [
        { label: clientInfoLabels.gstin, value: data.clientGst },
        { label: clientInfoLabels.phone, value: data.clientPhone },
        { label: clientInfoLabels.email, value: data.clientEmail },
      ].forEach((item) => {
        if (item.value && item.value !== "Email") {
          doc.setFont("helvetica", "bold");
          doc.text(item.label, x0 + 3, currentBillToY);
          const labelWidth = doc.getTextWidth(item.label);
          doc.setFont("helvetica", "normal");
          const valueWidth = doc.getTextWidth(item.value);
          const remainingWidth = billToColW - 6 - labelWidth;
          if (valueWidth > remainingWidth) {
            currentBillToY += 4.5;
            doc.text(item.value, x0 + 3 + 3, currentBillToY);
          } else {
            doc.text(item.value, x0 + 3 + labelWidth, currentBillToY);
          }
          currentBillToY += 4.5 + billToGap;
        }
      });

      let invDetails = [
        [`Invoice #:`, data.invoiceNumber],
        [`Date:`, data.invoiceDate],
        [`Payment:`, data.paymentType],
      ];
      if (data.vehicleNumber)
        invDetails.push([`Vehicle No.:`, data.vehicleNumber]);
      if (data.transportMode)
        invDetails.push([`Transportation:`, data.transportMode]);
      let invDetailsY = sectionY + 9;

      invDetails.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, colSeparatorX + 3, invDetailsY);
        doc.setFont("helvetica", "normal");
        const valueX = x0 + innerWidth - 3 - doc.getTextWidth(String(value));
        doc.text(String(value), valueX, invDetailsY);
        invDetailsY += 4.5 + billToGap; // FIX: Added billToGap for consistent spacing
      });

      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(lineThickness);
      doc.rect(x0, sectionY, innerWidth, sectionHeight, "S");
      doc.line(
        colSeparatorX,
        sectionY,
        colSeparatorX,
        sectionY + sectionHeight
      );

      let tableY = sectionY + sectionHeight + 4;

      let totalGstAmount = 0,
        totalBaseAmount = 0;
      data.items.forEach((item) => {
        const cgstRate =
          item.cgstRate !== undefined ? item.cgstRate : data.cgstRate;
        const sgstRate =
          item.sgstRate !== undefined ? item.sgstRate : data.sgstRate;
        totalGstAmount += data.isGst
          ? (item.amount * (cgstRate + sgstRate)) / 100
          : 0;
        totalBaseAmount += item.amount;
      });

      const tableData = data.items.map((item, idx) => {
        const itemCgstRate =
          item.cgstRate !== undefined ? item.cgstRate : data.cgstRate;
        const itemSgstRate =
          item.sgstRate !== undefined ? item.sgstRate : data.sgstRate;
        const itemGstRate = itemCgstRate + itemSgstRate;
        const itemGstAmount = data.isGst
          ? (item.amount * itemGstRate) / 100
          : 0;
        const itemTotal = item.amount + itemGstAmount;
        return [
          (idx + 1).toString(),
          item.description,
          item.hsnCode,
          item.quantity.toLocaleString("en-IN"),
          formatCurrency(item.rate),
          formatCurrency(item.amount),
          data.isGst ? `${itemGstRate}%` : "0%",
          formatCurrency(itemGstAmount),
          formatCurrency(itemTotal),
        ];
      });
      const subTotalRow = [
        "",
        "Sub-Total:",
        "",
        data.items
          .reduce((sum, item) => sum + item.quantity, 0)
          .toLocaleString("en-IN"),
        "",
        formatCurrency(totalBaseAmount),
        "",
        formatCurrency(totalGstAmount),
        formatCurrency(totalBaseAmount + totalGstAmount),
      ];
      tableData.push(subTotalRow);
      const srW = 10,
        hsnW = 20,
        qtyW = 18,
        rateW = 20,
        taxW = 22,
        gstPW = 15,
        gstAW = 20,
        totalW = 25;
      const descW =
        innerWidth -
        2 -
        (srW + hsnW + qtyW + rateW + taxW + gstPW + gstAW + totalW);

      autoTable(doc, {
        startY: tableY,
        head: [
          [
            "Sr",
            "Goods & Service Description",
            "HSN",
            "Quantity",
            "Rate",
            "Taxable",
            "GST\n%",
            "GST Amt",
            "Total",
          ],
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [230, 240, 255],
          textColor: 0,
          fontStyle: "bold",
          halign: "center",
          lineWidth: lineThickness,
          lineColor: [180, 180, 180],
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8.5,
          valign: "middle",
          lineWidth: lineThickness,
          lineColor: [180, 180, 180],
        },
        columnStyles: {
          0: { cellWidth: srW, halign: "center" },
          1: { cellWidth: descW, halign: "left" },
          2: { cellWidth: hsnW, halign: "center" },
          3: { cellWidth: qtyW, halign: "right" },
          4: { cellWidth: rateW, halign: "right" },
          5: { cellWidth: taxW, halign: "right" },
          6: { cellWidth: gstPW, halign: "center" },
          7: { cellWidth: gstAW, halign: "right" },
          8: { cellWidth: totalW, halign: "right" },
        },
        margin: { left: x0 + 1, right: margin + borderGap + 1 },
        styles: {
          overflow: "linebreak",
          cellPadding: 1.5,
          minCellHeight: 6,
          fontSize: 8.5,
        },
        didParseCell: (d) => {
          if (d.section === "body" && d.row.index === tableData.length - 1) {
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.fillColor = [245, 245, 245];
          }
        },
      });

      let tableEndY = (doc as any).lastAutoTable.finalY;
      let bankSummaryY = tableEndY + 6;
      const bankSummaryHeight = 32;

      if (data.includeBankDetails) {
        doc.setFillColor(240, 240, 240);
        doc.rect(x0, bankSummaryY, billToColW, 6, "F");
        doc.rect(colSeparatorX, bankSummaryY, invoiceDetailsColW, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(0, 0, 0);
        doc.text("Our Bank Details", x0 + 2, bankSummaryY + 4);
        doc.text("Summary", colSeparatorX + 2, bankSummaryY + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        let bankTextY = bankSummaryY + 9;
        const bankDetails = [
          [`Bank Name :`, data.bankName],
          [`IFSC Code :`, data.bankIfscCode],
          [`Account No :`, data.bankAccountNo],
          [`Account Holder :`, data.accountHolderName],
          
        ];
        if (data.upiId) bankDetails.push([`UPI ID :`, data.upiId]);
        bankDetails.forEach(([label, value]) => {
          doc.setFont("helvetica", "bold");
          doc.text(label, x0 + 3, bankTextY);
          doc.setFont("helvetica", "normal");
          doc.text(value || "", x0 + 3 + doc.getTextWidth(label) + 2, bankTextY);
          bankTextY += 4;
        });
        // Calculate proper GST amounts and roundoff
        const cgstTotal = data.cgstAmount || 0;
        const sgstTotal = data.sgstAmount || 0;
        const igstTotal = data.igstAmount || 0;
        const calculatedTotal = data.subtotal + cgstTotal + sgstTotal + igstTotal;
        
        // Round off to nearest lower ones value (e.g., 123.57 = 123.00)
        const roundedTotal = Math.floor(calculatedTotal);
        const roundoffAmount = calculatedTotal - roundedTotal;
        
        let summaryTextY = bankSummaryY + 9;
        const summaryLines = [
          [`Subtotal:`, formatCurrency(data.subtotal)],
          [`CGST Amt:`, formatCurrency(cgstTotal)],
          [`SGST Amt:`, formatCurrency(sgstTotal)],
          [`IGST Amt:`, formatCurrency(igstTotal)],
          [`Round off:`, formatCurrency(roundoffAmount)],
          [`Total Amount:`, formatCurrency(roundedTotal)],
        ];
        summaryLines.forEach(([label, value]) => {
          if (label === "Freight Packing Charges:" && !value) return;
          doc.setFont("helvetica", "bold");
          doc.text(label, colSeparatorX + 3, summaryTextY);
          doc.setFont("helvetica", "normal");
          if (value)
            doc.text(
              value,
              x0 + innerWidth - 3 - doc.getTextWidth(value),
              summaryTextY
            );
          summaryTextY += 4;
        });
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(lineThickness);
        doc.rect(x0, bankSummaryY, innerWidth, bankSummaryHeight, "S");
        doc.line(
          colSeparatorX,
          bankSummaryY,
          colSeparatorX,
          bankSummaryY + bankSummaryHeight
        );
        let invoiceTotalInWordsY = bankSummaryY + bankSummaryHeight + 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Invoice Total in Words", x0, invoiceTotalInWordsY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const wordsLines = doc.splitTextToSize(
          `Rupees ${numberToWords(roundedTotal)} Only`,
          innerWidth
        );
        doc.text(wordsLines, x0, invoiceTotalInWordsY + 4);
      }

      let signBoxWidth = 60,
        signBoxHeight = 25;
      let signX = x0 + innerWidth - signBoxWidth;
      let signY = pageHeight - margin - borderGap - signBoxHeight - 6;
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(lineThickness);
      doc.rect(signX, signY, signBoxWidth, signBoxHeight, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `For, ${data.companyName}`,
        signX + signBoxWidth / 2,
        signY + 8,
        { align: "center" }
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("(Authorised Signatory)", signX + signBoxWidth / 2, signY + 20, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Thank you for your business!",
        pageWidth / 2,
        pageHeight - margin + 4,
        { align: "center" }
      );

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      resolve(pdfBuffer);
    } catch (error) {
      console.error("PDF Generation Error in generateInvoicePDFBox:", error);
      reject(error);
    }
  });
}

function formatCurrency(amount: number): string {
  return `Rs. ${new Intl.NumberFormat("en-IN", {
    style: "decimal",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount)}`;
}

function numberToWords(num: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const thousands = ["", "Thousand", "Lakh", "Crore"];

  if (num === 0) return "Zero";
  const [integerPart, decimalPart] = num.toString().split(".");
  let result = "";
  if (parseInt(integerPart) > 0)
    result = convertIntegerToWords(
      parseInt(integerPart),
      ones,
      teens,
      tens,
      thousands
    );
  if (decimalPart && parseInt(decimalPart) > 0) {
    const decimalValue = parseInt(decimalPart.padEnd(2, "0").slice(0, 2));
    if (result) result += " And ";
    result +=
      convertIntegerToWords(decimalValue, ones, teens, tens, []) + " Paise";
  }
  return result;
}

function convertIntegerToWords(
  num: number,
  ones: string[],
  teens: string[],
  tens: string[],
  thousands: string[]
): string {
  if (num === 0) return "";
  let result = "";
  const groups = [num % 1000];
  num = Math.floor(num / 1000);
  while (num > 0) {
    groups.push(num % 100);
    num = Math.floor(num / 100);
  }
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;
    let groupText = "";
    if (i === 0) {
      groupText = convertGroupToWords(group, ones, teens, tens);
    } else {
      if (group >= 10) {
        const tenDigit = Math.floor(group / 10);
        const oneDigit = group % 10;
        groupText =
          tenDigit >= 2
            ? tens[tenDigit] + (oneDigit > 0 ? " " + ones[oneDigit] : "")
            : teens[group - 10];
      } else {
        groupText = ones[group];
      }
    }
    if (groupText) {
      if (result) result += " ";
      result += groupText;
      if (i > 0 && thousands[i]) result += " " + thousands[i];
    }
  }
  return result;
}

function convertGroupToWords(
  num: number,
  ones: string[],
  teens: string[],
  tens: string[]
): string {
  let result = "";
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  if (hundreds > 0) result += ones[hundreds] + " Hundred";
  if (remainder > 0) {
    if (result) result += " ";
    if (remainder < 10) result += ones[remainder];
    else if (remainder < 20) result += teens[remainder - 10];
    else {
      const tenDigit = Math.floor(remainder / 10);
      const oneDigit = remainder % 10;
      result += tens[tenDigit];
      if (oneDigit > 0) result += " " + ones[oneDigit];
    }
  }
  return result;
}
