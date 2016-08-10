/**
 * Copyright 2005-2009 Hillcrest Laboratories, Inc.  All rights reserved.  
 * Hillcrest Laboratories, and the Hillcrest logo are registered trademarks 
 * of Hillcrest Laboratories, Inc.
 */
 
// Utility function for randomizing arrays
function fisherYates ( myArray ) {
    var i = myArray.length;
    if ( i == 0 ) return false;
    while ( --i ) {
        var j = Math.floor( Math.random() * ( i + 1 ) );
        var tempi = myArray[i];
        var tempj = myArray[j];
        myArray[i] = tempj;
        myArray[j] = tempi;
    }
    return myArray;
}

function throttle(method, period, scope) {
    clearTimeout(method._tId);
    method._tId= setTimeout(function(){
        method.call(scope);
    }, period);
}

function handleVisiblyDone() {
    window.handleVisiblyDone = null;    
    var loadTime = new Date().getTime() - g_pageLoadStart.getTime();
    pageTracker._trackPageview("/LoadTime/"+(loadTime/1000).toFixed(0));
    pageTracker._trackEvent("Page Load", "Looks Done", "/", loadTime);
}


function LinksView(body, config) {
    var self = this;
		
    var defaults = {
        pageSize: 20,
        numHeaderClasses: 6,
        
        header: "#header",
        logopane: "#logopane",
        scrollbox: "#scrollbox",
        logos: "#logos",
        veil: ".veil",
        infobar: "#infobar",
        scrollbar: "#scrollbar",
		
		animations: 1
    };

    if (config) {
        $.extend(defaults, config);
    }
    
    this.config = defaults;
    
    this._$body = body;
    this._$header = this._$body.find(this.config.header);
    this._$logopane = this._$body.find(this.config.logopane);
    this._$scrollbox = this._$body.find(this.config.scrollbox);
    this._$veil = this._$body.find(this.config.veil);
    this._$infobar = this._$body.find(this.config.infobar);
    this._$scrollbar = this._$body.find(this.config.scrollbar);
    this._$upArrow = this._$scrollbar.children(":first"); 
    this._$downArrow = this._$scrollbar.children(":last");
    
    this._$hdrLinks = null;
    
    this._categories = null;
    this._sites = null;
    
    this._selectedCat = null;
    this._selectedCatName = null;
    this._hoverData = {logo: null, timeout: null};
    this._demoItems = [];
    this._userActive = false;
    this._demoTimeout = null;
	
    this._$scrollbox.scrollable({
        items: this.config.logos,
        vertical: true,
        size: 1,
        clickable: false,
        easing: 'swing',
        speed: 1200,
        easing: 'swing',
		onBeforeSeek: function(){
			self.hoverLogo();
		},
		onSeek: function(){
			self.updateScrollArrows();
		},
		onAddItem: function(){
			self.updateScrollArrows();
		}
    }).mousewheelLimited(1200);
    
    this._scrollable = this._$scrollbox.scrollable();

    this._$upArrow.click(function(){
        self._scrollable.prev();
    });
    this._$downArrow.click(function(){
        self._scrollable.next();
    });
	
    this._$logopane.mouseenter(function () {
        if (!self._userActive) {
            self._userActive = true;
			if (self.config.animations) {
				self.stopDemo();
			}
            self.hoverLogo();
        }
    }).mouseleave(function () {
        self._userActive = false;
		if (self.config.animations) {
			self.startDemo();
		}
    });
    
    $(window).resize(function() {
        throttle(self.handleResize, 100, self);
    });
}

LinksView.ALL = 0x8000;

LinksView.prototype.updateScrollArrows = function () {
    this._$upArrow.toggleClass("disabled", this._scrollable.getIndex() == 0);
    this._$downArrow.toggleClass("disabled", this._scrollable.getIndex()+1 == this._scrollable.getSize());
}

LinksView.prototype.handleResize = function () {
    var container = $("#container");
    var sidebar = $("#sidebar");
    var oldWidth = container.width();
    var cols = Math.floor(($(window).width() - 113 - 13) / 173);
    var newWidth = cols * 173 + 23 + 13;
    
    var oldHeight = container.height();
    var rows = Math.max(1, Math.floor(($(window).height() - 100) / 103));
    var newHeight = rows * 103 + 81;
        
    if (newWidth != oldWidth || newHeight != oldHeight) {
        container.width(newWidth);
        container.height(newHeight);
        container[0].style.visibility = "visible";
        this.selectCategory(this._selectedCat);
    }
}

LinksView.prototype.setData = function (categories, sites) {
    if (categories == null) {
        categories = [];
    }
    categories = [['All',LinksView.ALL,'bg-color-all']].concat(categories);
    
    this._categories = categories;
    this._sites = sites;
    
    this._$header.empty();
    
    var headerHTML = ['<ul><li><img id="headerlogo" src="assets/sitelogos/' + _siteLogo + '.png" /></li>'];
    for (var i=0, j=categories.length; i<j; i++) {
        if (i > 0) {
            categories[i][2] = "bg-color-" + ((i-1) % this.config.numHeaderClasses);
        }
        headerHTML[i+1] = '<li><a>' + categories[i][0] + '</a></li>';
    }
    headerHTML[i+2] = ['</ul>'];
    this._$header.append(headerHTML.join('\n'));
    
    var idx = 0;
    this._$hdrLinks = this._$header.find("a").each(
        function () {
            var $this = $(this);
            $this.data("catInfo", {index: idx,
                                   category: categories[idx][0],
                                   flag: categories[idx][1],
                                   hlclass: categories[idx][2],
                                   isSelected: false});
            idx++;
        });
        
    var self = this;
    this._$hdrLinks.hover(
        function () {
            self.highlightCategory($(this).data("catInfo").flag);
        },
        function () {
            self.highlightCategory(self._selectedCat);
        }).click(
            function () {
                self.selectCategory($(this).data("catInfo").flag);
                pageTracker._trackPageview("/click/category/"+$(this).data("catInfo").category); 
            }
        );
        
    this.selectCategory(LinksView.ALL);
    this.handleResize();

}

LinksView.prototype.highlightCategory = function (flags) {
    if (!this._$hdrLinks) {
        this.setData();
    }
    for (var i=0, j=this._$hdrLinks.length, curLink = this._$hdrLinks.eq(i); i<j; i++, curLink = this._$hdrLinks.eq(i)) {
        if (curLink.data("catInfo").flag != this._selectedCat) {
            curLink.removeClass();
        }
        if (flags & curLink.data("catInfo").flag) {
            curLink.addClass(curLink.data("catInfo").hlclass);
        }
    }
}

LinksView.prototype.selectCategory = function (flag) {
    this._selectedCat = flag;
    for (var i=0;i<this._categories.length;i++) {
        if (this._categories[i][1] == flag) {
            this._selectedCatName = this._categories[i][0];
            break;
        }
    }
    
    this.highlightCategory(flag);
    
    this.hoverLogo();
    
    this._scrollable.getItemWrap().empty();
    
    var numCols = Math.floor((this._$logopane.width() - 12) / 173);
    var numRows = Math.floor((this._$logopane.height() - 12) / 103);
    
    this.config.numCols = numCols;
    this.config.numRows = numRows;
    this.config.pageSize = numCols * numRows;
    this._$scrollbox.width(numCols * 173 + 12);
    this._$scrollbox.height(numRows * 103 + 11);
    
    var divChunkTag = '<div class="chunk" style="height:'+(numRows * 103)+'px;">';
    var logosHTML = [divChunkTag];
    var ii = 0; // Page num
    var iii = 0; // Index within single page
    this._demoItems = [[]];
    for (var i=0, j=this._sites.length; i<j; i++) {
        if (this._selectedCat == LinksView.ALL || this._sites[i][1] & this._selectedCat) {
            if (iii >= this.config.pageSize) {
                logosHTML[logosHTML.length] = '</div>'+divChunkTag;
                ii++;
                this._demoItems[ii] = [];
                iii = 0;
            }
            this._demoItems[ii][this._demoItems[ii].length] = "#logo_" + i + "_" + ii + "_" + iii;
            logosHTML[logosHTML.length] = '<div class="logo" id="logo_' + i + '_' + ii + '_' + iii +'"><img class="logo-shadow" src="assets/images/shadow.png"/><img class="logo-image" alt="' + this._sites[i][0] + '" src="assets/logos/' + this._sites[i][2] + '"/></div>';
            iii++;
        }
    }
    logosHTML[logosHTML.length] = '</div>';
    this._scrollable.getItemWrap().append(logosHTML.join('\n'));    
    
    if (ii < 1) { 
        this._$scrollbar.hide();
    } else {
        this._$scrollbar.show();
    }

    fisherYates(this._demoItems);
    
    var self = this;
	//var hzDur = this.config.animations ? 200 : 0;
	var hzDur = 200;
    var logos = this._scrollable.getItemWrap().find("div.logo").each(function () {
            var $this = $(this);
            var id = $this.attr("id").split("_");
            var idx = parseInt(id[1]);
            var pageNum = parseInt(id[2]);
            var pageIdx = parseInt(id[3]);
            
            var shadow = $this.children().eq(0);
			var logo = $this.children().eq(1);
			
			if (self.config.animations) {
				shadow.hoverzoom(hzDur, 1.15, 20, 0, 100, {up: "hoverUp", down: "hoverDown"});
				logo.hoverzoom(hzDur, 1.15, -2, -2, 200, {up: "hoverUp", down: "hoverDown"});
			}
			
		    logo.error(function() {
		        var c = colors[colorIdx];
		        colorIdx++;
		        if (colorIdx >= colors.length) colorIdx = 0;
				var replacement = $('<div class="logo-image logo-missing-image"><div class="logo-missing-image-text" style="background-color: ' + c + ';">' + $(this).attr('alt') + '</div></div>');
		        $(this).replaceWith(replacement);
				
				if (self.config.animations) {
					replacement.hoverzoom(hzDur, 1.15, -2, -2, 200, {up: "hoverUp", down: "hoverDown"});
				}
		    });			
			
            
            $this.data('logoInfo', 
                        {'index': idx,
                         'position': [Math.floor(pageIdx/numCols) % numRows, pageIdx % numCols, pageNum],
                         'name': self._sites[idx][0],
                         'categories': self._sites[idx][1],
                         'image': self._sites[idx][2],
                         'url': self._sites[idx][3],
                         'description': self._sites[idx][4]});
            
            if (handleVisiblyDone && idx == self.config.pageSize-1) {
                logo.one("load", handleVisiblyDone).each(function(){
                    if(this.complete) $(this).trigger("load");
                });
            }
			
            
        }).click(
            function() {
                try {
                    pageTracker._trackPageview("/click/site/"+self._selectedCatName+"/"+$(this).data("logoInfo").url);
                } catch (x) {}
                window.location="http://" + $(this).data("logoInfo").url;
            }
        );
		
	if (this.config.animations) {
		logos.hover(
			function() {
				self._userActive = true;
				self.hoverLogo($(this));
			},
			function() {
				self.hoverLogo();
			}
		)
	}
    
    this._scrollable.begin();
    
	if (this.config.animations) {
		this.startDemo();
	}
}

LinksView.prototype.hoverLogo = function ($logo, infoDelay, callback) {
    if (this._hoverData.logo) {
        this._hoverData.logo.removeClass("logo-highlight logo-highlight-bold logo-hover-top logo-hover-bottom");
		
		if (this.config.animations) {
			this._hoverData.logo.find("#border-fudge").remove();
			this._hoverData.logo.find("#arrow").remove();
			this.highlightCategory(this._selected);
			this._hoverData.logo.children().trigger('hoverDown');
			
			clearTimeout(this._hoverData.timeout);
			this._$veil.stop().css({"display": "none", "opacity": 0.0});
			this._$infobar.children().eq(1).empty();
			this._$infobar.stop().css({"display": "none", "opacity": 0.0});
			this._hoverData.timeout = null;
		}
		
        this._hoverData.logo = null;
    }

    if ($logo && $logo.data('logoInfo')) {
        this.highlightCategory($logo.data('logoInfo').categories);
        this._hoverData.logo = $logo;
		
		if (this.config.animations) {
			$logo.addClass("logo-highlight-bold");
			var self = this;
			//var fadeDur = this.config.animations ? 250 : 0;
			var fadeDur = 250;
			this._hoverData.timeout = setTimeout(
				function () {
					var callbackInitiated = false
					self._$veil.stop().css("display", "block").animate({opacity: 1.0}, fadeDur, "swing", function () {
						if (callbackInitiated) return;
						callbackInitiated = true;
						var pos = $logo.data("logoInfo").position;
						var row = pos[0];
						var column = pos[1];
						var showAbove = ((row+1) / self.config.numRows) > 0.5
						var y = (row * 103) + (showAbove ? -190 : 113);
						$logo.addClass("logo-hover-" + (showAbove ? "top" : "bottom"));
						if (column == 0 || column == self.config.numCols-1) {
							$logo.append('<div id="border-fudge" class="' + (column == 0 ? "left" : "right") + '-' + (showAbove ? "top" : "bottom") + '"></div>');
						}
						$logo.append('<div id="arrow" class="' + (showAbove ? "up" : "down") + '"></div>');
						//self._$infobar.children().eq(1).append('<img class="snapshot" alt="' + $logo.data('logoInfo').name + '" src="http://images.websnapr.com/?size=s&key=0p4qxI1JRVS4&url=' + $logo.data('logoInfo').url + '"/><div class="siteinfo">' + $logo.data('logoInfo').description + '</div>');
						self._$infobar.children().eq(1).append('<img class="snapshot" alt="' + $logo.data('logoInfo').name + '" src="assets/snapshots/' + $logo.data('logoInfo').image + '"/><div class="siteinfo"><div>' + $logo.data('logoInfo').description + '</div></div>');
						self._$infobar.css("top", y).css("display", "block").animate({opacity: 1.0}, fadeDur, 
							function () {
								if (callback && typeof callback == "function") {
									callback();
								}
								if (self._userActive) {
									pageTracker._trackPageview("/hover/site/"+self._selectedCatName+"/"+$logo.data("logoInfo").url);
								}
							});
					});
				}, typeof infoDelay == "undefined" ? 2000 : infoDelay);
			
			$logo.children().trigger('hoverUp');
		}
    }
}

LinksView.prototype.stopDemo = function () {
	if (self._demoTimeout !== null) {
		clearTimeout(self._demoTimeout);
		self._demoTimeout = null;
	}
}

LinksView.prototype.startDemo = function () {
    var self = this;
    
    var demoIdx = 0;
    
    var demoItems = [];
    var numPages = this._demoItems.length;
    for (var i=0; i<numPages; i++) {
        this._demoItems[i] = fisherYates(this._demoItems[i]);
    }
    
    for (var i=0, j=this._demoItems[0].length; i<j; i++) {
        for (var ii=0; ii<numPages; ii++) {
            if (i < this._demoItems[ii].length) {
                demoItems[demoItems.length] = this._demoItems[ii][i];
            }
        }
    }
    
    function showRandomItem() {
        if (self._userActive) {
            clearTimeout(self._demoTimeout);
			self._demoTimeout = null;
            return;
        }
        var item = self._scrollable.getItemWrap().find(demoItems[demoIdx]);
        demoIdx++;
        if (demoIdx >= demoItems.length) {
            demoIdx = 0;
        }
        var itemPage = item.data("logoInfo").position[2];
		self.hoverLogo();
        if (self._scrollable.getIndex() != itemPage) {
            self._scrollable.seekTo(itemPage, 1200, function () {
				self.updateScrollArrows();
                if (self._userActive) return;
                self.hoverLogo(item, 0, function () {
                    if (self._userActive) return;
                    self._demoTimeout = setTimeout(showRandomItem, 8000);
                });
            });
        } else {
            self.hoverLogo(item, 0, function () {
                if (self._userActive) return;
                self._demoTimeout = setTimeout(showRandomItem, 8000);
            });            
        }
    }
    clearTimeout(self._demoTimeout);
	self._demoTimeout = null;
    self._demoTimeout = setTimeout(showRandomItem, 120000);
}

$.fn.hoverzoom = function(hzDuration, hzScale, fudgeX, fudgeY, zIndex, bindTo) {
    this.each(function() {
        var $this = $(this);
        
        var origW = $this.innerWidth();
        var origH = $this.innerHeight();
        var origPos = $this.position();
        var origZ = parseInt($this.parent().css('z-index')) || 0;
        var hzW = Math.ceil(origW * hzScale);
        var hzH = Math.ceil(origH * hzScale);
        var hzPos = {top: origPos.top - Math.floor((hzH - origH) / 2) + (fudgeX || 0), 
                     left: origPos.left - Math.floor((hzW - origW) / 2) + (fudgeY || 0)};
        $this.data('hoverzoom', {origW: origW,
                                 origH: origH,
                                 origPos: origPos,
                                 origZ: origZ, 
                                 hzW: hzW, 
                                 hzH: hzH, 
                                 hzPos: hzPos,
                                 hzZ: zIndex});
    });

    function hoverUp() {
        var $this = $(this);
        var hz = $this.data('hoverzoom');
        $this.css({'z-index': hz.hzZ || (hz.origZ + 1000)});
        $this.stop().animate({ 
            top:  hz.hzPos.top + 'px', 
            left: hz.hzPos.left + 'px', 
            height: hz.hzH + 'px', 
            width:  hz.hzW + 'px'
            }, hzDuration);
    }
    
    function hoverDown() {
        var $this = $(this);
        var hz = $this.data('hoverzoom');
        $this.stop().animate({ 
                top:  hz.origPos.top + 'px', 
                left: hz.origPos.left + 'px', 
                height: hz.origH + 'px', 
                width: hz.origW + 'px'         
            }, 
            hzDuration, 
            function() {
                $this.css('z-index', hz.origZ);
            });
    }
    
    if (!bindTo) {
        return this.hover(hoverUp, hoverDown);
    } else {
        return this.bind(bindTo.up, hoverUp).bind(bindTo.down, hoverDown);
    }
};

(function($) {
	$.fn.wheel = function( fn ){
		return this[ fn ? "bind" : "trigger" ]( "wheel", fn );
	};

	// special event config
	$.event.special.wheel = {
		setup: function(){
			$.event.add( this, wheelEvents, wheelHandler, {} );
		},
		teardown: function(){
			$.event.remove( this, wheelEvents, wheelHandler );
		}
	};

	// events to bind ( browser sniffed... )
	var wheelEvents = !$.browser.mozilla ? "mousewheel" : // IE, opera, safari
		"DOMMouseScroll"+( $.browser.version<"1.9" ? " mousemove" : "" ); // firefox

	// shared event handler
	function wheelHandler( event ) {
		
		switch ( event.type ){
			
			// FF2 has incorrect event positions
			case "mousemove": 
				return $.extend( event.data, { // store the correct properties
					clientX: event.clientX, clientY: event.clientY,
					pageX: event.pageX, pageY: event.pageY
				});
				
			// firefox	
			case "DOMMouseScroll": 
				$.extend( event, event.data ); // fix event properties in FF2
				event.delta = -event.detail / 3; // normalize delta
				break;
				
			// IE, opera, safari	
			case "mousewheel":				
				event.delta = event.wheelDelta / 120;
				break;
		}
		
		event.type = "wheel"; // hijack the event	
		return $.event.handle.call( this, event, event.delta );
	}
	
	
    // version number
    var t = $.tools.scrollable; 
    t.plugins = t.plugins || {};
    t.plugins.mousewheelLimited = {	
        version: '0.0.1',
        conf: { 
            api: false,
            speed: 50
        } 
    };

    // scrollable mousewheel implementation
    $.fn.mousewheelLimited = function(conf) {

        var globals = $.extend({}, t.plugins.mousewheelLimited.conf), ret;
        if (typeof conf == 'number') { conf = {speed: conf}; }
        conf = $.extend(globals, conf);
        
        this.each(function() {
            var api = $(this).scrollable();
            if (api) { ret = api; }
            
            var isScrolling = false;
            
            api.onSeek(  function (evt, i) { 
			    isScrolling = false;
			});
            
            api.getRoot().wheel(function(e, delta)  { 
                if (!isScrolling) {
					isScrolling = true;
					var idx = api.getIndex();
                    api.move(delta < 0 ? 1 : -1, conf.speed || 50);
					if (api.getIndex() == idx) {
						isScrolling = false;
					}
                }
                return false;
            });
        });
        
        return conf.api ? ret : this;
    };
})(jQuery); 

var colors = ["rgba(155,15,103,0.5)",
              "rgba(255,16,167,0.5)",
			  "rgba(168,204,106,0.5)",
			  "rgba(118,178,15,0.5)",
			  "rgba(24,120,178,0.5)",
			  "rgba(8,164,255,0.5)",
			  "rgba(255,255,255,0.2)",
			  "rgba(0,0,0,0)"];
var colorIdx = 0;

$.fn.buildLinksView = function (categories, sites, config) {
    // If we're not ready, postpone setup
    if (this.length == 0) {
        if (!$.isReady && this.selector) {
            var s = this.selector, c = this.context;
            $(function() {
                $(s, c).buildLinksView(categories, sites, config);
            });
        }
    }
    
    // Set up the view
    this.append('<div id="header"></div><div id="logopane"><div id="scrollbox"><div id="logos"></div></div><div id="scrollbar-container"><div id="scrollbar"><div id="scroll-up"></div><div id="scroll-down"></div></div></div><div class="veil"></div><div id="infobar"><img class="infobar-shadow" src="assets/images/shadow.png"/><div></div></div></div>');

    var view = new LinksView(this, config);
    view.setData(categories, sites);
	    
    return this.data("linksView", view);
}

