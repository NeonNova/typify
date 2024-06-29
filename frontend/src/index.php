<?php
// lyrics-api/index.php

require_once __DIR__ . '/vendor/autoload.php';
use SpotifyLyricsApi\Spotify;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

$trackid = $_GET['trackid'] ?? null;

if (!$trackid) {
    http_response_code(400);
    echo json_encode(['error' => true, 'message' => 'trackid parameter is required!']);
    exit;
}

$spotify = new Spotify(getenv('SP_DC'));
$spotify->checkTokenExpire();
$response = $spotify->getLyrics(track_id: $trackid);
echo $response;