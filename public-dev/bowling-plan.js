function getBowlingPlan(){

  var bowling_plan = [
    {
      name: 'stock',
      vx: [-800, -700],
      vy: [500, 550],
      spin: [0, 0],
      restitution: 0.45,
      friction: 7,
      freq: 60
    },
    {
      name: 'flipper',
      vx: [-700, -550],
      vy: [400, 500],
      spin: [-80, -40],
      restitution: 0.35,
      friction: 15,
      freq: 15
    },
    {
      name: 'yorker',
      vx: [-1000, -900],
      vy: [450, 550],
      spin: [-20, 0],
      restitution: 0.45,
      friction: 3,
      freq: 15
    },
    {
      name: 'bouncer',
      vx: [-850, -750],
      vy: [900, 1000],
      spin: [-10, 10],
      restitution: 0.45,
      friction: 7,
      freq: 20
    },
    {
      name: 'backspin',
      vx: [-650, -550],
      vy: [500, 550],
      spin: [50, 80],
      restitution: 0.60,
      friction: 15,
      freq: 15
    },
    {
      name: 'loose',
      vx: [-500, -400],
      vy: [500, 550],
      spin: [0, 0],
      restitution: 0.45,
      friction: 7,
      freq: 0
    }
  ];

  var tot = 0;
  var cdf = [-1];
  for (var i=0; i<bowling_plan.length; i++){
    tot += bowling_plan[i].freq;
    cdf.push(tot);
  }

  return function(){
    var r = randomInt(0, tot);
    var idx = 1;
    for (; idx<cdf.length; idx++){
      if (r<=cdf[idx] && r>cdf[idx-1]){
        idx--;
        break;
      }
    }
    var ball = bowling_plan[idx];
    return {
      vx: randomInt(ball.vx[0], ball.vx[1]),
      vy: randomInt(ball.vy[0], ball.vy[1]),
      spin: randomInt(ball.spin[0], ball.spin[1]),
      restitution: ball.restitution,
      friction: ball.friction
    };
  }
}