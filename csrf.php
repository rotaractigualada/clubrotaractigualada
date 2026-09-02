<?php
/**
 * csrf.php — Rotaract Club Igualada
 * Genera un token CSRF de doble submissió i el desa en una cookie
 * HttpOnly + SameSite=Strict. El mateix token es retorna en JSON per
 * que form-handler.php el validi contra la cookie (hash_equals).
 *
 * Resposta: { "csrf": "<token>" }
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/* Entorns de desenvolupament local: php -S 127.0.0.1 */
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
if (in_array($_SERVER['HTTP_HOST'] ?? '', ['127.0.0.1:8765', 'localhost:8765'], true)) {
    $secure = false;
}

$existing = (string) ($_COOKIE['rotaract_csrf'] ?? '');
/* Reutilitza el token si encara és vàlid (estable per sessió);
   així múltiples pestanyes comparteixen token i cap enviament
   no fallarà pel fet que una pàgina recarregui csrf.php. */
if ($existing !== '' && preg_match('/^[a-f0-9]{64}$/D', $existing) === 1) {
    echo json_encode(['csrf' => $existing]);
    exit;
}

$token = bin2hex(random_bytes(32));

$ok = setcookie(
    'rotaract_csrf',
    $token,
    [
        'expires'  => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]
);

if (!$ok) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'csrf_cookie']);
    exit;
}

echo json_encode(['csrf' => $token]);