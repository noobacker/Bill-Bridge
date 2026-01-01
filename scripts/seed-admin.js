const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcrypt")

const prisma = new PrismaClient()

async function main() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash("admin123", 12)

    // Create admin user
    const admin = await prisma.user.upsert({
      where: { email: "admin@bharatiya.com" },
      update: {},
      create: {
        name: "Admin User",
        email: "admin@bharatiya.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    })

    console.log("Admin user created:", admin)

    // Create some sample raw materials
    const rawMaterials = [
      { name: "Cement", unit: "bag", currentStock: 100, minStockLevel: 20 },
      { name: "Fly Ash", unit: "ton", currentStock: 50, minStockLevel: 10 },
      { name: "Sand", unit: "ton", currentStock: 25, minStockLevel: 5 },
      { name: "Stone Dust", unit: "ton", currentStock: 30, minStockLevel: 8 },
    ]

    for (const material of rawMaterials) {
      await prisma.rawMaterial.upsert({
        where: { name: material.name },
        update: {},
        create: material,
      })
    }

    console.log("Sample raw materials created")

    // Create sample vendor
    const vendor = await prisma.vendor.upsert({
      where: { name: "ABC Suppliers" },
      update: {},
      create: {
        name: "ABC Suppliers",
        contactName: "John Doe",
        phone: "+91-9876543210",
        email: "john@abcsuppliers.com",
        address: "Industrial Area, Chandrapur",
        gstNumber: "27ABCDE1234F1Z5",
      },
    })

    console.log("Sample vendor created:", vendor)

    // Create sample client
    const client = await prisma.client.upsert({
      where: { name: "XYZ Construction" },
      update: {},
      create: {
        name: "XYZ Construction",
        contactName: "Jane Smith",
        phone: "+91-9876543211",
        email: "jane@xyzconstruction.com",
        address: "Main Road, Chandrapur",
        gstNumber: "27XYZAB1234C1D2",
      },
    })

    console.log("Sample client created:", client)

    // Create sample production batch
    const batch = await prisma.productionBatch.create({
      data: {
        batchNumber: "BATCH-001",
        quantity: 10000,
        remainingQuantity: 8500,
        productionDate: new Date(),
        location: "Warehouse A",
        notes: "First production batch",
      },
    })

    console.log("Sample production batch created:", batch)
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
