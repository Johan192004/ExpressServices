-- Tabla USERS con los nuevos campos para el perfil
CREATE TABLE users (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(200),
    email VARCHAR(200) UNIQUE,
    password_hash VARCHAR(75),
    phone_number VARCHAR(75),
    personal_picture TEXT,
    city VARCHAR(100), 
    bio TEXT             
);

-- CAMBIO: La tabla 'suppliers' ahora se llama 'providers' para mayor claridad
CREATE TABLE providers (
    id_provider INT AUTO_INCREMENT PRIMARY KEY, 
    id_user INT,
    FOREIGN KEY (id_user) REFERENCES users(id_user)
);

CREATE TABLE clients (
    id_client INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT,
    FOREIGN KEY (id_user) REFERENCES users(id_user)
);

CREATE TABLE categories (
    id_category INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(60)
);

CREATE TABLE services (
    id_service INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    hour_price DECIMAL(10,2),
    creation_date DATE,
    experience_years TINYINT CHECK(experience_years>=0),
    id_category INT,
    id_provider INT, -- CAMBIO: id_supplier -> id_provider
    FOREIGN KEY (id_category) REFERENCES categories(id_category),
    -- CAMBIO: La llave foránea ahora apunta a la tabla 'providers'
    FOREIGN KEY (id_provider) REFERENCES providers(id_provider)
);

CREATE TABLE reviews (
    id_review INT AUTO_INCREMENT PRIMARY KEY,
    stars TINYINT CHECK(stars BETWEEN 1 AND 5),
    description TEXT,
    id_service INT,
    id_client INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_service) REFERENCES services(id_service),
    FOREIGN KEY (id_client) REFERENCES clients(id_client)
);

CREATE TABLE images (
    id_image INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(255),
    id_review INT,
    FOREIGN KEY (id_review) REFERENCES reviews(id_review)
);

CREATE TABLE favorites (
    id_favorite INT AUTO_INCREMENT PRIMARY KEY,
    id_service INT,
    id_client INT,
    FOREIGN KEY (id_service) REFERENCES services(id_service),
    FOREIGN KEY (id_client) REFERENCES clients(id_client),
    UNIQUE(id_service,id_client)
);

CREATE TABLE contracted_services (
    id_contracted_service INT AUTO_INCREMENT PRIMARY KEY,
    status ENUM('Cancelado','Pendiente','Completado') NOT NULL,
    contacted_date DATE NOT NULL,
    id_service INT,
    id_client INT,
    FOREIGN KEY (id_service) REFERENCES services(id_service),
    FOREIGN KEY (id_client) REFERENCES clients(id_client),
    UNIQUE(contacted_date,id_service,id_client)
);

ALTER TABLE users
ADD COLUMN reset_token VARCHAR(255) NULL,
ADD COLUMN reset_token_expires DATETIME NULL;

CREATE TABLE contracts (
    id_contract INT AUTO_INCREMENT PRIMARY KEY,
    id_service INT NULL,
    id_client INT NOT NULL,
    
    agreed_hours DECIMAL(5, 2) NOT NULL, -- Ej: 2.5 horas
    agreed_price DECIMAL(10, 2) NOT NULL, -- Se calcula (precio_hora * horas)
    
    -- El estado ahora refleja el nuevo flujo completo
    status ENUM('pending', 'accepted', 'denied', 'completed', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
    
    offer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Fecha en que el cliente envía la oferta
    response_date TIMESTAMP NULL, -- Fecha en que el proveedor responde
    
    FOREIGN KEY (id_service) REFERENCES services(id_service) ON DELETE SET NULL,
    FOREIGN KEY (id_client) REFERENCES clients(id_client)
);


-- ===================================================================
-- NUEVAS TABLAS PARA EL CHAT INTERNO
-- ===================================================================

-- Tabla para agrupar una conversación entre un cliente y un proveedor sobre un servicio
CREATE TABLE conversations (
    id_conversation INT AUTO_INCREMENT PRIMARY KEY,
    id_client INT NOT NULL,
    id_provider INT NOT NULL,
    id_service INT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_client) REFERENCES clients(id_client),
    FOREIGN KEY (id_provider) REFERENCES providers(id_provider),
    FOREIGN KEY (id_service) REFERENCES services(id_service) ON DELETE SET NULL,
    
    -- Creamos un índice único para que no se pueda crear más de una conversación
    -- para el mismo trío de cliente, proveedor y servicio.
    UNIQUE KEY uk_conversation (id_client, id_provider, id_service)
);

-- Tabla para guardar cada mensaje individual dentro de una conversación
CREATE TABLE messages (
    id_message INT AUTO_INCREMENT PRIMARY KEY,
    id_conversation INT NOT NULL,
    sender_id INT NOT NULL, -- Quién envió el mensaje (ID de la tabla 'users')
    
    content TEXT NOT NULL,
    
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (id_conversation) REFERENCES conversations(id_conversation),
    FOREIGN KEY (sender_id) REFERENCES users(id_user)
);

-- Migración para agregar created_at a la tabla reviews si no existe
-- (solo ejecutar si la tabla ya existe sin este campo)
-- ALTER TABLE reviews ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;