# Discogs Tagger (Web Edition)

A powerful, local web-based music manager and tagger inspired by MusicBee, utilizing the CodeIgniter 4 framework and the Discogs API for accurate metadata retrieval.

## Key Features

### 🎵 Immersive Library Browsing
*   **Recursive Scanning**: Automatically scans your music folder recursively. No need to click through artist folders; all albums are displayed in a single, flattened grid.
*   **Lazy-Loaded Artwork**: Optimized for large libraries. Displays local `cover.jpg` or `folder.jpg` instantly, falling back to embedded tags only when necessary.
*   **Full-Width Layout**: Maximizes screen real estate with a modern, sidebar-less design.
*   **Dark/Light Mode**: Toggle between a sleek dark theme (default) and a crisp light theme.

### 🔍 Smart Search & Tagging
*   **Inline Detail View**: Click an album to expand a detailed panel right in the grid.
    *   **Left Column**: View current local tracks and metadata.
    *   **Right Column**: Integrated Discogs search and match results.
*   **Smart Search**: Automatically searches Discogs based on Folder Name, Album, or Artist labels.
*   **Metadata comparison**: Side-by-side comparison of local files vs. Discogs data before applying.
*   **Publisher Support**: Fetches and writes the `Publisher` (Label) tag from Discogs.
*   **Artist Cleaning**: Automatically removes Discogs suffixes like ` (2)` or ` (3)` from artist names.

### 🛡️ Data Preservation
*   **Artwork Safety**: Preserves existing embedded cover art.
*   **Genre Safety**: Keeps your custom genre tags if they exist; only fills from Discogs if missing.
*   **Robust Path Handling**: Handles complex Windows paths and characters seamlessly.

## Installation

1.  **Requirements**:
    *   PHP 8.1+
    *   Composer
    *   XAMPP or similar local server

2.  **Setup**:
    *   Clone the repository to `c:\xampp\htdocs\Discogs Tagger`.
    *   Run `composer install` in the `ci4` folder.
    *   Configure `.env`:
        ```env
        MUSIC_ROOT_PATH="E:/Path/To/Your/Music"
        DISCOGS_CONSUMER_KEY="your_key"
        DISCOGS_CONSUMER_SECRET="your_secret"
        ```

3.  **Run**:
    *   Execute `start_server.bat`.
    *   Open `http://localhost:8080`.

## Tech Stack
*   **Backend**: CodeIgniter 4, getID3, Guzzle
*   **Frontend**: Bootstrap 5, Vanilla JS
