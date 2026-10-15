// PMR Phoenix 23430 - High Performance Momentum & Nanotech Interactions Engine

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lenis Butter-Smooth Momentum Scrolling
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Smooth anchor navigation with Lenis
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#' || !href) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -20, duration: 1.2 });
        }
      });
    });
  }

  // 2. Dynamic Scroll Progress Bar & Nav Blur
  const progressBar = document.getElementById('scroll-progress-bar');
  const navElement = document.getElementById('main-nav');
  const scrollPercentLabel = document.getElementById('scroll-percent');
  let scrollingTimeout = null;
  
  function updateScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    
    if (progressBar) {
      progressBar.style.width = `${scrollPercent}%`;
    }
    if (scrollPercentLabel) {
      scrollPercentLabel.textContent = `${Math.round(scrollPercent)}%`;
    }

    if (navElement) {
      if (scrollTop > 60) {
        navElement.classList.add('is-scrolled');
      } else {
        navElement.classList.remove('is-scrolled');
      }
    }

    // Disable iframe pointer events while scrolling to guarantee 120 FPS
    document.body.classList.add('is-scrolling');
    clearTimeout(scrollingTimeout);
    scrollingTimeout = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 120);
  }

  updateScrollProgress();

  // 3. Team 1 Roster (Authentic Descriptions from original site, NO fake quotes, NO Noah)
  const teamMembers = [
    {
      id: 1,
      name: "Arav",
      role: "Team Lead",
      dept: "Leadership",
      photo: "assets/images/team/team-lead.png",
      bio: "Leads PMR Phoenix from the front — sets the direction and keeps every sub-team pulling toward the same goal.",
      tags: ["Systems Direction", "Team Strategy", "Competition Lead"]
    },
    {
      id: 2,
      name: "James",
      role: "Secretary",
      dept: "Operations",
      photo: "assets/images/team/roster-1.png",
      bio: "Keeps the team's records, meetings, and communication running like clockwork.",
      tags: ["Documentation", "Meeting Cadence", "Team Operations"]
    },
    {
      id: 3,
      name: "Myles",
      role: "CAD Lead",
      dept: "Mechanical Design",
      photo: "assets/images/team/roster-6.png",
      bio: "Architects the robot's mechanical design — every mechanism starts as one of his CAD models.",
      tags: ["Parametric Modeling", "Chassis Architecture", "Mechanism CAD"]
    },
    {
      id: 4,
      name: "Andrew",
      role: "Drive Team Lead",
      dept: "Drive Operations",
      photo: "assets/images/team/roster-3.png",
      bio: "Commands the controls in every match and keeps the robot match-ready in the shop.",
      tags: ["Driver 1", "Match Teleoperation", "Shop Maintenance"]
    },
    {
      id: 5,
      name: "Wynona",
      role: "Outreach Lead",
      dept: "Community & Partners",
      photo: "assets/images/team/roster-4.png",
      bio: "Drives the team's presence in the community — sponsorships, events, and outreach.",
      tags: ["Outreach Events", "Partner Relations", "Community Impact"]
    },
    {
      id: 6,
      name: "Gia",
      role: "Outreach Lead & Lead Coder",
      dept: "Software & Outreach",
      photo: "assets/images/team/roster-5.png",
      bio: "Writes and leads the robot's code, and helps power the team's outreach on top of it.",
      tags: ["Autonomous Coding", "PedroPathing", "Outreach Leadership"]
    },
    {
      id: 7,
      name: "Adhvik",
      role: "Design & Build",
      dept: "Hardware Prototyping",
      photo: "assets/images/team/roster-7.png",
      bio: "Works across both design and the physical build, turning ideas into hardware.",
      tags: ["Hardware Prototyping", "Design Translation", "Shop Fabrication"]
    },
    {
      id: 8,
      name: "Lennon",
      role: "Assembly, Build & Human Player",
      dept: "Build & Field Play",
      photo: "assets/images/team/roster-2.png",
      bio: "Anchors assembly and build in the shop, then steps up as human player when it's game time.",
      tags: ["Subsystem Assembly", "Hardware Rigging", "Human Player"]
    }
  ];

  // Pre-cache all member images in memory for zero-lag roster scrolling
  teamMembers.forEach(m => {
    const preloadImg = new Image();
    preloadImg.src = m.photo;
  });

  const teamScrollTrack = document.getElementById('team-scroll-track');
  const memberName = document.getElementById('active-member-name');
  const memberRole = document.getElementById('active-member-role');
  const memberDept = document.getElementById('active-member-dept');
  const memberBio = document.getElementById('active-member-bio');
  const memberPhoto = document.getElementById('active-member-photo');
  const memberTags = document.getElementById('active-member-tags');
  const memberIndexNum = document.getElementById('active-member-index');
  const memberTotalNum = document.getElementById('active-member-total');
  const teamScrubberDots = document.getElementById('team-scrubber-dots');
  const teamTimelineChips = document.getElementById('team-timeline-chips');

  if (memberTotalNum) {
    memberTotalNum.textContent = String(teamMembers.length).padStart(2, '0');
  }

  // Populate scrubber dots and clickable chips
  if (teamScrubberDots && teamTimelineChips) {
    teamMembers.forEach((m, idx) => {
      // Scrubber dot
      const dot = document.createElement('button');
      dot.className = `scrubber-dot ${idx === 0 ? 'is-active' : ''}`;
      dot.setAttribute('aria-label', `Navigate to ${m.name}`);
      dot.dataset.index = idx;
      dot.addEventListener('click', () => scrollToMemberIndex(idx));
      teamScrubberDots.appendChild(dot);

      // Timeline chip
      const chip = document.createElement('button');
      chip.className = `timeline-chip ${idx === 0 ? 'is-active' : ''}`;
      chip.dataset.index = idx;
      chip.innerHTML = `<span>${String(idx + 1).padStart(2, '0')}</span> <strong>${m.name}</strong>`;
      chip.addEventListener('click', () => scrollToMemberIndex(idx));
      teamTimelineChips.appendChild(chip);
    });
  }

  let currentMemberIndex = -1;

  function setMember(idx) {
    if (idx === currentMemberIndex || idx < 0 || idx >= teamMembers.length) return;
    currentMemberIndex = idx;
    const m = teamMembers[idx];

    // Update active states
    document.querySelectorAll('.scrubber-dot').forEach((d, i) => {
      d.classList.toggle('is-active', i === idx);
    });
    document.querySelectorAll('.timeline-chip').forEach((c, i) => {
      c.classList.toggle('is-active', i === idx);
    });

    if (memberIndexNum) {
      memberIndexNum.textContent = String(idx + 1).padStart(2, '0');
    }

    if (memberName) memberName.textContent = m.name;
    if (memberRole) memberRole.textContent = m.role;
    if (memberDept) memberDept.textContent = m.dept;
    if (memberBio) memberBio.textContent = m.bio;

    if (memberPhoto) {
      memberPhoto.src = m.photo;
      memberPhoto.alt = `${m.name} — ${m.role}`;
    }

    if (memberTags) {
      memberTags.innerHTML = '';
      m.tags.forEach(t => {
        const span = document.createElement('span');
        span.className = 'member-tag';
        span.textContent = t;
        memberTags.appendChild(span);
      });
    }
  }

  // Initialize first member
  setMember(0);

  // Scroll mapping for pinned Team Section
  function onTeamTrackScroll() {
    if (!teamScrollTrack) return;
    const rect = teamScrollTrack.getBoundingClientRect();
    const trackHeight = teamScrollTrack.offsetHeight;
    const viewportHeight = window.innerHeight;
    
    // Calculate progress between 0 and 1
    const progress = Math.max(0, Math.min(1, -rect.top / (trackHeight - viewportHeight)));
    const targetIndex = Math.min(
      teamMembers.length - 1,
      Math.floor(progress * teamMembers.length)
    );

    setMember(targetIndex);
  }

  function scrollToMemberIndex(idx) {
    if (!teamScrollTrack) return;
    const trackTop = teamScrollTrack.offsetTop;
    const trackHeight = teamScrollTrack.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollTarget = trackTop + (idx / teamMembers.length) * (trackHeight - viewportHeight) + 15;
    
    if (lenis) {
      lenis.scrollTo(scrollTarget, { duration: 0.9 });
    } else {
      window.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
      });
    }
  }

  // 4. Parallax on Team Photo (Pure GPU translate3d)
  const teamPhotoImg = document.getElementById('parallax-team-photo');
  const teamPhotoSection = document.getElementById('team-photo-feature');

  function updateTeamPhotoParallax() {
    if (!teamPhotoSection || !teamPhotoImg) return;
    const rect = teamPhotoSection.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.top < vh && rect.bottom > 0) {
      const scrollRatio = (vh - rect.top) / (vh + rect.height);
      const translateY = (scrollRatio - 0.5) * -30;
      teamPhotoImg.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
    }
  }

  // 5. Hardware-Accelerated IntersectionObserver for Scroll Reveals (60–120 FPS)
  const revealElements = document.querySelectorAll(
    '.reveal-item, .scroll-reveal, .nanotech-stats-grid, .bot-media-grid, .innovations-grid, .video-theater, .contact-card, .social-links-list'
  );

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        entry.target.classList.add('revealed');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // 5B. Dynamic Scroll & "Go In" Perspective Motion for 23430
  const brandNumber = document.querySelector('.brand-giant-number');
  const brandSection = document.getElementById('brand-reveal');

  function updateBrandNumberMotion() {
    if (!brandSection || !brandNumber) return;
    const rect = brandSection.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.top < vh && rect.bottom > 0) {
      // Progress from entry (0) to centered (1)
      const p = Math.max(0, Math.min(1, (vh - rect.top) / (vh * 0.72)));
      const ease = 1 - Math.pow(1 - p, 3);
      // Smooth 3D perspective fly-in ("go in" animation)
      const translateY = (1 - ease) * 40;
      const scale = 0.88 + ease * 0.12;
      const opacity = Math.min(1, ease * 1.5);

      brandNumber.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      brandNumber.style.opacity = `${opacity.toFixed(2)}`;
    }
  }

  // 6. Interactive 3D Card Hover Tilt (Smooth & Throttled via RAF - excludes social cards)
  let tiltRaf = null;
  document.querySelectorAll('[data-tilt]:not(.social-card)').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      tiltRaf = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
      });
    });

    card.addEventListener('mouseleave', () => {
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });

  // 6B. Instant Video Facade Activator (120 FPS Native Scroll)
  const videoFacade = document.getElementById('video-facade');
  const videoWrapper = document.getElementById('video-wrapper');
  if (videoFacade && videoWrapper) {
    videoFacade.addEventListener('click', () => {
      videoWrapper.innerHTML = `
        <iframe
          src="https://www.youtube.com/embed/K8Ak1i--m3w?autoplay=1&rel=0&modestbranding=1"
          title="Night Fury 23430 - Record Match"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="video-iframe"
        ></iframe>
      `;
    });
  }

  // 7. One-Click Copy Email with Instant Feedback
  const copyEmailBtn = document.getElementById('copy-email-btn');
  const copyToast = document.getElementById('copy-toast');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      const email = 'pmssroboticsclub@gmail.com';
      navigator.clipboard.writeText(email).then(() => {
        if (copyToast) {
          copyToast.classList.add('is-visible');
          setTimeout(() => {
            copyToast.classList.remove('is-visible');
          }, 2400);
        }
      }).catch(() => {
        window.location.href = `mailto:${email}`;
      });
    });
  }

  // 8. Mobile Navigation Menu Toggle
  const navToggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('mobile-drawer');
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isOpen);
      mobileNav.classList.toggle('is-open', !isOpen);
      document.body.classList.toggle('no-scroll', !isOpen);
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('is-open');
        document.body.classList.remove('no-scroll');
      });
    });
  }

  // 9. Live Vancouver / PST Clock
  const liveClock = document.getElementById('live-time-pst');
  if (liveClock) {
    function updateClock() {
      const options = {
        timeZone: 'America/Vancouver',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const formatter = new Intl.DateTimeFormat([], options);
      liveClock.textContent = `${formatter.format(new Date())} PST`;
    }
    setInterval(updateClock, 1000);
    updateClock();
  }

  // 10. Unified Scroll Coordinator (Optimized for Lenis & RAF)
  let isScrollTicking = false;
  function onScrollTick() {
    if (!isScrollTicking) {
      requestAnimationFrame(() => {
        updateScrollProgress();
        updateBrandNumberMotion();
        onTeamTrackScroll();
        updateTeamPhotoParallax();
        isScrollTicking = false;
      });
      isScrollTicking = true;
    }
  }

  if (lenis) {
    lenis.on('scroll', onScrollTick);
  } else {
    window.addEventListener('scroll', onScrollTick, { passive: true });
  }
  onScrollTick();
});
