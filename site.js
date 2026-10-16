(() => {
  'use strict';

  const tenure = document.getElementById('ncsoft-tenure');
  if (tenure) {
    const today = new Date();
    const months = Math.max(0, (today.getFullYear() - 2022) * 12 + today.getMonth() - 3);
    tenure.textContent = `${Math.floor(months / 12)}y ${months % 12}m`;
  }

  const grid = document.getElementById('project-grid');
  if (!grid) return;
  const projects = Array.from(grid.querySelectorAll('.project-info'));
  const buttons = Array.from(document.querySelectorAll('[data-filter]'));
  const search = document.getElementById('project-search');
  const clear = document.getElementById('clear-search');
  const sort = document.getElementById('project-sort');
  const category = document.getElementById('project-category');
  const skillSelect = document.getElementById('project-skill');
  const count = document.getElementById('project-count');
  const empty = document.getElementById('project-empty');
  document.querySelector('.project-toolbar').hidden = false;
  document.querySelector('.project-filter').hidden = false;
  document.querySelector('.project-workspace').classList.add('is-interactive');
  document.querySelector('.project-results-bar').hidden = false;
  const validFilters = new Set(buttons.map(button => button.dataset.filter));
  const validSkills = new Set(Array.from(skillSelect.options, option => option.value));
  const projectSkills = new Map(projects.map(project => [project, new Set((project.dataset.skills || '').split(/\s+/).filter(Boolean))]));
  const searchableText = new Map(projects.map(project => [project, project.textContent.normalize('NFKC').toLocaleLowerCase()]));
  let filter = 'all';
  let skill = 'all';

  function updateUrl(push = false) {
    const url = new URL(location.href);
    const values = { category: filter === 'all' ? '' : filter, skill: skill === 'all' ? '' : skill, q: search.value.trim(), sort: sort.value === 'newest' ? '' : sort.value };
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (url.href !== location.href) {
      // Static file previews may restrict History API URL changes.
      try { history[push ? 'pushState' : 'replaceState'](null, '', url); } catch { /* Filtering still works without URL persistence. */ }
    }
  }

  function render() {
    category.value = filter;
    skillSelect.value = skill;
    const terms = search.value.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const project of projects) {
      const matchesCategory = filter === 'all' || project.dataset.category.split(' ').includes(filter);
      const matchesSkill = skill === 'all' || projectSkills.get(project).has(skill);
      const matchesSearch = terms.every(term => searchableText.get(project).includes(term));
      project.hidden = !(matchesCategory && matchesSkill && matchesSearch);
      if (!project.hidden) visible++;
    }
    for (const button of buttons) {
      const active = button.dataset.filter === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    const ordered = projects.slice().sort((a, b) => {
      // Undated ongoing research stays discoverable without inventing a start date.
      const ongoing = Number(b.dataset.status === 'ongoing') - Number(a.dataset.status === 'ongoing');
      return sort.value === 'oldest'
        ? -ongoing || a.dataset.start.localeCompare(b.dataset.start)
        : ongoing || b.dataset.start.localeCompare(a.dataset.start);
    });
    grid.append(...ordered);
    count.textContent = filter === 'all' && skill === 'all' && !terms.length
      ? `전체 ${projects.length}개 프로젝트`
      : `${projects.length}개 중 ${visible}개 프로젝트`;
    empty.hidden = visible !== 0;
    clear.hidden = search.value.length === 0;
  }

  function readUrl() {
    const params = new URLSearchParams(location.search);
    filter = validFilters.has(params.get('category')) ? params.get('category') : 'all';
    skill = validSkills.has(params.get('skill')) ? params.get('skill') : 'all';
    search.value = params.get('q') || '';
    sort.value = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
    render();
  }

  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const project = document.getElementById(id);
    if (!projects.includes(project)) return;
    // Featured links reveal their destination even after a filtered history entry.
    if (project.hidden) {
      filter = 'all';
      skill = 'all';
      search.value = '';
      render();
      updateUrl();
    }
    project.querySelector('details').open = true;
    requestAnimationFrame(() => project.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }

  function removeHash() {
    const url = new URL(location.href);
    url.hash = '';
    try { history.replaceState(null, '', url); } catch { /* Local previews can restrict history. */ }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    removeHash();
    render();
    updateUrl(true);
  }));
  category.addEventListener('change', () => {
    filter = category.value;
    removeHash();
    render();
    updateUrl(true);
  });
  skillSelect.addEventListener('change', () => {
    skill = skillSelect.value;
    removeHash();
    render();
    updateUrl(true);
  });
  search.addEventListener('input', () => { removeHash(); render(); updateUrl(); });
  clear.addEventListener('click', () => {
    search.value = '';
    render();
    updateUrl();
    search.focus();
  });
  sort.addEventListener('change', () => { render(); updateUrl(true); });
  document.getElementById('reset-projects').addEventListener('click', () => {
    filter = 'all';
    skill = 'all';
    search.value = '';
    sort.value = 'newest';
    render();
    updateUrl(true);
    search.focus();
  });
  grid.addEventListener('click', event => {
    const link = event.target.closest('.project-title a');
    if (!link) return;
    link.closest('.project-info').querySelector('details').open = true;
    if (link.hash === location.hash) revealHash();
  });
  window.addEventListener('popstate', () => { readUrl(); revealHash(); });
  window.addEventListener('hashchange', revealHash);
  readUrl();
  revealHash();
})();
