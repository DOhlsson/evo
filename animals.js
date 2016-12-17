function Animal(x, y, color, def) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.def = def;
  this.life = randomInt(600, 700);
  this.energy = 300;
  this.reproductionCooldown = 300;

  // TODO: do this better

  if (def.functions.draw == "herbivoreDraw") {
    this.draw = herbivoreDraw;
  } else if (def.functions.draw == "carnivoreDraw") {
    this.draw = carnivoreDraw;
  } else {
    throw new Error("No draw function");
  }

  if (def.functions.move == "herbivoreMove") {
    this.move = herbivoreMove;
  } else if (def.functions.move == "carnivoreMove") {
    this.move = carnivoreMove;
  } else {
    throw new Error("No move function");
  }

  if (def.functions.ai == "herbivoreAI") {
    this.ai = herbivoreAI;
    this.eatVal = herbivoreEatVal;
  } else if (def.functions.ai == "carnivoreAI") {
    this.ai = carnivoreAI;
    this.moveTarget = moveTarget;
  } else {
    throw new Error("No ai function");
  }
}
function moveTarget(target) {
  var xdiff = Math.abs(this.x - target.x);
  var ydiff = Math.abs(this.y - target.y);

  if (xdiff > ydiff) {
    if (this.x < target.x) {
      this.x++;
    } else if (this.x > target.x) {
      this.x--;
    }
  } else {
    if (this.y < target.y) {
      this.y++;
    } else if (this.y > target.y) {
      this.y--;
    }
  }

  return this.x == target.x && this.y == target.y;
}

function herbivoreDraw(context) {
  context.beginPath();
  context.arc(this.x*game.config.tilesize+game.config.tilesize/2,
              this.y*game.config.tilesize+game.config.tilesize/2,
              game.config.tilesize/2-2, 0, 2 * Math.PI, false);
  context.fillStyle = this.color.toString();
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'black';
  context.stroke();
}
function herbivoreMove() {
  var r = randomInt(0, 3);
  var ps = [];
  var eat = 0;
  var eatp;

  // TODO: not map limit safe
  ps[0] = game.getPlant(this.x+1, this.y);
  ps[1] = game.getPlant(this.x, this.y+1);
  ps[2] = game.getPlant(this.x-1, this.y);
  ps[3] = game.getPlant(this.x, this.y-1);

  for (var j = 0; j < ps.length; j++) {
    var i = (j+r) % 4;
    var e = this.eatVal(ps[i]);

    if (e > eat) {
      eatp = ps[i];
      eat = e;
    }
  }

  if (eat > game.config.eatlimit) {
    this.x = eatp.x;
    this.y = eatp.y;
  } else {
    var d = randomDir(this.x, this.y);
    this.x = d.x;
    this.y = d.y;
  }
}
function herbivoreAI() {
  // TODO: split ai into parts, and make it modular
  this.reproductionCooldown--;
  this.energy -= 10;
  this.life--;

  var p = game.getPlant(this.x, this.y);
  if (p) { p.visited = true; }
  game.rerenderRq(p != null ? p : new RerenderSq(this.x, this.y));
  if (this.life <= 0) {
    game.deaths.oldage++;
    deleteAnimal(this);
    return;
  }

  if (this.energy <= 0) {
    game.deaths.starvation++;
    deleteAnimal(this);
    return;
  }

  var eat = this.eatVal(p);
  if (eat < game.config.eatlimit) {  // move
    this.move();
  } else {  // eat
    if (p.size < eat && this.energy > 4000) { // graze
      this.move();
    } else if (p.size < eat) {
      this.energy += p.size;
      p.size = -1;
      game.plants[p.x][p.y] = null;
      game.plantsAlive--;
    } else {
      this.energy += eat;
      p.size -= eat;
    }
  }

  if (this.reproductionCooldown <= 0 && this.energy > 4000) {  // breed
    var na = new Animal(this.x, this.y, this.color.mutate(game.config.animalMutation), this.def);
    this.energy = 2000;
    this.reproductionCooldown = 200;
    game.animals.push(na);
  }
}
function herbivoreEatVal (p) {
  if (!p)
    return 0;

  var eff = Math.abs(this.color.r - p.color.r);
  eff += Math.abs(this.color.g - p.color.g);
  eff += Math.abs(this.color.b - p.color.b);
  eff = 1-eff/765;
  return Math.floor(50*eff);
}

function carnivoreDraw(context) {
  var leftx = this.x*game.config.tilesize;
  var lefty = (this.y+1)*game.config.tilesize - game.config.plantBorder;
  var rightx = leftx + game.config.tilesize - game.config.plantBorder;
  var righty = lefty;
  var topx = leftx + Math.floor(game.config.tilesize/2);
  var topy = this.y*game.config.tilesize;
  context.beginPath();
  context.moveTo(leftx, lefty);
  context.lineTo(rightx, righty);
  context.lineTo(topx, topy);
  context.fillStyle = this.color.toString();
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'black';
  context.stroke();
}

function carnivoreAI() {
  this.reproductionCooldown--;
  this.energy -= 9;
  this.life--;

  // TODO make this in another function?
  var p = game.getPlant(this.x, this.y);
  if (p) { p.visited = true; }
  game.rerenderRq(p != null ? p : new RerenderSq(this.x, this.y));

  if (this.life <= 0) {
    console.log('died of old age', this.energy, 'energy left');
    game.deaths.oldage++;
    deleteAnimal(this);
    return;
  }

  if (this.energy <= 0) {
    console.log('died of starvation', this.life, 'life left');
    game.deaths.starvation++;
    deleteAnimal(this);
    return;
  }

  if (this.life < this.reproductionCooldown) {
    // old and waits to die
    return;
  }

  if (this.digestion) {
    this.digestion--;
  } else if (this.reproductionCooldown <= 0 && this.energy > 5000) {  // breed
    console.log('reproduced');
    var na = new Animal(this.x, this.y, this.color.mutate(game.config.animalMutation), this.def);
    na.energy -= 75;
    na.life += 50;
    this.energy = 2000;
    this.reproductionCooldown = 300;
    game.animals.push(na);
  } else {
    this.move(); 
  }
}

function carnivoreMove() {
  if (this.target) {
    //console.log('have target');
    var t = false;
    if (this.life%4 > 0) {
      var t = this.moveTarget(this.target);
    } else {
      var rd = randomDir(this.x, this.y);
      this.x = rd.x;
      this.y = rd.y;
    }
    if (t) {
      //console.log('standing on target');
      var da = deleteAnimal(this.target);
      if (da) {
        if (this.target.def == this.def) {
          console.log('CANNIBAL!'); // TODO only cannibalize if there is no other food source
        }
        this.digestion = 35;
        game.deaths.predation++;
        this.energy += Math.floor(this.target.energy/2);
        this.target = null;
        return;
      } else {
        this.target = null;
      }
    }
  } else {
    var dmin = Number.MAX_VALUE;
    var tar;
    var me = this;
    game.animals.forEach(function (a) {
      if (a == me) {
        return;
      }
      if (a.def != me.def || me.energy < 200) {
        var d = (a.x - me.x)*(a.x - me.x) + (a.y - me.y)*(a.y - me.y);
        if (!a.targeted && d < game.config.viewDistance && d < dmin) {
          tar = a;
          dmin = d;
        }
      }
    });
    if (tar) {
      //console.log('have new target');
      this.target = tar;
      this.target.targeted = true;
    } else {
      var x = randomInt(0, game.max_x);
      var y = randomInt(0, game.max_y);
      this.target = {x: x, y: y};
    }
  }
}
