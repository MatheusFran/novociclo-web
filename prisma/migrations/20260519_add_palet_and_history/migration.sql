-- AlterTable
ALTER TABLE `Carregamento` ADD COLUMN `observations` VARCHAR(191),
    ADD COLUMN `cityGroups` JSON NOT NULL DEFAULT '[]',
    ADD COLUMN `romaneio` JSON;

-- CreateTable
CREATE TABLE `Palet` (
    `id` VARCHAR(191) NOT NULL,
    `carregamentoId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `items` JSON NOT NULL,
    `totalWeight` DOUBLE NOT NULL DEFAULT 0,
    `totalUnits` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaletHistory` (
    `id` VARCHAR(191) NOT NULL,
    `carregamentoId` VARCHAR(191) NOT NULL,
    `paletId` VARCHAR(191),
    `action` VARCHAR(191) NOT NULL,
    `details` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaletHistory_carregamentoId_idx`(`carregamentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Palet` ADD CONSTRAINT `Palet_carregamentoId_fkey` FOREIGN KEY (`carregamentoId`) REFERENCES `Carregamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaletHistory` ADD CONSTRAINT `PaletHistory_carregamentoId_fkey` FOREIGN KEY (`carregamentoId`) REFERENCES `Carregamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
