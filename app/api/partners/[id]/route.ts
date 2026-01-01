import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if partner is in use
    const inUse = await db.purchase.findFirst({
      where: {
        partnerId: params.id,
      },
    })

    if (inUse) {
      return new NextResponse("Cannot delete partner that has transactions", { status: 400 })
    }

    const partner = await db.partner.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json(partner)
  } catch (error) {
    console.error("[PARTNER_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { name, type, contactName, phone, email, address, gstNumber, bankName, accountNumber, ifscCode } = body

    if (!name || !type) {
      return new NextResponse("Name and type are required", { status: 400 })
    }

    // Check if partner with new name already exists (excluding current one)
    const existingPartner = await db.partner.findFirst({
      where: {
        name,
        id: {
          not: params.id,
        },
      },
    })

    if (existingPartner) {
      return new NextResponse("Partner with this name already exists", { status: 400 })
    }

    const partner = await db.partner.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        type,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gstNumber: gstNumber || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
      },
    })

    return NextResponse.json(partner)
  } catch (error) {
    console.error("[PARTNER_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const partnerId = params.id

    // Get the partner with their invoices
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
          include: {
            sales: {
              include: {
                productType: true,
              }
            }
          }
        }
      }
    })

    if (!partner) {
      return new NextResponse("Partner not found", { status: 404 })
    }

    // Format the transactions
    const transactions = partner.invoices.map(invoice => {
      // Calculate the total quantity across all sales
      const totalQuantity = invoice.sales.reduce((sum, sale) => sum + sale.quantity, 0);
      
      // Get unique product types
      const productTypes = [...new Set(invoice.sales.map(sale => sale.productType.name))];
      
      return {
        id: invoice.id,
        date: invoice.createdAt,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        products: productTypes.join(", "),
        quantity: totalQuantity,
        paymentStatus: invoice.pendingAmount > 0 ? "Pending" : "Paid",
        pendingAmount: invoice.pendingAmount
      };
    });

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        contactPerson: partner.contactPerson || null,
        phone: partner.phone || null,
        email: partner.email || null,
        address: partner.address || null,
        gstNumber: partner.gstNumber || null,
        bankName: partner.bankName || null,
        accountNumber: partner.accountNumber || null,
        ifscCode: partner.ifscCode || null,
      },
      transactions
    })
  } catch (error: any) {
    console.error("[PARTNER_GET]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}
