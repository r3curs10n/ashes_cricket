/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/
var util = require("util"),					// Utility resources (logging, object inspection, etc)
	io = require("socket.io"),				// Socket.IO
	Player = require("./Player").Player,
	express = require("express"),
	app = express();	// Player class

var mapOpponent = {};
var openMatches = [];
app.use(express.static(__dirname + '/public'));
app.listen(8121);
/**************************************************
** GAME VARIABLES
**************************************************/
var socket,		// Socket controller
	batsman=null, bowler=null,no_of_players=0;	// Batsman,Bowler


/**************************************************
** GAME INITIALISATION
**************************************************/
function init() {

	// Set up Socket.IO to listen on port 8000
	socket = io.listen(8120);

	// Configure Socket.IO
	socket.configure(function() {
		// Only use WebSockets
		socket.set("transports", ["websocket"]);

		// Restrict log output
		socket.set("log level", 2);
	});

	// Start listening for events
	setEventHandlers();
};


/**************************************************
** GAME EVENT HANDLERS
**************************************************/
var setEventHandlers = function() {
	// Socket.IO
	socket.sockets.on("connection", onSocketConnection);
};

// New socket connection
function onSocketConnection(client) {
	util.log("New player has connected: "+client.id);

	// Listen for client disconnected
	client.on("disconnect", onClientDisconnect);

	// Listen for new player message
	client.on("new player", onNewPlayer);

	// Listen for move player message
	client.on("move player", onMovePlayer);

	client.on("bowl",transmitBowl);

	client.on("simulate",transmitSimulation);

	client.on("reverse roles",reverse);

	client.on("game finished",finished);

	
};

function finished(data)
{
	socket.sockets.socket(mapOpponent[this.id]).emit("game finished",data);
}

function reverse(data)
{
	console.log("roles reversed");
	socket.sockets.socket(mapOpponent[this.id]).emit("reverse roles",data);
}

function transmitBowl(data)
{
	console.log(data);
	socket.sockets.socket(mapOpponent[this.id]).emit("bowl",data);
}

function transmitSimulation(data)
{
	console.log(data);
	socket.sockets.socket(mapOpponent[this.id]).emit("simulate",data);
}
// Socket client has disconnected
function onClientDisconnect() {
	util.log("Player has disconnected: "+this.id);
};

// New player has joined
function onNewPlayer(data) {
	console.log(openMatches.length);
	if(openMatches.length == 0)
	{
		console.log("Batsman Connected");
		var matchObject = {
			Player1 : "" ,
			Player2 : "" 
		};
		matchObject.Player1 = this.id;
		openMatches.push(matchObject);
		this.emit("you are batsman",{});
	}
	else 
	{
		console.log("Bowler Connected");
		openMatches[0].Player2 = this.id;
		var matchInitiated = openMatches[0];
		openMatches.splice(0, 1);
		mapOpponent[matchInitiated.Player1] = matchInitiated.Player2;
		mapOpponent[matchInitiated.Player2] = matchInitiated.Player1;
		this.emit("you are bowler",{});
	}
};




/**************************************************
** RUN THE GAME
**************************************************/
init();