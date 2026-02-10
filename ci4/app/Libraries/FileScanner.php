<?php

namespace App\Libraries;

class FileScanner
{
    private $rootPath;

    public function __construct()
    {
        $this->rootPath = rtrim(env('MUSIC_ROOT_PATH') ?: '', '/\\');
    }

    public function scanDir($relativePath)
    {
        $currentPath = realpath($this->rootPath . DIRECTORY_SEPARATOR . $relativePath);
        if (!$currentPath || strpos($currentPath, realpath($this->rootPath)) !== 0) {
            return [];
        }

        $results = [];
        $scanned = scandir($currentPath);

        foreach ($scanned as $item) {
            if ($item === '.' || $item === '..')
                continue;

            $fullPath = $currentPath . DIRECTORY_SEPARATOR . $item;
            if (is_dir($fullPath)) {
                $results[] = [
                    'name' => $item,
                    'path' => str_ireplace(realpath($this->rootPath), '', $fullPath),
                    'type' => 'dir'
                ];
            }
        }
        return $results;
    }

    public function getAlbums($relativePath)
    {
        $currentPath = realpath($this->rootPath . DIRECTORY_SEPARATOR . $relativePath);
        if (!$currentPath)
            return [];

        // Recursive Scan
        return $this->scanForAlbums($currentPath);
    }

    private function scanForAlbums($dir)
    {
        $albums = [];
        // Check if current dir is an album
        if ($this->isAlbumFolder($dir)) {
            $albums[] = $this->createAlbumNode($dir);
        }

        // Scan children
        $nodes = scandir($dir);
        foreach ($nodes as $node) {
            if ($node === '.' || $node === '..')
                continue;
            $fullPath = $dir . DIRECTORY_SEPARATOR . $node;

            if (is_dir($fullPath)) {
                $subAlbums = $this->scanForAlbums($fullPath);
                $albums = array_merge($albums, $subAlbums);
            }
        }

        return $albums;
    }

    public function getTracks($relativePath)
    {
        $currentPath = realpath($this->rootPath . DIRECTORY_SEPARATOR . $relativePath);
        if (!$currentPath)
            return [];

        $tracks = [];
        $tagManager = new TagManager();

        $nodes = scandir($currentPath);
        foreach ($nodes as $node) {
            if ($node === '.' || $node === '..')
                continue;
            $fullPath = $currentPath . DIRECTORY_SEPARATOR . $node;

            if (is_file($fullPath) && $this->isMusic($fullPath)) {
                $tracks[] = $tagManager->readTags($fullPath, $this->rootPath);
            }
        }
        return $tracks;
    }

    private function isAlbumFolder($path)
    {
        $nodes = scandir($path);
        foreach ($nodes as $node) {
            if ($node === '.' || $node === '..')
                continue;
            if (is_file($path . DIRECTORY_SEPARATOR . $node) && $this->isMusic($node)) {
                return true;
            }
        }
        return false;
    }

    private function createAlbumNode($path)
    {
        $tagManager = new TagManager();
        $nodes = scandir($path);

        $firstTrack = null;
        foreach ($nodes as $node) {
            if ($node === '.' || $node === '..')
                continue;
            // Strict check to avoid reading tags of non-music files
            if (is_file($path . DIRECTORY_SEPARATOR . $node) && $this->isMusic($node)) {
                try {
                    // Only read basic info, avoid heavy picture extraction if possible in TagManager (needs support)
                    // For now, just catching errors
                    $firstTrack = $tagManager->readTags($path . DIRECTORY_SEPARATOR . $node, $this->rootPath);
                } catch (\Exception $e) {
                    log_message('error', 'Error reading tags for ' . $node . ': ' . $e->getMessage());
                    continue; // Try next file
                }

                if ($firstTrack)
                    break;
            }
        }

        // We cannot return full cover data for all albums due to memory constraints
        // Instead, return flag and let frontend lazy load via getCover API
        // getCover prioritizes local files (fast) before reading tags
        $hasCover = false;

        // Quick check: does a local cover file exist?
        $commonNames = ['cover.jpg', 'folder.jpg', 'front.jpg', 'album.jpg', 'cover.png', 'folder.png'];
        foreach ($commonNames as $name) {
            if (file_exists($path . DIRECTORY_SEPARATOR . $name)) {
                $hasCover = true;
                break;
            }
        }

        // Fallback: check first track for embedded art (already loaded)
        if (!$hasCover && !empty($firstTrack['cover'])) {
            $hasCover = true;
        }

        return [
            'type' => 'album',
            'name' => basename($path),
            'path' => str_ireplace(realpath($this->rootPath), '', $path),
            'has_cover' => $hasCover,
            'cover' => null, // Null to save memory; frontend uses lazy loading
            'artist' => $firstTrack['album_artist'] ?? ($firstTrack['artist'] ?? 'Unknown Artist'),
            'album' => $firstTrack['album'] ?? basename($path)
        ];
    }

    public function getCover($relativePath)
    {
        $currentPath = realpath($this->rootPath . DIRECTORY_SEPARATOR . $relativePath);
        if (!$currentPath)
            return null;

        // 1. Check for local cover files (Fast & Light)
        $commonNames = ['cover.jpg', 'folder.jpg', 'front.jpg', 'album.jpg', 'cover.png', 'folder.png', 'front.png'];
        foreach ($commonNames as $name) {
            $imgPath = $currentPath . DIRECTORY_SEPARATOR . $name;
            if (file_exists($imgPath)) {
                $type = pathinfo($imgPath, PATHINFO_EXTENSION);
                $data = file_get_contents($imgPath);
                return 'data:image/' . $type . ';base64,' . base64_encode($data);
            }
        }

        // 2. Fallback to ID3 Tags
        $tagManager = new TagManager();
        $nodes = scandir($currentPath);

        foreach ($nodes as $node) {
            if ($node === '.' || $node === '..')
                continue;
            if (is_file($currentPath . DIRECTORY_SEPARATOR . $node) && $this->isMusic($node)) {
                try {
                    $tags = $tagManager->readTags($currentPath . DIRECTORY_SEPARATOR . $node, $this->rootPath);
                    if (!empty($tags['cover'])) {
                        return $tags['cover'];
                    }
                } catch (\Exception $e) {
                    continue;
                }
            }
        }
        return null;
    }

    private function isMusic($path)
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return in_array($ext, ['mp3', 'flac', 'wav', 'm4a', 'ogg']);
    }
}
