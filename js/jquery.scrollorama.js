/*
	scrollorama - The jQuery plugin for doing cool scrolly stuff
	by John Polacek (@johnpolacek)
	
	Dual licensed under MIT and GPL.
*/

(function($) {
    $.scrollorama = function(options) {
		
		// PRIVATE VARS
		var blocks = [],
			browserPrefix = '',
			onBlockChange = function() {};
		
		var scrollorama = this;
		
		var defaults = {offset:0};
		
		scrollorama.settings = $.extend({}, defaults, options);
		scrollorama.blockIndex = 0;
		
		if (options.blocks === undefined) alert('ERROR: Must assign blocks class selector to scrollorama plugin');
		
		// PRIVATE FUNCTIONS
		function init() {
			if (typeof scrollorama.settings.blocks === 'string')  scrollorama.settings.blocks = $(scrollorama.settings.blocks);
			
			// set browser prefix
			if ($.browser.mozilla)	browserPrefix = '-moz-';
			if ($.browser.webkit)	browserPrefix = '-webkit-';
			if ($.browser.opera)	browserPrefix = '-o-';
			if ($.browser.msie)		browserPrefix = '-ms-';
			
			// create blocks array to contain animation props
			$('body').css('position','relative');
			
			var i;
			for (i=0; i<scrollorama.settings.blocks.length; i++) {
				var block = scrollorama.settings.blocks.eq(i);
				blocks.push({
					block: block,
					top: block.offset().top,
					pin: 0,
					animations:[]
				});
			}
			
			// convert block elements to absolute position
			for (i=0; i<blocks.length; i++) {
				blocks[i].block
					.css('position', 'absolute')
					.css('top', blocks[i].top);
			}
			
			$("body").prepend("<div id='scroll-wrap'></div>");
			
			var didScroll = false;
			$(window).scroll(function(){
				didScroll = true; 
			});
			setInterval(function(){ 
				if(didScroll){
					onScrollorama();
					didScroll = false;
				}				
			}, 50);
		}
		
		function onScrollorama() {
			var scrollTop = $(window).scrollTop();
			var currBlockIndex = getCurrBlockIndex(scrollTop);
			
			// update all animations
			for (var i=0; i<blocks.length; i++) {
				
				// go through the animations for each block
				if (blocks[i].animations.length) {
					for (var j=0; j<blocks[i].animations.length; j++) {
						var anim = blocks[i].animations[j];
						
						// if above current block, settings should be at start value
						if (i > currBlockIndex) {
							if (currBlockIndex != i-1 && anim.baseline != 'bottom') {
								setProperty(anim.element, anim.property, anim.startVal);
							}
							if (blocks[i].pin) {
								blocks[i].block
									.css('position', 'absolute')
									.css('top', blocks[i].top);
							}
						}
						
						// if below current block, settings should be at end value
						// unless on an element that gets animated when it hits the bottom of the viewport
						else if (i < currBlockIndex) {
							setProperty(anim.element, anim.property, anim.endVal);
							if (blocks[i].pin) {
								blocks[i].block
									.css('position', 'absolute')
									.css('top', (blocks[i].top + blocks[i].pin));
							}
						}
						
						// otherwise, set values per scroll position
						if (i == currBlockIndex || (currBlockIndex == i-1 && anim.baseline == 'bottom')) {
							// if block gets pinned, set position fixed
							if (blocks[i].pin && currBlockIndex == i) {
								blocks[i].block
									.css('position', 'fixed')
									.css('top', 0);
							}
							
							// set start and end animation positions
							var startAnimPos = blocks[i].top + anim.delay;
							if (anim.baseline == 'bottom')  startAnimPos -= $(window).height();
							var endAnimPos = startAnimPos + anim.duration;							
							
							// if scroll is before start of animation, set to start value
							if (scrollTop < startAnimPos)  setProperty(anim.element, anim.property, anim.startVal);
							
							// if scroll is after end of animation, set to end value
							else if (scrollTop > endAnimPos) {
								setProperty(anim.element, anim.property, anim.endVal);
								if (blocks[i].pin) {
									blocks[i].block
											.css('position', 'absolute')
											.css('top', (blocks[i].top + blocks[i].pin));
								}
							}
							
							// otherwise, set value based on scroll
							else {
								// calculate percent to animate
								var animPercent = (scrollTop - startAnimPos) / anim.duration;
								// then multiply the percent by the value range and calculate the new value
								var animVal = anim.startVal + (animPercent * (anim.endVal - anim.startVal));
								setProperty(anim.element, anim.property, animVal);
							}
						}
					}
				}
			}
			
			// update blockIndex and trigger event if changed
			if (scrollorama.blockIndex != currBlockIndex) {
				scrollorama.blockIndex = currBlockIndex;
				onBlockChange();
			}
		}
		
		function getCurrBlockIndex(scrollTop) {
			var currBlockIndex = 0;
			for (var i=0; i<blocks.length; i++) {
				// check if block is in view
				if (blocks[i].top <= scrollTop - scrollorama.settings.offset)  currBlockIndex = i;
			}
			return currBlockIndex;
		}
		
		function setProperty(target, prop, val) {
			if (prop === 'rotate' || prop === 'zoom' || prop === 'scale') {
				if (prop === 'rotate') {
					target.css(browserPrefix+'transform', 'rotate('+val+'deg)');
				} else if (prop === 'zoom' || prop === 'scale') {
					var scaleCSS = 'scale('+val+')';
					if (browserPrefix !== '-ms-') {
						target.css(browserPrefix+'transform', scaleCSS);
					} else {
						target.css('zoom', scaleCSS);
					}
				}
			} else {
				target.css(prop, val);
			}	
		}
		
		// PUBLIC FUNCTIONS
		scrollorama.animate = function(target) {
			/*
				target		= animation target
				arguments	= array of animation parameters
				
				animation parameters:
				delay		= amount of scrolling (in pixels) before animation starts
				duration	= amount of scrolling (in pixels) over which the animation occurs
				property	= css property being animated
				start		= start value of the property
				end			= end value of the property
				pin			= pin block during animation duration (applies to all animations within block)
				baseline	= top (default, when block reaches top of viewport) or bottom (when block first comies into view)
			*/
			
			// if string, convert to DOM object
			if (typeof target === 'string')  target = $(target);
			
			// find block of target
			var targetIndex;
			var targetBlock;
			for (var i=0; i<blocks.length; i++) {
				if (blocks[i].block.has(target).length) {
					targetBlock = blocks[i];
					targetIndex = i;
				}
			}
			
			// add each animation to the blocks animations array
			for (i=1; i<arguments.length; i++) {
				
				var anim = arguments[i];
				
				// for top/left/right/bottom, set relative positioning if static
				if (anim.property == 'top' || anim.property == 'left' || anim.property == 'bottom' || anim.property == 'right' ) {
					
					if (target.css('position') == 'static')	target.css('position','relative');
					
					// set anim.start, anim.end defaults
					if (anim.start === undefined)			anim.start = 0;
					else if (anim.end === undefined)		anim.end = 0;
				}
				
				// set anim.start/anim.end defaults for rotate, zoom/scale, letter-spacing
				if (anim.property == 'rotate') {
					if (anim.start === undefined)	anim.start = 0;
					if (anim.end === undefined)		anim.end = 0;
				} else if (anim.property == 'zoom' || anim.property == 'scale' ) {
					if (anim.start === undefined)	anim.start = 1;
					if (anim.end === undefined)		anim.end = 1;
				} else if (anim.property == 'letter-spacing' && target.css(anim.property)) {
					if (anim.start === undefined)	anim.start = 1;
					if (anim.end === undefined)		anim.end = 1;
				}
				
				if (anim.baseline === undefined) {
					if (anim.pin || targetBlock.pin || targetIndex === 0)	anim.baseline = 'top';
					else													anim.baseline = 'bottom';
				}
				
				if (anim.delay === undefined)  anim.delay = 0;
				
				targetBlock.animations.push({
					element: target,
					delay: anim.delay,
					duration: anim.duration,
					property: anim.property,
					startVal: anim.start !== undefined ? anim.start : parseInt(target.css(anim.property),10),	// if undefined, use current css value
					endVal: anim.end !== undefined ? anim.end : parseInt(target.css(anim.property),10),			// if undefined, use current css value
					baseline: anim.baseline !== undefined ? anim.baseline : 'bottom'
				});
				
				if (anim.pin) {
					if (targetBlock.pin < anim.duration + anim.delay) {
						var offset = anim.duration + anim.delay - targetBlock.pin;
						targetBlock.pin += offset;
						
						// adjust positions of blocks below target block
						for (var j=targetIndex+1; j<blocks.length; j++) {
							blocks[j].top += offset;
							blocks[j].block.css('top', blocks[j].top);
						}
					}
				}
			}
			
			onScrollorama();
		};
		
		// function for passing blockChange event callback
		scrollorama.onBlockChange = function(f) {
			onBlockChange = f;
		};
		
		// function for getting an array of scrollpoints
		// (top of each animation block and animation element scroll start point)
		scrollorama.getScrollpoints = function() {
			var scrollpoints = [];
			for (var i=0; i<blocks.length; i++) {
				scrollpoints.push(blocks[i].top);
				// go through the animations for each block
				if (blocks[i].animations.length && blocks[i].pin > 0) {
					for (var j=0; j<blocks[i].animations.length; j++) {
						var anim = blocks[i].animations[j];
						scrollpoints.push(blocks[i].top + anim.delay + anim.duration);
					}
				}
			}
			// make sure scrollpoints are in numeric order
			scrollpoints.sort(function(a,b){return a - b;});
			return scrollpoints;
		};
		
		
		// INIT
		init();
		
		return scrollorama;
    };
     
})(jQuery);