import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateInvoicePDF, generateInvoicePDFBox } from "@/lib/generate-pdf"
import { formatDate } from "@/lib/utils"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const url = new URL(req.url)
    const includeBankDetails = url.searchParams.get("includeBankDetails") === "true"

    // Properly await the params object as required by Next.js
    const { id: invoiceId } = await params

    if (!invoiceId) {
      return new NextResponse("Invoice ID is required", { status: 400 })
    }

    // 1. Fetch Invoice Data with all necessary relations
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        partner: true,
        sales: {
          include: {
            productType: true,
            productionBatch: {
              include: {
                storageLocation: true
              }
            }
          }
        }
      }
    })

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }

    // 2. Fetch Company & Bill Settings - Get all available settings
    const settings = await db.systemSettings.findFirst()

    console.log("Settings fetched:", settings) // Debug log
    console.log("Partner details:", invoice.partner) // Debug log

    // 3. Consolidate sales data for the invoice
    const consolidatedItems = new Map<string, any>()

    for (const sale of invoice.sales) {
      if (consolidatedItems.has(sale.productTypeId)) {
        const item = consolidatedItems.get(sale.productTypeId)
        item.quantity += sale.quantity
        item.amount += sale.amount
        item.batches.push({
          location: sale.productionBatch?.storageLocation?.name || 'N/A',
          quantity: sale.quantity,
        })
      } else {
        consolidatedItems.set(sale.productTypeId, {
          description: sale.productType.name,
          hsnCode: sale.productType.hsnNumber || '',
          quantity: sale.quantity,
          rate: sale.rate,
          amount: sale.amount,
          cgstRate: (sale.productType as any).cgstRate ?? 9,
          sgstRate: (sale.productType as any).sgstRate ?? 9,
          igstRate: (sale.productType as any).igstRate ?? 0,
          isService: (sale.productType as any).isService ?? false,
          batches: [{
            location: sale.productionBatch?.storageLocation?.name || 'N/A',
            quantity: sale.quantity,
          }],
        })
      }
    }

    const items = Array.from(consolidatedItems.values())

    // 4. Calculate proper GST rates if not stored in invoice
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    if (invoice.isGst && settings) {
      cgstRate = settings.cgstRate || 9; // Default to 9% if not set
      sgstRate = settings.sgstRate || 9; // Default to 9% if not set
      igstRate = settings.igstRate || 0; // Default to 0% if not set
    }

    // 5. Prepare comprehensive data for the PDF template
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: formatDate(invoice.invoiceDate),
      // Client details
      clientName: invoice.partner.name,
      clientAddress: invoice.partner.address || undefined,
      clientGst: invoice.partner.gstNumber || undefined,
      clientPhone: invoice.partner.phone || undefined,
      clientEmail: invoice.partner.email || undefined,
      // Items
      items: items,
      // Financial details
      subtotal: invoice.subtotal,
      cgstRate: cgstRate, // Default rate, individual items may have different rates
      cgstAmount: invoice.cgstAmount,
      sgstAmount: invoice.sgstAmount,
      igstAmount: invoice.igstAmount || 0,
      totalAmount: invoice.totalAmount,
      isGst: invoice.isGst,
      paymentType: invoice.paymentType,
      remarks: invoice.remarks || undefined,
      transportMode: invoice.transportMode || undefined,
      ...(typeof (invoice as any)['transportVehicle'] === 'string' && (invoice as any)['transportVehicle'] ? { vehicleNumber: (invoice as any)['transportVehicle'] } : {}),
      // Company details - use settings or generic placeholders
      companyName: settings?.companyName?.trim() ? settings.companyName : "Company Name",
      companyAddress: settings?.address?.trim() ? settings.address : "Company Address",
      companyGst: settings?.gstNumber?.trim() ? settings.gstNumber : "GST Number",
      companyPhone: settings?.phone?.trim() ? settings.phone : "Phone Number",
      companyEmail: settings?.email?.trim() ? settings.email : "Email",
      // Bank details
      bankName: settings?.bankName?.trim() ? settings.bankName : "Bank Name",
      bankAccountNo: settings?.accountNumber?.trim() ? settings.accountNumber : "Account Number",
      bankIfscCode: settings?.ifscCode?.trim() ? settings.ifscCode : "IFSC Code",
      accountHolderName: settings?.accountHolderName?.trim() ? settings.accountHolderName : "Account Holder Name",
      includeBankDetails: includeBankDetails,
      logoUrl: (settings as any)?.logoUrl || '/images/default_logo.png',
      upiId: (settings as any)?.upiId || '',
      sgstRate: settings?.sgstRate ?? 9,
      igstRate: settings?.igstRate ?? 0,
    }

    const companyName = settings?.companyName;
    const invoiceNumber = invoice.invoiceNumber;
    const clientName = invoice.partner.name.replace(/\s+/g, '_').replace(/[^\w\d_]/g, '');
    const date = new Date(invoice.invoiceDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}${month}${year}`;
      
    const filename = `${companyName}_${invoiceNumber}_${clientName}_${formattedDate}.pdf`;

    // Select PDF format
    let pdfBuffer;
    const pdfFormat = (settings as any)?.pdfFormat;
    if (pdfFormat === 'box') {
      pdfBuffer = await generateInvoicePDFBox(invoiceData);
    } else {
      pdfBuffer = await generateInvoicePDF(invoiceData);
    }

    console.log("Invoice data prepared:", invoiceData) // Debug log

    try {
      // 6. Generate the PDF buffer
      // 7. Return the PDF as a response
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      })
    } catch (pdfError: any) {
      console.error("[PDF_GENERATION_ERROR]", pdfError)
      return new NextResponse(`Error generating PDF: ${pdfError.message || 'Unknown error'}`, { status: 500 })
    }

  } catch (error: any) {
    console.error("[INVOICE_DOWNLOAD]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}