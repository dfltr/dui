(function() {

[].indexOf || (Array.prototype.indexOf = function(v, n){
    n = (n == null) ? 0 : n; var m = this.length;
    for(var i = n; i < m; i++) {
        if(this[i] == v) return i;
    }

    return -1;
});

[].filter || (Array.prototype.filter = function(fun /*, thisp*/) {
    var len = this.length >>> 0, res = [], thisp = arguments[1];

    for (var i = 0; i < len; i++) {
      if (i in this) {
        var val = this[i];
        if (fun.call(thisp, val, i, this)) res.push(val);
      }
    }

    return res;
});


DUI = function(deps, action, opts) {
    if(arguments.length == 1) action = deps;
    action = action && action.constructor == Function ? action : function(){};

    var str = action.toString(), re = /(DUI\.\w+)/gim, matches = [], match;

    if(opts && opts.newQ && DUI.currentQ.length > 0) {
        DUI.currentQ = DUI.actions[DUI.actions.push([]) - 1];
    }

    if(deps && deps.constructor == Array) matches = deps;
    if(DUI.loadedScripts.concat(DUI.loading).indexOf(DUI.jQueryURL) == -1) DUI.load(DUI.jQueryURL);

    while(match = re.exec(str)) {
        var unique = true; match = match[1] || null;

        var internals = ['isClass','global','prototype','_dontEnum','_ident','_bootstrap','init','create','ns','each'];
        var omit = ['clean'];

        if(internals.indexOf(match.replace('DUI.', '')) > -1) {
            match = 'DUI.Class';
        }

        //replace this with Array.indexOf
        for(var i = 0; i < matches.length; i++) {
            if(matches[i] == match) unique = false;
        }

        if(unique && omit.indexOf(match.replace('DUI.', '')) == -1) matches.push(match);
    }

    DUI.currentQ.push(action);

    for(var i = 0; i < matches.length; i++) {
        DUI.load(matches[i], opts);
    }

    if(DUI.loading.length == 0) {
        DUI.loaded();
    }
}

DUI.loading = [];
DUI.actions = [];
DUI.currentQ = DUI.actions[DUI.actions.push([]) - 1];
DUI.loadedScripts = [];
DUI.jQueryURL = 'http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.js';
DUI.scriptURL = 'http://' + window.location.hostname + '/';
DUI.maps = {};
DUI.debug = false;

//I can't believe I still have to do this. Dear IE, Kindly die in a shit fire.
/* DUI.indexOf = [].indexOf || function(obj, v, n){
    n = (n == null) ? 0 : n; var m = obj.length;
    for(var i = n; i < m; i++) {
        if(obj[i] == v) return i;
    }

    return -1;
}; */

DUI.load = function(module, opts) {
    if(DUI.loading.indexOf(module) > -1) return;

    if(DUI.loadedScripts.indexOf(module) > -1) {
        DUI.loaded(module, opts);
        return;
    }

    //^http - url, leave intact
    //DUI. - scriptDir/DUI/(match).js
    //else - scriptDir/(match.replace(':', '/')).js

    //split on :, look for _foo, check if DUI.maps._foo, replace _foo with mapped value, join(':')
    var loadStr = module, parts = module.split(/:(?!\/\/)/);
    for(var i = 0; i < parts.length; i++) {
        if(DUI.maps[parts[i]]) parts[i] = DUI.maps[parts[i]];
    }
    module = parts.join('/');

    var src = module.indexOf('http') == 0 ? module :
        (module.indexOf('DUI.') > -1 ? DUI.scriptURL + 'DUI/' + module + '.js' :
        DUI.scriptURL + module + '.js');

    //If a map injects http in, make sure it's a real-ass url, k?
    //TODO: By now everything starts with http. Refactor src assignment tomorrow
    //TODO: File extension doesn't need to be ".js", deal with this
    if(src.indexOf('http') == 0 && src.indexOf('.js') != src.length - 3) src += '.js';

    if(DUI.debug) {
        var delim = src.search(/(\?|&)/) > -1 ? '&' : '?';
        src += delim + (new Date()).getTime();
    }

    DUI.loading.push(loadStr);

    var d = document, jq = d.createElement('script'), a = 'setAttribute';
    jq[a]('type', 'text/javascript');
    jq[a]('src', src);
    jq.onload = function() { DUI.loaded(loadStr, opts); };
    jq.onreadystatechange = function() {
        if('loadedcomplete'.indexOf(jq.readyState) > -1) {
            DUI.loaded(loadStr, opts);
        }
    }
    d.body.appendChild(jq);
}

DUI.loaded = function(module) {
    DUI.loading = DUI.loading.filter(function(item) {
        return item != module;
    });

    if(module) DUI.loadedScripts.push(module);

    if(DUI.loading.length == 0) {
        while(DUI.actions.length > 0) {
            var q = DUI.actions.shift();
            while(q.length > 0) {
                var func = q.pop();
                func.apply(DUI);
            }
        }

        DUI.actions = [[]];
        DUI.currentQ = DUI.actions[0];
    }
}

DUI.clean = function(module) {
    if(module.constructor == Array) {
        $.each(module, function() {
            DUI.clean(this);
        });
        return;
    }

    var safe = module.replace(/([:\.]{1})/g, '\\$1');
    $('._view\\:' + safe + ', ._click\\:' + safe + ', ._hover\\:' + safe + ', ._load\\:' + safe)
                .removeClass('_view:' + module + ' _click:' + module + ' _hover:' + module + ' _load:' + module);
}

var d = document, add = 'addEventListener', att = 'attachEvent', boot = function(e) {
    e = e || window.event;

    if(e.button == 2 || e.ctrlKey || e.metaKey) return;

    var y = e.type, t = e.target || e.srcElement, c = t.className, m = c.match(/(?:^|\s)_(click|hover):(\S+)(?:$|\s)/), h = '';

    if(m && m[1] && m[2]) {
        if((m[1] == 'hover' && y == 'mouseover')
            || (m[1] == 'click' && y == 'click')) {

            m = m[2];
        } else return;

        if(t.className.indexOf('booting') == -1) {
            t.className = c + ' booting';

            DUI([m], function() {
                DUI.clean(m);

                var evt = new $.Event(y);
                evt.fromDUI = true;
                $(t).removeClass('booting').trigger(evt);
            }, {
                newQ: true
            });
        }

        e.preventDefault ? e.preventDefault() : e.returnValue = false;
    }
};

var onload = function() {
    var html = 'class="' + document.body.className + '" ' + document.body.innerHTML, re = /class=(?:'|")(?:[^'"]*?)_load:([^\s"']+)(?:[^'"]*?)(?:'|")/gim, matches = [], match;

    while(match = re.exec(html)) {
        var unique = true;
        match = match[1] || null;

        for(var i = 0; i < matches.length; i++) {
            if(matches[i] == match) unique = false;
        }

        if(unique) matches.push(match);
    }

    DUI(matches, function() {
        DUI.clean(matches);
    }, {
        newQ: true
    });
}

var onscroll = function() {
    //todo: cross-browser math
    //todo: roll regexes throughout the file into one common object
    var height = window.innerHeight, scroll = window.scrollY, re = /class=(?:'|")(?:[^'"]*?)_view:([^\s"']+)(?:[^'"]*?)(?:'|")/gim, matches = [], el;

    if(document.querySelectorAll) {
        qsa = document.querySelectorAll('*[class*=_view]');

        for(var i = 0; i < qsa.length; i++) {
            el = qsa[i];

            if(height + scroll > el.offsetTop) {
                matches.push(/(?:^|\s)_view:([^\s]+)(?:\s|$)/.exec(el.className)[1]);
            }
        }


    } else {
        console.log('no');
    }

    if(matches.length > 0) {
        el.className = el.className + ' booting';

        DUI(matches, function() {
            $(el).removeClass('booting');

            DUI.clean(matches);
        }, {
            newQ: true
        });
    }
}

if(d[att]) {
    d[att]('onclick', boot);
    d[att]('onmouseover', boot);
    d[att]('onscroll', onscroll);
    window[att]('onload', onload);
} else {
    d[add]('click', boot, false);
    d[add]('mouseover', boot, false);
    d[add]('scroll', onscroll, false);
    window[add]('load', onload, false);
}

})();
