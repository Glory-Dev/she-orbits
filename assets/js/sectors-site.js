(function (global) {
  'use strict';

  var SECTORS_DATA_URL = '../assets/data/sectors.json';
  var sectorsCache = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatStatus(status) {
    return status === 'active' ? 'Active now' : 'Coming soon';
  }

  function loadSectors() {
    if (sectorsCache) {
      return Promise.resolve(sectorsCache);
    }

    return fetch(SECTORS_DATA_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load sectors data');
        }
        return response.json();
      })
      .then(function (data) {
        sectorsCache = data.sectors || [];
        return sectorsCache;
      });
  }

  function getSectorBySlug(slug) {
    return loadSectors().then(function (sectors) {
      return sectors.find(function (sector) {
        return sector.slug === slug;
      }) || null;
    });
  }

  function getSlugFromQuery() {
    return new URLSearchParams(window.location.search).get('slug');
  }

  function renderSectorGrid(container, options) {
    if (!container) {
      return;
    }

    var eagerImage = options && options.eagerImage;
    var loadingAttr = eagerImage ? ' loading="eager" decoding="async"' : ' loading="lazy" decoding="async"';

    loadSectors()
      .then(function (sectors) {
        container.innerHTML = sectors.map(function (sector) {
          var statusClass = sector.status === 'active' ? 'is-active' : 'is-coming-soon';
          var detailUrl = 'sector-detail.html?slug=' + encodeURIComponent(sector.slug);

          return (
            '<article class="sector-photo-card ' + statusClass + '">' +
              '<a href="' + detailUrl + '" class="sector-photo-link" aria-label="Discover ' + escapeHtml(sector.shortName) + '">' +
                '<div class="sector-photo-wrap" style="flex: 1; background-image: url(\'' + escapeHtml(sector.image) + '\');" role="img" aria-label="' + escapeHtml(sector.name) + '"></div>' +
                '<div class="sector-photo-body">' +
                  '<h3 class="sector-photo-title">' + escapeHtml(sector.shortName) + '</h3>' +
                  '<p class="sector-photo-status">' + escapeHtml(formatStatus(sector.status)) + '</p>' +
                  '<span class="sector-photo-btn">Discover now</span>' +
                '</div>' +
              '</a>' +
            '</article>'
          );
        }).join('');
      })
      .catch(function () {
        container.innerHTML = '<p class="sectors-load-error">Unable to load sectors. Please refresh the page.</p>';
      });
  }

  function renderSectorDetail(root) {
    if (!root) {
      return;
    }

    var slug = getSlugFromQuery();

    if (!slug) {
      root.innerHTML = '<p class="text-white">Sector not found. <a href="sectors.html" class="text-white">Browse all sectors</a>.</p>';
      return;
    }

    getSectorBySlug(slug)
      .then(function (sector) {
        if (!sector) {
          root.innerHTML = '<p class="text-white">Sector not found. <a href="sectors.html" class="text-white">Browse all sectors</a>.</p>';
          return;
        }

        document.title = 'SHE ORBITS - ' + sector.name;

        var statusClass = sector.status === 'active' ? 'is-active' : 'is-coming-soon';
        var ctaHref = 'https://forms.gle/3PLVyWYVhBK8dJFS6';
        var ctaLabel = 'Sign your interest';

        root.innerHTML =
          '<div class="row g-5 align-items-start">' +
            '<div class="col-lg-6">' +
              '<img src="' + escapeHtml(sector.image) + '" alt="' + escapeHtml(sector.name) + '" class="sector-detail-image w-100">' +
            '</div>' +
            '<div class="col-lg-6">' +
              '<span class="sector-detail-number">Sector ' + String(sector.id).padStart(2, '0') + '</span>' +
              '<span class="sector-detail-status ' + statusClass + '">' + escapeHtml(formatStatus(sector.status)) + '</span>' +
              '<h1 class="sector-detail-title">' + escapeHtml(sector.name) + '</h1>' +
              '<p class="sector-detail-description">' + escapeHtml(sector.description) + '</p>' +
              '<p class="sector-detail-description">' + escapeHtml(sector.detail) + '</p>' +
              '<div class="d-flex flex-wrap gap-3 mt-4">' +
                '<a href="' + ctaHref + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary text-white">' + escapeHtml(ctaLabel) + '</a>' +
                '<a href="sectors.html" class="btn border border-white border-opacity-25 text-white">All sectors</a>' +
              '</div>' +
            '</div>' +
          '</div>';
      })
      .catch(function () {
        root.innerHTML = '<p class="text-white">Unable to load this sector. <a href="sectors.html" class="text-white">Browse all sectors</a>.</p>';
      });
  }

  global.SheOrbitsSectors = {
    loadSectors: loadSectors,
    getSectorBySlug: getSectorBySlug,
    renderSectorGrid: renderSectorGrid,
    renderSectorDetail: renderSectorDetail
  };
})(window);
