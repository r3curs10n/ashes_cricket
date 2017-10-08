/**************************************************
** GAME PLAYER CLASS
**************************************************/
var Player = function() {
	var id;
	var mouse_x,mouse_y;

	// Getters and setters
	var getMouse_x = function() {
		return mouse_x;
	};

	var getMouse_y = function() {
		return mouse_y;
	};

	var setMouse_x = function(newX) {
		mouse_x = newX;
	};

	var setMouse_y = function(newY) {
		mouse_y = newY;
	};
	// Define which variables and methods can be accessed
	return {
		getMouse_x: getMouse_x,
		getMouse_y: getMouse_y,
		setMouse_x: setMouse_x,
		setMouse_y: setMouse_y,
		id: id
	}
};
// Export the Player class so you can use it in
// other files by using require("Player").Player
exports.Player=Player;