<?php
// api/menu.php - Gestión de menús
require_once '../config/db.php';

header('Content-Type: application/json');
// El menú QR es público, el resto requiere auth

$action = $_GET['action'] ?? 'completo';
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// ---- MENU COMPLETO (para QR, público) ----
if ($action === 'completo') {
    $turno = getTurno();

    // Precio almuerzo
    $stmt = $pdo->query("SELECT precio FROM menu_almuerzo_config LIMIT 1");
    $config = $stmt->fetch();

    // Opciones almuerzo
    $stmt2 = $pdo->query("SELECT categoria, nombre FROM menu_almuerzo_opciones WHERE activo = 1 ORDER BY categoria, id");
    $opciones_raw = $stmt2->fetchAll();
    $opciones = ['sopa'=>[], 'segundo'=>[], 'postre'=>[]];
    foreach ($opciones_raw as $o) $opciones[$o['categoria']][] = $o['nombre'];

    // Bebidas
    $stmt3 = $pdo->query("SELECT id, nombre, precio FROM bebidas WHERE activo = 1");
    $bebidas = $stmt3->fetchAll();

    // Menú noche
    $stmt4 = $pdo->query("SELECT categoria, nombre, precio FROM menu_noche WHERE activo = 1 ORDER BY categoria, id");
    $noche_raw = $stmt4->fetchAll();
    $noche = [];
    foreach ($noche_raw as $n) {
        if (!isset($noche[$n['categoria']])) $noche[$n['categoria']] = [];
        $noche[$n['categoria']][] = ['nombre'=>$n['nombre'], 'precio'=>(float)$n['precio']];
    }
    $noche_formatted = [];
    foreach ($noche as $cat => $items) {
        $noche_formatted[] = ['categoria' => $cat, 'items' => $items];
    }

    jsonResponse([
        'turno'   => $turno,
        'almuerzo' => [
            'precio'   => (float)$config['precio'],
            'sopas'    => $opciones['sopa'],
            'segundos' => $opciones['segundo'],
            'postres'  => $opciones['postre'],
            'bebidas'  => $bebidas,
        ],
        'noche' => $noche_formatted,
    ]);
}

// ---- ACTUALIZAR PRECIO ALMUERZO ----
elseif ($action === 'precio_almuerzo' && $method === 'POST') {
    verificarRol('admin');
    $data   = json_decode(file_get_contents('php://input'), true);
    $precio = (float)($data['precio'] ?? 0);
    if ($precio <= 0) jsonResponse(['error' => 'Precio inválido'], 400);
    $pdo->prepare("UPDATE menu_almuerzo_config SET precio = ?")->execute([$precio]);
    jsonResponse(['success' => true]);
}

// ---- AGREGAR OPCIÓN ALMUERZO ----
elseif ($action === 'agregar_almuerzo' && $method === 'POST') {
    verificarRol('admin');
    $data      = json_decode(file_get_contents('php://input'), true);
    $categoria = $data['categoria'] ?? '';
    $nombre    = trim($data['nombre'] ?? '');
    if (!in_array($categoria, ['sopa','segundo','postre']) || !$nombre) jsonResponse(['error' => 'Datos inválidos'], 400);
    $pdo->prepare("INSERT INTO menu_almuerzo_opciones (categoria, nombre) VALUES (?,?)")->execute([$categoria, $nombre]);
    jsonResponse(['success' => true]);
}

// ---- ELIMINAR OPCIÓN ALMUERZO ----
elseif ($action === 'eliminar_almuerzo' && $method === 'POST') {
    verificarRol('admin');
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? 0);
    $pdo->prepare("UPDATE menu_almuerzo_opciones SET activo = 0 WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}

// ---- AGREGAR ITEM NOCHE ----
elseif ($action === 'agregar_noche' && $method === 'POST') {
    verificarRol('admin');
    $data      = json_decode(file_get_contents('php://input'), true);
    $categoria = trim($data['categoria'] ?? '');
    $nombre    = trim($data['nombre'] ?? '');
    $precio    = (float)($data['precio'] ?? 0);
    if (!$categoria || !$nombre || $precio <= 0) jsonResponse(['error' => 'Datos inválidos'], 400);
    $pdo->prepare("INSERT INTO menu_noche (categoria, nombre, precio) VALUES (?,?,?)")->execute([$categoria, $nombre, $precio]);
    jsonResponse(['success' => true]);
}

// ---- ACTUALIZAR ITEM NOCHE ----
elseif ($action === 'actualizar_noche' && $method === 'POST') {
    verificarRol('admin');
    $data   = json_decode(file_get_contents('php://input'), true);
    $id     = (int)($data['id'] ?? 0);
    $nombre = trim($data['nombre'] ?? '');
    $precio = (float)($data['precio'] ?? 0);
    $pdo->prepare("UPDATE menu_noche SET nombre = ?, precio = ? WHERE id = ?")->execute([$nombre, $precio, $id]);
    jsonResponse(['success' => true]);
}

// ---- ELIMINAR ITEM NOCHE ----
elseif ($action === 'eliminar_noche' && $method === 'POST') {
    verificarRol('admin');
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? 0);
    $pdo->prepare("UPDATE menu_noche SET activo = 0 WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}

// ---- AGREGAR BEBIDA ----
elseif ($action === 'agregar_bebida' && $method === 'POST') {
    verificarRol('admin');
    $data   = json_decode(file_get_contents('php://input'), true);
    $nombre = trim($data['nombre'] ?? '');
    $precio = (float)($data['precio'] ?? 0);
    if (!$nombre || $precio <= 0) jsonResponse(['error' => 'Datos inválidos'], 400);
    $pdo->prepare("INSERT INTO bebidas (nombre, precio) VALUES (?,?)")->execute([$nombre, $precio]);
    jsonResponse(['success' => true]);
}

else {
    jsonResponse(['error' => 'Acción no válida'], 400);
}
