-- CreateTable
CREATE TABLE `HomeBanner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `videoUrl` VARCHAR(191) NOT NULL,
    `linkUrl` VARCHAR(191) NOT NULL,
    `type` ENUM('POPUP', 'FIXED', 'MIDDLE') NOT NULL DEFAULT 'POPUP',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HomeBanner_type_isActive_idx`(`type`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
