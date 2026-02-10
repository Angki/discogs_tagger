<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Libraries\FileScanner;

class Scan extends ResourceController
{
    private $scanner;

    public function __construct()
    {
        $this->scanner = new FileScanner();
    }

    public function index()
    {
        // Default action or strict routing?
        // We'll use query params to match old API for easiest JS migration
        $action = $this->request->getGet('action');
        $path = $this->request->getGet('path') ?? '';

        switch ($action) {
            case 'list_dirs':
                return $this->respond($this->scanner->scanDir($path));
            case 'list_files':
                return $this->respond($this->scanner->getAlbums($path));
            case 'list_files_with_metadata':
                // New endpoint for hierarchical view with metadata
                $force = $this->request->getGet('force') === '1';
                return $this->respond($this->scanner->getAlbumsWithMetadata($path, $force));
            case 'list_tracks':
                return $this->respond($this->scanner->getTracks($path));
            case 'get_cover':
                // Return just the cover string (base64 or url)
                $coverData = $this->scanner->getCover($path);
                if ($coverData) {
                    return $this->respond(['cover' => $coverData]);
                }
                return $this->failNotFound('No cover found');
            default:
                return $this->fail('Invalid action', 400);
        }
    }
}
