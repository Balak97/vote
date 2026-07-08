<?php
/**
 * Proxy PHP Walata Vote — O2Switch
 * Route les appels /api/* vers api.vote.cantic-mali.com
 */

$apiOrigin = 'https://api.vote.cantic-mali.com';
$path = isset($_GET['walata_path']) ? (string) $_GET['walata_path'] : '';

if ($path === '' || strpos($path, '..') !== false) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['detail' => 'Chemin proxy invalide']);
    exit;
}

if (strpos($path, 'uploads/') === 0) {
    $target = $apiOrigin . '/' . $path;
} else {
    $target = $apiOrigin . '/api/' . $path;
}

$query = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
if ($query !== '') {
    parse_str($query, $params);
    unset($params['walata_path']);
    if (!empty($params)) {
        $target .= '?' . http_build_query($params);
    }
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['detail' => 'Extension PHP curl manquante sur le serveur']);
    exit;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

$headers = [];
$contentType = '';
if (!empty($_SERVER['CONTENT_TYPE'])) {
    $contentType = $_SERVER['CONTENT_TYPE'];
} elseif (!empty($_SERVER['HTTP_CONTENT_TYPE'])) {
    $contentType = $_SERVER['HTTP_CONTENT_TYPE'];
}

if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
}

$isMultipart = stripos($contentType, 'multipart/form-data') !== false;
$postFields = null;
$body = null;

if ($isMultipart) {
    // php://input est vide pour multipart — reconstruire via $_POST / $_FILES
    $postFields = array();
    foreach ($_POST as $key => $value) {
        $postFields[$key] = $value;
    }
    foreach ($_FILES as $key => $file) {
        if (!isset($file['tmp_name'], $file['error'])) {
            continue;
        }
        if ($file['error'] === UPLOAD_ERR_OK && is_uploaded_file($file['tmp_name'])) {
            $mime = !empty($file['type']) ? $file['type'] : 'application/octet-stream';
            $name = !empty($file['name']) ? $file['name'] : 'upload.bin';
            if (class_exists('CURLFile')) {
                $postFields[$key] = new CURLFile($file['tmp_name'], $mime, $name);
            } else {
                $postFields[$key] = '@' . $file['tmp_name'] . ';filename=' . $name;
            }
        }
    }
} else {
    if ($contentType !== '') {
        $headers[] = 'Content-Type: ' . $contentType;
    }
    if (in_array($method, array('POST', 'PUT', 'PATCH', 'DELETE'), true)) {
        $body = file_get_contents('php://input');
    }
}

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if ($postFields !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
} elseif ($body !== null && $body !== '') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('detail' => 'Impossible de joindre api.vote.cantic-mali.com'));
    curl_close($ch);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

http_response_code($status);

foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0) {
        continue;
    }
    if (stripos($line, 'Content-Type:') === 0) {
        header($line, false);
    }
}

echo $responseBody;
