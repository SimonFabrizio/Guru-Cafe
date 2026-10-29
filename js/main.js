// Pestañas del menú: muestra una categoría por vez.
(function () {
  var tabs = document.querySelectorAll('.tab');
  if (!tabs.length) return;

  // Con JS las listas se apilan (ver .panels en el CSS) y se alternan con una
  // clase en vez de "hidden", para poder animar la entrada sin mover la página.
  var panels = document.querySelector('.panels');
  if (panels) {
    panels.classList.add('is-stacked');
    tabs.forEach(function (t) {
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.classList.toggle('is-off', panel.hidden);
      panel.hidden = false;
    });
  }

  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (panels) panel.classList.toggle('is-off', !on);
      else panel.hidden = !on;
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { e.preventDefault(); select(next); next.focus(); }
    });
  });
})();

// Navegación: atracción magnética (solo con mouse) y submenú de la carta.
(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var calm = matchMedia('(prefers-reduced-motion: reduce)');

  // Cada opción se corre unos píxeles hacia el cursor y el texto un poco más,
  // así se siente una capa con peso. Se mide sin el desplazamiento aplicado
  // (offsetLeft/Top) para que el movimiento no se realimente.
  nav.querySelectorAll('.nav__item').forEach(function (el) {
    var label = el.querySelector('.nav__label');
    var frame = 0;
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !fine.matches || calm.matches) return;
      var x = e.clientX, y = e.clientY;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        var box = el.offsetParent.getBoundingClientRect();
        var dx = (x - box.left - el.offsetLeft) / el.offsetWidth * 2 - 1;
        var dy = (y - box.top - el.offsetTop) / el.offsetHeight * 2 - 1;
        dx = Math.max(-1, Math.min(1, dx));
        dy = Math.max(-1, Math.min(1, dy));
        el.classList.add('is-magnet');
        el.style.translate = (dx * 6).toFixed(2) + 'px ' + (dy * 4).toFixed(2) + 'px';
        if (label) label.style.translate = (dx * 3).toFixed(2) + 'px ' + (dy * 2).toFixed(2) + 'px';
      });
    });
    el.addEventListener('pointerleave', function () {
      cancelAnimationFrame(frame);
      el.classList.remove('is-magnet');
      el.style.translate = '';
      if (label) label.style.translate = '';
    });
  });

  // Submenú: se abre al pasar el mouse, con toque o con teclado.
  var group = nav.querySelector('.nav__group');
  if (!group) return;
  var button = group.querySelector('button');
  var links = group.querySelectorAll('.nav__sub a');
  var openedBy = null;
  var closeTimer = 0;

  function open(how) {
    clearTimeout(closeTimer);
    if (how === 'key') group.setAttribute('data-instant', '');
    else group.removeAttribute('data-instant');
    group.setAttribute('data-open', '');
    button.setAttribute('aria-expanded', 'true');
    openedBy = how;
  }
  function close() {
    clearTimeout(closeTimer);
    group.removeAttribute('data-open');
    button.setAttribute('aria-expanded', 'false');
    openedBy = null;
  }

  group.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse' && fine.matches && !openedBy) open('hover');
    else clearTimeout(closeTimer);
  });
  group.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse' && openedBy === 'hover') closeTimer = setTimeout(close, 160);
  });

  button.addEventListener('click', function (e) {
    var byKey = e.detail === 0;
    if (openedBy === 'hover') { openedBy = 'click'; return; }
    if (openedBy) close(); else open(byKey ? 'key' : 'click');
  });
  group.addEventListener('keydown', function (e) {
    var i = Array.prototype.indexOf.call(links, document.activeElement);
    if (e.key === 'Escape' && openedBy) { close(); button.focus(); }
    if (e.key === 'ArrowDown' && e.target === button) {
      e.preventDefault();
      if (!openedBy) open('key');
      links[0].focus();
    }
    if (i < 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); links[(i + 1) % links.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i ? links[i - 1] : button).focus(); }
  });
  group.addEventListener('focusout', function (e) {
    if (!group.contains(e.relatedTarget)) close();
  });
  document.addEventListener('pointerdown', function (e) {
    if (openedBy && !group.contains(e.target)) close();
  });

  links.forEach(function (link) {
    link.addEventListener('click', function () {
      var tab = link.getAttribute('data-tab');
      if (tab) document.getElementById(tab).click();
      close();
    });
  });
})();

// Entrada de secciones: al llegar a cada sección, sus bloques aparecen en cascada.
// Solo se esconden los que al cargar están debajo del borde de la pantalla:
// sin JS todo se ve normal y lo que ya está a la vista no parpadea.
(function () {
  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length || !('IntersectionObserver' in window)) return;

  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      // Los que entran juntos salen escalonados, en el orden de la página
      entry.target.style.transitionDelay = Math.min(n++ * 70, 280) + 'ms';
      entry.target.classList.remove('is-pending');
    });
  }, { threshold: 0.2 });

  var fold = window.innerHeight;
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top < fold) return;
    el.classList.add('is-pending');
    io.observe(el);
  });
})();
