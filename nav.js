(function () {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;

    var page = window.location.pathname.split('/').pop() || 'index.html';

    nav.innerHTML =
        '<a href="index.html" class="nav-logo">The Verdant Curse</a>' +
        '<button class="nav-hamburger" aria-label="Toggle navigation" aria-expanded="false">' +
        '<span></span><span></span><span></span></button>' +
        '<ul class="nav-links">' +
        '<li><a href="primer.html">The World</a></li>' +
        '<li><a href="handbook.html">Handbook</a></li>' +
        '<li><a href="character-builder.html">Builder</a></li>' +
        '<li><span class="nav-disabled">Tabletop</span></li>' +
        '</ul>';

    nav.querySelectorAll('.nav-links a').forEach(function (a) {
        if (a.getAttribute('href') === page) a.classList.add('nav-active');
    });

    var btn = nav.querySelector('.nav-hamburger');

    btn.addEventListener('click', function () {
        var open = nav.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.querySelectorAll('.nav-links a').forEach(function (link) {
        link.addEventListener('click', function () {
            nav.classList.remove('nav-open');
            btn.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('click', function (e) {
        if (nav.classList.contains('nav-open') && !nav.contains(e.target)) {
            nav.classList.remove('nav-open');
            btn.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            nav.classList.remove('nav-open');
            btn.setAttribute('aria-expanded', 'false');
        }
    });
}());
