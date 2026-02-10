

// App State
const state = {
    currentPath: '',
    albums: [],
    selectedAlbumPath: null,
    tracks: [],
    searchResults: {},
    selectedRelease: null,
    detailPanelEl: null, // Track the dynamic panel
    isSmartView: false, // New Smart View Toggle
    items: [] // Keep track of current raw items for toggling
};

// DOM Elements (Static)
const els = {
    mainView: document.getElementById('main-view'),
    breadcrumbs: document.getElementById('breadcrumbs')
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadFolders();
});

async function loadFolders(path = '') {
    try {
        els.mainView.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2">Loading...</div></div>';

        const [dirsRes, albumsRes] = await Promise.all([
            fetch(`api/scan?action=list_dirs&path=${encodeURIComponent(path)}`),
            fetch(`api/scan?action=list_files&path=${encodeURIComponent(path)}`)
        ]);

        const dirs = await dirsRes.json();
        const albums = await albumsRes.json();

        const pureDirs = dirs.map(d => ({ ...d, type: 'dir' }));
        const pureAlbums = albums.map(a => ({ ...a, type: 'album' }));

        const albumPaths = new Set(pureAlbums.map(a => a.path));
        const uniqueDirs = pureDirs.filter(d => !albumPaths.has(d.path));

        const combined = [...uniqueDirs, ...pureAlbums];
        combined.sort((a, b) => a.name.localeCompare(b.name));

        state.currentPath = path;
        state.albums = pureAlbums;
        state.items = combined;

        renderAlbumGrid(combined);
        updateBreadcrumbs(path);

    } catch (e) {
        console.error("Failed to load folders", e);
        els.mainView.innerHTML = '<div class="alert alert-danger">Error loading folders. Check console.</div>';
    }
}

function updateBreadcrumbs(path) {
    els.breadcrumbs.innerHTML = '';
    const home = document.createElement('a');
    home.innerHTML = '<i class="bi bi-house"></i>';
    home.className = 'text-decoration-none text-light me-2';
    home.href = '#';
    home.onclick = (e) => { e.preventDefault(); loadFolders(''); };
    els.breadcrumbs.appendChild(home);

    // Smart View Toggle
    const smartBtn = document.createElement('button');
    smartBtn.innerHTML = state.isSmartView
        ? '<i class="bi bi-diagram-3-fill text-info"></i>'
        : '<i class="bi bi-diagram-3"></i>';
    smartBtn.className = `btn btn-sm ${state.isSmartView ? 'btn-dark border-info' : 'btn-outline-secondary'} border-0 ms-2`;
    smartBtn.title = "Toggle Smart Split View";
    smartBtn.onclick = () => {
        state.isSmartView = !state.isSmartView;
        renderAlbumGrid(state.items);
        updateBreadcrumbs(state.currentPath);
    };
    els.breadcrumbs.appendChild(smartBtn);

    const separator = document.createElement('span');
    separator.innerHTML = '<span class="mx-2 text-secondary">|</span>';
    els.breadcrumbs.appendChild(separator);

    if (path) {
        const parts = path.split(/[\\/]/).filter(p => p);
        let currentBuild = '';
        parts.forEach(part => {
            currentBuild += (currentBuild ? '/' : '') + part;
            const sep = document.createElement('span');
            sep.textContent = ' / ';
            els.breadcrumbs.appendChild(sep);

            const crumb = document.createElement('a');
            crumb.textContent = part;
            crumb.className = 'text-decoration-none text-secondary ms-2';
            crumb.href = '#';
            const linkPath = currentBuild;
            crumb.onclick = (e) => { e.preventDefault(); loadFolders(linkPath); };
            els.breadcrumbs.appendChild(crumb);
        });
    }
}

function renderAlbumGrid(items) {
    if (state.isSmartView) {
        items = smartGroupAlbums(items);
    }

    els.mainView.innerHTML = '';

    if (items.length === 0) {
        els.mainView.innerHTML = '<div class="alert alert-info">No items found.</div>';
        return;
    }

    const row = document.createElement('div');
    row.className = 'row g-3 position-relative';
    row.id = 'album-grid-row';

    items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3 col-xl-2 album-col';

        const card = document.createElement('div');
        card.className = 'card h-100 border-0 shadow-sm album-card';
        card.dataset.path = item.path;
        card.style.cursor = 'pointer';

        if (item.type === 'dir') {
            card.innerHTML = `
                <div class="ratio ratio-1x1 card-img-top bg-body-secondary position-relative d-flex align-items-center justify-content-center">
                     <i class="bi bi-folder-fill fs-1 text-warning"></i>
                </div>
                <div class="card-body p-2">
                     <h6 class="card-title text-truncate small mb-0 text-body">${item.name}</h6>
                </div>
            `;
            card.onclick = () => loadFolders(item.path);
        } else if (item.type === 'merged_split') {
            // Lazy load via API (getCover prioritizes local files, so it's fast)
            const coverSrc = item.has_cover
                ? `api/scan?action=get_cover&path=${encodeURIComponent(item.path)}`
                : 'assets/default-cover.png';

            card.innerHTML = `
                <div class="ratio ratio-1x1 card-img-top bg-body-secondary position-relative">
                    <img src="${coverSrc}" loading="lazy" class="object-fit-cover w-100 h-100" alt="Cover" onerror="this.src='assets/default-cover.png'">
                    <div class="position-absolute top-0 end-0 m-1 badge bg-info shadow-sm" title="Merged Split"><i class="bi bi-diagram-3-fill"></i> Pair</div>
                </div>
                <div class="card-body p-2">
                    <h6 class="card-title text-truncate small mb-1 text-body" title="${item.album}">${item.album}</h6>
                    <div class="card-text text-truncate small text-secondary" title="${item.artist}">
                        ${item.artist}
                    </div>
                </div>
            `;
            card.onclick = () => expandAlbum(item, card, col);
        } else {
            // Lazy load via API (getCover prioritizes local files, so it's fast)
            const coverSrc = item.has_cover
                ? `api/scan?action=get_cover&path=${encodeURIComponent(item.path)}`
                : 'assets/default-cover.png';

            card.innerHTML = `
                <div class="ratio ratio-1x1 card-img-top bg-body-secondary position-relative">
                    <img src="${coverSrc}" loading="lazy" class="object-fit-cover w-100 h-100" alt="Cover" onerror="this.src='assets/default-cover.png'">
                    ${!item.has_cover ? '<div class="position-absolute top-50 start-50 translate-middle text-muted"><i class="bi bi-music-note-beamed fs-1"></i></div>' : ''}
                </div>
                <div class="card-body p-2">
                    <h6 class="card-title text-truncate small mb-1 text-body" title="${item.album}">${item.album}</h6>
                    <p class="card-text text-truncate small text-secondary" title="${item.artist}">${item.artist}</p>
                </div>
            `;
            card.onclick = () => expandAlbum(item, card, col);
        }

        col.appendChild(card);
        row.appendChild(col);
    });

    els.mainView.appendChild(row);
}

// Smart Grouping Logic
function smartGroupAlbums(items) {
    const albums = items.filter(i => i.type === 'album');
    const dirs = items.filter(i => i.type === 'dir');
    const processedPaths = new Set();
    const merged = [];

    albums.forEach(album => {
        if (processedPaths.has(album.path)) return;

        // Check for "Split" pattern: "Split w/ OtherArtist" or "Split with OtherArtist"
        const splitRegex = /Split\s+(?:w\/|with)\s+(.+)/i;
        const match = album.album.match(splitRegex);

        if (match) {
            const partnerNamePartial = match[1].trim();

            const partner = albums.find(p => {
                if (p.path === album.path || processedPaths.has(p.path)) return false;

                const pArtist = p.artist || '';
                // Robust check: Partner artist name matches the "Other Artist" found in this album's title
                if (!pArtist.toLowerCase().includes(partnerNamePartial.toLowerCase()) &&
                    !partnerNamePartial.toLowerCase().includes(pArtist.toLowerCase())) return false;

                // Check if Partner's Album Title references This Artist
                const pMatch = p.album.match(splitRegex);
                if (!pMatch) return false;

                const myNamePartial = pMatch[1].trim();
                const myArtist = album.artist || '';

                return (myArtist.toLowerCase().includes(myNamePartial.toLowerCase()) ||
                    myNamePartial.toLowerCase().includes(myArtist.toLowerCase()));
            });

            if (partner) {
                merged.push({
                    type: 'merged_split',
                    name: album.name,
                    path: album.path, // Primary path
                    paths: [album.path, partner.path],
                    cover: album.cover,
                    has_cover: album.has_cover || partner.has_cover,
                    artist: `${album.artist} / ${partner.artist}`,
                    album: "Split Release",
                    sources: [album, partner]
                });
                processedPaths.add(album.path);
                processedPaths.add(partner.path);
                return;
            }
        }

        merged.push(album);
        processedPaths.add(album.path);
    });

    return [...dirs, ...merged];
}

async function expandAlbum(album, cardElement, colElement) {
    if (state.selectedAlbumPath === album.path && state.detailPanelEl) {
        closeDetail();
        return;
    }

    document.querySelectorAll('.album-card').forEach(c => c.classList.remove('border-primary', 'border-2'));
    cardElement.classList.add('border-primary', 'border-2');

    if (state.detailPanelEl) {
        state.detailPanelEl.remove();
        state.detailPanelEl = null;
    }

    state.selectedAlbumPath = album.path;
    state.selectedRelease = null; // Reset selection

    const row = colElement.parentElement;
    const allCols = Array.from(row.children).filter(c => c.classList.contains('album-col'));
    const myTop = colElement.offsetTop;
    let insertAfter = colElement;

    for (let i = allCols.indexOf(colElement) + 1; i < allCols.length; i++) {
        if (allCols[i].offsetTop > myTop) break;
        insertAfter = allCols[i];
    }

    const panelCol = document.createElement('div');
    panelCol.className = 'col-12 mt-3 mb-3 detail-panel-container';
    state.detailPanelEl = panelCol;

    const cardRect = cardElement.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const arrowLeft = (cardRect.left - rowRect.left) + (cardRect.width / 2);

    panelCol.innerHTML = `
        <div class="position-relative bg-dark border border-secondary p-3 rounded shadow-lg">
            <div class="detail-arrow" style="left: ${arrowLeft}px;"></div>
            <div id="inline-detail-content">
                <div class="text-center p-4">
                    <div class="spinner-border text-light" role="status"></div>
                </div>
            </div>
        </div>
    `;

    if (insertAfter.nextSibling) {
        row.insertBefore(panelCol, insertAfter.nextSibling);
    } else {
        row.appendChild(panelCol);
    }

    try {
        if (album.type === 'merged_split') {
            // Fetch tracks for ALL paths concurrently
            const promises = album.paths.map(p =>
                fetch(`api/scan?action=list_tracks&path=${encodeURIComponent(p)}`).then(r => r.json())
            );
            const results = await Promise.all(promises);
            state.tracks = results.flat();
            renderMergedDetailView(album, album.sources, results, document.getElementById('inline-detail-content'));
        } else {
            const res = await fetch(`api/scan?action=list_tracks&path=${encodeURIComponent(album.path)}`);
            const tracks = await res.json();
            state.tracks = tracks;
            renderInlineDetailView(album, tracks, document.getElementById('inline-detail-content'));
        }

        const panelRect = panelCol.getBoundingClientRect();
        if (panelRect.bottom > window.innerHeight) {
            panelCol.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } catch (e) {
        console.error(e);
        document.getElementById('inline-detail-content').innerHTML = '<div class="alert alert-danger">Failed to load tracks.</div>';
    }
}

function renderMergedDetailView(mergedAlbum, sources, trackSets, container) {
    let tracksHtml = '';

    sources.forEach((source, idx) => {
        const setTracks = trackSets[idx] || [];
        tracksHtml += `
            <div class="mb-3">
                <h6 class="text-info border-bottom border-secondary pb-1 mb-2">
                    <i class="bi bi-person"></i> ${source.artist} 
                    <span class="text-muted fw-normal ms-2">(${source.album})</span>
                </h6>
                <table class="table table-dark table-sm table-hover small mb-0">
                    <tbody>
                        ${setTracks.map((t, i) => `
                            <tr>
                                <td style="width:30px;">${i + 1}</td>
                                <td>${t.title}</td>
                                <td>${t.artist || t.album_artist || ''}</td>
                                <td class="text-muted text-truncate" style="max-width:150px;">${t.name}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
             <h4 class="mb-0 text-white"><i class="bi bi-diagram-3"></i> ${mergedAlbum.artist} <span class="badge bg-secondary ms-2">Split Release</span></h4>
             <button onclick="closeDetail()" class="btn btn-sm btn-outline-light"><i class="bi bi-x-lg"></i> Close</button>
        </div>
        
        <div class="row g-4">
            <!-- Left: Local Tracks (Split View) -->
            <div class="col-lg-6 border-end border-secondary">
                <div class="d-flex gap-3 mb-3">
                     <img src="${mergedAlbum.has_cover ? `api/scan?action=get_cover&path=${encodeURIComponent(mergedAlbum.path)}` : 'assets/default-cover.png'}" style="width:100px; height:100px; object-fit:cover;" class="rounded bg-black shadow" onerror="this.src='assets/default-cover.png'">
                     
                     ${sources[1].has_cover ? `<img src="api/scan?action=get_cover&path=${encodeURIComponent(sources[1].path)}" style="width:100px; height:100px; object-fit:cover;" class="rounded bg-black shadow" onerror="this.src='assets/default-cover.png'">` : ''}

                     <div>
                        <div class="badge bg-secondary mb-1">${state.tracks.length} Total Tracks</div>
                        <div class="text-muted small">Merged View</div>
                    </div>
                </div>
                
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    ${tracksHtml}
                </div>
            </div>

            <!-- Right: Discogs Match / Search (Standard) -->
            <div class="col-lg-6 d-flex flex-column" id="discogs-pane">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="text-info mb-0"><i class="bi bi-disc"></i> Discogs Match</h5>
                    <button id="btn-smart-search" class="btn btn-sm btn-info" onclick="triggerSmartSearch('${mergedAlbum.path.replace(/'/g, "\\'")}')">
                        <i class="bi bi-magic"></i> Smart Search
                    </button>
                </div>
                
                <div id="search-results-area" class="flex-grow-1 overflow-auto" style="min-height: 200px; max-height: 400px;">
                    <br>
                    <div class="text-center text-muted p-4 border border-secondary border-dashed rounded">
                        <i class="bi bi-search fs-1 mb-2"></i>
                        <p>Search for the combined release on Discogs.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderInlineDetailView(album, tracks, container) {
    // 2-Column Layout
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
             <h4 class="mb-0 text-white"><i class="bi bi-vinyl"></i> ${album.album} <span class="text-secondary fs-6">by ${album.artist}</span></h4>
             <button onclick="closeDetail()" class="btn btn-sm btn-outline-light"><i class="bi bi-x-lg"></i> Close</button>
        </div>
        
        <div class="row g-4">
            <!-- Left: Local Tracks -->
            <div class="col-lg-6 border-end border-secondary">
                 <div class="d-flex gap-3 mb-3">
                    <img src="${album.has_cover ? `api/scan?action=get_cover&path=${encodeURIComponent(album.path)}` : 'assets/default-cover.png'}" style="width:100px; height:100px; object-fit:cover;" class="rounded bg-black shadow" onerror="this.src='assets/default-cover.png'">
                    <div>
                        <div class="badge bg-secondary mb-1">${tracks.length} Tracks</div>
                        <div class="text-muted small">${album.path}</div>
                    </div>
                </div>
                
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-dark table-sm table-hover small mb-0">
                        <thead>
                            <tr><th>#</th><th>Title</th><th>Artist</th><th>File</th></tr>
                        </thead>
                        <tbody>
                            ${tracks.map((t, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${t.title}</td>
                                    <td>${t.artist || t.album_artist || ''}</td>
                                    <td class="text-muted text-truncate" style="max-width:150px;">${t.name}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Right: Discogs Match / Search -->
            <div class="col-lg-6 d-flex flex-column" id="discogs-pane">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="text-info mb-0"><i class="bi bi-disc"></i> Discogs Match</h5>
                    <button id="btn-smart-search" class="btn btn-sm btn-info" onclick="triggerSmartSearch('${album.path.replace(/'/g, "\\'")}')">
                        <i class="bi bi-magic"></i> Smart Search
                    </button>
                </div>
                
                <div id="search-results-area" class="flex-grow-1 overflow-auto" style="min-height: 200px; max-height: 400px;">
                    <div class="text-center text-muted p-4 border border-secondary border-dashed rounded">
                        <i class="bi bi-search fs-1 mb-2"></i>
                        <p>Click "Smart Search" to find matches on Discogs.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.closeDetail = () => {
    if (state.detailPanelEl) {
        state.detailPanelEl.remove();
        state.detailPanelEl = null;
    }
    state.selectedAlbumPath = null;
    document.querySelectorAll('.album-card').forEach(c => c.classList.remove('border-primary', 'border-2'));
};

window.triggerSmartSearch = async (albumPath) => {
    const resultsArea = document.getElementById('search-results-area');
    resultsArea.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-info"></div><div class="mt-2">Searching Discogs...</div></div>';

    // Logic from old auto-search
    if (state.tracks.length > 0) {
        const first = state.tracks[0];
        const folderName = albumPath.split(/[\\/]/).pop();

        await performSearch({
            artist: first.album_artist || first.artist,
            album: first.album,
            folder: folderName
        }, resultsArea);
    }
};

async function performSearch(smartParams, outputContainer) {
    let url = 'api/search?';
    const params = new URLSearchParams();
    if (smartParams.artist) params.append('artist', smartParams.artist);
    if (smartParams.album) params.append('album', smartParams.album);
    if (smartParams.folder) params.append('folder', smartParams.folder);
    url += params.toString();

    try {
        const res = await fetch(url);
        const pools = await res.json();
        renderSearchPools(pools, outputContainer);
    } catch (e) {
        outputContainer.innerHTML = '<div class="alert alert-danger m-2">Search failed</div>';
    }
}

function renderSearchPools(pools, container) {
    container.innerHTML = '';
    if (!pools || pools.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">No results found on Discogs.</div>';
        return;
    }

    pools.forEach(pool => {
        const card = document.createElement('div');
        card.className = 'card bg-secondary text-white mb-3 border-0';
        card.innerHTML = `<div class="card-header border-bottom border-dark py-1 px-2 small bg-dark">${pool.pool}</div>`;

        const list = document.createElement('div');
        list.className = 'list-group list-group-flush';

        if (pool.results.length === 0) {
            list.innerHTML = '<div class="list-group-item bg-transparent text-muted small">No results</div>';
        } else {
            pool.results.forEach(res => {
                const item = document.createElement('button');
                item.className = 'list-group-item list-group-item-action bg-secondary text-white border-bottom border-dark d-flex gap-2 align-items-start p-2 pool-item';
                item.innerHTML = `
                    <img src="${res.thumb}" style="width:40px; height:40px; object-fit:cover;" class="rounded">
                    <div class="flex-grow-1" style="min-width:0; text-align: left;">
                        <div class="fw-bold small text-truncate" title="${res.title}">${res.title}</div>
                        <div class="small text-light-emphasis">${res.year || ''} ${res.country || ''}</div>
                    </div>
                `;
                item.onclick = () => selectRelease(res, item);
                list.appendChild(item);
            });
        }
        card.appendChild(list);
        container.appendChild(card);
    });
}

// Select Release & Show Comparison (Replaces Search Results in Right Pane)
async function selectRelease(release, itemElement) {
    state.selectedRelease = release;

    // Visual feedback
    const allItems = document.querySelectorAll('.pool-item');
    allItems.forEach(el => el.classList.remove('active', 'bg-primary'));
    if (itemElement) itemElement.classList.add('active', 'bg-primary');

    const pane = document.getElementById('discogs-pane');
    // Don't fully replace pane yet, maybe just the content area? 
    // Actually, user wants comparison. Let's make the Right Column the Comparison View.

    const resultsArea = document.getElementById('search-results-area');
    resultsArea.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-info"></div><div class="mt-2">Fetching Metadata...</div></div>';

    try {
        const type = release.type || 'release';
        const res = await fetch(`api/search?action=get_release&id=${release.id}&type=${type}`);
        const fullRelease = await res.json();
        state.selectedRelease = fullRelease;

        renderComparisonInPane(fullRelease, resultsArea);

    } catch (e) {
        console.error(e);
        resultsArea.innerHTML = '<div class="alert alert-danger">Failed to load release details</div>';
    }
}

function renderComparisonInPane(release, container) {
    const discogsTracks = release.tracklist || [];
    const localTracks = state.tracks || [];

    let releaseArtistName = 'Unknown';
    if (release.artists && release.artists.length > 0) {
        releaseArtistName = release.artists.map(a => a.name.replace(/\s\(\d+\)$/, '')).join(' / ');
    }
    const publisher = release.extracted_label || 'Unknown';

    container.innerHTML = `
        <div class="card bg-dark border-success mb-3">
            <div class="card-header bg-success text-white py-1 d-flex justify-content-between align-items-center">
                <span class="small fw-bold">Selected: ${release.title}</span>
                <button class="btn btn-xs btn-outline-light py-0" onclick="triggerSmartSearch('${state.selectedAlbumPath.replace(/'/g, "\\'")}')">Back</button>
            </div>
            <div class="card-body p-2 small">
                <div><strong>Artist:</strong> ${releaseArtistName}</div>
                <div><strong>Publisher:</strong> ${publisher}</div>
                <div><strong>Year:</strong> ${release.year || '?'}</div>
            </div>
        </div>

        <div class="d-grid gap-2 mb-3">
             <button onclick="applyTags()" id="btn-confirm-apply" class="btn btn-success fw-bold"><i class="bi bi-check-lg"></i> Apply Tags</button>
        </div>

        <div class="table-responsive border border-secondary rounded">
            <table class="table table-dark table-sm table-striped small mb-0">
                <thead><tr><th>#</th><th>Discogs Track / Artist</th></tr></thead>
                <tbody>
                    ${discogsTracks.map((t, i) => {
        let trackArtist = '';
        if (t.artists && t.artists.length > 0) {
            trackArtist = t.artists.map(a => a.name.replace(/\s\(\d+\)$/, '')).join(' / ');
        } else {
            // If no specific track artist, assume release artist? 
            // Discogs often omits if same as release.
            trackArtist = release.artists ? release.artists.map(a => a.name.replace(/\s\(\d+\)$/, '')).join(' / ') : '';
        }

        const localTrack = localTracks[i];
        const localArtist = localTrack ? (localTrack.artist || localTrack.album_artist || '?') : '?';

        // Highlight if specific track artist differs from local?
        // Display format: Title - Artist

        return `
                            <tr>
                                <td>${t.position}</td>
                                <td>
                                    <div class="d-flex justify-content-between">
                                        <div class="fw-bold">${t.title}</div>
                                        <div class="text-info" style="font-size:0.85em">${trackArtist}</div>
                                    </div>
                                    
                                    <div class="d-flex justify-content-between text-muted border-top border-secondary mt-1 pt-1" style="font-size:0.85em">
                                        <div>${localTrack ? localTrack.title : '<span class="text-danger">Missing</span>'}</div>
                                        <div>${localTrack ? localArtist : ''}</div>
                                    </div>
                                </td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// APPLY TAGS LOGIC (Redirects to visual feedback)
async function applyTags() {
    if (!state.selectedRelease || !state.tracks) return;

    const btn = document.getElementById('btn-confirm-apply');
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Applying...';
        btn.disabled = true;
    }

    const release = state.selectedRelease;
    const discogsTracks = release.tracklist || [];
    let albumArtist = 'Unknown';
    if (release.artists && release.artists.length > 0) {
        albumArtist = release.artists.map(a => a.name.replace(/\s\(\d+\)$/, '')).join(' / ');
    }
    const publisher = release.extracted_label || '';

    const payload = { files: [] };

    state.tracks.forEach((track, index) => {
        const remote = discogsTracks[index];
        if (remote) {
            let trackArtist = albumArtist;
            if (remote.artists && remote.artists.length > 0) {
                trackArtist = remote.artists.map(a => a.name.replace(/\s\(\d+\)$/, '')).join(' / ');
            }
            const fallbackGenre = release.genres?.[0] || '';
            payload.files.push({
                path: track.path,
                album: release.title,
                year: release.year ? release.year.toString() : '',
                genre: fallbackGenre,
                artist: trackArtist,
                album_artist: albumArtist,
                title: remote.title || '',
                track: remote.position || '',
                publisher: publisher
            });
        }
    });

    if (payload.files.length === 0) {
        alert("No files to update.");
        if (btn) { btn.disabled = false; btn.innerHTML = 'Apply Tags'; }
        return;
    }

    try {
        const res = await fetch('api/tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        // Count success
        const successCount = result.filter(r => r.status === 'success').length;
        const failCount = result.length - successCount;

        // Show alert
        let msg = `Successfully tagged ${successCount} files!`;
        if (failCount > 0) {
            msg += `\nFailed: ${failCount} files.`;
            const firstErr = result.find(r => r.status === 'error');
            if (firstErr) msg += `\nReason: ${firstErr.message}`;
        }
        alert(msg);

        // Reload Folder to show updates
        triggerSmartSearch(state.selectedAlbumPath); // Or just close?
        // Maybe close detail to refresh list?
        // closeDetail(); 
        // Or reload tracks:
        const tracksRes = await fetch(`api/scan?action=list_tracks&path=${encodeURIComponent(state.selectedAlbumPath)}`);
        const newTracks = await tracksRes.json();
        state.tracks = newTracks;
        // Re-render handled by manual view update if needed, but for now we just stay or reset.

    } catch (e) {
        alert('Error applying tags: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Apply Tags'; }
    }
}

// Theme Logic
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const current = htmlEl.getAttribute('data-bs-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}
function setTheme(theme) {
    htmlEl.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = theme === 'dark'
            ? '<i class="bi bi-moon-stars-fill"></i>'
            : '<i class="bi bi-sun-fill"></i>';
    }

}