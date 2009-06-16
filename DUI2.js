(function($) {

/* Create our top-level namespace */
DUI = {
    //Simple check so see if the object passed in is a DUI Class
    isClass: function(check, type)
    {
        //false: check for dynamic, true: check for static, null: either type
        type = type || null;
        
        try {
            if(check._ident.library == 'DUI.Class') {
                if(type == null
                || (type == false && check._ident.dynamic)
                || (type == true && !check._ident.dynamic)) {
                    return true;
                }
            }
        } catch(noIdentUhOh) {
            return false;
        }
        
        return false;
    }
};

DUI.Class = function() {
    //Sugar for "myClass = new DUI.Class()" usage
    return this.constructor.prototype._bootstrap.apply(this.constructor, arguments);
}

$.extend(DUI.Class.prototype, {
    _ident: {
        library: "DUI.Class",
        version: "0.1.0",
        dynamic: true
    },
    
    _bootstrap: function() {
        //"this" needs to temporarily refer to the final class, not DUI
        var copy = function() {
            return function() {
                this.init.apply(this, arguments);
            }
        }.apply(copy);
        
        $.extend(copy.prototype, this.prototype);
        return copy.prototype.create.apply(copy, arguments);
    },
    
    init: function()
    { /* Constructor for created classes */ },
    
    create: function()
    {
        //For clarity, let's get rid of an instance of "this" in the code
        var _class = this;
        
        //Get the last argument...
        var s = Array.prototype.slice.apply(arguments).reverse()[0] || null;
        //...and check to see if it's boolean.
        //False (default): dynamic class, true: static class
        s = s !== null && s.constructor == Boolean ? s : false;
        
        //Static: extend the Object, Dynamic: extend the prototype
        var extendee = s ? _class : _class.prototype;
        
        
        //Foo.create('Bar', {}) usage
        if(arguments.length > 0 && arguments[0].constructor == String) {
            var args = Array.prototype.slice.call(arguments);
            var name = args.shift();
            _class[name] = _class.create.apply(_class, args);
            
            return _class[name];
        }
        
        //Change the ident for static classes
        if(s) _class.prototype._ident.dynamic = false;
        
        //This is where it gets weird: Copy helpers in from the proto
        $.each(['_ident', 'create'], function() {
            _class[this] = _class.prototype[this];
        });
        
        //Loop through arguments. If they're the right type, tack them on
        $.each(arguments, function() {
            var arg = this;
            
            //Either we're passing in an object full of methods, or an existing class
            if(arg.constructor == Object || DUI.isClass(arg)) {
                //If arg is a dynamic class, pull from its prototype
                var payload = DUI.isClass(arg, false) ? arg.prototype : arg;
                
                /* Here we're going per-property instead of doing $.extend(extendee, this) so that
                 * we overwrite each property instead of the whole namespace. */
                $.each(payload, function(i) {
                    //Special case! If 'dontEnum' is passed in as an array, add its contents to DUI.Class._dontEnum
                    if(i == 'dontEnum' && this.constructor == Array) {
                        extendee._dontEnum = $.merge(extendee._dontEnum, this);
                    }
                    
                    //Add the current property to our class
                    extendee[i] = this;
                });
            }
        });
        
        return _class;
    }
});

//DUI = new DUI.Class(DUI, true);

})(jQuery);

