/*
  Warnings:

  - You are about to drop the column `customerAddress` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerDocument` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `loteDate` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `loteId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `lotControl` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `lot` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BOMItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CRMClient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CRMInteraction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeliverySchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InteractionLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockDetail` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `customerId` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Activity` DROP FOREIGN KEY `Activity_leadId_fkey`;

-- DropForeignKey
ALTER TABLE `BOMItem` DROP FOREIGN KEY `BOMItem_componentId_fkey`;

-- DropForeignKey
ALTER TABLE `BOMItem` DROP FOREIGN KEY `BOMItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `CRMInteraction` DROP FOREIGN KEY `CRMInteraction_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `InteractionLog` DROP FOREIGN KEY `InteractionLog_leadId_fkey`;

-- DropForeignKey
ALTER TABLE `Order` DROP FOREIGN KEY `Order_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `StockDetail` DROP FOREIGN KEY `StockDetail_productId_fkey`;

-- DropIndex
DROP INDEX `Order_customerId_fkey` ON `Order`;

-- AlterTable
ALTER TABLE `Order` DROP COLUMN `customerAddress`,
    DROP COLUMN `customerDocument`,
    DROP COLUMN `customerEmail`,
    DROP COLUMN `customerName`,
    DROP COLUMN `customerPhone`,
    DROP COLUMN `loteDate`,
    DROP COLUMN `loteId`,
    MODIFY `customerId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Product` DROP COLUMN `lotControl`,
    DROP COLUMN `minStock`,
    DROP COLUMN `stock`;

-- AlterTable
ALTER TABLE `StockMovement` DROP COLUMN `city`,
    DROP COLUMN `lot`;

-- DropTable
DROP TABLE `Activity`;

-- DropTable
DROP TABLE `BOMItem`;

-- DropTable
DROP TABLE `CRMClient`;

-- DropTable
DROP TABLE `CRMInteraction`;

-- DropTable
DROP TABLE `DeliverySchedule`;

-- DropTable
DROP TABLE `InteractionLog`;

-- DropTable
DROP TABLE `Lead`;

-- DropTable
DROP TABLE `StockDetail`;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
