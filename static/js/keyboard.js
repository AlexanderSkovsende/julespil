const Keyboard = function() {

	this.alias = {
	    'left': 37,
        'up': 38,
        'right': 39,
        'down': 40,
        'space': 32,
        'return': 13
    };

	this.keys = {};

	this.pressed = function(key){
	    if (this.alias.hasOwnProperty(key)) {
            return !!this.keys[this.alias[key]];
        } else {
			return !!this.keys[key.toUpperCase().charCodeAt(0)];
		}
    };

	function keyDownHandler(e) {

		e = e || window.event;

		keyboard.keys[e.keyCode] = true;

	}

	function keyUpHandler(e) {

		e = e || window.event;

		keyboard.keys[e.keyCode] = false;

	}

	//EventListeners
	window.addEventListener("keydown", keyDownHandler, false);
	window.addEventListener("keyup", keyUpHandler, false);


};