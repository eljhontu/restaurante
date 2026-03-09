<?php
// config/db.php
date_default_timezone_set('America/La_Paz'); // Bolivia UTC-4

define('DB_HOST',    'localhost');
define('DB_NAME',    'restaurante_os');
define('DB_USER',    'root');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=".DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Error BD: ' . $e->getMessage()]));
        }
    }
    return $pdo;
}

function iniciarSesion(): void {
    if (session_status() === PHP_SESSION_NONE) session_start();
}

function verificarAuth(): void {
    iniciarSesion();
    if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401);
        die(json_encode(['error' => 'No autenticado']));
    }
}

function verificarRol(string ...$roles): void {
    iniciarSesion();
    if (!isset($_SESSION['rol']) || !in_array($_SESSION['rol'], $roles)) {
        http_response_code(403);
        die(json_encode(['error' => 'Sin permisos']));
    }
}

function jsonResponse(mixed $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Lee horarios desde DB (con fallback si la tabla no existe aún)
function getHorarios(): array {
    return [
        'almuerzo' => ['hora_inicio' => 11, 'hora_fin' => 16],
        'noche'    => ['hora_inicio' => 18, 'hora_fin' => 23],
    ];
}

function getTurno(): string {
    $hora = (int)date('H');
    // Sin restricción de horario: de 0-16 es almuerzo, de 17-23 es noche
    return ($hora < 17) ? 'almuerzo' : 'noche';
}
