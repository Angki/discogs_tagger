<?php

namespace App\Libraries;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class DiscogsService
{
    private $client;

    public function __construct()
    {
        // Load env variables helper
        helper('filesystem');

        // CI4 .env loading is automatic, but we access via getenv() or env()
        // We need to make sure vendor/autoload is available for Guzzle
        // which CI4 should handle if we composer require guzzlehttp/guzzle in CI root.

        $consumerKey = env('DISCOGS_CONSUMER_KEY');
        $consumerSecret = env('DISCOGS_CONSUMER_SECRET');

        $this->client = new Client([
            'base_uri' => 'https://api.discogs.com/',
            'headers' => [
                'User-Agent' => 'DiscogsTagger/2.0 +http://localhost',
                'Authorization' => "Discogs key={$consumerKey}, secret={$consumerSecret}"
            ]
        ]);
    }

    public function search($artist, $album, $folderName)
    {
        $pools = [];

        if ($artist && $album) {
            $pools[] = $this->queryDiscogs(
                ['artist' => $artist, 'release_title' => $album, 'type' => 'release'],
                'Exact Match (Artist + Album)'
            );
        }

        if ($album) {
            $pools[] = $this->queryDiscogs(
                ['release_title' => $album, 'type' => 'release'],
                'Album Title Match'
            );
        }

        if ($folderName) {
            $cleanName = $this->cleanFolderName($folderName);
            $pools[] = $this->queryDiscogs(
                ['q' => $cleanName, 'type' => 'release'],
                'Folder Name Match: ' . $cleanName
            );
        }

        return array_values(array_filter($pools));
    }

    public function getRelease($id, $type = 'release')
    {
        try {
            $endpoint = ($type === 'master') ? "masters/$id" : "releases/$id";
            $response = $this->client->request('GET', $endpoint);
            $data = json_decode($response->getBody(), true);

            if ($type === 'master' && isset($data['main_release'])) {
                $response = $this->client->request('GET', "releases/" . $data['main_release']);
                $data = json_decode($response->getBody(), true);
            }

            // Extract Label/Publisher
            $label = 'Unknown';
            if (!empty($data['labels']) && is_array($data['labels'])) {
                $label = $this->cleanArtistName($data['labels'][0]['name'] ?? 'Unknown');
            }
            $data['extracted_label'] = $label;

            // Clean Artist Names in main release
            if (!empty($data['artists'])) {
                foreach ($data['artists'] as &$artist) {
                    $artist['name'] = $this->cleanArtistName($artist['name']);
                }
            }

            // Clean Tracklist Artists
            if (!empty($data['tracklist'])) {
                foreach ($data['tracklist'] as &$track) {
                    if (!empty($track['artists'])) {
                        foreach ($track['artists'] as &$ta) {
                            $ta['name'] = $this->cleanArtistName($ta['name']);
                        }
                    }
                }
            }

            return $data;
        } catch (GuzzleException $e) {
            log_message('error', "Discogs API Error: " . $e->getMessage());
            throw new \Exception("Failed to fetch release from Discogs.");
        }
    }

    private function cleanArtistName($name)
    {
        // Remove suffixes like (2), (3) etc.
        return preg_replace('/\s\(\d+\)$/', '', $name);
    }

    private function queryDiscogs($params, $poolName)
    {
        try {
            $response = $this->client->request('GET', 'database/search', ['query' => $params]);
            $data = json_decode($response->getBody(), true);

            if (empty($data['results']))
                return null;

            return [
                'pool' => $poolName,
                'results' => array_slice($data['results'], 0, 5)
            ];
        } catch (GuzzleException $e) {
            return ['pool' => $poolName, 'error' => 'API Error', 'results' => []];
        }
    }

    private function cleanFolderName($name)
    {
        $name = preg_replace('/\[.*?\]/', '', $name);
        $name = preg_replace('/\s*\(.*?\)/', '', $name);
        $name = preg_replace('/^\d+\s*-\s*/', '', $name);
        return trim($name);
    }
}
