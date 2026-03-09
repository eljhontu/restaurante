-- =============================================
-- Base de Datos Completa 
-- =============================================
CREATE DATABASE IF NOT EXISTS restaurante_os CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurante_os;

-- =============================================
-- USUARIOS 
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    apellido    VARCHAR(100) DEFAULT '',
    telefono    VARCHAR(20)  DEFAULT '',
    usuario     VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    rol         ENUM('admin','camarero','cocinero','caja') NOT NULL,
    activo      TINYINT(1) DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- =============================================
-- PLATOS 
-- =============================================
CREATE TABLE IF NOT EXISTS platos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    descripcion TEXT,
    imagen_url  VARCHAR(500) DEFAULT '',
    categoria   ENUM('sopa','segundo','postre','noche','bebida') NOT NULL,
    precio      DECIMAL(10,2) DEFAULT 0.00,
    activo      TINYINT(1) DEFAULT 1,
    agotado     TINYINT(1) DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PRECIO ALMUERZO 
-- =============================================
CREATE TABLE IF NOT EXISTS config_almuerzo (
    id     INT AUTO_INCREMENT PRIMARY KEY,
    precio DECIMAL(10,2) NOT NULL DEFAULT 20.00
);

-- =============================================
-- MENÚ POR DÍA (planificación semanal)
-- =============================================
CREATE TABLE IF NOT EXISTS menu_dia (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    fecha    DATE NOT NULL,
    plato_id INT NOT NULL,
    turno    ENUM('almuerzo','noche') NOT NULL,
    UNIQUE KEY unique_dia_plato (fecha, plato_id),
    FOREIGN KEY (plato_id) REFERENCES platos(id) ON DELETE CASCADE
);

-- =============================================
-- MESAS 
-- =============================================
CREATE TABLE IF NOT EXISTS mesas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    numero        INT NOT NULL UNIQUE,
    estado        ENUM('libre','ocupada','lista','pagando') DEFAULT 'libre',
    consumo_total DECIMAL(10,2) DEFAULT 0.00,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- PEDIDOS
-- =============================================
CREATE TABLE IF NOT EXISTS pedidos (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id    INT NOT NULL,
    estado     ENUM('preparando','listo','entregado','pagado') DEFAULT 'preparando',
    turno      ENUM('almuerzo','noche') NOT NULL,
    total      DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
);

-- =============================================
-- ITEMS DE PEDIDO
-- =============================================
CREATE TABLE IF NOT EXISTS pedido_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id  INT NOT NULL,
    nombre     VARCHAR(150) NOT NULL,
    precio     DECIMAL(10,2) NOT NULL,
    tipo       VARCHAR(50) DEFAULT 'plato',
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- =============================================
-- VENTAS
-- =============================================
CREATE TABLE IF NOT EXISTS ventas (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id    INT NOT NULL,
    total      DECIMAL(10,2) NOT NULL,
    turno      ENUM('almuerzo','noche') NOT NULL,
    fecha      DATE NOT NULL,
    hora       TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Config almuerzo
INSERT INTO config_almuerzo (precio) VALUES (20.00);

-- Mesas
INSERT INTO mesas (numero) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

-- Platos (sopas)
INSERT INTO platos (nombre, descripcion, imagen_url, categoria, precio) VALUES
('Sopa de maní',     'Sopa cremosa de maní con verduras frescas y papas cocidas',      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', 'sopa',    0.00),
('Sopa de pollo',    'Caldo de pollo casero con fideos, zanahorias y hierbas aromáticas','https://images.unsplash.com/photo-1602473341776-060eb0cd6af8?w=400', 'sopa',    0.00),
('Sopa de verduras', 'Sopa ligera con vegetales de temporada y especias naturales',     'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', 'sopa',    0.00),
-- Segundos
('Pollo al horno',   'Pollo al horno marinado con hierbas, acompañado de arroz y ensalada', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c1?w=400', 'segundo', 0.00),
('Milanesa',         'Milanesa de res empanizada crujiente con papas fritas y ensalada',     'https://images.unsplash.com/photo-1560717845-968823efbee1?w=400', 'segundo', 0.00),
('Trucha frita',     'Trucha fresca frita a la sartén con limón y guarnición de arroz',      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400', 'segundo', 0.00),
-- Postres
('Gelatina',         'Gelatina casera de frutas tropicales con crema',                   'https://images.unsplash.com/photo-1571066811602-716837d681de?w=400', 'postre',  0.00),
('Flan',             'Flan de vainilla artesanal bañado en caramelo líquido',            'https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=400', 'postre',  0.00),
('Helado',           'Helado artesanal de vainilla con topping de chocolate',             'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400', 'postre',  0.00),
-- Platos noche
('Pizza',            'Pizza artesanal con masa delgada, salsa de tomate y mozzarella', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', 'noche',   45.00),
('Hamburguesa',      'Hamburguesa de res 200g con lechuga, tomate, queso y papas',     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', 'noche',   35.00),
('Salchipapa',       'Salchichas parrilleras con papas fritas crujientes y salsas',    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 'noche',   20.00),
('Anticucho',        'Anticuchos de corazón de res a la brasa con maíz y ají',         'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400', 'noche',   30.00),
('Chicharrón',       'Chicharrón de cerdo crocante acompañado de mote y llajwa',       'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', 'noche',   40.00),
-- Bebidas
('Refresco',         'Bebida gaseosa fría a elección (Coca-Cola, Pepsi, Fanta)',        'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', 'bebida',   5.00),
('Jugo natural',     'Jugo de frutas naturales del día (naranja, mango o maracuyá)',   'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=400', 'bebida',   5.00),
('Cerveza',          'Cerveza nacional fría en botella de 600ml',                       'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=400', 'bebida',  15.00),
('Agua mineral',     'Agua mineral sin gas en botella individual 500ml',               'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400', 'bebida',   3.00);


INSERT INTO usuarios (nombre, apellido, telefono, usuario, password, rol) VALUES
('Carlos',  'Mamani',  '70012345', 'admin',  'CAMBIAR', 'admin'),
('María',   'Flores',  '71023456', 'maria',  'CAMBIAR', 'cocinero'),
('Luis',    'Quispe',  '72034567', 'luis',   'CAMBIAR', 'camarero'),
('Ana',     'Condori', '73045678', 'ana',    'CAMBIAR', 'caja');
