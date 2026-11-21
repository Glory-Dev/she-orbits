// Contact forms (home "contactForm", contact page participant/partner tabs).
// Replaces contact-site.js + the inline fetch handlers. One submit handler per form:
// validate -> POST to the Google Apps Script -> show status.
const ENDPOINT = document.body.dataset.formsEndpoint;
const $ = (id) => document.getElementById(id);

async function submit(form, { status, success, message, extra = {} }) {
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const btn = form.querySelector('button[type=submit]');
  const data = new FormData(form);
  Object.entries(extra).forEach(([k, v]) => data.append(k, v));
  btn.disabled = true;
  if (status) status.textContent = 'Submitting...';
  try {
    await fetch(ENDPOINT, { method: 'POST', body: data });
    if (status) status.textContent = message;
    if (success) { success.classList.remove('d-none'); success.focus?.(); }
    form.reset();
  } catch (err) {
    console.error(err);
    if (status) status.textContent = 'Something went wrong. Please try again or email us directly.';
  } finally {
    btn.disabled = false;
  }
}

// ---- home page form ----
const home = $('contactForm');
home?.addEventListener('submit', (e) => {
  e.preventDefault();
  submit(home, { status: $('contactFormStatus'), message: "Thank you! We'll be in touch soon.", extra: { formType: 'homepage-contact' } });
});

// ---- contact page ----
const participant = $('participantForm');
const partner = $('partnerForm');
if (participant && partner) {
  const TAB_COPY = {
    participant: {
      heading: 'Join Our Programs',
      intro: "Tell us about yourself and your space aspirations. We'll match you with the perfect program to launch your journey.",
      sidebarTitle: 'Why Join SHE ORBITS?',
      sidebarItems: ['Global Community', 'Expert Mentorship', 'Real Space Projects', 'Career Pathways', 'Scholarships Available'],
    },
    partner: {
      heading: 'Partner With Us',
      intro: 'Share how your organization can collaborate with SHE ORBITS through mentorship, programs, sponsorship, or research partnerships.',
      sidebarTitle: 'Partnership Opportunities',
      sidebarItems: ['Sponsor programs and scholarships', 'Provide mentors and internships', 'Co-host workshops and events', 'Collaborate on research missions', 'Reach girls in 50+ countries'],
    },
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const setActiveTab = (tab) => {
    const isPartner = tab === 'partner';
    $('participantFormPanel').classList.toggle('d-none', isPartner);
    $('partnerFormPanel').classList.toggle('d-none', !isPartner);
    $('participantFormPanel').setAttribute('aria-hidden', String(isPartner));
    $('partnerFormPanel').setAttribute('aria-hidden', String(!isPartner));
    [['contactTabParticipant', !isPartner], ['contactTabPartner', isPartner]].forEach(([id, on]) => {
      const el = $(id);
      el?.classList.toggle('active', on);
      el?.setAttribute('aria-selected', String(on));
    });
    const copy = TAB_COPY[tab];
    if ($('contactSidebarTitle')) $('contactSidebarTitle').textContent = copy.sidebarTitle;
    if ($('contactFormHeading')) $('contactFormHeading').textContent = copy.heading;
    if ($('contactFormIntro')) $('contactFormIntro').textContent = copy.intro;
    if ($('contactSidebarList')) {
      $('contactSidebarList').innerHTML = copy.sidebarItems
        .map((i) => `<li class="hstack gap-2"><i class="fa-solid fa-circle-check text-primary fs-6" aria-hidden="true"></i><span class="fs-6">${esc(i)}</span></li>`)
        .join('');
    }
  };
  $('contactTabParticipant')?.addEventListener('click', () => setActiveTab('participant'));
  $('contactTabPartner')?.addEventListener('click', () => setActiveTab('partner'));

  const params = new URLSearchParams(location.search);
  setActiveTab(params.get('tab') === 'partner' || location.hash === '#partner' ? 'partner' : 'participant');

  // ?program=<slug>&intent=enroll|interest  (links from the opportunity cards)
  const program = params.get('program');
  if (program) {
    setActiveTab('participant');
    const select = $('programInterestSelect');
    const known = JSON.parse($('programsData')?.textContent || '[]');
    if (select) {
      if (![...select.options].some((o) => o.value === program)) {
        const opt = document.createElement('option');
        opt.value = program;
        opt.textContent = known.find((p) => p.slug === program)?.title ?? program;
        select.appendChild(opt);
      }
      select.value = program;
    }
    const intent = params.get('intent');
    if (intent === 'enroll') $('contactFormHeading').textContent = 'Enroll in a Program';
    else if (intent === 'interest') $('contactFormHeading').textContent = 'Sign Your Interest';
  }

  participant.addEventListener('submit', (e) => {
    e.preventDefault();
    $('partnerFormSuccess')?.classList.add('d-none');
    submit(participant, { status: $('formStatus'), success: $('participantFormSuccess'), message: 'Thank you! Your application has been submitted.' });
  });

  // The partner form had no backend before (it only showed a success message and discarded the data).
  let partnerStatus = $('partnerFormStatus');
  if (!partnerStatus) {
    partnerStatus = document.createElement('p');
    partnerStatus.id = 'partnerFormStatus';
    partnerStatus.className = 'mt-3 mb-0 small';
    partnerStatus.setAttribute('role', 'status');
    partner.appendChild(partnerStatus);
  }
  partner.addEventListener('submit', (e) => {
    e.preventDefault();
    $('participantFormSuccess')?.classList.add('d-none');
    submit(partner, { status: partnerStatus, success: $('partnerFormSuccess'), message: 'Thank you! We will be in touch soon.', extra: { formType: partner.dataset.formType || 'partner' } });
  });
}
