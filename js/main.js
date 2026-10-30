var fine = matchMedia('(hover: hover) and (pointer: fine)');
var calm = matchMedia('(prefers-reduced-motion: reduce)');

// Encabezado: transparente sobre el inicio, esmerilado apenas se baja.
(function () {
  var header = document.querySelector('[data-header]');
  if (!header) return;
  var ticking = false;
  function update() {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

// Menú hamburguesa del celular.
(function () {
  var header = document.querySelector('[data-header]');
  var burger = document.querySelector('.burger');
  if (!header || !burger) return;
  var drawer = document.getElementById(burger.getAttribute('aria-controls'));

  function set(open) {
    header.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    drawer.inert = !open;
  }
  set(false);

  burger.addEventListener('click', function () {
    set(burger.getAttribute('aria-expanded') !== 'true');
  });
  drawer.addEventListener('click', function (e) {
    if (e.target.closest('a')) set(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { set(false); burger.focus(); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (header.classList.contains('is-open') && !header.contains(e.target)) set(false);
  });
  // Si se agranda la ventana a tamaño compu, el cajón no queda abierto por detrás
  matchMedia('(min-width: 900px)').addEventListener('change', function () { set(false); });
})();

// Atracción magnética: el elemento se corre unos píxeles hacia el cursor
// (solo con mouse). Se mide sin el desplazamiento aplicado (offsetLeft/Top)
// para que el movimiento no se realimente.
function magnet(el, strength, label) {
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
      el.style.translate = (dx * strength[0]).toFixed(2) + 'px ' + (dy * strength[1]).toFixed(2) + 'px';
      if (label) label.style.translate = (dx * strength[0] / 2).toFixed(2) + 'px ' + (dy * strength[1] / 2).toFixed(2) + 'px';
    });
  });
  el.addEventListener('pointerleave', function () {
    cancelAnimationFrame(frame);
    el.classList.remove('is-magnet');
    el.style.translate = '';
    if (label) label.style.translate = '';
  });
}
document.querySelectorAll('.nav__item').forEach(function (el) {
  magnet(el, [6, 4], el.querySelector('.nav__label'));
});
document.querySelectorAll('[data-magnet]').forEach(function (el) {
  magnet(el, [8, 8]);
});

// Submenú de la carta: se abre al pasar el mouse, con toque o con teclado.
(function () {
  var group = document.querySelector('.nav__group');
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
  links.forEach(function (link) { link.addEventListener('click', close); });
})();

// Filtros de la carta: las tarjetas que salen se apagan y las que quedan
// vuelven a entrar en cascada. Los enlaces con data-filter (submenú y cajón)
// también eligen la categoría.
(function () {
  var buttons = document.querySelectorAll('.filter');
  var cards = document.querySelectorAll('.card');
  var status = document.querySelector('[data-filter-status]');
  if (!buttons.length) return;
  var names = { todos: 'todos los productos', cafes: 'cafés', vermu: 'vermú', comida: 'comida' };
  var current = 'todos';
  var timer = 0;

  function apply(cat) {
    if (cat === current) return;
    current = cat;
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-filter') === cat ? 'true' : 'false');
    });
    var shown = Array.prototype.filter.call(cards, function (c) {
      return cat === 'todos' || c.getAttribute('data-cat') === cat;
    });
    if (status) status.textContent = 'Mostrando ' + names[cat] + ': ' + shown.length;

    // Las tarjetas que todavía esperaban su entrada por scroll ya no esperan
    cards.forEach(function (c) { c.classList.remove('is-pending'); c.style.transitionDelay = ''; });

    clearTimeout(timer);
    if (calm.matches) {
      cards.forEach(function (c) { c.hidden = shown.indexOf(c) < 0; });
      return;
    }
    cards.forEach(function (c) { if (!c.hidden) c.classList.add('is-out'); });
    timer = setTimeout(function () {
      cards.forEach(function (c) {
        c.classList.remove('is-out');
        c.hidden = shown.indexOf(c) < 0;
      });
      shown.forEach(function (c, i) {
        c.classList.add('is-in');
        c.style.transitionDelay = Math.min(i * 50, 300) + 'ms';
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          shown.forEach(function (c) { c.classList.remove('is-in'); });
        });
      });
    }, 180);
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () { apply(b.getAttribute('data-filter')); });
  });
  document.querySelectorAll('a[data-filter]').forEach(function (a) {
    a.addEventListener('click', function () { apply(a.getAttribute('data-filter')); });
  });
})();

// Parálax del inicio: el fondo baja más lento que la página y el vaso
// sube un poco más rápido, así se sienten capas. Con el mouse, el vaso
// además se inclina hacia el cursor.
(function () {
  var hero = document.querySelector('.hero');
  var bg = document.querySelector('[data-parallax]');
  var cup = document.querySelector('[data-tilt]');
  if (!hero || !bg) return;
  var speed = parseFloat(bg.getAttribute('data-parallax')) || 0.3;
  var ticking = false;

  function update() {
    ticking = false;
    if (calm.matches) return;
    var y = window.scrollY;
    if (y > hero.offsetHeight) return;
    bg.style.transform = 'translate3d(0,' + (y * speed).toFixed(1) + 'px,0)';
    if (cup) cup.style.setProperty('--py', (y * -0.12).toFixed(1) + 'px');
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  if (!cup) return;
  hero.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !fine.matches || calm.matches) return;
    var box = hero.getBoundingClientRect();
    var dx = (e.clientX - box.left) / box.width - 0.5;
    var dy = (e.clientY - box.top) / box.height - 0.5;
    cup.style.setProperty('--ry', (dx * 10).toFixed(2) + 'deg');
    cup.style.setProperty('--rx', (dy * -8).toFixed(2) + 'deg');
  });
  hero.addEventListener('pointerleave', function () {
    cup.style.setProperty('--ry', '0deg');
    cup.style.setProperty('--rx', '0deg');
  });
})();

// "Abierto ahora": compara la hora de Argentina con los horarios de la página
// (data-days: 0 = domingo; data-open / data-close: "8:00").
(function () {
  var badge = document.querySelector('[data-status]');
  var rows = document.querySelectorAll('.hours [data-days]');
  if (!badge || !rows.length) return;
  var text = badge.querySelector('[data-status-text]');
  var dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function toMin(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +(p[1] || 0); }
  function now() {
    // Hora de Berisso, aunque el que mira esté en otro huso
    var parts = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    return { day: day, min: +parts.hour * 60 + +parts.minute };
  }
  function hoursFor(day) {
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-days').split(',').indexOf(String(day)) >= 0) {
        return { row: rows[i], open: rows[i].getAttribute('data-open'), close: rows[i].getAttribute('data-close') };
      }
    }
    return null;
  }

  function update() {
    var t = now();
    var today = hoursFor(t.day);
    rows.forEach(function (r) { r.classList.toggle('is-today', !!today && r === today.row); });
    var isOpen = today && t.min >= toMin(today.open) && t.min < toMin(today.close);
    badge.classList.toggle('is-open', !!isOpen);
    if (isOpen) {
      text.textContent = 'Abierto ahora · cierra a las ' + today.close;
    } else if (today && t.min < toMin(today.open)) {
      text.textContent = 'Cerrado · abre hoy a las ' + today.open;
    } else {
      // Busca el próximo día con horario
      for (var d = 1; d <= 7; d++) {
        var next = hoursFor((t.day + d) % 7);
        if (next) {
          text.textContent = 'Cerrado · abre ' + (d === 1 ? 'mañana' : 'el ' + dayNames[(t.day + d) % 7]) + ' a las ' + next.open;
          break;
        }
      }
    }
    badge.hidden = false;
  }
  try { update(); setInterval(update, 60000); } catch (e) { /* sin Intl: no se muestra el aviso */ }
})();

// Año del pie
(function () {
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
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
      // Los que entran juntos salen escalonados, 50 ms uno de otro, en el orden de
      // la página; con tope para que el último de un grupo largo no se haga esperar
      entry.target.style.transitionDelay = Math.min(n++ * 50, 300) + 'ms';
      entry.target.classList.remove('is-pending');
      // El retraso es solo para la entrada: después, el hover responde al instante
      setTimeout(function () { entry.target.style.transitionDelay = ''; }, 1300);
    });
  }, { threshold: 0.15 });

  var fold = window.innerHeight;
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top < fold) return;
    el.classList.add('is-pending');
    io.observe(el);
  });
})();
