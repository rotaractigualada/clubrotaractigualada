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
const TO_EMAIL       = 'rotaractigualada@gmail.com';
/* El remitent ha de ser una bústia del domini (Hostinger): si el correu
   sortís «de» una adreça de Gmail des d'aquest servidor, Gmail el marcaria
   com a spam o el rebutjaria. Les respostes van igualment a qui ha escrit
   (Reply-To) i les còpies, a TO_EMAIL. */
const FROM_EMAIL     = 'ayuda@rotaractigualada.org';
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
const SITE_URL          = 'https://rotaractigualada.org'; // per al logo i els enllaços del correu
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

/* Correu de notificació: versió HTML (amb el logo, les dades en targetes
   i botons per respondre) i versió de text pla per als programes que no
   mostren HTML. No porta signatura: en contestar s'hi afegeix la vostra. */
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
/* La IP no va al correu (no cal per respondre): només queda al CSV, per a l'antispam */
$body .= "\n---\nEnviat des de " . ($_SERVER['HTTP_HOST'] ?? 'web') . "\n";
$body .= "Per respondre, contesta aquest correu: anirà directament a {$email}.\n";

$html = email_html([
    'tipus'     => $tipus,
    'name'      => $name,
    'fullName'  => $fullName,
    'email'     => $email,
    'phone'     => $phone,
    'age'       => $age,
    'typeLabel' => $typeLabel,
    'recipient' => $recipientKey !== 'club' ? $recipient['label'] : '',
    'message'   => $message,
]);

$boundary = 'rotaract-' . bin2hex(random_bytes(12));
$mime  = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
$mime .= chunk_split(base64_encode($body));
$mime .= "--{$boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
$mime .= chunk_split(base64_encode($html));
$mime .= "--{$boundary}--\r\n";

$headers  = 'From: Web Rotaract Igualada <' . FROM_EMAIL . ">\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n";
/* Si el missatge és per a presidència o secretaria, el club en rep còpia */
if ($recipient['email'] !== TO_EMAIL) {
    $headers .= 'Cc: ' . TO_EMAIL . "\r\n";
}
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";

if (function_exists('mb_encode_mimeheader')) {
    $mailSubject = mb_encode_mimeheader($mailSubject, 'UTF-8');
}
$mailOk = @mail($recipient['email'], $mailSubject, $mime, $headers);

if (!$mailOk) {
    /* El missatge no s'ha perdut (queda al CSV), però cal avisar */
    respond(500, ['ok' => false, 'error' => 'mail']);
}

respond(200, ['ok' => true]);

/* ── Plantilla HTML del correu de notificació ────────────────────
   HTML pensat per a programes de correu (Gmail, Outlook, Apple Mail…):
   taules, estils en línia i el logo servit des de la web. Tot el que ha
   escrit la persona passa per h() abans d'entrar a l'HTML. */
function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Enllaç de WhatsApp per a mòbils espanyols (6xx/7xx) o números amb prefix internacional. */
function whatsapp_url(string $phone): string {
    $digits = preg_replace('/\D/', '', $phone);
    if (strlen($digits) === 9 && in_array($digits[0], ['6', '7'], true)) {
        $digits = '34' . $digits;
    } elseif (strpos(ltrim($phone), '+') === 0 || strpos($digits, '00') === 0) {
        $digits = ltrim($digits, '0');
    } else {
        return '';
    }
    return strlen($digits) >= 10 ? 'https://wa.me/' . $digits : '';
}

function email_html(array $d): string {
    $font  = "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif";
    $unir  = $d['tipus'] === 'unir';
    $first = $d['name'] !== '' ? $d['name'] : $d['fullName'];
    $when  = new DateTime('now', new DateTimeZone('Europe/Madrid'));

    $pill  = $unir ? 'Nova sol·licitud' : 'Nou missatge · ' . $d['typeLabel'];
    $title = $unir ? $d['fullName'] . ' vol unir-se al club' : 'Missatge de ' . $d['fullName'];
    $pre   = $unir
        ? $d['fullName'] . ' (' . $d['age'] . ' anys) vol formar part del Rotaract Igualada'
        : $d['typeLabel'] . ' de ' . $d['fullName'] . ($d['recipient'] !== '' ? ' per a ' . $d['recipient'] : '');

    // Files de dades (etiqueta → valor ja en HTML)
    $rows = [['Nom', h($d['fullName'])]];
    $rows[] = ['Correu', '<a href="mailto:' . h($d['email']) . '" style="color:#2f2f96;text-decoration:none;font-weight:700;">' . h($d['email']) . '</a>'];
    if ($d['phone'] !== '') {
        $tel = preg_replace('/[^0-9+]/', '', $d['phone']);
        $rows[] = ['Telèfon', '<a href="tel:' . h($tel) . '" style="color:#2f2f96;text-decoration:none;font-weight:700;">' . h($d['phone']) . '</a>'];
    }
    if ($unir) {
        $rows[] = ['Edat', h($d['age']) . ' anys'];
    } else {
        $rows[] = ['Motiu', h($d['typeLabel'])];
        $rows[] = ['Per a', $d['recipient'] !== '' ? h($d['recipient']) : 'General (club)'];
    }
    $rows[] = ['Rebut', $when->format('d/m/Y') . ' a les ' . $when->format('H:i')];

    $rowsHtml = '';
    foreach ($rows as $i => [$label, $value]) {
        $border = $i === count($rows) - 1 ? '' : 'border-bottom:1px solid #ece9f5;';
        $rowsHtml .= '<tr>'
            . '<td style="padding:11px 0;' . $border . 'width:96px;vertical-align:top;font-family:' . $font . ';font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a86a8;">' . $label . '</td>'
            . '<td style="padding:11px 0;' . $border . 'vertical-align:top;font-family:' . $font . ';font-size:15px;color:#1e1e3c;">' . $value . '</td>'
            . '</tr>';
    }

    // Botons: respondre (sempre), trucar i WhatsApp (si hi ha telèfon)
    $button = static function (string $href, string $label, bool $main) use ($font): string {
        $style = $main
            ? 'background:#da1a5d;color:#ffffff;border:1px solid #da1a5d;'
            : 'background:#ffffff;color:#2f2f96;border:1px solid #c9c6e6;';
        // inline-block: en pantalles estretes els botons passen a la línia següent
        return '<a href="' . h($href) . '" style="' . $style
            . 'display:inline-block;margin:0 6px 8px 0;padding:11px 18px;border-radius:999px;font-family:' . $font
            . ';font-size:14px;font-weight:700;text-decoration:none;white-space:nowrap;">' . $label . '</a>';
    };
    $replySubject = $unir ? 'Rotaract Igualada · La teva sol·licitud per unir-te al club' : 'Rotaract Igualada · Resposta al teu missatge';
    $reply = 'mailto:' . $d['email'] . '?subject=' . rawurlencode($replySubject);
    $buttons = $button($reply, '&#9993;&nbsp; Respondre a ' . h($first), true);
    if ($d['phone'] !== '') {
        $buttons .= $button('tel:' . preg_replace('/[^0-9+]/', '', $d['phone']), '&#9742;&nbsp; Trucar', false);
        $wa = whatsapp_url($d['phone']);
        if ($wa !== '') {
            $buttons .= $button($wa, 'WhatsApp', false);
        }
    }

    $messageLabel = $unir ? 'Per què vol formar part del club' : 'Missatge';
    $message = nl2br(h($d['message']), false);
    $logo = h(SITE_URL . '/logo-correu.png');
    $site = h(SITE_URL);
    $siteHost = h((string) parse_url(SITE_URL, PHP_URL_HOST));

    return '<!DOCTYPE html>
<html lang="ca">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>' . h($title) . '</title>
</head>
<body style="margin:0;padding:0;background:#f3f1f8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' . h($pre) . '</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f1f8" style="background:#f3f1f8;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6e2f2;">
<tr><td height="6" bgcolor="#da1a5d" style="height:6px;line-height:6px;font-size:0;background:#da1a5d;background-image:linear-gradient(90deg,#2f2f96,#da1a5d);">&nbsp;</td></tr>
<tr><td align="center" style="padding:28px 24px 8px;">
<a href="' . $site . '" style="text-decoration:none;"><img src="' . $logo . '" width="200" height="67" alt="Club Rotaract d&#39;Igualada" style="display:block;border:0;width:200px;height:auto;"></a>
</td></tr>
<tr><td style="padding:18px 32px 6px;font-family:' . $font . ';">
<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:#fde7ef;color:#da1a5d;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">' . h($pill) . '</span>
<h1 style="margin:14px 0 0;font-family:' . $font . ';font-size:24px;line-height:1.25;font-weight:800;color:#1e1e3c;">' . h($title) . '</h1>
</td></tr>
<tr><td style="padding:14px 32px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' . $rowsHtml . '</table>
</td></tr>
<tr><td style="padding:16px 32px 4px;">
<p style="margin:0 0 8px;font-family:' . $font . ';font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a86a8;">' . $messageLabel . '</p>
<div style="padding:16px 18px;background:#f7f5fc;border-left:4px solid #da1a5d;border-radius:10px;font-family:' . $font . ';font-size:15px;line-height:1.6;color:#1e1e3c;">' . $message . '</div>
</td></tr>
<tr><td style="padding:20px 26px 0;">' . $buttons . '</td></tr>
<tr><td style="padding:14px 32px 28px;font-family:' . $font . ';font-size:13px;line-height:1.55;color:#6b6889;">
Per respondre, també pots contestar directament aquest correu: anirà a <strong style="color:#1e1e3c;">' . h($d['email']) . '</strong>.
</td></tr>
<tr><td bgcolor="#1e1e3c" style="padding:16px 32px;background:#1e1e3c;font-family:' . $font . ';font-size:12px;color:#c9c6e6;" align="center">
Enviat des del formulari de <a href="' . $site . '" style="color:#ffffff;text-decoration:none;font-weight:700;">' . $siteHost . '</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>';
}
