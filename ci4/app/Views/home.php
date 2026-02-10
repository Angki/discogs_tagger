<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discogs Tagger</title>
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/style.css">
</head>

<body class="bg-dark text-light">

    <div class="container-fluid h-100 d-flex flex-column p-0">

        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary px-3">
            <div class="container-fluid">
                <a class="navbar-brand" href="#"><i class="bi bi-disc"></i> Discogs Tagger</a>

                <div class="d-flex align-items-center flex-grow-1 mx-3">
                    <div id="breadcrumbs" class="text-secondary small me-3"></div>
                </div>

                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-secondary me-2" onclick="loadFolders('')" title="Root"><i
                            class="bi bi-house"></i></button>
                    <button id="theme-toggle" class="btn btn-sm btn-outline-light" title="Toggle Theme">
                        <i class="bi bi-moon-stars-fill"></i>
                    </button>
                </div>
            </div>
        </nav>

        <div class="row flex-grow-1 g-0 overflow-hidden">
            <!-- Main Content (Full Width) -->
            <div class="col-12 d-flex flex-column position-relative">
                <div id="main-view" class="p-4 overflow-auto flex-grow-1">
                    <!-- Albums Grid -->
                </div>
                <!-- Detail Panel is now injected dynamically by app.js -->
            </div>
        </div>
    </div>

    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <!-- App JS -->
    <script src="js/app.js"></script>
</body>

</html>