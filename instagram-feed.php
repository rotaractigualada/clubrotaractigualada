<?php
/**
 * instagram-feed.php — Últimes publicacions d'Instagram per a la portada.
 *
 * Funciona només quan hi ha un token de l'API d'Instagram (vegeu el README,
 * «Instagram automàtic»):
 *   - El token es desa a form-data/instagram-token.txt (inaccessible per web).
 *   - Demana a Instagram el perfil i les 6 últimes publicacions com a màxim
 *     un cop cada hora; la resta de visites reben la còpia desada.
 *   - Les imatges es baixen i es redueixen a instagram/auto/, de manera que
 *     els visitants no es connecten mai a Instagram.
 *   - Renova el token tot sol (dura 60 dies) cada setmana.
 * Si no està configurat o Instagram falla sense cap còpia desada, respon 204
 * i la portada continua mostrant les targetes fixes de l'HTML.
 */

declare(strict_types=1);

const IG_DATA_DIR   = __DIR__ . '/form-data/instagram';
const IG_TOKEN_FILE = __DIR__ . '/form-data/instagram-token.txt';
const IG_STATE_FILE = IG_DATA_DIR . '/estat.json';
const IG_LOCK_FILE  = IG_DATA_DIR . '/.lock';
const IG_IMG_DIR    = __DIR__ . '/instagram/auto';
const IG_IMG_URL    = 'instagram/auto/';
const IG_POSTS      = 6;
const IG_MAX_AGE    = 3600;        // 1 hora entre consultes a Instagram
const IG_RETRY      = 600;         // si Instagram falla, torna-ho a provar en 10 minuts
const IG_REFRESH    = 7 * 86400;   // renova el token cada setmana
const IG_IMG_SIZE   = 640;         // costat de les miniatures (px)
const IG_IMG_MAX    = 8 * 1024 * 1024;

// Adreça de l'API. Els tests la canvien per un servidor de proves.
function ig_api(): string
{
    $base = getenv('RT_IG_API');
    return $base ? rtrim($base, '/') : 'https://graph.instagram.com';
}

function ig_respond(int $code, ?array $data = null): void
{
    http_response_code($code);
    header('Cache-Control: public, max-age=600');
    if ($data !== null) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    exit;
}

function ig_get(string $url, int $max = 2 * 1024 * 1024): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_USERAGENT      => 'RotaractIgualada-web/1.0',
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        if (PHP_VERSION_ID < 80000) curl_close($ch);
        if (!is_string($body) || $code !== 200 || strlen($body) > $max) return null;
        return $body;
    }
    $ctx = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true, 'user_agent' => 'RotaractIgualada-web/1.0']]);
    $body = @file_get_contents($url, false, $ctx, 0, $max + 1);
    $status = isset($http_response_header[0]) ? $http_response_header[0] : '';
    if (!is_string($body) || !preg_match('#^HTTP/\S+ 200\b#', $status) || strlen($body) > $max) return null;
    return $body;
}

function ig_json(string $path, array $params): ?array
{
    $body = ig_get(ig_api() . $path . '?' . http_build_query($params));
    if ($body === null) return null;
    $data = json_decode($body, true);
    return is_array($data) && !isset($data['error']) ? $data : null;
}

// Les imatges només es baixen per HTTPS (o del servidor de proves)
function ig_image_url_ok(string $url): bool
{
    if (getenv('RT_IG_API') && strpos($url, ig_api() . '/') === 0) return true;
    return (bool) preg_match('#^https://[a-z0-9.-]+/#i', $url);
}

// Baixa una imatge i la desa com a JPEG quadrat de IG_IMG_SIZE px
function ig_save_image(string $url, string $file): bool
{
    if (!ig_image_url_ok($url)) return false;
    $raw = ig_get($url, IG_IMG_MAX);
    if ($raw === null) return false;
    $info = @getimagesizefromstring($raw);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) return false;
    $tmp = $file . '.tmp';
    if (function_exists('imagecreatefromstring') && ($src = @imagecreatefromstring($raw))) {
        $w = imagesx($src);
        $h = imagesy($src);
        $side = min($w, $h);
        $size = min(IG_IMG_SIZE, $side);
        $dst = imagecreatetruecolor($size, $size);
        imagecopyresampled($dst, $src, 0, 0, (int) (($w - $side) / 2), (int) (($h - $side) / 2), $size, $size, $side, $side);
        imageinterlace($dst, true);
        $ok = imagejpeg($dst, $tmp, 82);
        if (PHP_VERSION_ID < 80000) { imagedestroy($src); imagedestroy($dst); }
        if (!$ok) return false;
    } elseif ($info[2] === IMAGETYPE_JPEG) {
        if (file_put_contents($tmp, $raw) === false) return false;
    } else {
        return false;
    }
    return rename($tmp, $file);
}

function ig_load_state(): array
{
    $s = is_file(IG_STATE_FILE) ? json_decode((string) file_get_contents(IG_STATE_FILE), true) : null;
    return is_array($s) ? $s : [];
}

function ig_save_state(array $state): void
{
    $tmp = IG_STATE_FILE . '.tmp';
    file_put_contents($tmp, json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    rename($tmp, IG_STATE_FILE);
}

function ig_public(array $state): ?array
{
    if (empty($state['posts'])) return null;
    return ['profile' => $state['profile'] ?? null, 'posts' => $state['posts']];
}

function ig_caption(?string $text): string
{
    $text = trim(preg_replace('/\s+/u', ' ', (string) $text));
    if (function_exists('mb_strlen') && mb_strlen($text) > 140) {
        $text = rtrim(mb_substr($text, 0, 139)) . '…';
    } elseif (strlen($text) > 140) {
        $text = rtrim(substr($text, 0, 139)) . '…';
    }
    return $text;
}

// Consulta Instagram i actualitza l'estat (perfil, publicacions i imatges)
function ig_update(array $state, string $token): array
{
    $now = time();

    // Renovació setmanal del token (un token ha de tenir com a mínim 24 h)
    $since = (int) ($state['token_desde'] ?? 0);
    if ($since === 0) {
        $state['token_desde'] = $now;
    } elseif ($now - $since > IG_REFRESH) {
        $r = ig_json('/refresh_access_token', ['grant_type' => 'ig_refresh_token', 'access_token' => $token]);
        if ($r && !empty($r['access_token']) && preg_match('/^[A-Za-z0-9._-]{20,}$/', $r['access_token'])) {
            $token = $r['access_token'];
            file_put_contents(IG_TOKEN_FILE, $token . "\n", LOCK_EX);
            $state['token_desde'] = $now;
        }
    }

    $media = ig_json('/me/media', [
        'fields'       => 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
        'limit'        => IG_POSTS,
        'access_token' => $token,
    ]);
    if (!$media || !isset($media['data']) || !is_array($media['data'])) {
        $state['error'] = $now;
        return $state;
    }

    if (!is_dir(IG_IMG_DIR)) @mkdir(IG_IMG_DIR, 0755, true);
    $posts = [];
    foreach (array_slice($media['data'], 0, IG_POSTS) as $m) {
        $id = isset($m['id']) ? (string) $m['id'] : '';
        $link = isset($m['permalink']) ? (string) $m['permalink'] : '';
        if (!preg_match('/^\d{1,30}$/', $id) || !preg_match('#^https://www\.instagram\.com/[A-Za-z0-9_./-]+$#', $link)) continue;
        $type = isset($m['media_type']) ? (string) $m['media_type'] : 'IMAGE';
        $src = $type === 'VIDEO' ? ($m['thumbnail_url'] ?? '') : ($m['media_url'] ?? '');
        $file = IG_IMG_DIR . '/' . $id . '.jpg';
        if (!is_file($file) && !ig_save_image((string) $src, $file)) continue;
        $posts[] = [
            'url'     => $link,
            'img'     => IG_IMG_URL . $id . '.jpg',
            'caption' => ig_caption($m['caption'] ?? ''),
            'date'    => isset($m['timestamp']) ? (string) $m['timestamp'] : '',
            'type'    => $type === 'CAROUSEL_ALBUM' ? 'carrusel' : ($type === 'VIDEO' ? 'video' : 'foto'),
        ];
    }
    if (!$posts) {
        $state['error'] = $now;
        return $state;
    }

    $me = ig_json('/me', ['fields' => 'username,media_count,followers_count', 'access_token' => $token]);
    $profile = null;
    if ($me) {
        $profile = [
            'username'  => isset($me['username']) && preg_match('/^[A-Za-z0-9._]{1,30}$/', (string) $me['username']) ? (string) $me['username'] : null,
            'posts'     => isset($me['media_count']) ? (int) $me['media_count'] : null,
            'followers' => isset($me['followers_count']) ? (int) $me['followers_count'] : null,
        ];
    }

    // Esborra les miniatures que ja no surten
    $keep = array_map(function ($p) { return basename($p['img']); }, $posts);
    foreach (glob(IG_IMG_DIR . '/*.jpg') ?: [] as $old) {
        if (!in_array(basename($old), $keep, true)) @unlink($old);
    }

    $state['posts'] = $posts;
    $state['profile'] = $profile ?? ($state['profile'] ?? null);
    $state['actualitzat'] = $now;
    unset($state['error']);
    return $state;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    ig_respond(405);
}

$token = is_file(IG_TOKEN_FILE) ? trim((string) file_get_contents(IG_TOKEN_FILE)) : '';
if ($token === '' || !preg_match('/^[A-Za-z0-9._-]{20,}$/', $token)) {
    ig_respond(204);
}
if (!is_dir(IG_DATA_DIR) && !@mkdir(IG_DATA_DIR, 0755, true)) {
    ig_respond(204);
}

$state = ig_load_state();
$age = time() - (int) ($state['actualitzat'] ?? 0);
$failedRecently = isset($state['error']) && time() - (int) $state['error'] < IG_RETRY;

if ($age >= IG_MAX_AGE && !$failedRecently) {
    // Només una visita a la vegada consulta Instagram; les altres reben la còpia
    $lock = fopen(IG_LOCK_FILE, 'c');
    if ($lock && flock($lock, LOCK_EX | LOCK_NB)) {
        $state = ig_load_state();
        if (time() - (int) ($state['actualitzat'] ?? 0) >= IG_MAX_AGE) {
            $state = ig_update($state, $token);
            ig_save_state($state);
        }
        flock($lock, LOCK_UN);
    }
    if ($lock) fclose($lock);
}

$public = ig_public($state);
if ($public === null) ig_respond(204);
ig_respond(200, $public);
