<?php
// api/platos.php — CRUD de platos y menú diario
require_once '../config/db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pdo    = getDB();

// ---- PÚBLICO: Menú completo para QR ----
if ($action === 'menu_qr') {
    $fecha    = date('Y-m-d');
    $horarios = getHorarios();

    // Verificar si hay menú planificado para hoy
    $stmt = $pdo->prepare("SELECT COUNT(*) as c FROM menu_dia WHERE fecha = ?");
    $stmt->execute([$fecha]);
    $hayPlan = (int)$stmt->fetch()['c'] > 0;

    if ($hayPlan) {
        // Traer platos planificados para hoy
        $stmt2 = $pdo->prepare("
            SELECT p.*, md.turno as turno_dia
            FROM menu_dia md
            JOIN platos p ON p.id = md.plato_id
            WHERE md.fecha = ? AND p.activo = 1
            ORDER BY p.categoria, p.nombre
        ");
        $stmt2->execute([$fecha]);
        $platosHoy = $stmt2->fetchAll();
    } else {
        // Sin plan → mostrar todos los activos
        $stmt2 = $pdo->query("SELECT * FROM platos WHERE activo = 1 ORDER BY categoria, nombre");
        $platosHoy = $stmt2->fetchAll();
        foreach ($platosHoy as &$p) {
            $p['turno_dia'] = in_array($p['categoria'], ['sopa','segundo','postre']) ? 'almuerzo' : 'noche';
        }
    }

    // Organizar por turno y categoría
    $almuerzo = ['sopas'=>[],'segundos'=>[],'postres'=>[],'bebidas'=>[]];
    $noche    = ['platos'=>[],'bebidas'=>[]];

    $stmtPrecio = $pdo->query("SELECT precio FROM config_almuerzo LIMIT 1");
    $precioAlmuerzo = (float)($stmtPrecio->fetch()['precio'] ?? 20);

    foreach ($platosHoy as $p) {
        $item = [
            'id'          => $p['id'],
            'nombre'      => $p['nombre'],
            'descripcion' => $p['descripcion'],
            'imagen_url'  => $p['imagen_url'],
            'precio'      => (float)$p['precio'],
            'agotado'     => (int)$p['agotado'],
            'categoria'   => $p['categoria'],
        ];
        $turno = $p['turno_dia'] ?? ($p['categoria'] === 'sopa' || $p['categoria'] === 'segundo' || $p['categoria'] === 'postre' ? 'almuerzo' : 'noche');

        if ($turno === 'almuerzo') {
            if ($p['categoria'] === 'sopa')     $almuerzo['sopas'][]   = $item;
            if ($p['categoria'] === 'segundo')  $almuerzo['segundos'][] = $item;
            if ($p['categoria'] === 'postre')   $almuerzo['postres'][] = $item;
            if ($p['categoria'] === 'bebida')   $almuerzo['bebidas'][] = $item;
        } else {
            if ($p['categoria'] === 'noche')  $noche['platos'][]  = $item;
            if ($p['categoria'] === 'bebida') $noche['bebidas'][] = $item;
        }
    }

    jsonResponse([
        'fecha'    => $fecha,
        'turno'    => getTurno(),
        'horarios' => $horarios,
        'almuerzo' => array_merge(['precio' => $precioAlmuerzo], $almuerzo),
        'noche'    => $noche,
    ]);
}

// ---- AUTENTICADO: Listar todos los platos ----
elseif ($action === 'listar') {
    verificarAuth();
    $cat  = $_GET['categoria'] ?? null;
    $sql  = "SELECT * FROM platos WHERE activo = 1";
    $params = [];
    if ($cat) { $sql .= " AND categoria = ?"; $params[] = $cat; }
    $sql .= " ORDER BY categoria, nombre";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

// ---- Crear plato ----
elseif ($action === 'crear' && $method === 'POST') {
    verificarAuth(); verificarRol('admin');
    $d = json_decode(file_get_contents('php://input'), true);
    $nombre      = trim($d['nombre']      ?? '');
    $descripcion = trim($d['descripcion'] ?? '');
    $imagen_url  = trim($d['imagen_url']  ?? '');
    $categoria   = $d['categoria'] ?? '';
    $precio      = (float)($d['precio']   ?? 0);
    if (!$nombre || !in_array($categoria, ['sopa','segundo','postre','noche','bebida']))
        jsonResponse(['error' => 'Datos inválidos'], 400);
    $pdo->prepare("INSERT INTO platos (nombre, descripcion, imagen_url, categoria, precio) VALUES (?,?,?,?,?)")
        ->execute([$nombre, $descripcion, $imagen_url, $categoria, $precio]);
    jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
}

// ---- Actualizar plato ----
elseif ($action === 'actualizar' && $method === 'POST') {
    verificarAuth(); verificarRol('admin','cocinero');
    $d = json_decode(file_get_contents('php://input'), true);
    $id = (int)($d['id'] ?? 0);

    // Cocinero solo puede cambiar agotado
    if ($_SESSION['rol'] === 'cocinero') {
        $agotado = isset($d['agotado']) ? (int)$d['agotado'] : null;
        if (!is_null($agotado))
            $pdo->prepare("UPDATE platos SET agotado=? WHERE id=?")->execute([$agotado, $id]);
        jsonResponse(['success' => true]);
    }

    // Admin puede editar todo
    $nombre      = trim($d['nombre']      ?? '');
    $descripcion = trim($d['descripcion'] ?? '');
    $imagen_url  = trim($d['imagen_url']  ?? '');
    $categoria   = $d['categoria'] ?? '';
    $precio      = (float)($d['precio']   ?? 0);
    $agotado     = (int)($d['agotado']    ?? 0);
    $pdo->prepare("UPDATE platos SET nombre=?, descripcion=?, imagen_url=?, categoria=?, precio=?, agotado=? WHERE id=?")
        ->execute([$nombre, $descripcion, $imagen_url, $categoria, $precio, $agotado, $id]);
    jsonResponse(['success' => true]);
}

// ---- Eliminar plato ----
elseif ($action === 'eliminar' && $method === 'POST') {
    verificarAuth(); verificarRol('admin');
    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($d['id'] ?? 0);
    $pdo->prepare("UPDATE platos SET activo=0 WHERE id=?")->execute([$id]);
    jsonResponse(['success' => true]);
}

// ---- Precio almuerzo ----
elseif ($action === 'precio_almuerzo' && $method === 'POST') {
    verificarAuth(); verificarRol('admin');
    $d      = json_decode(file_get_contents('php://input'), true);
    $precio = (float)($d['precio'] ?? 0);
    if ($precio <= 0) jsonResponse(['error' => 'Precio inválido'], 400);
    $pdo->prepare("UPDATE config_almuerzo SET precio=?")->execute([$precio]);
    jsonResponse(['success' => true]);
}

// ---- Menú del día: obtener ----
elseif ($action === 'menu_dia_get') {
    verificarAuth();
    $fecha = $_GET['fecha'] ?? date('Y-m-d');
    $stmt  = $pdo->prepare("
        SELECT md.*, p.nombre, p.categoria, p.imagen_url, p.precio, p.agotado
        FROM menu_dia md JOIN platos p ON p.id = md.plato_id
        WHERE md.fecha = ? ORDER BY p.categoria, p.nombre
    ");
    $stmt->execute([$fecha]);
    jsonResponse($stmt->fetchAll());
}

// ---- Menú del día: guardar ----
elseif ($action === 'menu_dia_set' && $method === 'POST') {
    verificarAuth(); verificarRol('admin');
    $d       = json_decode(file_get_contents('php://input'), true);
    $fecha   = $d['fecha']    ?? date('Y-m-d');
    $platos  = $d['platos']   ?? [];   // [{plato_id, turno}]

    $pdo->beginTransaction();
    try {
        $pdo->prepare("DELETE FROM menu_dia WHERE fecha=?")->execute([$fecha]);
        $ins = $pdo->prepare("INSERT INTO menu_dia (fecha, plato_id, turno) VALUES (?,?,?)");
        foreach ($platos as $p) $ins->execute([$fecha, (int)$p['plato_id'], $p['turno']]);
        $pdo->commit();
        jsonResponse(['success' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// ---- Menú semanal ----
elseif ($action === 'menu_semana') {
    verificarAuth();
    $stmt = $pdo->query("
        SELECT md.fecha, COUNT(*) as total
        FROM menu_dia md GROUP BY md.fecha
        ORDER BY md.fecha DESC LIMIT 14
    ");
    jsonResponse($stmt->fetchAll());
}

else jsonResponse(['error' => 'Acción no válida'], 400);
