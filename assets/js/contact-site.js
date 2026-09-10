(function (global) {
  'use strict';

  var TAB_COPY = {
    participant: {
      heading: 'Join Our Programs',
      intro: "Tell us about yourself and your space aspirations. We'll match you with the perfect program to launch your journey.",
      sidebarTitle: 'Why Join SHE ORBITS?',
      sidebarItems: [
        'Global Community',
        'Expert Mentorship',
        'Real Space Projects',
        'Career Pathways',
        'Scholarships Available'
      ]
    },
    partner: {
      heading: 'Partner With Us',
      intro: 'Share how your organization can collaborate with SHE ORBITS through mentorship, programs, sponsorship, or research partnerships.',
      sidebarTitle: 'Partnership Opportunities',
      sidebarItems: [
        'Sponsor programs and scholarships',
        'Provide mentors and internships',
        'Co-host workshops and events',
        'Collaborate on research missions',
        'Reach girls in 50+ countries'
      ]
    }
  };

  function getInitialTab() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'partner' || window.location.hash === '#partner') {
      return 'partner';
    }
    return 'participant';
  }

  function updateSidebar(tab) {
    var copy = TAB_COPY[tab];
    var title = document.getElementById('contactSidebarTitle');
    var list = document.getElementById('contactSidebarList');
    var heading = document.getElementById('contactFormHeading');
    var intro = document.getElementById('contactFormIntro');

    if (title) {
      title.textContent = copy.sidebarTitle;
    }
    if (list) {
      list.innerHTML = copy.sidebarItems.map(function (item) {
        return (
          '<li class="hstack gap-2">' +
            '<iconify-icon icon="lucide:check-circle" class="text-primary fs-6"></iconify-icon>' +
            '<span class="fs-6">' + item + '</span>' +
          '</li>'
        );
      }).join('');
    }
    if (heading) {
      heading.textContent = copy.heading;
    }
    if (intro) {
      intro.textContent = copy.intro;
    }
  }

  function setActiveTab(tab) {
    var participantPanel = document.getElementById('participantFormPanel');
    var partnerPanel = document.getElementById('partnerFormPanel');
    var participantTab = document.getElementById('contactTabParticipant');
    var partnerTab = document.getElementById('contactTabPartner');

    if (!participantPanel || !partnerPanel) {
      return;
    }

    var isPartner = tab === 'partner';
    participantPanel.classList.toggle('d-none', isPartner);
    partnerPanel.classList.toggle('d-none', !isPartner);
    participantPanel.setAttribute('aria-hidden', isPartner ? 'true' : 'false');
    partnerPanel.setAttribute('aria-hidden', isPartner ? 'false' : 'true');

    if (participantTab) {
      participantTab.classList.toggle('active', !isPartner);
      participantTab.setAttribute('aria-selected', !isPartner ? 'true' : 'false');
    }
    if (partnerTab) {
      partnerTab.classList.toggle('active', isPartner);
      partnerTab.setAttribute('aria-selected', isPartner ? 'true' : 'false');
    }

    updateSidebar(tab);
  }

  function hideSuccessAlerts() {
    ['participantFormSuccess', 'partnerFormSuccess'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.classList.add('d-none');
      }
    });
  }

  function showSuccess(alertId) {
    hideSuccessAlerts();
    var alert = document.getElementById(alertId);
    if (alert) {
      alert.classList.remove('d-none');
      alert.focus();
    }
  }

  function bindFormSubmit(formId, alertId) {
    var form = document.getElementById(formId);
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      // Backend action URL will be wired here (Formspree, API, etc.).
      showSuccess(alertId);
      form.reset();
    });
  }

  function initContactTabs() {
    var participantTab = document.getElementById('contactTabParticipant');
    var partnerTab = document.getElementById('contactTabPartner');

    if (participantTab) {
      participantTab.addEventListener('click', function () {
        setActiveTab('participant');
      });
    }
    if (partnerTab) {
      partnerTab.addEventListener('click', function () {
        setActiveTab('partner');
      });
    }

    setActiveTab(getInitialTab());
  }

  function initContactForms() {
    bindFormSubmit('participantForm', 'participantFormSuccess');
    bindFormSubmit('partnerForm', 'partnerFormSuccess');
  }

  function init() {
    initContactTabs();
    initContactForms();
  }

  global.SheOrbitsContact = {
    init: init,
    setActiveTab: setActiveTab
  };
})(window);
