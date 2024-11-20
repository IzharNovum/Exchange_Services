# ************************************************************
# Sequel Pro SQL dump
# Version 5446
#
# https://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 8.0.21)
# Database: cryptohero
# Generation Time: 2024-11-19 05:47:51 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
SET NAMES utf8mb4;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table exchange_pairs
# ------------------------------------------------------------

DROP TABLE IF EXISTS `exchange_pairs`;

CREATE TABLE `exchange_pairs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `exchange_id` int unsigned NOT NULL,
  `pair_id` int unsigned DEFAULT NULL,
  `name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `min_quantity` double DEFAULT '0',
  `max_quantity` int DEFAULT NULL,
  `min_notional` double DEFAULT '0',
  `price_precision` int DEFAULT NULL,
  `amount_precision` int DEFAULT NULL,
  `contract_size` float DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `future_type` enum('coin_m','usd_m','usd_c') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchange_pair` (`exchange_id`,`pair_id`),
  KEY `pair_id` (`pair_id`),
  KEY `exchange_id` (`exchange_id`),
  CONSTRAINT `exchange_pairs_ibfk_1` FOREIGN KEY (`exchange_id`) REFERENCES `exchanges` (`id`),
  CONSTRAINT `exchange_pairs_ibfk_2` FOREIGN KEY (`pair_id`) REFERENCES `pairs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table exchanges
# ------------------------------------------------------------

DROP TABLE IF EXISTS `exchanges`;

CREATE TABLE `exchanges` (
  `order` tinyint(1) NOT NULL DEFAULT '15',
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `image` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint DEFAULT '1',
  `status` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ok',
  `require_param` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_future` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table pairs
# ------------------------------------------------------------

DROP TABLE IF EXISTS `pairs`;

CREATE TABLE `pairs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `from` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `kline_exchange_id` tinyint(1) DEFAULT NULL,
  `contract_type` enum('perpetual','deliver') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contract_time` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table user_bots
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user_bots`;

CREATE TABLE `user_bots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `rent_id` int DEFAULT NULL,
  `user_id` int unsigned NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `checked_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `frequency` int unsigned NOT NULL COMMENT 'minutes',
  `exchange_pair_id` int unsigned NOT NULL,
  `strategy` enum('Long','Short','Both') COLLATE utf8mb4_unicode_ci DEFAULT 'Long',
  `initial_fund` double(20,8) DEFAULT NULL,
  `base_order_percentage` double(20,8) DEFAULT NULL,
  `base_order_type` enum('static','dynamic') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'static',
  `extra_order_percentage` double(20,2) unsigned NOT NULL COMMENT 'market/order',
  `profit` double(20,2) DEFAULT NULL,
  `stop_loss` double(20,2) DEFAULT NULL,
  `back_test_time_frame` int DEFAULT NULL COMMENT '365 day',
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `indicator_triggers_entry` tinyint DEFAULT NULL,
  `indicator_triggers_exit` tinyint DEFAULT NULL,
  `pair_id` int NOT NULL,
  `exchange_id` int NOT NULL,
  `type` enum('simple','advance','dca','exit','price','grid','sell','inter_arbitrage','intra_arbitrage') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'simple',
  `min_tp` float DEFAULT '0',
  `order_type` enum('market','limit') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'market',
  PRIMARY KEY (`id`),
  KEY `user_exchange_bots` (`user_id`,`exchange_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table users
# ------------------------------------------------------------

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `role` enum('normal','alpha','beta') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `referral_code` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referred_by` int DEFAULT NULL,
  `device_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apple_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facebook_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `last_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `date_of_birth` date DEFAULT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `device_security_enable` tinyint(1) DEFAULT '0',
  `security_token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `exchange_security_token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `status` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `currency_id` int unsigned NOT NULL DEFAULT '1',
  `platform` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_exchange` int DEFAULT '0',
  `google2fa_secret` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
