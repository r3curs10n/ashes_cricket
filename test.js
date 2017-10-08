var challenge = require('./challenge.js');

var c = new challenge.Challenge(1, 2);
/*c.save(function(err, res){
	console.log(res);
	console.log(err);
});*/

challenge.forUser(2, function(err, res){
	console.log(res)
})