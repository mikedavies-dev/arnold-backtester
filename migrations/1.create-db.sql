CREATE TABLE `backtests` (
  `id` varchar(64) NOT NULL,
  `startedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `backtest_positions` (
  `id` varchar(64) NOT NULL,
  `backtestId` varchar(64) NOT NULL,
  `symbol` varchar(32) NOT NULL,
  `createdAt` datetime(6) NOT NULL,
  `openedAt` datetime(6) DEFAULT NULL,
  `closeReason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_backtest_positions_backtest_id` (`backtestId`),
  CONSTRAINT `fk_backtest_positions_backtest_id` FOREIGN KEY (`backtestId`) REFERENCES `backtests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `backtest_orders` (
  `id` varchar(64) NOT NULL,
  `positionId` varchar(64) NOT NULL,
  `parentId` varchar(64) DEFAULT NULL,
  `type` varchar(32) NOT NULL,
  `action` varchar(32) NOT NULL,
  `shares` int(11) NOT NULL,
  `openedAt` datetime(6) DEFAULT NULL,
  `filledAt` datetime(6) DEFAULT NULL,
  `fillPrice` decimal(10,4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_backtest_orders_parent_id` (`parentId`),
  KEY `fk_backtest_orders_position_id` (`positionId`),
  CONSTRAINT `fk_backtest_orders_parent_id` FOREIGN KEY (`parentId`) REFERENCES `backtest_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_backtest_orders_position_id` FOREIGN KEY (`positionId`) REFERENCES `backtest_positions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;