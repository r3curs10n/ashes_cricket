var express = require('express')
  , fs = require('fs')
  , passport = require('passport')
  , util = require('util')
  , FacebookStrategy = require('passport-facebook').Strategy
  , logger = require('morgan')
  , session = require('express-session')
  , bodyParser = require("body-parser")
  , cookieParser = require("cookie-parser")
  , methodOverride = require('method-override')
  , fb = require('fbgraph')
  , mc = require('mongodb').MongoClient
  , ObjectId = require('mongodb').ObjectID
  , cron = require('cron')
  , challenge = require('./challenge')
  , async =require('async')
  , fs = require('fs')
  , io = require("socket.io")
  , Player = require("./Player")
  , leaderboard_data_score = [] , leaderboard_data_four = [] , leaderboard_data_six_dist , leaderboard_data_strike = []
  ;

var mongoStore = require('connect-mongo')(session);

var leaderboard_data_career_runs = [];
var leaderboard_data_career_average = [];
var leaderboard_data_career_strike_rate = [];

var leaderboard_update_time = 0;

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var CronJob = require('cron').CronJob;

function startLeaderboardCron(){

  function work(){
    var jdone = 0;
    function onDone(){
      jdone++;
      if (jdone===7){
        leaderboard_update_time = (new Date()).getTime();
        console.log('cron run at: ')
        console.log((new Date()));
      }
    }

     mdb.collection('ashes_match').find({'finished': true}).sort({'score': -1}).limit(60).toArray(function(err, data){
        leaderboard_data_score = data;
        onDone();
      });

     mdb.collection('ashes_match').find({'finished': true}).sort({'six_distance': -1}).limit(60).toArray(function(err, data){
        leaderboard_data_six_dist = data;
        onDone();
      });

     mdb.collection('ashes_match').find({'finished': true}).sort({'no_of_fours': -1}).limit(60).toArray(function(err, data){
        leaderboard_data_four = data;
        onDone();
      });

     mdb.collection('ashes_match').find({'finished': true}).sort({'strike_rate': -1}).limit(60).toArray(function(err, data){
        leaderboard_data_strike = data;
        onDone();
      });

    mdb.collection('ashes_user').find({}, {stats: 1, fb_id: 1, fb_name: 1}).sort({'stats.runs': -1}).limit(60).toArray(function(err, data){
      leaderboard_data_career_runs = data;
      onDone();
    });

    mdb.collection('ashes_user').find({}, {stats: 1, fb_id: 1, fb_name: 1}).sort({'stats.average': -1}).limit(60).toArray(function(err, data){
      leaderboard_data_career_average = data;
      onDone();
    });

    mdb.collection('ashes_user').find({}, {stats: 1, fb_id: 1, fb_name: 1}).sort({'stats.strike_rate': -1}).limit(60).toArray(function(err, data){
      leaderboard_data_career_strike_rate = data;
      onDone();
    });
  }

  work();

  var job = new CronJob('*/10 * * * * *', function() {
    /*
     * Runs every 5 minutes
     */

    work();

    }, function () {
      /* This function is executed when the job stops */
    },
    true /* Start the job right now */
  );
}


var MONGO_URL = 'mongodb://localhost:27017/test';
var mdb = null;

function createIndexes(){
  mdb.collection('ashes_user').createIndex({'fb_id': 1});
  mdb.collection('ashes_user').createIndex({'stats.runs': -1});
  mdb.collection('ashes_user').createIndex({'stats.average': -1});
  mdb.collection('ashes_user').createIndex({'stats.strike_rate': -1});
  mdb.collection('ashes_match').createIndex({'finished': 1, 'runs': -1});
}

// helper function to get all objects (by going through all pages) of a fbgraph call
function fb_fetch_all_data(url, cb){
  objects = [];
  function iterator(url){
    fb.get(url, function(err, data){
      if (err){
        cb(err, null);
        return;
      }
      if (data.data.length == 0){
        cb(null, objects);
        return;
      }
      for (var i = 0; i < data.data.length; i++){
        objects.push(data.data[i]);
      }
      iterator(data.paging.next);
    });
  }
  iterator(url);
}

function insert_user_into_database(req, res, cb) {

  mdb.collection("ashes_user").find({"fb_id": req.user.id}).toArray(function(err, data){
    if (data.length > 0){
      cb(null);
      return;
    }
    mdb.collection("ashes_user").insertOne({
      "fb_id": req.user.id,
      "fb_name": req.user.displayName,
      "fb_url": req.user.profileUrl,
      "email": req.user.email,
      "friends": [],
      "stats": {
        runs: 0,
        matches: 0,
        balls: 0,
        average: 0,
        strike_rate: 0
      }
    }, function(err, result){
      cb(null);
    });
  });
}

function update_player_stats(user_id, match_stats, cb){
  mdb.collection('ashes_user').find({ fb_id: user_id }).toArray(function(err, data){
    if (err || data.length == 0){
      cb();
      return;
    }
    var career_stats = data[0].stats;
    career_stats.runs += parseInt(match_stats.runs_scored, 10);
    career_stats.matches++;
    career_stats.balls += parseInt(match_stats.balls_faced, 10);
    career_stats.average = career_stats.runs / career_stats.matches;
    career_stats.strike_rate = career_stats.runs / career_stats.balls;
    mdb.collection('ashes_user').updateOne(
      { fb_id: user_id },
      { $set: { stats: career_stats } },
      function (err, result){
        cb();
      }
    );
  })
}

function insert_match_into_database(req, res, cb) {

  var match = {
    "user_id": req.user.id,
    "fb_name": req.user.displayName,
    "score": 0,
    "six_distance": 0,
    "strike_rate": 0,
    "no_of_fours": 0,
    //"fb_pic_url":'http://graph.facebook.com/' + req.user.id + "/picture?type=square",
    "finished": false
  };

  var matchId = req.session.matchId;
  console.log('fff '+ matchId);
  mdb.collection('ashes_match').find({ _id: ObjectId(matchId) }).toArray(function(err, results){
    if (err){
      return;
    }
    if (results.length == 0 || results[0].finished == true){
      mdb.collection("ashes_match").insertOne(match, function(err, result){
        cb(null, match._id);
      });
    } else {
      cb(null, matchId);
    }
  });

}

function update_match_score(req, res, cb) {

  console.log(req.body.sixes);
  var max_six_dist = 0;
  for(var i = 0; i < req.body.sixes.length ; i++)
  {
    if(max_six_dist < req.body.sixes[i])
    {
      max_six_dist = req.body.sixes[i];
    }
  }
  mdb.collection("ashes_match").updateOne(
    { "_id": ObjectId(req.session.matchId) },
    {
      $set: { "score": parseInt(req.body.runs_scored, 10),"six_distance": max_six_dist, "no_of_fours": parseInt(req.body.num_fours, 10), "strike_rate": (parseInt(req.body.runs_scored, 10)*100)/parseInt(req.body.balls_faced, 10), finished: true }
    }, function(err, results){

      async.parallel([
        function(callback){
          update_player_stats(req.user.id, req.body, callback);
        },
        function(callback){
          insert_match_into_database(req, res, function(err, matchId){
            req.session.matchId = matchId;
            callback(err);
          });
        }
      ], function (err, res){
        cb(err);
      });

    }
  );
}


var FACEBOOK_APP_ID = config.fb_app_id;
var FACEBOOK_APP_SECRET = config.fb_app_secret;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Facebook profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Facebook
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://" + config.domain + "/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Facebook profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Facebook account with a user record in your database,
      // and return that user instead.
      profile.accessToken = accessToken;
      return done(null, profile);
    });
  }
));




var app = express();

// configure Express
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  //app.use(logger());
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(session({ store: new mongoStore({ url: MONGO_URL }), secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(__dirname + '/public'));

  // fb graph middleware
  app.use(function(req, res, next){
    if (req.user){
      fb.setAccessToken(req.user.accessToken);
    }
    next();
  });

function update_leaderboard_cache(req){
  var stats = req.body;
  if (!req.session.lcache){
    req.session.lcache = [];
  }
  req.session.lcache = req.session.lcache.filter(function(e){
    return e.time >= leaderboard_update_time;
  });
  stats.time = (new Date()).getTime();
  req.session.lcache.push(stats);
}

app.post('/score',function(req, res){
  if (req.user){
    console.log("Call to update score");
    update_match_score(req, res, function(err){

      // update cache
      update_leaderboard_cache(req);
      res.send('done');

    });
  } else {
    res.send('login');
  }
});

app.get('/', function(req, res){
  if(req.user){
    insert_user_into_database(req, res, function(err){

      mdb.collection('ashes_challenge').count({challengee: req.user.id, state: 1}, function(err, result){
        if (err) {
          result = 0;
        }
        res.render('index2', {user: req.user, pending_challenges: result});
      });

      // get fb friends
      fb_fetch_all_data('/me/friends', function(err, data){
        mdb.collection('ashes_user').updateOne(
          { fb_id: req.user.id },
          {
            $set: { friends: data }
          }, function (err, results){
            // do nothing
          }
        );
      });

    });

  } else {
      res.render('index2', { user: req.user, pending_challenges: 0 });
  }
});

app.get('/game', function(req, res){
  var d = new Date();
  if(!req.user){
    res.render('batsman', { user: req.user, challenge_id: -1, mode: 'G_SOLO', seed: d.getTime() });
  } else {
    insert_match_into_database(req, res, function(err, matchId){
      req.session.matchId = matchId;
      res.render('batsman', { user: req.user, challenge_id: -1, mode: 'G_SOLO', seed: d.getTime() })
    });
  }
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});


app.get('/multiplayer', function(req, res){
  if(!req.user)
  {
    res.render('login');
  }
  else
  {
    res.render('facebook_match', { user: req.user });
  }
});
// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
  passport.authenticate('facebook', {scope: ['user_friends', 'email']}),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/error', function(req, res){
  res.render('error',{});
});app.get('/error', function(req, res){
  res.render('error',{});
});

app.get('/leaderboard', function(req, res){
  function done(){
    if(!req.user)
    {
      res.render(
        'leaderboard',
        {
          leaderboard_list_score: leaderboard_data_score,
          leaderboard_list_four: leaderboard_data_four,
          leaderboard_list_six_dist: leaderboard_data_six_dist,
          leaderboard_list_strike: leaderboard_data_strike,
          leaderboard_list_career_runs: leaderboard_data_career_runs,
          leaderboard_list_career_average: leaderboard_data_career_average,
          leaderboard_list_career_strike_rate: leaderboard_data_career_strike_rate,
          user: req.user,
          pending_challenges: 0
        }
      );
    }
    else
    {
      mdb.collection('ashes_challenge').count({challengee: req.user.id, state: 1}, function(err, result){
        if (err) {
          result = 0;
        }
        res.render(
          'leaderboard',
          {
            leaderboard_list_score: leaderboard_data_score,
            leaderboard_list_four: leaderboard_data_four,
            leaderboard_list_six_dist: leaderboard_data_six_dist,
            leaderboard_list_strike: leaderboard_data_strike,
            leaderboard_list_career_runs: leaderboard_data_career_runs,
            leaderboard_list_career_average: leaderboard_data_career_average,
            leaderboard_list_career_strike_rate: leaderboard_data_career_strike_rate,
            user: req.user,
            pending_challenges: result
          }
        );
      });
    }
  }

  /*if (req.user){
    var lcache = [];
    lcache = req.session.lcache || [];
    for (var i = 0; i<lcache.length; i++){
      leaderboard_data_score.push({score: lcache[i].runs_scored, user_id: req.user.id, fb_name: req.user.displayName})
    }
    leaderboard_data_score.sort(function(l, r){
      return r.score - l.score; // sort descending
    });

    // replace user stats
    mdb.collection('ashes_user').find({fb_id: req.user.id}).toArray(function(err, data){
      if (err || data.length == 0){
        done();
        return;
      }
      var user = data[0];
      leaderboard_data_career_runs = leaderboard_data_career_runs.map(function(e){
        if (e.fb_id === user.fb_id){
          e.stats = user.stats;
        }
        return e;
      });
      leaderboard_data_career_runs.sort(function(l, r){
        return r.stats.runs - l.stats.runs;
      });

      done();
    });

    return;
  }*/

  done();
  
});


// expects a field 'opponent_id' in body
app.post('/new_challenge', function(req, res){
  console.log('sdfsfss')
  if (!req.user){
    res.redirect('/login');
    return;
  }
  challenge.createChallenge(mdb, req.user.id, req.body.opponent_id, function(err, c){
    if (err){
      res.render('error', {});
      return;
    }
    console.log(c);
    res.render('batsman', { user: req.user, challenge_id: c._id, mode: 'G_CHALLENGER', seed: c.seed });
  });
});

// expects a field 'challenge_id' in body
app.post('/accept_challenge', function(req, res){
  if (!req.user){
    res.redirect('/login');
    return;
  }
  mdb.collection('ashes_challenge').find({ _id: ObjectId(req.body.challenge_id) }).toArray(function(err, data){
    if (err || data.length == 0 || data[0].challengee !== req.user.id || data[0].state !== 1){
      res.render('error', {});
      return;
    }
    res.render('batsman', { user: req.user, challenge_id: data[0]._id, mode: 'G_CHALLENGEE', seed: data[0].seed });
  });
});

app.post('/challenger_score', function(req, res){
  if (!req.user){
    res.redirect('/login');
    return;
  }
  mdb.collection('ashes_challenge').find({ _id: ObjectId(req.body.challenge_id) }).toArray(function(err, data){
    if (err || data.length == 0 || data[0].challenger !== req.user.id || data[0].state !== 0){
      res.send('error');
      console.log('sf')
      return;
    }
    mdb.collection('ashes_challenge').updateOne(
      { _id: ObjectId(req.body.challenge_id) },
      {
        $set: { challenger_score: parseInt(req.body.runs_scored), state: 1 }
      },
      function(err, result){
        // do nothing
      }
    );
    res.send('ok');
  });
});

app.post('/challengee_score', function(req, res){
  if (!req.user){
    res.redirect('/login');
    return;
  }
  console.log(req.body);
  mdb.collection('ashes_challenge').find({ _id: ObjectId(req.body.challenge_id) }).toArray(function(err, data){
    if (err || data.length == 0 || data[0].challengee !== req.user.id || data[0].state !== 1){
      res.send('error');
      return;
    }
    mdb.collection('ashes_challenge').updateOne(
      { _id: ObjectId(req.body.challenge_id) },
      {
        $set: { challengee_score: parseInt(req.body.runs_scored), state: 2 }
      },
      function(err, result){
        // do nothing
      }
    );
    var user_score = parseInt(req.body.runs_scored);
    var opp_score = data[0].challenger_score;
    if (user_score>opp_score){
      res.send('win');
    } else if (user_score<opp_score){
      res.send('lose');
    } else {
      res.send('tie');
    }
  });
});

app.get('/challenge', function(req, res){
  if (!req.user){
    res.redirect('/login');
    return;
  }
  mdb.collection('ashes_challenge').find({ challengee: req.user.id, state: 1 }).toArray(function(err, data){
    if (err){
      res.render('error', {});
      return;
    }
    var c = 0;
    if (data.length>0){
      c = data[0]._id;
    }
    res.render('challenge', { opid: req.user.id, cid: c });
  });
});

mc.connect(MONGO_URL, function(err, db){
  mdb = db;
  startLeaderboardCron();
  //DEBUG
  /*
  mdb.collection("ashes_match").drop(function(err,reply){
    if(!err)
    {
     console.log("Executed successfully");
     startLeaderboardCron();
    }
    else
    {
      console.log("Error: "+err);
      startLeaderboardCron();
    }
  });
*/
  //DEBUG
});

app.get('/v_challenge', function(req, res){
  if (!req.user){
    res.redirect('/login');
    return;
  }
  mdb.collection('ashes_challenge').find( { $or: [ { challenger: req.user.id, state: 2 }, { challengee: req.user.id, state: 2 } ] } ).toArray(function(err1, data1){
  mdb.collection('ashes_challenge').find({ challengee: req.user.id, state: 2 }).toArray(function(err2, data2){
  mdb.collection('ashes_challenge').find({ challengee: req.user.id, state: 1 }).toArray(function(err3, data3){
  mdb.collection('ashes_user').find({ fb_id : req.user.id }, {friends: 1}).toArray(function(err4, data4){
        console.log(data4);
        if(data4.length != 0)
        {
          data4[0].friends.push({id:req.user.id, name: req.user.displayName});
        }
        else
        {
          data4=[];
          data4.push({friends:[{id:req.user.id}]});
        }
        res.render('view_challenge', {user:req.user,challenge_list : data1, challenge_list2 : data2, challenge_list3 : data3, data_friends : data4[0].friends});
        //res.send("done");
        });
      });
    });
  });
});

app.get('/user/:fbid', function(req, res){
  var fbid = req.params.fbid;
  console.log(fbid);
  mdb.collection('ashes_user').find({ fb_id: fbid }, { fb_name: 1, stats: 1 }).toArray(function(err, data){
    if (err || data.length==0){
      res.send(JSON.stringify({}));
      return;
    }
    res.send(JSON.stringify(data[0]));
  });
});

app.listen(config.port);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
