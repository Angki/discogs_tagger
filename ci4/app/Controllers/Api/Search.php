<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Libraries\DiscogsService;

class Search extends ResourceController
{
    private $discogs;

    public function __construct()
    {
        $this->discogs = new DiscogsService();
    }

    public function index()
    {
        $action = $this->request->getGet('action') ?? 'search';

        if ($action === 'search') {
            $artist = $this->request->getGet('artist');
            $album = $this->request->getGet('album');
            $folder = $this->request->getGet('folder');

            if (!$artist && !$album && !$folder) {
                return $this->fail('Missing search parameters', 400);
            }

            $results = $this->discogs->search($artist, $album, $folder);
            return $this->respond($results);
        } elseif ($action === 'get_release') {
            $id = $this->request->getGet('id');
            $type = $this->request->getGet('type') ?? 'release';

            if (!$id)
                return $this->fail('Missing ID', 400);

            try {
                $data = $this->discogs->getRelease($id, $type);
                return $this->respond($data);
            } catch (\Exception $e) {
                return $this->fail($e->getMessage(), 500);
            }
        }

        return $this->fail('Invalid action', 400);
    }
}
