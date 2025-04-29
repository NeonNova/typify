<?php

require_once __DIR__ . '/vendor/autoload.php';

// Load environment variables from .env file
$env_file = __DIR__ . '/.env';
if (file_exists($env_file)) {
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

$trackid = $_GET['trackid'] ?? null;
$url = $_GET['url'] ?? null;
$format = $_GET['format'] ?? null;

$re = '~[\bhttps://open.\b]*spotify[\b.com\b]*[/:]*track[/:]*([A-Za-z0-9]+)~';

if (!$trackid && !$url) {
    http_response_code(400);
    echo json_encode(['error' => true, 'message' => 'url or trackid parameter is required!', 'usage' => 'https://github.com/akashrchandran/spotify-lyrics-api']);
    return;
}

if ($url) {
    preg_match($re, $url, $matches, PREG_OFFSET_CAPTURE, 0);
    $trackid = $matches[1][0];
}

try {
    $spotify = new SpotifyLyricsApi\Spotify(getenv('SP_DC'));
    $spotify->checkTokenExpire();
    $response = $spotify->getLyrics(track_id: $trackid);
    $json_res = json_decode($response, true);

    if ($json_res === null || !isset($json_res['lyrics'])) {
        http_response_code(404);
        echo json_encode(['error' => true, 'message' => 'lyrics for this track is not available on spotify!']);
        return;
    }

    $lines = $json_res['lyrics']['lines'];
    if ($format == 'lrc') {
        $lines = $spotify->getLrcLyrics($lines);
    } elseif ($format == 'srt') {
        $lines = $spotify->getSrtLyrics($lines);
    }

    echo json_encode([
        'error' => false,
        'lyrics' => [
            'syncType' => $json_res['lyrics']['syncType'],
            'lines' => $lines
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}