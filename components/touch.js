/*
 * @nTouch.js - the nRelate mobile utility library
 * @version 2.0.1
 *
 * @author Bo Wang (bo.wang@nrelate.com)
 * @forked from Swipe.js (https://github.com/thebird/Swipe)
 *
 * Copyright (c) 2014 nRelate
 *
 */

function nTouch(container, options) {

	"use strict";

	var meta = document.createElement('meta'),
		node = document.getElementsByTagName('meta')[0];

	meta.setAttribute('name', 'viewport');
	meta.setAttribute('content', 'initial-scale=1');

	node.parentNode.insertBefore(meta, node);

	// utilities
	var noop = function() {}; // simple no operation function
	var offloadFn = function(fn) {
		setTimeout(fn || noop, 0)
	}; // offload a functions execution

	// check browser capabilities
	var browser = {
		addEventListener: !!window.addEventListener,
		touch: ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch,
		transitions: (function(temp) {
			var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
			for (var i in props)
				if (temp.style[props[i]] !== undefined) return true;
			return false;
		})(document.createElement('swipe'))
	};

	// quit if no root inner
	if (!container) return;

	// get the parent of the "slides", in this case, each unit
	var inner = nRelate.xgebcn('nr_inner', 'div', container)[0],
		title = nRelate.xgebcn('nr_title', 'h3', container)[0],
		about = nRelate.xgebcn('nr_about', 'span', container)[0];

	inner.removeChild(inner.lastChild);

	var slides = inner.children, // cache slides
		length = slides.length,
		slidePos, width, innerWidth, outerWidth, offset;

	options = options || {};
	var index = parseInt(options.startSlide, 10) || 0;
	var speed = options.speed || 300;
	var reveal = options.reveal || 2; // reveal is the number of complete units being shown
	var preview = options.preview || 0.4; // how much the preview should be in total
	var hidden = length - reveal - 1;
	var smoothness = options.smoothness || 100;
	options.continuous = options.continuous !== undefined ? options.continuous : true;
	options.sticky = options.sticky !== undefined ? options.sticky : true;

	function setup() {

		// set continuous to false if only one slide
		if (slides.length < 2) options.continuous = false;

		//special case if two slides
		if (browser.transitions && options.continuous && slides.length < 3) {
			inner.appendChild(slides[0].cloneNode(true));
			inner.appendChild(inner.children[1].cloneNode(true));
			slides = inner.children;
		}

		// create an array to store current positions of each slide
		slidePos = new Array(slides.length);

		// start detecting orientation
		var orientation = window.orientation;

		if (orientation === 0 || orientation === 180) orientation = 'portrait';
		else if (Math.abs(orientation) === 90) orientation = 'landscape';
		else {
			// JavaScript orientation not supported. Work it out.
			if (window.innerWidth > window.innerHeight)
				orientation = 'landscape';
			else
				orientation = 'portrait';
		}

		// alert(orientation + ': ' + screen.width);

		outerWidth = screen.width;

		// https://github.com/ten1seven/jRespond/issues/1

		if (window.innerWidth > window.innerHeight) {
			// Landscape. Take larger of the two dimensions.
			outerWidth = (screen.width > screen.height) ? screen.width : screen.height;
		} else if (window.innerHeight < window.innerWidth) {
			// Take smaller of the two dimensions
			outerWidth = (screen.width > screen.height) ? screen.height : screen.width;
		}

		// decide the screen width, container width, and unit width
		innerWidth = container.parentNode.getBoundingClientRect().width || container.parentNode.offsetWidth;
		width = Math.round(outerWidth / (reveal + preview));
		offset = Math.round((outerWidth - innerWidth) / 2);

		console.log(offset + ' ' + innerWidth + ' ' + outerWidth);

		// deal with the case that padding is used on parent element, set a default offset
		if (offset === 0) {
			offset = 15; // give it a default padding to show preview of the previous unit
		}

		console.log(offset + ' ' + innerWidth + ' ' + outerWidth);

		/*
		 * reposition container and set width equal to screen size, try not give container a fixed width, same thing for offset
		 * trade off is if widget is placed in a not-full-width containing div, units won't extend to the edge
		 */

		translate(container, -offset, 0);

		container.style.width = outerWidth + 'px';
		container.style.overflow = "hidden";

		// set width for the slider container, which is nr_inner, *10 to make sure extra padding/margin won't break layout
		title.style.marginLeft = offset + 'px';
		inner.style.width = (slides.length * width * 2) + 'px';
		inner.style.marginLeft = offset > options.leftPos ? offset : options.leftPos + 'px';
		about.style.right = offset > options.leftPos ? offset : options.leftPos + 'px';
		about.style.width = innerWidth + 'px';

		// reposition unit after orientation changes
		inner.style.left = -width * headIndex + 'px';

		// stack inners
		var pos = slides.length;

		// set slide width and data-index
		while (pos--) {
			var slide = slides[pos];

			slide.style.width = width + 'px';
			slide.setAttribute('data-index', pos);

			if (browser.transitions) {
				// slide.style.left = (pos * -width) + 'px';
				// move(pos, index > pos ? -width : (index < pos ? width : 0), 0);

				/* the second parameter being the amount of distance moved for that single unit, 
				 * it will also be stored as the CURRENT position for that unit
				 */
				move(pos, 0, 0);
			}
		}

		// reposition inners before and after index
		if (options.continuous && browser.transitions) {
			// move(circle(index-1), -width, 0);
			// move(circle(index+1), width, 0);
		}

		// if (!browser.transitions) inner.style.left = (index * -width) + 'px';
		if (!browser.transitions) inner.style.left = (0) + 'px';
	}

	function circulate(direction, num) {
		for (var i = 0; i < num; i++) {
			if (direction === 'left')
				inner.insertBefore(slides[0], slides[length - 1].nextSibling);
			if (direction === 'right')
				inner.insertBefore(slides[length - 1], slides[0]);
		}
	}

	function prev() {
		if (options.continuous) slide(index - 1);
		else if (index) slide(index - 1);
	}

	function next() {
		if (options.continuous) slide(index + 1);
		else if (index < slides.length - 1) slide(index + 1);
	}

	function circle(index) {
		// a simple positive modulo using slides.length
		return (slides.length + (index % slides.length)) % slides.length;
	}

	function slide(to, slideSpeed) {
		// do nothing if already on requested slide

		if (index == to) return;

		if (browser.transitions) {
			var direction = Math.abs(index - to) / (index - to); // 1: backward, -1: forward

			// get the actual position of the slide
			if (options.continuous) {
				var natural_direction = direction;
				direction = -slidePos[circle(to)] / width;

				// if going forward but to < index, use to = slides.length + to
				// if going backward but to > index, use to = -slides.length + to
				if (direction !== natural_direction) to = -direction * slides.length + to;
			}

			var diff = Math.abs(index - to) - 1;

			// move all the slides between index and to in the right direction
			while (diff--) move(circle((to > index ? to : index) - diff - 1), width * direction, 0);

			to = circle(to);
			move(index, width * direction, slideSpeed || speed);
			move(to, 0, slideSpeed || speed);

			if (options.continuous) move(circle(to - direction), -(width * direction), 0); // we need to get the next in place
		} else {
			to = circle(to);
			animate(index * -width, to * -width, slideSpeed || speed);
			//no fallback for a circular continuous if the browser does not accept transitions
		}

		index = to;
		offloadFn(options.callback && options.callback(index, slides[index]));
	}

	function move(index, dist, speed) {
		// translate(index, dist, speed);
		translate(slides[index], dist, speed);
		slidePos[index] = dist;

		console.log(dist);
	}

	function translate(node, dist, speed) {
		var style = node && node.style;

		if (!style) return;

		style.webkitTransitionDuration =
			style.MozTransitionDuration =
			style.msTransitionDuration =
			style.OTransitionDuration =
			style.transitionDuration = speed + 'ms';

		style.webkitTransform = 'translate(' + dist + 'px,0)' + 'translateZ(0)';
		style.msTransform =
			style.MozTransform =
			style.OTransform = 'translateX(' + dist + 'px)';
	}

	function animate(from, to, speed) {
		// if not an animation, just reposition
		if (!speed) {
			inner.style.left = to + 'px';
			return;
		}

		var start = +new Date;
		var timer = setInterval(function() {
			var timeElap = +new Date - start;

			if (timeElap > speed) {
				inner.style.left = to + 'px';

				if (delay) begin();

				options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);
				clearInterval(timer);

				return;
			}

			inner.style.left = (((to - from) * (Math.floor((timeElap / speed) * 100) / 100)) + from) + 'px';
		}, 4);
	}

	// setup auto slideshow
	var delay = options.auto || 0;
	var interval;

	function begin() {
		interval = setTimeout(next, delay);
	}

	function stop() {
		delay = 0;
		clearTimeout(interval);
	}

	// setup initial vars
	var start = {};
	var delta = {};
	var isScrolling;
	var lastLeft = 0;
	var headIndex = 0;

	// setup event capturing
	var events = {
		handleEvent: function(event) {
			switch (event.type) {
				case 'touchstart':
					this.start(event);
					break;
				case 'touchmove':
					this.move(event);
					break;
				case 'touchend':
					offloadFn(this.end(event));
					break;
				case 'webkitTransitionEnd':
				case 'msTransitionEnd':
				case 'oTransitionEnd':
				case 'otransitionend':
				case 'transitionend':
					offloadFn(this.transitionEnd(event));
					break;
				case 'resize':
					offloadFn(setup);
					break;
			}

			if (options.stopPropagation) event.stopPropagation();
		},
		start: function(event) {
			var touches = event.touches[0];
			// measure start values
			start = {
				// get initial touch coords
				x: touches.pageX,
				y: touches.pageY,

				// store time to determine touch duration
				time: +new Date
			};

			// used for testing first move event
			isScrolling = undefined;

			// reset delta and end measurements
			delta = {};

			// set the last position for the swipe
			lastLeft = parseInt((inner.style.left.split('px')[0]), 10) || 0;
			// lastLeft = -width*headIndex;

			// attach touchmove and touchend listeners
			inner.addEventListener('touchmove', this, false);
			inner.addEventListener('touchend', this, false);
		},
		move: function(event) {
			// ensure swiping with one touch and not pinching
			if (event.touches.length > 1 || event.scale && event.scale !== 1) return
			if (options.disableScroll) event.preventDefault();

			var touches = event.touches[0];

			// measure change in x and y
			delta = {
				x: touches.pageX - start.x,
				y: touches.pageY - start.y
			}

			// determine if scrolling test has run - one time test
			if (typeof isScrolling == 'undefined') {
				isScrolling = !!(isScrolling || Math.abs(delta.x) < Math.abs(delta.y));
			}

			// if user is not trying to scroll vertically
			if (!isScrolling) {
				// prevent native scrolling
				event.preventDefault();

				// stop slideshow
				stop();

				// move the entire widget with finger gesture, maybe hoist to top
				inner.style.left = delta.x + lastLeft + 'px';
			}
		},
		end: function(event) {
			// measure duration
			var duration = +new Date - start.time;

			// determine if slide attempt triggers next/prev slide
			var isValidSlide =
				Number(duration) < 250 // if slide duration is less than 250ms
				&& Math.abs(delta.x) > 20 // and if slide amt is greater than 20px
				|| Math.abs(delta.x) > width / 2; // or if slide amt is greater than half the width

			var velocity = delta.x / duration;
			var inertia = velocity * Math.abs(velocity) * smoothness;
			var elapse = 2 * Math.abs(velocity) * smoothness;

			console.log('distance: ' + Math.abs(delta.x) + '	duration: ' + duration + '	velocity: ' + velocity);
			console.log('inertia: ' + inertia + '	elapse: ' + elapse);

			// determine if slide attempt is past start and end
			var isPastBounds = !index && delta.x > 0 // if first slide and slide amt is greater than 0
				|| index == slides.length - 1 && delta.x < 0; // or if last slide and slide amt is less than 0

			if (options.continuous) isPastBounds = false;

			// determine direction of swipe (true:right, false:left)
			var direction = delta.x < 0;

			// if not scrolling vertically
			if (!isScrolling) {
				if (isValidSlide) {
					// this variable keep how many units to slide
					var swiped = options.sticky ? 1 : Math.round(Math.abs(delta.x + inertia) / width);

					// what if swiped is larger than the number of total units?  swiped <= hidden
					swiped = swiped < hidden ? swiped : hidden;
					console.log('hidden: ' + hidden + ' headIndex: ' + headIndex + ' swiped: ' + swiped + '			precise: ' + Math.abs(delta.x + inertia) / width);

					// circulate units if necessary
					if (direction) {
						if (headIndex + swiped > hidden) {
							// reached left bound
							if (options.continuous) {
								circulate('left', hidden);
								animate(lastLeft + delta.x, lastLeft + delta.x + hidden * width);
								animate(lastLeft + delta.x + hidden * width, lastLeft + delta.x + hidden * width + inertia, elapse);
							} else {
								animate(lastLeft + delta.x, lastLeft + delta.x + inertia, elapse);
							}
						} else {
							// emulate inertia, apply law of physics
							animate(lastLeft + delta.x, lastLeft + delta.x + inertia, elapse);
						}
					} else {
						if (headIndex - swiped < 0) {
							// reached right bound
							if (options.continuous) {
								circulate('right', hidden);
								animate(lastLeft + delta.x, lastLeft + delta.x - hidden * width);
								animate(lastLeft + delta.x - hidden * width, lastLeft + delta.x - hidden * width + inertia, elapse);
							} else {
								animate(lastLeft + delta.x, lastLeft + delta.x + inertia, elapse);
							}
						} else {
							// emulate inertia, apply law of physics
							animate(lastLeft + delta.x, lastLeft + delta.x + inertia, elapse);
						}
					}

					setTimeout(function() {
						// if going left
						if (direction) {
							if (options.continuous) {
								if (headIndex + swiped > hidden) {
									animate(lastLeft + delta.x + hidden * width + inertia, lastLeft + hidden * width - swiped * width, speed);
									headIndex = headIndex - hidden;
								} else {
									animate(lastLeft + delta.x + inertia, lastLeft - swiped * width, speed);
								}
							} else {
								if (headIndex + swiped > hidden) {
									animate(lastLeft + delta.x + inertia, -(hidden + 1) * width, speed);
									headIndex = hidden - swiped + 1;
								} else {
									animate(lastLeft + delta.x + inertia, lastLeft - swiped * width, speed);
								}
							}

							headIndex = headIndex + swiped;
						} else {
							// if going right
							if (options.continuous) {
								if (headIndex - swiped < 0) {
									animate(lastLeft + delta.x - hidden * width + inertia, lastLeft - hidden * width + swiped * width, speed);
									headIndex = headIndex + hidden;
								} else {
									animate(lastLeft + delta.x + inertia, lastLeft + swiped * width, speed);
								}
							} else {
								if (headIndex - swiped < 0) {
									animate(lastLeft + delta.x + inertia, 0, speed);
									headIndex = swiped;
								} else {
									animate(lastLeft + delta.x + inertia, lastLeft + swiped * width, speed);
								}
							}

							headIndex = headIndex - swiped;
						}
					}, elapse);

				} else {
					// return of original position for invalid swipe regardless continuous or not
					animate(lastLeft + delta.x, lastLeft, speed);
				}
			}

			// console.log(headIndex + ': ' + headIndex*width);

			// kill touchmove and touchend event listeners until touchstart called again
			inner.removeEventListener('touchmove', events, false);
			inner.removeEventListener('touchend', events, false);
		},
		transitionEnd: function(event) {
			if (parseInt(event.target.getAttribute('data-index'), 10) == index) {
				if (delay) begin();
				options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);
			}
		}
	}

	// trigger setup
	setup();

	function restoreZoom() {
		var landscape = Math.abs(window.orientation) === 90,
			screenWidth;

		if (landscape) {
			// Landscape. Take larger of the two dimensions.
			screenWidth = (screen.width > screen.height) ? screen.width : screen.height;
		} else {
			// Take smaller of the two dimensions
			screenWidth = (screen.width > screen.height) ? screen.height : screen.width;
		}

		outerWidth = screenWidth;

		width = Math.round(outerWidth / (reveal + preview));
		inner.style.left = -width * headIndex + 'px';

		// alert( outerWidth + ' : ' + width );

		container.style.width = outerWidth + 'px';

		// set slide width and data-index

		var pos = slides.length;

		while (pos--) {
			var slide = slides[pos];
			slide.style.width = width + 'px';
		}
	}

	// start auto slideshow if applicable
	if (delay) begin();

	// add event listeners
	if (browser.addEventListener) {
		// set touchstart event on inner
		if (browser.touch) inner.addEventListener('touchstart', events, false);

		if (browser.transitions) {
			inner.addEventListener('webkitTransitionEnd', events, false);
			inner.addEventListener('msTransitionEnd', events, false);
			inner.addEventListener('oTransitionEnd', events, false);
			inner.addEventListener('otransitionend', events, false);
			inner.addEventListener('transitionend', events, false);
		}

		// set resize event on window
		window.addEventListener('resize', events, false);
		// window.addEventListener('orientationchange', restoreZoom, false);

	} else {
		window.onresize = function() {
			setup();
		}; // to play nice with old IE
	}

	// expose the nTouch API
	return {
		setup: function() {
			setup();
		},
		slide: function(to, speed) {
			// cancel slideshow
			stop();
			slide(to, speed);
		},
		prev: function() {
			// cancel slideshow
			stop();
			prev();
		},
		next: function() {
			// cancel slideshow
			stop();
			next();
		},
		stop: function() {
			// cancel slideshow
			stop();
		},
		getPos: function() {
			// return current index position
			return index;
		},
		getNumSlides: function() {
			// return total number of slides
			return length;
		},
		kill: function() {
			// cancel slideshow
			stop();

			// reset inner
			inner.style.width = '';
			inner.style.left = '';

			// reset slides
			var pos = slides.length;
			while (pos--) {
				var slide = slides[pos];
				slide.style.width = '';
				slide.style.left = '';

				if (browser.transitions) translate(pos, 0, 0);
			}

			// removed event listeners
			if (browser.addEventListener) {
				// remove current event listeners
				inner.removeEventListener('touchstart', events, false);
				inner.removeEventListener('webkitTransitionEnd', events, false);
				inner.removeEventListener('msTransitionEnd', events, false);
				inner.removeEventListener('oTransitionEnd', events, false);
				inner.removeEventListener('otransitionend', events, false);
				inner.removeEventListener('transitionend', events, false);
				window.removeEventListener('resize', events, false);
			} else {
				window.onresize = null;
			}
		}
	}
}


if (window.jQuery || window.Zepto) {
	(function($) {
		$.fn.nTouch = function(params) {
			return this.each(function() {
				$(this).data('nTouch', new nTouch($(this)[0], params));
			});
		}
	})(window.jQuery || window.Zepto)
}


(function onDoneLoading() {
	if (typeof nRelate === 'object' && (nRelate.xgebcn('nr_panel').length > 0)) {
		window.mySwipe = nTouch(document.getElementById('nrelate'), {
			continuous: true,
			sticky: false,
			smoothness: 100, // [0, 100]
			reveal: 2, // [1, 4]
			preview: 0.3, // [0, 0.5]
			leftPos: 23
		});
	} else {
		setTimeout(function() {
			onDoneLoading();
		}, 1000);
	}
})();

// onDoneLoading();