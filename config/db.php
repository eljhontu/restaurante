<?php
// =============================================
// config/db.php - Configuración de Base de Datos
// =============================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'restaurante_os');
define('DB_USER', 'root');
define('DB_PASS', '');      // En XAMPP por defecto está vacío
define('DB_CHARSET', 'utf8mb4');

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Error de conexión a la base de datos: ' . $e->getMessage()]));
        }
    }
    return $pdo;
}

// Inicia sesión si no está iniciada
function iniciarSesion() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

// Verifica que el usuario esté logueado
function verificarAuth() {
    iniciarSesion();
    if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401);
        die(json_encode(['error' => 'No autenticado']));
    }
}

// Verifica rol específico
function verificarRol(...$roles) {
    iniciarSesion();
    if (!isset($_SESSION['rol']) || !in_array($_SESSION['rol'], $roles)) {
        http_response_code(403);
        die(json_encode(['error' => 'Sin permisos para esta acción']));
    }
}

// Respuesta JSON estándar
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Detecta turno según hora
function getTurno() {
    $hora = (int)date('H');
    if ($hora >= 11 && $hora < 16) return 'almuerzo';
    if ($hora >= 18 && $hora < 23) return 'noche';
    return 'cerrado';
}
