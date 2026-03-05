<?php
// api/reportes.php - Reportes para administrador
require_once '../config/db.php';

verificarAuth();
verificarRol('admin');
header('Content-Type: application/json');

$pdo    = getDB();
$action = $_GET['action'] ?? 'resumen';

// ---- RESUMEN DEL DÍA ----
if ($action === 'resumen') {
    $fecha = $_GET['fecha'] ?? date('Y-m-d');

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(total),0) as total, COUNT(*) as ventas FROM ventas WHERE fecha = ?");
    $stmt->execute([$fecha]);
    $dia = $stmt->fetch();

    $stmt2 = $pdo->prepare("SELECT COALESCE(SUM(total),0) as total, COUNT(*) as ventas FROM ventas WHERE turno='almuerzo' AND fecha=?");
    $stmt2->execute([$fecha]);
    $almuerzo = $stmt2->fetch();

    $stmt3 = $pdo->prepare("SELECT COALESCE(SUM(total),0) as total, COUNT(*) as ventas FROM ventas WHERE turno='noche' AND fecha=?");
    $stmt3->execute([$fecha]);
    $noche = $stmt3->fetch();

    $mesasActivas = $pdo->query("SELECT COUNT(*) as c FROM mesas WHERE estado != 'libre'")->fetch()['c'];

    jsonResponse([
        'fecha'         => $fecha,
        'total_dia'     => (float)$dia['total'],
        'ventas_dia'    => (int)$dia['ventas'],
        'almuerzo'      => ['total' => (float)$almuerzo['total'], 'ventas' => (int)$almuerzo['ventas']],
        'noche'         => ['total' => (float)$noche['total'],    'ventas' => (int)$noche['ventas']],
        'mesas_activas' => (int)$mesasActivas,
    ]);
}

// ---- PLATOS MÁS VENDIDOS ----
elseif ($action === 'platos') {
    $desde = $_GET['desde'] ?? date('Y-m-d', strtotime('-30 days'));
    $hasta = $_GET['hasta'] ?? date('Y-m-d');

    $stmt = $pdo->prepare("
        SELECT pi.nombre, COUNT(*) as cantidad, SUM(pi.precio) as total
        FROM pedido_items pi
        JOIN pedidos p ON p.id = pi.pedido_id
        WHERE p.estado = 'pagado' AND DATE(p.created_at) BETWEEN ? AND ?
          AND pi.tipo != 'bebida'
        GROUP BY pi.nombre
        ORDER BY cantidad DESC
        LIMIT 10
    ");
    $stmt->execute([$desde, $hasta]);
    jsonResponse($stmt->fetchAll());
}

// ---- BEBIDAS MÁS VENDIDAS ----
elseif ($action === 'bebidas') {
    $desde = $_GET['desde'] ?? date('Y-m-d', strtotime('-30 days'));
    $hasta = $_GET['hasta'] ?? date('Y-m-d');

    $stmt = $pdo->prepare("
        SELECT pi.nombre, COUNT(*) as cantidad, SUM(pi.precio) as total
        FROM pedido_items pi
        JOIN pedidos p ON p.id = pi.pedido_id
        WHERE p.estado = 'pagado' AND DATE(p.created_at) BETWEEN ? AND ?
          AND pi.tipo = 'bebida'
        GROUP BY pi.nombre
        ORDER BY cantidad DESC
        LIMIT 10
    ");
    $stmt->execute([$desde, $hasta]);
    jsonResponse($stmt->fetchAll());
}

// ---- VENTAS POR PERÍODO ----
elseif ($action === 'periodo') {
    $tipo  = $_GET['tipo'] ?? 'semana'; // dia, semana, mes
    $desde = match($tipo) {
        'dia'   => date('Y-m-d'),
        'semana'=> date('Y-m-d', strtotime('-7 days')),
        'mes'   => date('Y-m-d', strtotime('-30 days')),
        default => date('Y-m-d', strtotime('-7 days')),
    };

    $stmt = $pdo->prepare("
        SELECT fecha, turno, SUM(total) as total, COUNT(*) as ventas
        FROM ventas WHERE fecha >= ?
        GROUP BY fecha, turno
        ORDER BY fecha DESC, turno
    ");
    $stmt->execute([$desde]);
    jsonResponse($stmt->fetchAll());
}

else {
    jsonResponse(['error' => 'Acción no válida'], 400);
}
