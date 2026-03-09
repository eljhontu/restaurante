<?php
// api/mesas.php - CRUD de mesas
require_once '../config/db.php';

verificarAuth();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'listar';
$pdo    = getDB();

// ---- LISTAR MESAS ----
if ($action === 'listar') {
    $stmt = $pdo->query("
        SELECT m.*,
            (SELECT COUNT(*) FROM pedidos p WHERE p.mesa_id = m.id AND p.estado != 'pagado') as pedidos_activos
        FROM mesas m ORDER BY m.numero
    ");
    jsonResponse($stmt->fetchAll());
}

// ---- VER UNA MESA ----
elseif ($action === 'ver') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT * FROM mesas WHERE id = ?");
    $stmt->execute([$id]);
    $mesa = $stmt->fetch();
    if (!$mesa) jsonResponse(['error' => 'Mesa no encontrada'], 404);

    // Trae los pedidos activos de la mesa
    $stmt2 = $pdo->prepare("
        SELECT p.*, GROUP_CONCAT(pi.nombre SEPARATOR '||') as items_nombres,
               GROUP_CONCAT(pi.precio SEPARATOR '||') as items_precios
        FROM pedidos p
        LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
        WHERE p.mesa_id = ? AND p.estado != 'pagado'
        GROUP BY p.id
        ORDER BY p.created_at DESC
    ");
    $stmt2->execute([$id]);
    $pedidos = $stmt2->fetchAll();

    foreach ($pedidos as &$p) {
        $nombres  = explode('||', $p['items_nombres'] ?? '');
        $precios  = explode('||', $p['items_precios'] ?? '');
        $p['items'] = [];
        foreach ($nombres as $i => $n) {
            if ($n) $p['items'][] = ['nombre' => $n, 'precio' => (float)($precios[$i] ?? 0)];
        }
        unset($p['items_nombres'], $p['items_precios']);
    }

    $mesa['pedidos'] = $pedidos;
    jsonResponse($mesa);
}

// ---- CAMBIAR ESTADO ----
elseif ($action === 'estado' && $method === 'POST') {
    verificarRol('admin','camarero','caja');
    $data  = json_decode(file_get_contents('php://input'), true);
    $id    = (int)($data['id'] ?? 0);
    $estado = $data['estado'] ?? '';
    $estados_validos = ['libre','ocupada','lista','pagando'];
    if (!in_array($estado, $estados_validos)) jsonResponse(['error' => 'Estado no válido'], 400);

    $stmt = $pdo->prepare("UPDATE mesas SET estado = ? WHERE id = ?");
    $stmt->execute([$estado, $id]);
    jsonResponse(['success' => true]);
}

// ---- CREAR MESA ----
elseif ($action === 'crear' && $method === 'POST') {
    verificarRol('admin');
    $data   = json_decode(file_get_contents('php://input'), true);
    $numero = (int)($data['numero'] ?? 0);
    if ($numero <= 0) jsonResponse(['error' => 'Número de mesa inválido'], 400);
    $check = $pdo->prepare("SELECT id FROM mesas WHERE numero = ?");
    $check->execute([$numero]);
    if ($check->fetch()) jsonResponse(['error' => 'Ya existe una mesa con ese número'], 409);
    $pdo->prepare("INSERT INTO mesas (numero) VALUES (?)")->execute([$numero]);
    jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
}

// ---- ELIMINAR MESA ----
elseif ($action === 'eliminar' && $method === 'POST') {
    verificarRol('admin');
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? 0);
    // Verificar que no tenga pedidos activos
    $check = $pdo->prepare("SELECT COUNT(*) as c FROM pedidos WHERE mesa_id = ? AND estado != 'pagado'");
    $check->execute([$id]);
    if ((int)$check->fetch()['c'] > 0) jsonResponse(['error' => 'La mesa tiene pedidos activos, no se puede eliminar'], 400);
    $pdo->prepare("DELETE FROM mesas WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}

else {
    jsonResponse(['error' => 'Acción no válida'], 400);
}
