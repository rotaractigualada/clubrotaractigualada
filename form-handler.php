<?php
/**
 * form-handler.php — Rotaract Club Igualada
 * Rep els dos formularis de la pàgina Contacte («Escriu-nos»):
 *   - tipus=info  → demanar informació (dubte, proposta o altres)
 *   - tipus=unir  → sol·licitud per formar part del club
 * Envia el missatge per correu (mail()) i en desa una còpia a
 * form-data/submissions.csv (inaccessible per web, vegeu .htaccess).
 *
 * Respostes:
 *   - Si la petició demana JSON (Accept: application/json, ho fa
 *     correu.js) → { "ok": true } o { "ok": false, "error": "...", "fields": [...] }
 *   - Si no (navegador sense JavaScript, enviament normal del formulari)
 *     → redirecció 303 a contacte.html?enviat=ok|error|camps#escriu-nos.
 *     Així la pàgina mai no es queda en blanc.
 */
declare(strict_types=1);

/* ── CONFIGURACIÓ ────────────────────────────────────────────── */
const TO_EMAIL       = 'ayuda@rotaractigualada.org';
const FROM_EMAIL     = 'ayuda@rotaractigualada.org'; // bústia real del domini (Hostinger)
/* Destinataris que es poden triar al formulari d'informació. El formulari
   només envia la clau; l'adreça es decideix aquí (mai es llegeix una
   adreça de la petició). Clau desconeguda → club. */
const RECIPIENTS = [
    'club'        => ['email' => TO_EMAIL,                      'label' => 'General'],
    'presidencia' => ['email' => 'gerard.lopez@rotary2202.org', 'label' => 'Presidència'],
    'secretaria'  => ['email' => 'luca.santos@rotary2202.org',  'label' => 'Secretaria'],
];
const SUBJECTS          = ['dubte' => 'Dubte', 'proposta' => 'Proposta', 'altre' => 'Altres'];
const SUBJECT_PREFIX    = '[Web Rotaract] ';
const LOG_FILE          = __DIR__ . '/form-data/submissions.csv';
const MIN_INTERVAL_SECS = 30; // antispam: mínim de segons entre enviaments d'una mateixa IP
const MIN_FILL_SECS     = 3;  // antispam: menys temps omplint el formulari = bot

ini_set('display_errors', '0');

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: SAMEORIGIN');
header('Content-Security-Policy: default-src \'none\'; frame-ancestors \'self\'');

/** Respon i acaba: JSON per a correu.js o redirecció per a l'enviament normal. */
function respond(int $status, array $payload): void {
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
    $state = !empty($payload['ok']) ? 'ok' : (($payload['error'] ?? '') === 'fields' ? 'camps' : 'error');
    // Torna a la mateixa pàgina de contacte (també /es/ i /en/), mai a un altre domini
    $page = '/contacte.html';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($referer !== '' && parse_url($referer, PHP_URL_HOST) === parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) {
        $path = (string) parse_url($referer, PHP_URL_PATH);
        if (preg_match('#^/(?:(?:es|en)/)?contacte\.html$#', $path)) {
            $page = $path;
        }
    }
    $tipus = ($_POST['tipus'] ?? '') === 'unir' ? 'uneix-te' : 'escriu-nos';
    http_response_code(303);
    header('Location: ' . $page . '?enviat=' . $state . '#' . $tipus);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    $wantsJson = true;
    respond(405, ['ok' => false, 'error' => 'method']);
}

/* ── Només des d'aquesta mateixa web ──────────────────────────────
   Si el navegador indica d'on ve la petició (Origin o, si no n'hi ha,
   Referer), ha de ser el mateix domini. Bloqueja enviaments des d'altres
   webs sense dependre de cap cookie ni token (que era una de les coses
   que podien fallar). */
function same_host(string $url): bool {
    $host = parse_url($url, PHP_URL_HOST);
    $port = parse_url($url, PHP_URL_PORT);
    $value = ($host ?: '') . ($port ? ':' . $port : '');
    return $value !== '' && strcasecmp($value, $_SERVER['HTTP_HOST'] ?? '') === 0;
}
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
if (($origin !== '' && $origin !== 'null' && !same_host($origin)) || ($origin === '' && $referer !== '' && !same_host($referer))) {
    respond(403, ['ok' => false, 'error' => 'origin']);
}

/* Honeypot: si el camp ocult «website» ve omplert, és un bot.
   Respon èxit per no avisar-lo, però no processa res. */
if (!empty($_POST['website'])) {
    respond(200, ['ok' => true]);
}
/* Temps omplint el formulari (el posa correu.js): massa ràpid → bot */
$elapsed = $_POST['elapsed'] ?? '';
if ($elapsed !== '' && is_numeric($elapsed) && (float) $elapsed < MIN_FILL_SECS) {
    respond(200, ['ok' => true]);
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

/* Límit d'enviaments per IP (antispam) */
$rlDir  = __DIR__ . '/form-data/ratelimit';
$rlFile = $rlDir . '/' . md5($ip) . '.txt';
if (is_file($rlFile) && (time() - (int) file_get_contents($rlFile)) < MIN_INTERVAL_SECS) {
    respond(429, ['ok' => false, 'error' => 'rate']);
}

function cut(string $value, int $max): string {
    return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}
/** Text d'una sola línia: sense etiquetes ni salts de línia (evita injectar capçaleres). */
function clean_line(string $value, int $max): string {
    $value = trim(strip_tags($value));
    $value = str_replace(["\r", "\n", "\0"], ' ', $value);
    return cut($value, $max);
}

$tipus   = ($_POST['tipus'] ?? 'info') === 'unir' ? 'unir' : 'info';
$name    = clean_line((string) ($_POST['name'] ?? ''), 120);
$surname = clean_line((string) ($_POST['surname'] ?? ''), 120);
$email   = strtolower(clean_line((string) ($_POST['email'] ?? ''), 190));
$phone   = clean_line((string) ($_POST['phone'] ?? ''), 30);
$age     = clean_line((string) ($_POST['age'] ?? ''), 3);
$message = cut(trim(strip_tags((string) ($_POST['message'] ?? ''))), 2000);
$privacy = (string) ($_POST['privacy'] ?? '');

$errors = [];
if ($name === '')                               { $errors[] = 'name'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'email'; }
if ($message === '')                            { $errors[] = 'message'; }
if (!in_array($privacy, ['1', 'on', 'true', 'yes'], true)) { $errors[] = 'privacy'; }
if ($phone !== '' && !preg_match('/^[0-9+()\s.-]{6,30}$/', $phone)) { $errors[] = 'phone'; }

if ($tipus === 'info') {
    $subject = (string) ($_POST['subject'] ?? '');
    if (!array_key_exists($subject, SUBJECTS)) { $errors[] = 'subject'; }
    $recipientKey = (string) ($_POST['recipient'] ?? 'club');
    if (!array_key_exists($recipientKey, RECIPIENTS)) {
        $recipientKey = 'club';
    }
} else {
    $subject = '';
    $recipientKey = 'club'; // les sol·licituds per unir-se arriben sempre al club
    if (!ctype_digit($age) || (int) $age < 14 || (int) $age > 99) { $errors[] = 'age'; } // obligatòria
}
$recipient = RECIPIENTS[$recipientKey];

if ($errors) {
    respond(400, ['ok' => false, 'error' => 'fields', 'fields' => $errors]);
}

$fullName  = trim($name . ' ' . $surname);
$typeLabel = $tipus === 'unir' ? 'Uneix-te' : SUBJECTS[$subject];

/* Còpia de seguretat de totes les trameses (CSV) */
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
    $csvField($fullName),
    $csvField($email),
    $csvField($typeLabel),
    $csvField($message),
    $csvField($phone),
    $csvField($recipient['label']),
    $csvField($age),
]) . "\n";

if (!is_dir(dirname(LOG_FILE))) {
    @mkdir(dirname(LOG_FILE), 0755, true);
}
@file_put_contents(LOG_FILE, $csvLine, FILE_APPEND | LOCK_EX);

if (!is_dir($rlDir)) {
    @mkdir($rlDir, 0755, true);
}
@file_put_contents($rlFile, (string) time(), LOCK_EX);

/* Correu de notificació */
if ($tipus === 'unir') {
    $mailSubject = SUBJECT_PREFIX . 'Vull unir-me al club: ' . $fullName;
    $body  = "Nova sol·licitud per formar part del club\n\n";
    $body .= "Nom: {$fullName}\n";
    $body .= "Correu: {$email}\n";
    $body .= "Edat: {$age}\n";
    if ($phone !== '') { $body .= "Telèfon: {$phone}\n"; }
    $body .= "\nPer què vol formar part del club:\n{$message}\n";
} else {
    $mailSubject = SUBJECT_PREFIX . 'Informació: ' . $typeLabel
        . ($recipientKey !== 'club' ? ' (' . $recipient['label'] . ')' : '');
    $body  = "Nom: {$fullName}\n";
    $body .= "Correu: {$email}\n";
    $body .= "Motiu: {$typeLabel}\n";
    $body .= "Per a: {$recipient['label']} ({$recipient['email']})\n";
    $body .= "\nMissatge:\n{$message}\n";
}
$body .= "\n---\nEnviat des de " . ($_SERVER['HTTP_HOST'] ?? 'web') . " (IP: {$ip})\n";
$body .= "Per respondre, contesta aquest correu: anirà directament a {$email}.\n";

$headers  = 'From: Web Rotaract Igualada <' . FROM_EMAIL . ">\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n";
/* Si el missatge és per a presidència o secretaria, el club en rep còpia */
if ($recipient['email'] !== TO_EMAIL) {
    $headers .= 'Cc: ' . TO_EMAIL . "\r\n";
}
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

if (function_exists('mb_encode_mimeheader')) {
    $mailSubject = mb_encode_mimeheader($mailSubject, 'UTF-8');
}
$mailOk = @mail($recipient['email'], $mailSubject, $body, $headers);

if (!$mailOk) {
    /* El missatge no s'ha perdut (queda al CSV), però cal avisar */
    respond(500, ['ok' => false, 'error' => 'mail']);
}

respond(200, ['ok' => true]);
