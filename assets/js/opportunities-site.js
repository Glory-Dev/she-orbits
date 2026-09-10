(function (global) {
  'use strict';

  var OPPORTUNITIES_DATA_URL = '../assets/data/opportunities.json';
  var dataCache = null;

  var PAST_INTEREST_URL = 'https://forms.gle/4KEWiMb24qBmNK1U6';
  var UPCOMING_ENROLL_URL = 'https://forms.gle/R8WKx4ZNdWqPibps9';

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // opportunity.detail is authored content from our own JSON file, not
  // user input, so it's rendered as-is to allow markup like <br>, <video>,
  // <a>, <strong>, etc.
  function renderRichHtml(value) {
    return String(value || '');
  }

  function loadOpportunitiesData() {
    if (dataCache) {
      return Promise.resolve(dataCache);
    }

    return fetch(OPPORTUNITIES_DATA_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load opportunities data');
        }

        return response.json();
      })
      .then(function (data) {
        dataCache = {
          types: Array.isArray(data.types) ? data.types : [],
          opportunities: Array.isArray(data.opportunities)
            ? data.opportunities.filter(function (item) {
                // Ignore empty placeholder objects in the JSON.
                return item &&
                  item.slug &&
                  item.title &&
                  item.type &&
                  item.lifecycle;
              })
            : []
        };

        return dataCache;
      });
  }

  function getOpportunityBySlug(slug) {
    return loadOpportunitiesData().then(function (data) {
      return data.opportunities.find(function (item) {
        return item.slug === slug;
      }) || null;
    });
  }

  function getTypeById(types, typeId) {
    return types.find(function (type) {
      return type.id === typeId;
    }) || null;
  }

  function getSlugFromQuery() {
    return new URLSearchParams(window.location.search).get('slug');
  }

  /*
   * ---------------------------------------------------------
   * Lifecycle helpers
   * ---------------------------------------------------------
   */

  function getLifecycleLabel(lifecycle) {
    if (lifecycle === 'ongoing') {
      return 'Ongoing';
    }

    if (lifecycle === 'upcoming') {
      return 'Upcoming';
    }

    if (lifecycle === 'past') {
      return 'Past';
    }

    return '';
  }

  function getLifecycleClass(lifecycle) {
    if (
      lifecycle === 'ongoing' ||
      lifecycle === 'upcoming' ||
      lifecycle === 'past'
    ) {
      return 'is-' + lifecycle;
    }

    return '';
  }

  /*
   * Only Past and Upcoming opportunities have a special CTA.
   *
   * Past     -> Sign your interest
   * Upcoming -> Enroll now
   * Ongoing  -> No special CTA
   */

  function getCtaLabel(lifecycle) {
    if (lifecycle === 'past') {
      return 'Sign your interest';
    }

    if (lifecycle === 'upcoming') {
      return 'Enroll now';
    }

    return '';
  }

  function getCtaUrl(lifecycle) {
    if (lifecycle === 'past') {
      return PAST_INTEREST_URL;
    }

    if (lifecycle === 'upcoming') {
      return UPCOMING_ENROLL_URL;
    }

    return '';
  }

  function renderCtaButton(lifecycle) {
    var label = getCtaLabel(lifecycle);
    var url = getCtaUrl(lifecycle);

    if (!label || !url) {
      return '';
    }

    return (
      '<a href="' + url + '"' +
        ' class="program-btn program-btn-cta btn border border-white border-opacity-25 text-white"' +
        ' target="_blank"' +
        ' rel="noopener noreferrer">' +
        escapeHtml(label) +
      '</a>'
    );
  }

  function buildDetailUrl(slug) {
    return 'program-detail.html?slug=' + encodeURIComponent(slug);
  }

  /*
   * ---------------------------------------------------------
   * Program cards
   * ---------------------------------------------------------
   */

  function renderProgramCard(opportunity, options) {
    var lifecycleClass = getLifecycleClass(opportunity.lifecycle);
    var detailUrl = buildDetailUrl(opportunity.slug);

    var eagerImage = options && options.eagerImage;
    var showType = options && options.showType;
    var hideLifecycle = options && options.hideLifecycle;

    var loadingAttr = eagerImage
      ? ' loading="eager" decoding="async"'
      : ' loading="lazy" decoding="async"';

    /*
     * Type label is only looked up when requested, since it needs
     * the types list from the JSON (not just the opportunity itself).
     */
    var typeHtml = '';

    if (showType) {
      var types = (options && options.types) || [];
      var type = getTypeById(types, opportunity.type);
      var typeLabel = type ? type.label : opportunity.type;

      typeHtml =
        '<p class="program-card-type">' +
          escapeHtml(typeLabel) +
        '</p>';
    }

    var lifecycleHtml = hideLifecycle
      ? ''
      : '<p class="program-card-lifecycle">' +
          escapeHtml(getLifecycleLabel(opportunity.lifecycle)) +
        '</p>';

    return (
      '<article class="program-card ' + lifecycleClass + '">' +

        '<div class="program-photo-wrap" style="background-image: url(\'' +
          escapeHtml(opportunity.image) +
          '\');" role="img" aria-label="' +
          escapeHtml(opportunity.title) +
          '">' +
        '</div>' +

        '<div class="program-card-body">' +

          '<h3 class="program-card-title">' +
            escapeHtml(opportunity.title) +
          '</h3>' +

          typeHtml +

          lifecycleHtml +

          '<p class="program-card-description program-card-description-clamp">' +
            escapeHtml(opportunity.description) +
          '</p>' +

          '<div class="program-card-actions">' +

            /*
             * Discover more is ALWAYS shown.
             */
            '<a href="' +
              detailUrl +
              '"' +
              ' class="program-btn program-btn-discover">' +
              'Discover more' +
            '</a>' +

            /*
             * CTA is only shown for:
             * - Past
             * - Upcoming
             *
             * Ongoing has no special CTA.
             */
            renderCtaButton(opportunity.lifecycle) +

          '</div>' +

        '</div>' +
      '</article>'
    );
  }

  function renderCards(opportunities, options) {
    return opportunities
      .map(function (opportunity) {
        return renderProgramCard(opportunity, options);
      })
      .join('');
  }

  /*
   * ---------------------------------------------------------
   * Home page preview
   * ---------------------------------------------------------
   */

  /*
   * Home page only shows Upcoming opportunities now. The ongoingContainer
   * param is kept (rather than removed) so existing call sites in the
   * HTML don't break if they still pass an element for it — it's simply
   * left untouched/empty. Remove the ongoing section markup on the page
   * itself when you're ready to drop it entirely.
   */
  function renderHomeProgramsPreview(ongoingContainer, upcomingContainer) {
    if (!upcomingContainer) {
      return;
    }

    loadOpportunitiesData()
      .then(function (data) {
        var upcoming = data.opportunities.filter(function (item) {
          return item.lifecycle === 'upcoming';
        });

        var homeCardOptions = {
          types: data.types,
          showType: true,
          hideLifecycle: true
        };

        upcomingContainer.innerHTML = upcoming.length
          ? renderCards(upcoming, homeCardOptions)
          : '<p class="programs-load-error">No upcoming programs to display.</p>';
      })
      .catch(function () {
        upcomingContainer.innerHTML =
          '<p class="programs-load-error">' +
            'Unable to load programs. Please refresh the page.' +
          '</p>';
      });
  }

  /*
   * ---------------------------------------------------------
   * Programs hub
   * ---------------------------------------------------------
   */

  function renderProgramsHub(root) {
    if (!root) {
      return;
    }

    loadOpportunitiesData()
      .then(function (data) {
        root.innerHTML = data.types
          .map(function (type) {

            var items = data.opportunities.filter(function (item) {
              return item.type === type.id;
            });

            var cards = items.length
              ? '<div class="programs-grid">' +
                  renderCards(items, { eagerImage: true }) +
                '</div>'
              : '<p class="programs-empty">' +
                  'New opportunities in this category will be announced soon.' +
                '</p>';

            return (
              '<section id="' +
                escapeHtml(type.id) +
                '" class="programs-hub-section">' +

                '<div class="programs-hub-section-header">' +

                  '<h2 class="programs-hub-section-title">' +
                    escapeHtml(type.label) +
                  '</h2>' +

                  '<p class="programs-hub-section-description">' +
                    escapeHtml(type.desc) +
                  '</p>' +

                '</div>' +

                cards +

              '</section>'
            );
          })
          .join('');
      })
      .catch(function () {
        root.innerHTML =
          '<p class="programs-load-error">' +
            'Unable to load opportunities. Please refresh the page.' +
          '</p>';
      });
  }

  /*
   * ---------------------------------------------------------
   * Lists
   * ---------------------------------------------------------
   */

  function renderList(items, className) {
    if (!items || !items.length) {
      return '';
    }

    return (
      '<ul class="' +
        className +
      '">' +

        items
          .map(function (item) {
            return '<li>' + escapeHtml(item) + '</li>';
          })
          .join('') +

      '</ul>'
    );
  }

  /*
   * ---------------------------------------------------------
   * Final projects
   * ---------------------------------------------------------
   */

  function renderFinalProjectsSection(finalProjects) {
    if (!finalProjects || !finalProjects.enabled) {
      return '';
    }

    return (
      '<div class="program-detail-block">' +

        '<h2 class="program-detail-heading">' +
          escapeHtml(
            finalProjects.title || 'Final Projects'
          ) +
        '</h2>' +

        '<p class="program-detail-description">' +
          escapeHtml(finalProjects.description) +
        '</p>' +

        '<div class="final-projects-container" style="margin-top: 1.5rem;">' +

          '<a href="' +
            escapeHtml(finalProjects.googleDriveUrl) +
            '"' +
            ' target="_blank"' +
            ' rel="noopener noreferrer"' +
            ' class="btn btn-primary text-white"' +
            ' style="display: inline-flex; align-items: center; gap: 0.5rem;">' +

            '<iconify-icon' +
              ' icon="mdi:google-drive"' +
              ' style="font-size: 1.25rem;">' +
            '</iconify-icon>' +

            'View All Projects on Google Drive' +

          '</a>' +

        '</div>' +

      '</div>'
    );
  }

  /*
   * ---------------------------------------------------------
   * Opportunity detail page
   * ---------------------------------------------------------
   */

  function renderProgramDetail(root) {
    if (!root) {
      return;
    }

    var slug = getSlugFromQuery();

    if (!slug) {
      root.innerHTML =
        '<p class="text-white">' +
          'Program not found. ' +
          '<a href="programs.html" class="text-white">' +
            'Browse all opportunities' +
          '</a>.' +
        '</p>';

      return;
    }

    getOpportunityBySlug(slug)
      .then(function (opportunity) {

        if (!opportunity) {
          root.innerHTML =
            '<p class="text-white">' +
              'Program not found. ' +
              '<a href="programs.html" class="text-white">' +
                'Browse all opportunities' +
              '</a>.' +
            '</p>';

          return;
        }

        document.title = 'SHE ORBITS - ' + opportunity.title;

        var lifecycleClass =
          getLifecycleClass(opportunity.lifecycle);

        var finalProjectsHtml =
          renderFinalProjectsSection(
            opportunity.finalProjects
          );

        var typeLabel = opportunity.type;

        loadOpportunitiesData()
          .then(function (data) {

            var type = getTypeById(
              data.types,
              opportunity.type
            );

            if (type) {
              typeLabel = type.label;
            }

            /*
             * Topics and sessions are optional in the new JSON.
             */
            var topicsHtml = '';

            if (
              Array.isArray(opportunity.topics) &&
              opportunity.topics.length
            ) {
              topicsHtml =
                '<div class="program-detail-block">' +

                  '<h2 class="program-detail-heading">' +
                    'Topics covered' +
                  '</h2>' +

                  renderList(
                    opportunity.topics,
                    'program-detail-list'
                  ) +

                '</div>';
            }

            var sessionsHtml = '';

            if (
              Array.isArray(opportunity.sessions) &&
              opportunity.sessions.length
            ) {
              sessionsHtml =
                '<div class="program-detail-block">' +

                  '<h2 class="program-detail-heading">' +
                    'Sessions & milestones' +
                  '</h2>' +

                  renderList(
                    opportunity.sessions,
                    'program-detail-list'
                  ) +

                '</div>';
            }

            /*
             * Only Past and Upcoming opportunities get
             * a special CTA on the detail page.
             *
             * Ongoing only gets "All opportunities".
             */
            var detailCtaHtml = renderCtaButton(
              opportunity.lifecycle
            );

            root.innerHTML =

              '<div class="program-detail-layout">' +

                '<div class="program-detail-image" style="background-image: url(\'' +
                  escapeHtml(opportunity.image) +
                  '\');" role="img" aria-label="' +
                  escapeHtml(opportunity.title) +
                  '">' +
                '</div>' +

                '<span class="program-detail-type">' +
                  escapeHtml(typeLabel) +
                '</span>' +

                '<span class="program-detail-lifecycle ' +
                  lifecycleClass +
                '">' +
                  escapeHtml(
                    getLifecycleLabel(
                      opportunity.lifecycle
                    )
                  ) +
                '</span>' +

                '<h1 class="program-detail-title">' +
                  escapeHtml(opportunity.title) +
                '</h1>' +

                '<p class="program-detail-description">' +
                  escapeHtml(opportunity.description) +
                '</p>' +

                '<div class="program-detail-description">' +
                  renderRichHtml(opportunity.detail) +
                '</div>' +

                topicsHtml +

                sessionsHtml +

                finalProjectsHtml +

                '<div class="d-flex flex-wrap gap-3 mt-4">' +

                  detailCtaHtml +

                  '<a href="programs.html"' +
                    ' class="btn border border-white border-opacity-25 text-white">' +
                    'All opportunities' +
                  '</a>' +

                '</div>' +

              '</div>';
          });
      })
      .catch(function () {
        root.innerHTML =
          '<p class="text-white">' +
            'Unable to load this program. ' +
            '<a href="programs.html" class="text-white">' +
              'Browse all opportunities' +
            '</a>.' +
          '</p>';
      });
  }

  /*
   * ---------------------------------------------------------
   * Contact form prefill
   * ---------------------------------------------------------
   */

  function prefillContactForm(programSlug, intent) {
    var select =
      document.getElementById(
        'programInterestSelect'
      );

    if (!select || !programSlug) {
      return;
    }

    getOpportunityBySlug(programSlug)
      .then(function (opportunity) {

        var label =
          opportunity
            ? opportunity.title
            : programSlug;

        var value = programSlug;

        var existing =
          Array.prototype.find.call(
            select.options,
            function (option) {
              return option.value === value;
            }
          );

        if (!existing) {
          var option =
            document.createElement('option');

          option.value = value;
          option.textContent = label;

          select.appendChild(option);
        }

        select.value = value;

        var heading =
          document.getElementById(
            'contactFormHeading'
          );

        if (
          heading &&
          intent === 'enroll'
        ) {
          heading.textContent =
            'Enroll in a Program';

        } else if (
          heading &&
          intent === 'interest'
        ) {
          heading.textContent =
            'Sign Your Interest';
        }
      });
  }

  /*
   * ---------------------------------------------------------
   * Public API
   * ---------------------------------------------------------
   */

  global.SheOrbitsOpportunities = {
    loadOpportunitiesData:
      loadOpportunitiesData,

    getOpportunityBySlug:
      getOpportunityBySlug,

    renderHomeProgramsPreview:
      renderHomeProgramsPreview,

    renderProgramsHub:
      renderProgramsHub,

    renderProgramDetail:
      renderProgramDetail,

    prefillContactForm:
      prefillContactForm
  };

})(window);