exports.createChallenge = function(db, challenger, challengee, cb){

  var d = new Date();

  // challenge state..
  // 0: nobody has played
  // 1: challenger has played
  // 2: challengee has played

  var nchallenge = {
    "challenger": challenger,
    "challengee": challengee,
    "challenger_score": 0,
    "challengee_score": 0,
    "seed": d.getTime(),
    "state": 0
  };
  
  db.collection('ashes_challenge').insertOne(nchallenge, function(err, result){
    if (err){
      cb(err, null);
    } else {
      cb(null, nchallenge);
    }
  });
}

