<?php
// api/upload.php — Subir imágenes de platos
require_once '../config/db.php';
verificarAuth();
verificarRol('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Método no válido'], 405);

$file = $_FILES['imagen'] ?? null;
if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(['error' => 'No se recibió ningún archivo'], 400);
}

// Validar tipo
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, $allowedTypes)) {
    jsonResponse(['error' => 'Solo se permiten imágenes JPG, PNG, WEBP o GIF'], 400);
}

// Validar tamaño (max 3MB)
if ($file['size'] > 3 * 1024 * 1024) {
    jsonResponse(['error' => 'La imagen no debe superar 3MB'], 400);
}

// Generar nombre único
$ext      = match($mime) {
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif',
};
$filename = uniqid('plato_', true) . '.' . $ext;
$destDir  = __DIR__ . '/../uploads/';
$destPath = $destDir . $filename;

if (!is_dir($destDir)) mkdir($destDir, 0755, true);

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    jsonResponse(['error' => 'Error al guardar la imagen'], 500);
}

// Devolver URL relativa
$url = 'uploads/' . $filename;
jsonResponse(['success' => true, 'url' => $url]);
