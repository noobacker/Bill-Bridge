import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const settings = await db.systemSettings.findFirst()

    if (!settings) {
      return NextResponse.json({
        companyName: '',
        address: '',
        phone: '',
        email: '',
        gstNumber: '',
        panNumber: '',
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
        cgstRate: 9,
        sgstRate: 9,
        defaultBrickPrice: 0,
        pdfFormat: 'modern', // Add this line
        logoUrl: '/images/default_logo.png',
        upiId: '',
        showLogoInPdf: true,
        language: 'en',
      })
    }

    return NextResponse.json({
      companyName: settings.companyName || '',
      address: settings.address || '',
      phone: settings.phone || '',
      email: settings.email || '',
      gstNumber: settings.gstNumber || '',
      panNumber: settings.panNumber || '',
      bankName: settings.bankName || '',
      accountNumber: settings.accountNumber || '',
      accountHolderName: settings.accountHolderName || '',
      ifscCode: settings.ifscCode || '',
      cgstRate: settings.cgstRate ?? 9,
      sgstRate: settings.sgstRate ?? 9,
      defaultBrickPrice: settings.defaultBrickPrice ?? 7,
      pdfFormat: settings.pdfFormat || 'modern', // Add this line
      logoUrl: settings.logoUrl || '/images/default_logo.png',
      upiId: settings.upiId || '',
      showLogoInPdf: typeof settings.showLogoInPdf === 'boolean' ? settings.showLogoInPdf : true,
      language: settings.language || 'en',
    })
  } catch (error) {
    console.error("[SETTINGS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session as any)?.user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized - Admin access required", { status: 401 })
    }

    const body = await req.json()

    // Get the first settings record or create if it doesn't exist
    let settings = await db.systemSettings.findFirst()

    if (!settings) {
      settings = await db.systemSettings.create({
        data: {
          companyName: body.name || '',
          address: body.address || '',
          phone: body.phone || '',
          email: body.email || '',
          gstNumber: body.gstNumber || '',
          panNumber: body.panNumber || '',
          bankName: body.bankName || '',
          accountNumber: body.accountNumber || '',
          accountHolderName: body.accountHolderName || '',
          ifscCode: body.ifscCode || '',
          cgstRate: body.cgstRate ?? 9,
          sgstRate: body.sgstRate ?? 9,
          defaultBrickPrice: body.defaultBrickPrice ?? 7,
          pdfFormat: body.pdfFormat ?? 'modern', // Add this line
          upiId: body.upiId || '',
          showLogoInPdf: typeof body.showLogoInPdf === 'boolean' ? body.showLogoInPdf : true,
          language: body.language || 'en',
        },
      })
    }

    // Merge old and new data for update
    const updateData = {
      companyName: body.name ?? settings.companyName ?? '',
      address: body.address ?? settings.address ?? '',
      phone: body.phone ?? settings.phone ?? '',
      email: body.email ?? settings.email ?? '',
      gstNumber: body.gstNumber ?? settings.gstNumber ?? '',
      panNumber: body.panNumber ?? settings.panNumber ?? '',
      bankName: body.bankName ?? settings.bankName ?? '',
      accountNumber: body.accountNumber ?? settings.accountNumber ?? '',
      accountHolderName: body.accountHolderName ?? settings.accountHolderName ?? '',
      ifscCode: body.ifscCode ?? settings.ifscCode ?? '',
      cgstRate: body.cgstRate ?? settings.cgstRate ?? 9,
      sgstRate: body.sgstRate ?? settings.sgstRate ?? 9,
      defaultBrickPrice: body.defaultBrickPrice ?? settings.defaultBrickPrice ?? 7,
      pdfFormat: body.pdfFormat ?? settings.pdfFormat ?? 'modern', // Add this line
      upiId: body.upiId ?? settings.upiId ?? '',
      showLogoInPdf: typeof body.showLogoInPdf === 'boolean' ? body.showLogoInPdf : (typeof settings.showLogoInPdf === 'boolean' ? settings.showLogoInPdf : true),
      language: body.language ?? settings.language ?? 'en',
    }

    const updatedSettings = await db.systemSettings.update({
      where: {
        id: settings.id,
      },
      data: updateData,
    })

    return NextResponse.json({
      companyName: updatedSettings.companyName || '',
      address: updatedSettings.address || '',
      phone: updatedSettings.phone || '',
      email: updatedSettings.email || '',
      gstNumber: updatedSettings.gstNumber || '',
      panNumber: updatedSettings.panNumber || '',
      bankName: updatedSettings.bankName || '',
      accountNumber: updatedSettings.accountNumber || '',
      accountHolderName: updatedSettings.accountHolderName || '',
      ifscCode: updatedSettings.ifscCode || '',
      cgstRate: updatedSettings.cgstRate ?? 9,
      sgstRate: updatedSettings.sgstRate ?? 9,
      defaultBrickPrice: updatedSettings.defaultBrickPrice ?? 7,
      pdfFormat: updatedSettings.pdfFormat || 'modern', // Add this line
      logoUrl: updatedSettings.logoUrl || '/images/default_logo.png',
      upiId: updatedSettings.upiId || '',
      showLogoInPdf: typeof updatedSettings.showLogoInPdf === 'boolean' ? updatedSettings.showLogoInPdf : true,
      language: updatedSettings.language || 'en',
    })
  } catch (error) {
    console.error("[SETTINGS_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
