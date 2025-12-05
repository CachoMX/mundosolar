const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAPI() {
  try {
    console.log('Testing inventory query...')

    const totalProducts = await prisma.inventoryItem.aggregate({
      _sum: {
        quantity: true
      }
    })

    console.log('Total products:', totalProducts)

    const categories = await prisma.productCategory.findMany({
      where: { isActive: true }
    })

    console.log('Categories:', categories.length)

  } catch (error) {
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testAPI()
