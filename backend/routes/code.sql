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

