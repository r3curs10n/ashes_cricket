HEIGHT = 600
WIDTH = 1000

var game = new Phaser.Game(WIDTH, HEIGHT, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update });

function preload() {

    game.load.image('pad', 'assets/Knee.png');
    game.load.image('ball', 'assets/cball.png');
    game.load.image('sky', 'assets/sky.png');
    game.load.image('shoe', 'assets/Shoe.png');
    game.load.image('thigh_pad', 'assets/Thigh.png');
    game.load.image('t_shirt3', 'assets/upper_body.png');
    game.load.image('shoulder', 'assets/arm.png');
    game.load.image('arm', 'assets/wrist.png');
    game.load.image('bat', 'assets/bat.png');
    game.load.image('star', 'assets/star.png');
    game.load.image('wicket', 'assets/wicket.jpg');
    game.load.image('wicket_dislodged', 'assets/wicket_dislodged.jpg');
    game.load.image('head', 'assets/head.png');
    game.load.image('scorecard', 'assets/scorecard.jpg');

}

G_SOLO = 0;
G_CHALLENGER = 1;
G_CHALLENGEE = 2;


var cursors;
var sprites = {};
var mouseSprite = null;
var materials = {}
var gameover=0,ballText,no_of_balls=0;
var game_mode = G_SOLO;
var practice = true;
var velocityBar = {};
var update_meter = 0;

var seed = 0;

var max_balls, max_wickets;
var wickets = 0;

var stats = {
  balls_faced: 0,
  runs_scored: 0,
  num_fours: 0,
  sixes: [],
  balls: []
}

var distText, runsText, practiceText;

var bowl;

var onGameOver = null;
var idle = true;
var reset_required = true;

function rads(deg) {
  return deg*3.1416/180;
}

function repeat(func, interval) {
  function go() {
    func();
    setTimeout(go, interval);
  }
  go();
}

// collision groups
C_BAT = null;
C_BALL = null;
C_GROUND = null;
C_WICKET = null;
C_WALL = null;
C_BODY = null;

OX = 150;   // position of back shoe - x
OY = 500;   // position of back shoe - y
OWX=15;
OWY=435;
DBL = 230;  // distance between shoes

SCALE = 100;
var lowerLegSize = 1.05*SCALE,
    upperLegSize = 1.05*SCALE,
    spineSize = 1.26*SCALE,
    upperArmSize = 0.88*SCALE,
    lowerArmSize = 0.80*SCALE,
    tboneSize = 0.35*SCALE,
    tboneLSize = 0*SCALE,
    batSize = 1.75*SCALE,
    batSizeW = 0.3*SCALE,
    headSize = 0.88*SCALE;

var skeleton = [
  {
    id: 'head',
    assetKey: 'head',
    length: headSize,
    position: {
      x: OX+DBL/2,
      y: OY-(lowerLegSize+upperLegSize+spineSize/2),
      angle: rads(-90)
    },
    zindex: 0,
  },
  {
    id: 'lowerLeftLeg',
    assetKey: 'pad',
    length: lowerLegSize,
    position: {
      x: OX+DBL,
      y: OY,
      angle: rads(-90)
    },
    zindex: -10,
  },
  {
    id: 'lowerRightLeg',
    assetKey: 'pad',
    length: lowerLegSize,
    position: {
      x: OX,
      y: OY,
      angle: rads(-90)
    },
    zindex: -10,
  },
  {
    id: 'upperLeftLeg',
    assetKey: 'thigh_pad',
    length: upperLegSize,
    position: {
      x: OX+DBL,
      y: OY-lowerLegSize,
      angle: rads(-90)
    },
    zindex: -5,
  },
  {
    id: 'upperRightLeg',
    assetKey: 'thigh_pad',
    length: upperLegSize,
    position: {
      x: OX,
      y: OY-lowerLegSize,
      angle: rads(-90)
    },
    zindex: -7,
  },
  {
    id: 'spine',
    assetKey: 't_shirt3',
    length: spineSize,
    position: {
      x: OX+DBL/2,
      y: OY-(lowerLegSize+upperLegSize),
      angle: rads(-90)
    },
    zindex: 0,
  },
  {
    id: 'lowerLeftArm',
    assetKey: 'arm',
    length: lowerArmSize,
    position: {
      x: OX+DBL,
      y: OY-(lowerLegSize+upperLegSize+spineSize-upperArmSize-lowerArmSize),
      angle: rads(90)
    },
    zindex: -12,
  },
  {
    id: 'lowerRightArm',
    assetKey: 'arm',
    length: lowerArmSize,
    position: {
      x: OX,
      y: OY-(lowerLegSize+upperLegSize+spineSize-upperArmSize-lowerArmSize),
      angle: rads(90)
    },
    zindex: -12,
  },
  {
    id: 'upperLeftArm',
    assetKey: 'shoulder',
    length: upperArmSize,
    position: {
      x: OX+DBL,
      y: OY-(lowerLegSize+upperLegSize+spineSize-lowerArmSize),
      angle: rads(-90)
    },
    zindex: 1,
  },
  {
    id: 'upperRightArm',
    assetKey: 'shoulder',
    length: upperArmSize,
    position: {
      x: OX,
      y: OY-(lowerLegSize+upperLegSize+spineSize-lowerArmSize),
      angle: rads(-90)
    },
    zindex: -11,
  }
];

// delay: after how many milliseconds should the specified limits be applied
var joints = {
  head: {
    a: {
      bone: 'head',
      pivot: [-headSize/2, 0]
    },
    b: {
      bone: 'spine',
      pivot: [spineSize/2-15, 30]
    },
    limits: [{min: rads(0), max: rads(0), delat: 0}]
  },
  leftKnee: {
    a: {
      bone: 'lowerLeftLeg',
      pivot: [lowerLegSize/2-20, 0]
    },
    b: {
      bone: 'upperLeftLeg',
      pivot: [-upperLegSize/2, 0]
    },
    limits: [{min: rads(-120), max: rads(-20), delay: 0}]
  },
  rightKnee: {
    a: {
      bone: 'lowerRightLeg',
      pivot: [lowerLegSize/2-20, 0]
    },
    b: {
      bone: 'upperRightLeg',
      pivot: [-upperLegSize/2, 0]
    },
    limits: [{min: rads(-55), max: rads(-5), delay: 0}]
  },
  leftPelvis: {
    a: {
      bone: 'upperLeftLeg',
      pivot: [upperLegSize/2, 0]
    },
    b: {
      bone: 'spine',
      pivot: [-spineSize/2+10, 5]
    },
    limits: [{min: rads(10), max: rads(60), delay: 0}]
  },
  rightPelvis: {
    a: {
      bone: 'upperRightLeg',
      pivot: [upperLegSize/2, 0]
    },
    b: {
      bone: 'spine',
      pivot: [-spineSize/2+10, -5]
    },
    limits: [{min: rads(-20), max: rads(100), delay: 0}]
  },
  leftShoulder: {
    a: {
      bone: 'upperLeftArm',
      pivot: [-upperArmSize/2, 0]
    },
    b: {
      bone: 'spine',
      pivot: [spineSize/2-10, tboneSize/2]
    },
    limits: [
      {min: rads(-210), max: rads(-50), delay: 0}
    ]
  },
  rightShoulder: {
    a: {
      bone: 'upperRightArm',
      pivot: [-upperArmSize/2, 0]
    },
    b: {
      bone: 'spine',
      pivot: [spineSize/2-10, -tboneSize/2]
    },
    limits: [
      {min: rads(40), max: rads(230), delay: 0}
    ]
  },
  leftElbow: {
    a: {
      bone: 'lowerLeftArm',
      pivot: [-lowerArmSize/2+10, 0]
    },
    b: {
      bone: 'upperLeftArm',
      pivot: [upperArmSize/2-10, 0]
    },
    limits: [
      {min: rads(-150), max: rads(-30), delay: 0}
    ]
  },
  rightElbow: {
    a: {
      bone: 'lowerRightArm',
      pivot: [-lowerArmSize/2+10, 0]
    },
    b: {
      bone: 'upperRightArm',
      pivot: [upperArmSize/2-10, -2]
    },
    limits: [
      {min: rads(30), max: rads(150), delay: 0}
    ]
  },
};

function createBoneSprite(id, assetKey, length) {
  var sprite = game.add.sprite(100, 100, assetKey);
  game.physics.p2.enable(sprite);
  sprite.body.clearShapes();
  sprite.body.addLine(length, 0, 0, 0);
  sprite.body.clearCollision(true, true);
  sprite.body.setCollisionGroup(C_BODY);
  sprite.body.collides([C_GROUND]);
  sprites[id] = sprite;
  return sprite;
}

function createSkeleton(skeleton, joints) {
  skeleton.sort(function(l, r) {
    return -(l.zindex - r.zindex);
  });

  for (var i in skeleton) {
    var bone = skeleton[i];
    var sprite = createBoneSprite(bone.id, bone.assetKey, bone.length);
    sprite.body.x = bone.position.x;
    sprite.body.y = bone.position.y;
    sprite.body.rotation = bone.position.angle;
    sprite.body.angularDamping = 0.8;
    sprite.body.damping = 0.8;
  }
  
  for (var jointId in joints) {
    var joint = joints[jointId];
    var constraint = game.physics.p2.createRevoluteConstraint(sprites[joint.a.bone], joint.a.pivot, sprites[joint.b.bone], joint.b.pivot);
    for (var limitId in joint.limits) {
      var limit = joint.limits[limitId];
      function go(constraint, limit){
        setTimeout(function(){
          constraint.setLimits(limit.min, limit.max);
        }, limit.delay);
      }
      go(constraint, limit);
    }
  }

}

function glueLegs() {

  var leftShoe = game.add.sprite(OX+DBL, OY, 'shoe');
  sprites.leftShoe = leftShoe;
  game.physics.p2.enable(leftShoe);
  leftShoe.body.clearCollision(true, true);
  leftShoe.body.static = true;

  var rightShoe = game.add.sprite(OX, OY, 'shoe');
  sprites.rightShoe = rightShoe;
  game.physics.p2.enable(rightShoe);
  rightShoe.body.clearCollision(true, true);
  rightShoe.body.static = true;

  
  game.physics.p2.createDistanceConstraint(leftShoe, sprites.lowerLeftLeg, 0, [-10,-20], [-lowerLegSize/2, 0]);
  game.physics.p2.createDistanceConstraint(rightShoe, sprites.lowerRightLeg, 0, [0,-10], [-lowerLegSize/2, 0]);
  
}

function addScoreCard() {
  var scoreCard = game.add.sprite(8, 8, 'scorecard');
  scoreCard.scale.setTo(0.15,0.15);
}

function addBat() {
  var bat = game.add.sprite(0, 0, 'bat');
  sprites.bat = bat;
  game.physics.p2.enable(bat);
  bat.body.clearCollision(true, true);
  bat.body.clearShapes();
  bat.body.addRectangle(180, 45);
  bat.body.setCollisionGroup(C_BAT);
  bat.body.collides([C_BALL, C_WICKET, C_GROUND]);
  bat.body.setMaterial(materials.bat);
  bat.body.x = OX+100;
  bat.body.y = OY-100;
  
  // hands together
  // game.physics.p2.createDistanceConstraint(
  //   sprites.lowerLeftArm,
  //   sprites.lowerRightArm,
  //   0,
  //   [lowerArmSize/2, 0],
  //   [lowerArmSize/2, 0]
  // );

  // add bat
  var c = game.physics.p2.createRevoluteConstraint(
    sprites.bat,
    [-batSize/2+10, 5],
    sprites.lowerLeftArm,
    [lowerArmSize/2, 0]
  );
  c.setLimits(rads(-25), rads(-20));

  c = game.physics.p2.createRevoluteConstraint(
    sprites.bat,
    [-batSize/2+30, 15],
    sprites.lowerRightArm,
    [lowerArmSize/2, 0]
  );

}

function bowled()
{
  if (gameover==0){
    wickets++;
    if (wickets == max_wickets){
      gameover=1;
    }
  }
}

function hit_wicket()
{
  if (gameover==0){
    wickets++;
    if (wickets == max_wickets){
      gameover=1;
    }
  }
}

function collide_wall(){
  update_meter = 1;
  velocityBar.currentProgress = 0;
  var ball = sprites.ball;
  var g = game.physics.p2.gravity.y;
  var h = OY - ball.body.y;
  var u = ball.body.velocity.y;
  var t = (-u + Math.sqrt(u*u + 2*h*g))/g;  // time to hit ground
  var s = Math.abs(ball.body.velocity.x) * t;  // distance covered
  stats.prev_runs = stats.runs_scored;
  if (ball.bounced_after_bat === false){
    distText.text = 'six dist: ' + s;
    if (s>=2400){
      // it's a six!
      stats.sixes.push(s);
      stats.runs_scored += 6;
      //runsText.text = 'Runs:          ' + stats.runs_scored;
    } else {
      distText.text = 'OUT!'
      if (gameover==0){
        wickets++;
        if (wickets == max_wickets){
          gameover = 1;
        }
      }
    }
  } else {
    distText.text = 'ball speed: ' + Math.abs(ball.body.velocity.x);
    var vel = Math.abs(ball.body.velocity.x);
    var runs = 0;
    if (vel>=1300) {
      runs = 4;
      stats.num_fours += 1;
      vel = 1500;
    } else if (vel>=1200) {
      runs = 3;
    } else if (vel>=1000) {
      runs = 2;
    } else if (vel>=600) {
      runs = 1;
    }
    velocityBar.progress = (vel * 128)/1500;
    velocityBar.colour = runs;
    distText.text = runs;
    stats.runs_scored += runs;
    //runsText.text = 'Runs:          ' + stats.runs_scored;
  }
}

function collide_ground(){
  var ball = this;
  if (ball.hit_bat === true){
    ball.bounced_after_bat = true;
  }
}

function collide_bat(){
  var ball = this;
  ball.hit_bat = true;
}

function addWicket() {
  var wicket = game.add.sprite(OWX, OWY, 'wicket');
  sprites.wicket = wicket;
  game.physics.p2.enable(wicket);
  wicket.body.clearCollision(true, true);
  wicket.body.setCollisionGroup(C_WICKET);
  wicket.body.collides(C_BALL,bowled,this);
  wicket.body.collides(C_BAT,hit_wicket,this);
  wicket.body.static=true;
}

function addGround() {
  var ground = game.add.sprite(0, OY);
  sprites.ground = ground;
  game.physics.p2.enable(ground);
  ground.body.clearShapes();
  ground.body.addPlane();
  ground.body.clearCollision(true, true);
  ground.body.setCollisionGroup(C_GROUND);
  ground.body.collides([C_BALL, C_BODY]);
  ground.body.static = true;
  ground.body.setMaterial(materials.ground);

  var bat_ground = game.add.sprite(0, OY+30);
  game.physics.p2.enable(bat_ground);
  bat_ground.body.clearShapes();
  bat_ground.body.addPlane();
  bat_ground.body.clearCollision(true, true);
  bat_ground.body.setCollisionGroup(C_GROUND);
  bat_ground.body.collides([C_BAT]);
  bat_ground.body.static = true;
}

function addVelocityBar() {
  // just a property we can tween so the bar has a progress to show
  console.log("yes");
  velocityBar.progress = 128;
        
  // the bar itself
  velocityBar.image = game.add.bitmapData(128, 8);
        
  game.add.sprite(game.world.centerX + (game.world.width * 0.4) - (velocityBar.image.width * 0.5), game.world.centerY - (game.world.height * 0.4), velocityBar.image);
      
  //game.add.tween(velocityBar).to({barProgress: 0}, 2000, null, true, 0, Infinity);
}

function updateScoreCard() {
  if(stats.prev_runs < stats.runs_scored) {
    stats.prev_runs += 1;
    runsText.text = 'Runs:          ' + stats.prev_runs;
    update_meter = 3;
  } else if (stats.prev_runs == stats.runs_scored) {
    update_meter = 0;
  }
}

function updateVelocityBar() {
  console.log("yep");
  // ensure you clear the context each time you update it or the bar will draw on top of itself
  velocityBar.image.context.clearRect(0, 0, velocityBar.image.width, velocityBar.image.height);
  
  // some simple colour changing to make it look like a health bar
  if (velocityBar.colour == 0) {
    velocityBar.image.context.fillStyle = '#fff';
    distText.addColor('#fff', 0);
  } else if (velocityBar.colour == 1) {
    velocityBar.image.context.fillStyle = '#aaa';
    distText.addColor('#aaa', 0); 
  } else if (velocityBar.colour == 2) {
    velocityBar.image.context.fillStyle = '#00f';
    distText.addColor('#00f', 0);
  } else if (velocityBar.colour == 3) {
    velocityBar.image.context.fillStyle = '#0f0';
    distText.addColor('#0f0', 0);
  } else if (velocityBar.colour == 4 || velocityBar.colour == 6) {
    velocityBar.image.context.fillStyle = '#f00';
    distText.addColor('#f00', 0);
  } 
  
  // draw the bar
  
  
  if (velocityBar.currentProgress == velocityBar.progress) {
    velocityBar.image.context.fillRect(0, 0, velocityBar.currentProgress, 8);
    update_meter = 2;
  } else if (velocityBar.currentProgress < velocityBar.progress) {
    velocityBar.image.context.fillRect(0, 0, velocityBar.currentProgress, 8);
    velocityBar.currentProgress += 1;
  } else {
    update_meter = 2;
  }
  // important - without this line, the context will never be updated on the GPU when using webGL
  velocityBar.image.dirty = true;
}

function createBall() {
    var ball = game.add.sprite(0, 0, 'ball');
    sprites.ball = ball;
    game.physics.p2.enable(ball);
    ball.body.clearShapes();
    ball.body.addCircle(20);
    ball.body.mass = 0.8;
    ball.body.clearCollision(true, true);
    ball.body.setCollisionGroup(C_BALL);
    ball.body.collides([C_WICKET]);
    ball.body.collides(C_GROUND, collide_ground, ball);
    ball.body.collides(C_BAT, collide_bat, ball);
    // ball.body.collides(C_WALL, collide_wall, ball);
    ball.body.setMaterial(materials.ball);

    ball.hit_bat = false; // track whether ball has hit bat
    ball.bounced_after_bat = false; // track whether ball has bounced after hitting bat

    var next_ball = getBowlingPlan();

    return function(){
      no_of_balls=no_of_balls+1;
      ballText.text = 'Overs:        ' + parseInt(no_of_balls/6) + '.' + no_of_balls%6;
      stats.balls_faced += 1;
      var z = next_ball();
      // console.log(z);
      ball.body.x = 1000;
      ball.body.y = 100;
      ball.body.velocity.x = z.vx;
      ball.body.velocity.y = z.vy;
      ball.body.angularVelocity = z.spin;
      materials.groundBall.friction = z.friction;
      materials.groundBall.restitution = z.restitution;
      // stats.balls.push(z);
      ball.hit_bat = false;
      ball.bounced_after_bat = false;
    }
}

function createMaterials() {
  materials.bat = game.physics.p2.createMaterial('batMaterial');
  materials.ball = game.physics.p2.createMaterial('ballMaterial');
  materials.ground = game.physics.p2.createMaterial('groundMaterial');
  materials.wall = game.physics.p2.createMaterial('wallMaterial');

  materials.groundBall = game.physics.p2.createContactMaterial(materials.ground, materials.ball);
  materials.groundBall.restitution = 0.45;
  materials.groundBall.stiffness = 10000000;
  materials.groundBall.friction = 7;

  materials.batBall = game.physics.p2.createContactMaterial(materials.bat, materials.ball);
  materials.batBall.restitution = 0.5;
  materials.batBall.stiffness = 1000000;
  materials.batBall.friction = 5;

}

/*function addWalls(){
  var wall = game.add.sprite(0, 0);
  game.physics.p2.enable(wall);
  wall.body.clearShapes();
  wall.body.addPlane();
  wall.body.clearCollision(true, true);
  wall.body.setCollisionGroup(C_WALL);
  wall.body.collides([C_BALL]);
  wall.body.static = true;
  wall.body.setMaterial(materials.wall);
  wall.body.rotation = rads(-90);
  wall.body.x = 950;
  wall.body.debug = true;
}*/

function create(){
  console.log("create");
  $('#phaser-example').first().children().first().css('display', 'inline');
  // game.add.image(0, 0, 'sky');
  game.stage.backgroundColor = '#7ec0ee';

  //  Enable p2 physics
  game.physics.startSystem(Phaser.Physics.P2JS);
  game.physics.p2.setImpactEvents(true);
  //console.log(game.physics.p2);
  game.physics.p2.world.iterations = 5;
  game.physics.p2.gravity.y = 500;

  // create collision groups
  C_BAT = game.physics.p2.createCollisionGroup();
  C_BALL = game.physics.p2.createCollisionGroup();
  C_GROUND = game.physics.p2.createCollisionGroup();
  C_WICKET = game.physics.p2.createCollisionGroup();
  C_WALL = game.physics.p2.createCollisionGroup();
  C_BODY = game.physics.p2.createCollisionGroup();

  // create materials
  createMaterials();

  createSkeleton(skeleton, joints);
  glueLegs();
  addGround();
  addWicket();
  addVelocityBar();

  
  distText = game.add.text(256, 16, 'Dist', { fontSize: '32px', fill: '#000' });
  //runsText = game.add.text(256, 52, 'Dist', { fontSize: '32px', fill: '#000' });
  practiceText = game.add.text(256, 88, '...', { fontSize: '16px', fill: '#000' });

  // wait for arms to stabilize before adding bat
  addBat();
  addScoreCard();
  ballText = game.add.text(16, 48, 'Overs:        0.0', { fontSize: '20px', fill: '#fff' });
  runsText = game.add.text(16, 24, 'Dist', { fontSize: '20px', fill: '#000' });
  setTimeout(startMouseInput, 300);

  past_time=(new Date()).getTime()-3000;
  bowl=createBall();
}

function startMouseInput() {

  mouseSprite = game.add.sprite(0, 0);
  game.physics.p2.enable(mouseSprite);
  mouseSprite.body.clearCollision(true, true);
  mouseSprite.body.static = true;

  game.input.addMoveCallback(move, this);
  game.physics.p2.createRevoluteConstraint(mouseSprite, [0,0], sprites.bat, [0,0], 700);

}

function move() {
  if (mouseSprite !== null) {
    mouseSprite.body.x = game.input.mousePointer.x;
    mouseSprite.body.y = game.input.mousePointer.y;
  }
}

var check_runs = false;

function update() {

  if (idle === true) {
    return;
  }
  if (reset_required === true) {
    reset();
    reset_required = false;
  }

  if (practice === true){
    if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)){
      reset();
      practiceText.text = 'Match on!'
      practice = false;
      Math.seedrandom(seed);
      return;
    }
  }

  sprites.lowerRightLeg.body.applyForce([0, 100], sprites.lowerRightLeg.x, sprites.lowerRightLeg.y);
  sprites.lowerLeftLeg.body.applyForce([50, 100], sprites.lowerLeftLeg.x, sprites.lowerLeftLeg.y);
  sprites.spine.body.applyForce([0, 100], sprites.spine.x, sprites.spine.y);

  if(gameover==0 || practice===true)
  {
    console.log(update_meter);
    if(update_meter == 0) {
      if (check_runs){
        if (sprites.ball.body.x >= WIDTH+100 || sprites.ball.body.y <= 0){
          check_runs = false;
          collide_wall();
        }
      }

      if (practice===false && stats.balls_faced >= max_balls){
        wickets++;
        if (wickets==max_wickets){
          gameover = 1;
        }
      }

      present_time = (new Date()).getTime();
      if(present_time - past_time >= 3000)
        { 
            bowl();
            check_runs = true;
            past_time=present_time;
        }
    } else if (update_meter == 1) {
      updateVelocityBar();
      present_time=(new Date()).getTime();
    } else if (update_meter == 2) {
      updateScoreCard();
    } else if (update_meter == 3) {
      if(stats.waiting < 50) {
        stats.waiting += 1;
        //console.log(stats.waiting);
      } else if (stats.waiting == 50) {
        stats.waiting = 0;
        console.log('yes');
        update_meter = 2;
      }
    }
  }
  else if(gameover==1)
  {
      gameover=2;
      seed++;
      Math.seedrandom(seed);
      sprites.wicket.loadTexture('wicket_dislodged');
      ballText.text="GAME OVER";
      if (onGameOver !== null){
        var start_again = onGameOver(stats);
        if (start_again){
          reset();
        }
      }
  }
}

function reset(){
  gameover = 0;
  sprites.wicket.loadTexture('wicket');
  no_of_balls = 0;
  wickets = 0;
  stats = {
    balls_faced: 0,
    runs_scored: 0,
    num_fours: 0,
    prev_runs: 0,
    waiting: 0,
    sixes: [],
    balls: []
  }
  sprites.ball.body.x = WIDTH;
  sprites.ball.body.velocity.x = 0;
  past_time = (new Date()).getTime();
  practice = true;
  ballText.text = "Let's begin!";
  practiceText.text = 'Get some practice and press SPACE when you are ready'
  displayStats();
}

function displayStats(){
  runsText.text = 'Runs:          ' + stats.runs_scored;
  ballText.text = 'Overs:        0.0';
}

function startGame(mode, _seed, gameOverCallback){
  seed = _seed;
  if (mode===G_SOLO){
    Math.seedrandom(seed);
  } else {
    Math.seedrandom('42');
  }
  
  onGameOver = gameOverCallback;
  reset_required = true;
  idle = false;
  game_mode = mode;
  if (mode === G_SOLO){
    max_balls = 10000000;
    max_wickets = 1;
  } else {
    max_balls = 30;
    max_wickets = 2;
  }
}
