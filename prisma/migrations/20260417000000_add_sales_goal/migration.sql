-- CreateTable SalesGoal
CREATE TABLE `SalesGoal` (
    `id` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL DEFAULT 1,
    `year` INTEGER NOT NULL DEFAULT 2026,
    `revenue` DOUBLE NOT NULL DEFAULT 0,
    `tons` DOUBLE NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalesGoal_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
