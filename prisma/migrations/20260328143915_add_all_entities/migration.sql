-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `uom` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `avgCost` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,
    `weight` DOUBLE NOT NULL,
    `stock` DOUBLE NOT NULL DEFAULT 0,
    `minStock` DOUBLE NOT NULL,
    `isRawMaterial` BOOLEAN NOT NULL DEFAULT false,
    `lotControl` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockDetail` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `lot` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BOMItem` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `componentId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceTable` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceTableItem` (
    `id` VARCHAR(191) NOT NULL,
    `priceTableId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `document` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `totalPurchased` DOUBLE NULL,
    `firstPurchaseDate` DATETIME(3) NULL,
    `lastPurchaseDate` DATETIME(3) NULL,
    `contractStatus` VARCHAR(191) NULL,
    `segmentation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerDocument` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `customerAddress` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDENTE', 'PRODUCAO', 'PRONTO_LOGISTICA', 'ENTREGA', 'AGUARDANDO_FATURAMENTO', 'FATURADO', 'REJEITADO') NOT NULL DEFAULT 'PENDENTE',
    `productionStage` ENUM('FILA', 'PROCESSO', 'QUALIDADE', 'CONCLUIDO') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deliveryDate` DATETIME(3) NOT NULL,
    `totalValue` DOUBLE NOT NULL,
    `totalWeight` DOUBLE NOT NULL,
    `seller` VARCHAR(191) NOT NULL,
    `closedBy` VARCHAR(191) NULL,
    `user` VARCHAR(191) NOT NULL,
    `paymentCondition` VARCHAR(191) NOT NULL,
    `priceTableId` VARCHAR(191) NULL,
    `assignedVehicleId` VARCHAR(191) NULL,
    `assignedDriverId` VARCHAR(191) NULL,
    `departureTime` DATETIME(3) NULL,
    `deliveryTime` DATETIME(3) NULL,
    `viewedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `loteId` VARCHAR(191) NULL,
    `loteDate` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `scheduledDeliveryDate` DATETIME(3) NULL,
    `customerId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,
    `finalPrice` DOUBLE NULL,
    `discount` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `responsible` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `lot` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `plate` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `capacityKg` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DISPONIVEL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vehicle_plate_key`(`plate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Driver` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `license` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DISPONIVEL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Driver_license_key`(`license`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliverySchedule` (
    `id` VARCHAR(191) NOT NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `orders` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AGENDADO',
    `notes` VARCHAR(191) NULL,
    `totalWeight` DOUBLE NOT NULL,
    `totalValue` DOUBLE NOT NULL,
    `cities` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `origin` VARCHAR(191) NOT NULL,
    `segment` VARCHAR(191) NOT NULL,
    `companySize` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NOVO',
    `value` DOUBLE NOT NULL,
    `score` INTEGER NOT NULL,
    `probability` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastContact` DATETIME(3) NULL,
    `nextContact` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InteractionLog` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `author` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Activity` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIA',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CRMClient` (
    `id` VARCHAR(191) NOT NULL,
    `razaoSocial` VARCHAR(191) NOT NULL,
    `nomeFantasia` VARCHAR(191) NOT NULL,
    `cnpjCpf` VARCHAR(191) NOT NULL,
    `segmento` VARCHAR(191) NOT NULL,
    `responsavelCompras` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `cidade` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `canalCaptacao` VARCHAR(191) NOT NULL,
    `etapaFunil` VARCHAR(191) NOT NULL DEFAULT 'LEAD',
    `statusCliente` VARCHAR(191) NOT NULL DEFAULT 'PROSPECT',
    `ultimoContatoData` DATETIME(3) NULL,
    `ultimoContatoTipo` VARCHAR(191) NULL,
    `proximoContatoData` DATETIME(3) NULL,
    `proximoContatoTipo` VARCHAR(191) NULL,
    `diasSemContato` INTEGER NOT NULL DEFAULT 0,
    `followupEmAtraso` BOOLEAN NOT NULL DEFAULT false,
    `ultimoPedidoId` VARCHAR(191) NULL,
    `ultimoPedidoData` DATETIME(3) NULL,
    `ultimoPedidoValor` DOUBLE NULL,
    `previsaoEntrega` DATETIME(3) NULL,
    `dataEntregaReal` DATETIME(3) NULL,
    `statusEntrega` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CRMInteraction` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `responsible` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StockDetail` ADD CONSTRAINT `StockDetail_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BOMItem` ADD CONSTRAINT `BOMItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BOMItem` ADD CONSTRAINT `BOMItem_componentId_fkey` FOREIGN KEY (`componentId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceTableItem` ADD CONSTRAINT `PriceTableItem_priceTableId_fkey` FOREIGN KEY (`priceTableId`) REFERENCES `PriceTable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_priceTableId_fkey` FOREIGN KEY (`priceTableId`) REFERENCES `PriceTable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InteractionLog` ADD CONSTRAINT `InteractionLog_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CRMInteraction` ADD CONSTRAINT `CRMInteraction_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `CRMClient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
