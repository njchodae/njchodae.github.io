
(function($) {

	var	$window = $(window),
		$body = $('body'),
		$wrapper = $('#page-wrapper'),
		$banner = $('#banner'),
		$header = $('#header');

	var heroScrollRaf = null;
	var heroScrollActive = false;

	// Breakpoints.
		breakpoints({
			xlarge:   [ '1281px',  '1680px' ],
			large:    [ '981px',   '1280px' ],
			medium:   [ '737px',   '980px'  ],
			small:    [ '481px',   '736px'  ],
			xsmall:   [ null,      '480px'  ]
		});

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Mobile?
		if (browser.mobile)
			$body.addClass('is-mobile');
		else {

			breakpoints.on('>medium', function() {
				$body.removeClass('is-mobile');
			});

			breakpoints.on('<=medium', function() {
				$body.addClass('is-mobile');
			});

		}

	// Scrolly.
		$('.scrolly').not('.hero .scrolly')
			.scrolly({
				speed: 1500,
				offset: $header.outerHeight()
			});

		$('.hero .scrolly')
			.on('click', function(event) {
				var $target = $($(this).attr('href'));
				if ($target.length === 0)
					return;

				event.preventDefault();

				var targetTop = $target.offset().top - $header.outerHeight();
				var startY = window.pageYOffset || document.documentElement.scrollTop;
				var targetY = Math.max(targetTop, 0);
				var duration = 6000;
				var startTime = performance.now();

				var cancelHeroScroll = function() {
					if (heroScrollRaf)
						cancelAnimationFrame(heroScrollRaf);
					heroScrollRaf = null;
					heroScrollActive = false;
					document.documentElement.classList.remove('hero-scroll-active');
					window.removeEventListener('wheel', cancelHeroScroll);
					window.removeEventListener('touchstart', cancelHeroScroll);
					window.removeEventListener('keydown', cancelHeroScroll);
				};

				if (heroScrollActive)
					cancelHeroScroll();

				if (startY === targetY)
					return;

				heroScrollActive = true;
				document.documentElement.classList.add('hero-scroll-active');

				var step = function(now) {
					var t = (now - startTime) / duration;
					if (t >= 1) {
						window.scrollTo(0, targetY);
						cancelHeroScroll();
						return;
					}

					var y = startY + (targetY - startY) * t;
					window.scrollTo(0, y);
					heroScrollRaf = window.requestAnimationFrame(step);
				};

				window.addEventListener('wheel', cancelHeroScroll);
				window.addEventListener('touchstart', cancelHeroScroll);
				window.addEventListener('keydown', cancelHeroScroll);
				heroScrollRaf = window.requestAnimationFrame(step);
			});

	// Menu.
		$('#menu')
			.append('<a href="#menu" class="close"></a>')
			.appendTo($body)
			.panel({
				delay: 500,
				hideOnClick: true,
				hideOnSwipe: true,
				resetScroll: true,
				resetForms: true,
				side: 'right',
				target: $body,
				visibleClass: 'is-menu-visible'
			});

	// Header.
		if ($banner.length > 0
		&&	$header.hasClass('alt')) {

			$window.on('resize', function() { $window.trigger('scroll'); });

			$banner.scrollex({
				bottom:		$header.outerHeight() + 1,
				terminate:	function() { $header.removeClass('alt'); },
				enter:		function() { $header.addClass('alt'); },
				leave:		function() { $header.removeClass('alt'); }
			});

		} else {
			// Hide header when scrolled down, show when at top
			$window.on('scroll', function () {
				if ($window.scrollTop() === 0) {
				$header.removeClass('hidden');
				} else {
				$header.addClass('hidden');
				}
			});
		}

	// Scroll-driven video mask for newsletter hero.
		(function() {
			var hero = document.querySelector('.hero');
			if (!hero)
				return;

			var maskMax = 30; // LOVE/BEYOND Starting size (vh)
			var maskMin = 1.5;  // LOVE minimum size at progress=0.6 (vh)

			var start = 0;
			var end = 0;
			var ticking = false;

			// utils
			var clamp01 = function(v){ return Math.max(0, Math.min(1, v)); };
			var lerp = function(a,b,t){ return a + (b-a)*t; };
			var segment = function(p,a,b){ return clamp01((p-a)/(b-a)); };

			// easing
			var easeOutCubic = function(t){ return 1 - Math.pow(1 - t, 3); };
			var easeInCubic  = function(t){ return t*t*t; };

			var updateMetrics = function() {
				start = hero.offsetTop;
				end = hero.offsetTop + hero.offsetHeight - window.innerHeight;
			};

			var updateProgress = function() {
				var scrollY = window.pageYOffset || document.documentElement.scrollTop;
				var range = Math.max(end - start, 1);
				var p = clamp01((scrollY - start) / range);

				// -------------------------
				// LOVE
				// 0.00~0.60 : size shrinks to maskMin
				// 0.60~0.80 : move up + fade out (size stays maskMin)
				// -------------------------
				var loveShrinkT = easeOutCubic(segment(p, 0.00, 0.50));   // 0..1
				var loveExitT   = easeInCubic(segment(p, 0.45, 1.0));    // 0..1

				var loveSize = lerp(maskMax, maskMin, loveShrinkT);       // vh
				
				if (p >= 0.70) loveSize = maskMin;

				var loveTy = lerp(0, -window.innerHeight * 0.90, loveExitT); // px
				var loveOp = lerp(1, 0, loveExitT);

				// -------------------------
				// BEYOND
				// <0.60 : below + invisible
				// 0.60~0.80 : enter from below to center + shrink to maskMin
				// 0.80~0.90 : move up + fade out (size stays maskMin)
				// -------------------------
				var beyondEnterT = easeOutCubic(segment(p, 0.20, 0.80));  // 0..1
				var beyondExitT  = easeInCubic(segment(p, 0.80, 1.5));   // 0..1

				var beyondSize = lerp(maskMax, maskMin, beyondEnterT);    // vh
				if (p >= 0.80) beyondSize = maskMin;

				
				var beyondTyEnter = lerp(window.innerHeight * 0.45, 0, beyondEnterT);
				
				var beyondTyExit  = lerp(0, -window.innerHeight * 0.90, beyondExitT);
				var beyondTy = (p < 0.80) ? beyondTyEnter : beyondTyExit;

				// opacity: enter에서 0→1, exit에서 1→0
				var beyondOp = lerp(0, 1, beyondEnterT) * lerp(1, 0, beyondExitT);

				// -------------------------
				// BORDERS
				// <0.80 : below + invisible
				// 0.80~0.90 : enter from below to center + shrink to maskMin
				// 0.90~1.00 : move up + fade out (size stays maskMin)
				// -------------------------
				var bordersEnterT = easeOutCubic(segment(p, 0.40, 0.80)); // 0..1
				var bordersExitT  = easeInCubic(segment(p, 0.80, 1.20));  // 0..1

				var bordersSize = lerp(maskMax, maskMin, bordersEnterT);  // vh
				if (p >= 0.80) bordersSize = maskMin;

				var bordersTyEnter = lerp(window.innerHeight * 0.45, 0, bordersEnterT);
				var bordersTyExit  = lerp(0, -window.innerHeight * 0.90, bordersExitT);
				var bordersTy = (p < 0.80) ? bordersTyEnter : bordersTyExit;

				var bordersOp = lerp(0, 1, bordersEnterT) * lerp(1, 0, bordersExitT);

				// -------------------------
				// OVERLAY ALPHA 
				// -------------------------
				var alpha = Math.min( Math.min(p, 0.6) * 1.6, 0.9);


				hero.style.setProperty('--hero-mask-alpha', alpha.toFixed(3));

				hero.style.setProperty('--love-size', loveSize.toFixed(2) + 'vh');
				hero.style.setProperty('--love-ty', loveTy.toFixed(1) + 'px');
				hero.style.setProperty('--love-op', loveOp.toFixed(3));

				hero.style.setProperty('--beyond-size', beyondSize.toFixed(2) + 'vh');
				hero.style.setProperty('--beyond-ty', beyondTy.toFixed(1) + 'px');
				hero.style.setProperty('--beyond-op', beyondOp.toFixed(3));

				hero.style.setProperty('--borders-size', bordersSize.toFixed(2) + 'vh');
				hero.style.setProperty('--borders-ty', bordersTy.toFixed(1) + 'px');
				hero.style.setProperty('--borders-op', bordersOp.toFixed(3));
			};

			var onScroll = function() {
				if (ticking)
					return;

				ticking = true;
				window.requestAnimationFrame(function() {
					updateProgress();
					ticking = false;
				});
			};

			updateMetrics();
			updateProgress();

			$window.on('scroll', onScroll);
			$window.on('resize', function() {
				updateMetrics();
				onScroll();
			});
		})();

})(jQuery);
