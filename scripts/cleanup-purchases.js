const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function cleanupOrphanedPurchases() {
  console.log('Starting cleanup of orphaned purchases...');

  try {
    // Find all purchases that do not have an associated expense
    const orphanedPurchases = await db.purchase.findMany({
      where: {
        expense: null,
      },
    });

    if (orphanedPurchases.length === 0) {
      console.log('No orphaned purchases found. Database is clean.');
      return;
    }

    console.log(`Found ${orphanedPurchases.length} orphaned purchases. Processing...`);

    // Get the "Raw Material" expense category
    const expenseCategory = await db.expenseCategory.findFirst({
      where: { name: 'Raw Material' },
    });

    if (!expenseCategory) {
      throw new Error('"Raw Material" expense category not found. Please seed your database.');
    }

    // Create a corresponding expense for each orphaned purchase
    for (const purchase of orphanedPurchases) {
      console.log(`Processing purchase ${purchase.id}...`);

      const newExpense = await db.expense.create({
        data: {
          categoryId: expenseCategory.id,
          amount: purchase.totalAmount,
          date: purchase.purchaseDate,
          description: `Purchase of raw material (ID: ${purchase.rawMaterialId})`,
        },
      });

      // Link the purchase to the new expense
      await db.purchase.update({
        where: { id: purchase.id },
        data: {
          expense: {
            connect: {
              id: newExpense.id,
            },
          },
        },
      });

      console.log(`- Created expense ${newExpense.id} and linked it to purchase ${purchase.id}`);
    }

    console.log('Successfully cleaned up all orphaned purchases.');
  } catch (error) {
    console.error('An error occurred during cleanup:', error);
  } finally {
    await db.$disconnect();
    console.log('Disconnected from database.');
  }
}

cleanupOrphanedPurchases(); 