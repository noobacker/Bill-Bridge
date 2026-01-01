const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash("admin123", 12);

    // Create admin user
    const admin = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        name: "Admin User",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("Admin user created:", admin);

    // Create default expense categories
    const expenseCategories = [
      { name: "Raw Material", isDefault: true },
      { name: "Electricity", isDefault: true },
      { name: "Labor", isDefault: true },
      { name: "Water", isDefault: true },
      { name: "Maintenance", isDefault: true },
      { name: "Fuel", isDefault: true },
      { name: "Transport", isDefault: true },
      { name: "Other", isDefault: true },
    ];

    for (const category of expenseCategories) {
      await prisma.expenseCategory.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      });
    }

    console.log("Default expense categories created");

    // Create default storage locations
    const storageLocations = [
      { name: "Drying", description: "Initial drying area for fresh bricks" },
      { name: "Warehouse A", description: "Main storage warehouse" },
      { name: "Warehouse B", description: "Secondary storage warehouse" },
    ];

    for (const location of storageLocations) {
      await prisma.storageLocation.upsert({
        where: { name: location.name },
        update: {},
        create: location,
      });
    }

    console.log("Default storage locations created");

    // Create default product types
    const productTypes = [
      {
        name: "Fly Ash Bricks",
        hsnNumber: "6810",
        description: "Standard fly ash bricks",
      },
      {
        name: "Red Clay Bricks",
        hsnNumber: "6904",
        description: "Traditional red clay bricks",
      },
    ];

    for (const type of productTypes) {
      await prisma.productType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      });
    }

    console.log("Default product types created");

    // Create default system settings
    await prisma.systemSettings.upsert({
      where: { id: "1" },
      update: {},
      create: {
        id: "1",
        companyName: "Bill Bridge",
        address: "E-58, opposite to HP Petroleum, M.I.D.C., Chandrapur, 442402",
        phone: "+91-9876543210",
        email: "info@bharatiyaenterprises.com",
        gstNumber: "27ABCDE1234F1Z5",
        panNumber: "ABCDE1234F",
        cgstRate: 9,
        sgstRate: 9,
        defaultBrickPrice: 7,
        pdfFormat: "modern", // Add this line
      },
    });

    console.log("System settings initialized");

    // Create sample raw materials
    const rawMaterials = [
      { name: "Cement", unit: "bag", currentStock: 100, minStockLevel: 20 },
      { name: "Fly Ash", unit: "ton", currentStock: 50, minStockLevel: 10 },
      { name: "Sand", unit: "ton", currentStock: 25, minStockLevel: 5 },
      { name: "Stone Dust", unit: "ton", currentStock: 30, minStockLevel: 8 },
    ];

    for (const material of rawMaterials) {
      await prisma.rawMaterial.upsert({
        where: { name: material.name },
        update: {},
        create: material,
      });
    }

    console.log("Sample raw materials created");

    // Create sample partners
    const partners = [
      {
        name: "ABC Suppliers",
        type: "VENDOR",
        contactName: "John Doe",
        phone: "+91-9876543210",
        email: "john@abcsuppliers.com",
        address: "Industrial Area, Chandrapur",
        gstNumber: "27ABCDE1234F1Z5",
      },
      {
        name: "XYZ Construction",
        type: "CLIENT",
        contactName: "Jane Smith",
        phone: "+91-9876543211",
        email: "jane@xyzconstruction.com",
        address: "Main Road, Chandrapur",
        gstNumber: "27XYZAB1234C1D2",
      },
      {
        name: "PQR Traders",
        type: "BOTH",
        contactName: "Raj Kumar",
        phone: "+91-9876543212",
        email: "raj@pqrtraders.com",
        address: "Market Area, Chandrapur",
        gstNumber: "27PQRST1234D1E3",
      },
    ];

    for (const partner of partners) {
      await prisma.partner.upsert({
        where: { name: partner.name },
        update: {},
        create: partner,
      });
    }

    console.log("Sample partners created");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
