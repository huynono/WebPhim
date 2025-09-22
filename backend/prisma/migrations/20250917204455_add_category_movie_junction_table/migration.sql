-- CreateTable
CREATE TABLE `CategoryOnMovie` (
    `movieId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,

    PRIMARY KEY (`movieId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CategoryOnMovie` ADD CONSTRAINT `CategoryOnMovie_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryOnMovie` ADD CONSTRAINT `CategoryOnMovie_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE `Movie` DROP FOREIGN KEY `Movie_categoryId_fkey`;

-- DropIndex
DROP INDEX `Movie_categoryId_fkey` ON `Movie`;

-- AlterTable
ALTER TABLE `Movie` DROP COLUMN `categoryId`;
