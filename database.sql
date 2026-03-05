-- =============================================
-- RestaurantOS - Base de Datos
-- Ejecutar en phpMyAdmin o consola MySQL
-- =============================================

CREATE DATABASE IF NOT EXISTS restaurante_os CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurante_os;

-- =============================================
-- USUARIOS
-- =============================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin','camarero','cocinero','caja') NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- MESAS
-- =============================================
CREATE TABLE mesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero INT NOT NULL UNIQUE,
    estado ENUM('libre','ocupada','lista','pagando') DEFAULT 'libre',
    consumo_total DECIMAL(10,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- MENU ALMUERZO
-- =============================================
CREATE TABLE menu_almuerzo_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    precio DECIMAL(10,2) NOT NULL DEFAULT 20.00
);

CREATE TABLE menu_almuerzo_opciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria ENUM('sopa','segundo','postre') NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo TINYINT(1) DEFAULT 1
);

-- =============================================
-- MENU NOCHE
-- =============================================
CREATE TABLE menu_noche (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    activo TINYINT(1) DEFAULT 1
);

-- =============================================
-- BEBIDAS (aplica a ambos turnos)
-- =============================================
CREATE TABLE bebidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    activo TINYINT(1) DEFAULT 1
);

-- =============================================
-- PEDIDOS
-- =============================================
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id INT NOT NULL,
    estado ENUM('preparando','listo','entregado','pagado') DEFAULT 'preparando',
    turno ENUM('almuerzo','noche') NOT NULL,
    total DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
);

-- =============================================
-- ITEMS DE PEDIDO
-- =============================================
CREATE TABLE pedido_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'plato',
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- =============================================
-- VENTAS (historial de cobros)
-- =============================================
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    turno ENUM('almuerzo','noche') NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Usuarios (password = 1234, hasheado con bcrypt)
INSERT INTO usuarios (nombre, usuario, password, rol) VALUES
('Carlos Admin',    'admin',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('María Cocina',    'maria',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cocinero'),
('Luis Camarero',   'luis',     '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'camarero'),
('Ana Caja',        'ana',      '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'caja');

-- Mesas
INSERT INTO mesas (numero) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

-- Config almuerzo
INSERT INTO menu_almuerzo_config (precio) VALUES (20.00);

-- Opciones almuerzo
INSERT INTO menu_almuerzo_opciones (categoria, nombre) VALUES
('sopa',    'Sopa de maní'),
('sopa',    'Sopa de pollo'),
('sopa',    'Sopa de verduras'),
('segundo', 'Pollo al horno'),
('segundo', 'Milanesa'),
('segundo', 'Trucha frita'),
('postre',  'Gelatina'),
('postre',  'Flan'),
('postre',  'Helado');

-- Menú noche
INSERT INTO menu_noche (categoria, nombre, precio) VALUES
('Platos', 'Pizza',         45.00),
('Platos', 'Hamburguesa',   35.00),
('Platos', 'Salchipapa',    20.00),
('Platos', 'Anticucho',     30.00),
('Platos', 'Chicharrón',    40.00),
('Bebidas','Refresco',      10.00),
('Bebidas','Cerveza',       15.00),
('Bebidas','Jugo',           8.00),
('Bebidas','Vino copa',     25.00),
('Bebidas','Agua',           5.00);

-- Bebidas adicionales (almuerzo)
INSERT INTO bebidas (nombre, precio) VALUES
('Refresco',  5.00),
('Jugo',      5.00),
('Soda',      5.00),
('Agua',      3.00);
