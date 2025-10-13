-- express_services.categories definition

CREATE TABLE `categories` (
  `id_category` int NOT NULL AUTO_INCREMENT,
  `title` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id_category`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.clients definition

CREATE TABLE `clients` (
  `id_client` int NOT NULL AUTO_INCREMENT,
  `id_user` int DEFAULT NULL,
  PRIMARY KEY (`id_client`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.contracts definition

CREATE TABLE `contracts` (
  `id_contract` int NOT NULL AUTO_INCREMENT,
  `id_service` int DEFAULT NULL,
  `id_client` int NOT NULL,
  `agreed_hours` decimal(5,2) NOT NULL,
  `agreed_price` decimal(10,2) NOT NULL,
  `status` enum('pending','accepted','denied','completed','paid','cancelled') NOT NULL DEFAULT 'pending',
  `offer_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `response_date` timestamp NULL DEFAULT NULL,
  `client_marked_completed` datetime DEFAULT NULL,
  `provider_marked_completed` datetime DEFAULT NULL,
  `hidden_by_provider` tinyint(1) DEFAULT '0',
  `hidden_by_client` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_contract`),
  KEY `id_client` (`id_client`),
  KEY `fk_contracts_service1` (`id_service`),
  CONSTRAINT `contracts_ibfk_2` FOREIGN KEY (`id_client`) REFERENCES `clients` (`id_client`),
  CONSTRAINT `fk_contracts_service1` FOREIGN KEY (`id_service`) REFERENCES `services` (`id_service`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.conversations definition

CREATE TABLE `conversations` (
  `id_conversation` int NOT NULL AUTO_INCREMENT,
  `id_client` int NOT NULL,
  `id_provider` int NOT NULL,
  `id_service` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_conversation`),
  UNIQUE KEY `uk_conversation` (`id_client`,`id_provider`,`id_service`),
  KEY `id_provider` (`id_provider`),
  KEY `conversations_ibfk_10` (`id_service`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`id_client`) REFERENCES `clients` (`id_client`),
  CONSTRAINT `conversations_ibfk_10` FOREIGN KEY (`id_service`) REFERENCES `services` (`id_service`) ON DELETE SET NULL,
  CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`id_provider`) REFERENCES `providers` (`id_provider`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.favorites definition

CREATE TABLE `favorites` (
  `id_favorite` int NOT NULL AUTO_INCREMENT,
  `id_service` int DEFAULT NULL,
  `id_client` int DEFAULT NULL,
  PRIMARY KEY (`id_favorite`),
  UNIQUE KEY `id_service` (`id_service`,`id_client`),
  KEY `id_client` (`id_client`),
  CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`id_service`) REFERENCES `services` (`id_service`),
  CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`id_client`) REFERENCES `clients` (`id_client`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- express_services.images definition

CREATE TABLE `images` (
  `id_image` int NOT NULL AUTO_INCREMENT,
  `url` varchar(255) DEFAULT NULL,
  `id_review` int DEFAULT NULL,
  PRIMARY KEY (`id_image`),
  KEY `id_review` (`id_review`),
  CONSTRAINT `images_ibfk_1` FOREIGN KEY (`id_review`) REFERENCES `reviews` (`id_review`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.messages definition

CREATE TABLE `messages` (
  `id_message` int NOT NULL AUTO_INCREMENT,
  `id_conversation` int NOT NULL,
  `sender_id` int NOT NULL,
  `content` text NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_message`),
  KEY `id_conversation` (`id_conversation`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`id_conversation`) REFERENCES `conversations` (`id_conversation`),
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=163 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.providers definition

CREATE TABLE `providers` (
  `id_provider` int NOT NULL AUTO_INCREMENT,
  `id_user` int DEFAULT NULL,
  PRIMARY KEY (`id_provider`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `providers_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.reviews definition

CREATE TABLE `reviews` (
  `id_review` int NOT NULL AUTO_INCREMENT,
  `stars` tinyint DEFAULT NULL,
  `description` text,
  `id_service` int DEFAULT NULL,
  `id_client` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_review`),
  KEY `id_service` (`id_service`),
  KEY `id_client` (`id_client`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`id_service`) REFERENCES `services` (`id_service`),
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`id_client`) REFERENCES `clients` (`id_client`),
  CONSTRAINT `reviews_chk_1` CHECK ((`stars` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.services definition

CREATE TABLE `services` (
  `id_service` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `hour_price` decimal(10,2) DEFAULT NULL,
  `creation_date` date DEFAULT NULL,
  `experience_years` tinyint DEFAULT NULL,
  `id_category` int DEFAULT NULL,
  `id_provider` int DEFAULT NULL,
  `is_hidden` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_service`),
  KEY `id_category` (`id_category`),
  KEY `id_provider` (`id_provider`),
  CONSTRAINT `services_ibfk_1` FOREIGN KEY (`id_category`) REFERENCES `categories` (`id_category`),
  CONSTRAINT `services_ibfk_2` FOREIGN KEY (`id_provider`) REFERENCES `providers` (`id_provider`),
  CONSTRAINT `services_chk_1` CHECK ((`experience_years` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- express_services.users definition

CREATE TABLE `users` (
  `id_user` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(200) DEFAULT NULL,
  `email` varchar(200) DEFAULT NULL,
  `password_hash` varchar(75) DEFAULT NULL,
  `phone_number` varchar(75) DEFAULT NULL,
  `personal_picture` text,
  `city` varchar(100) DEFAULT NULL,
  `bio` text,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

