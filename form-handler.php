<?php
/**
 * form-handler.php — Rotaract Club Igualada
 * Backend dels formularis de contacte (index.html i contacte.html).
 * Envia el missatge per correu (mail()) i en guarda una còpia a form-data/submissions.csv.
 * Respon JSON: { "ok": true } o { "ok": false, "error": "..." }
 */
declare(strict_types=1);

/* ── CONFIGURACIÓ ──────────────────────────────────────────────
   CANVIA aquestes constants abans de publicar si cal:
   TO_EMAIL    → correu on vols rebre els missatges del formulari.
   FROM_EMAIL  → remitent; molts hostings exigeixen que sigui un
                 correu del mateix domini (web@el-teu-domini).      */
const TO_EMAIL          = 'rotaractigualada@gmail.com';
const FROM_EMAIL        = 'web@rotaractigualada.org';
const SUBJECT_PREFIX    = '[Web Rotaract] ';
const LOG_FILE          = __DIR__ . '/form-data/submissions.csv';
const MIN_INTERVAL_SECS = 30;      // antispam: mínim de segons entre enviaments d'una mateixa IP

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function json_out(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

/* Honeypot: si el camp ocult «website» ve omplert, és un bot.
   Respon èxit per no avisar-lo, però no processa res. */
if (!empty($_POST['website'])) {
    json_out(200, ['ok' => true]);
}

/* Límit d'enviaments per IP (antispam) */
$rlDir  = __DIR__ . '/form-data/ratelimit';
$rlFile = $rlDir . '/' . md5($ip) . '.txt';
if (is_file($rlFile) && (time() - (int) file_get_contents($rlFile)) < MIN_INTERVAL_SECS) {
    json_out(429, ['ok' => false, 'error' => 'Too many requests. Try again in a moment.']);
}

function clean_text(string $value, int $max): string {
    $value = trim(strip_tags($value));
    $value = str_replace(["\r", "\n", "\0"], ' ', $value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

$name    = clean_text($_POST['name'] ?? '', 120);
$email   = strtolower(clean_text($_POST['email'] ?? '', 190));
$subject = clean_text($_POST['subject'] ?? '', 60);
$message = trim(strip_tags($_POST['message'] ?? ''));
if (function_exists('mb_substr')) {
    $message = mb_substr($message, 0, 2000);
} else {
    $message = substr($message, 0, 2000);
}
$privacy = (string) ($_POST['privacy'] ?? '');

$errors = [];
if ($name === '')                                  { $errors[] = 'name'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL))    { $errors[] = 'email'; }

$allowedSubjects = ['voluntariat', 'col·laboracio', 'unir-me', 'premsa', 'altre'];
if ($subject === '' || !in_array($subject, $allowedSubjects, true)) { $errors[] = 'subject'; }

if ($message === '') { $errors[] = 'message'; }
if (!in_array($privacy, ['1', 'on', 'true', 'yes'], true)) { $errors[] = 'privacy'; }

if ($errors) {
    json_out(400, ['ok' => false, 'error' => 'Invalid fields', 'fields' => $errors]);
}

/* Còpia de seguretat de totes les trameses (CSV) */
$subjectLabels = [
    'voluntariat'    => 'Voluntariat',
    'col·laboracio'  => 'Col·laboració',
    'unir-me'        => 'Unir-me al club',
    'premsa'         => 'Premsa',
    'altre'          => 'Altre',
];
$subjectLabel = $subjectLabels[$subject] ?? $subject;

$csvField = static function (string $v): string {
    /* Protecció davant injecció de fórmules: si el camp comença per
       = + - @ (o tabulador/salt de línia), Excel l'interpretaria com a
       fórmula en obrir el CSV. S'hi afegeix una cometa simple al davant. */
    if ($v !== '' && strpbrk($v[0], "=+-@\t\r") !== false) {
        $v = "'" . $v;
    }
    return '"' . str_replace('"', '""', $v) . '"';
};
$csvLine = implode(';', [
    date('c'),
    $ip,
    $csvField($name),
    $csvField($email),
    $csvField($subjectLabel),
    $csvField($message),
]) . "\n";

if (!is_dir(dirname(LOG_FILE))) {
    @mkdir(dirname(LOG_FILE), 0755, true);
}
@file_put_contents(LOG_FILE, $csvLine, FILE_APPEND | LOCK_EX);

/* Límits d'antispam: registra l'instant de l'últim enviament */
if (!is_dir($rlDir)) {
    @mkdir($rlDir, 0755, true);
}
@file_put_contents($rlFile, (string) time(), LOCK_EX);

/* Correu de notificació */
$body  = "Nom: {$name}\n";
$body .= "Correu: {$email}\n";
$body .= "Assumpte: {$subjectLabel}\n";
$body .= "\nMissatge:\n{$message}\n";
$body .= "\n---\nEnviat des de " . ($_SERVER['HTTP_HOST'] ?? 'web') . " (IP: {$ip})\n";

$headers  = 'From: ' . FROM_EMAIL . "\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n";
$headers .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
$headers .= 'X-Mailer: PHP/' . phpversion() . "\r\n";

$mailOk = @mail(TO_EMAIL, SUBJECT_PREFIX . 'Contacte: ' . $subjectLabel, $body, $headers);

if (!$mailOk) {
    /* El missatge no s'ha perdut (queda al CSV), però cal avisar */
    json_out(500, ['ok' => false, 'error' => 'mail']);
}

json_out(200, ['ok' => true]);