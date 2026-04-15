import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Verificar se já existe usuário admin
  const existingUser = await prisma.user.findUnique({
    where: { email: 'novociclo@email.com' }
  });

  if (!existingUser) {
    const hash = await bcrypt.hash('123456', 12);
    await prisma.user.create({
      data: {
        email: 'novociclo@email.com',
        password: hash,
        name: 'Admin'
      }
    });
    console.log('✓ Admin user created');
  } else {
    console.log('✓ Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
