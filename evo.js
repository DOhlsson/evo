//  --- Feature Wishlist ---
// pretty up the animal functions, too much code in large functions now
// Help Box
// Optionally skip rendering frames to increase ticks per second
// generalized, importable/exportable types
// special organism designs: locust, pirana, tree
// do experiments with 0 mutation systems, like black/white plants and animals
// make it possible to run many simulations side by side!
// live changing size of the map
// animals non-grid based
// larger map than viewsize
// tick and render speed not dependent on javascripts scheduler
//   use setTimeout instead, enable a stop counter that counts down frames until stop
//   1 for pause command, 10-60 for extinction (to let plants regrow before rendering stops)
//   this would be a good way to add a scheduler independent turbo-mode

var screenW = document.body.clientWidth;
var screenH = document.body.clientHeight;

var statsdiv = document.getElementById("stats");
var messagediv = document.getElementById("message");
var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
canvas.width = screenW;
canvas.height = screenH;

var defaultCfg = {
  tilesize: 20,
  eatlimit: 40,
  endOnEmpty: true,
  startPlants: 0.1,
  startHerbivores: 0.01,
  startCarnivores: 0.001,
  plantBorder: 1,
  gamespeed: 16,
  plantMutation: 10,
  animalMutation: 10,
  viewDistance: 100
};
var cfg = copyCfg(defaultCfg);
cfg.startPlants = 0.2;
cfg.startHerbivores = 0.01;
cfg.startCarnivores = 0.0002;
cfg.endOnEmpty = true;
cfg.gamespeed = 16;
cfg.tilesize = 10;
cfg.plantBorder = 1;
cfg.eatlimit = 40;
cfg.animalMutation = 15;
cfg.plantMutation = 5;
cfg.viewDistance = 200;

var game;

function Game(config) {
  this.config = config;
  this.frameNumber = 0;
  this.interval;
  this.rerender = [[]];
  this.running = false;

  this.plants = [[]];
  this.plantsAlive = 0;
  this.animals = [];

  // TODO: move these into a map based object?
  this.max_x = Math.floor(screenW/config.tilesize - 1);
  this.max_y = Math.floor(screenH/config.tilesize - 1);
  var mapsize = this.max_x * this.max_y;

  var startPlants = Math.floor(this.config.startPlants*mapsize);
  if (startPlants < 1) startPlants = 1;

  var startHerbivores = Math.floor(this.config.startHerbivores*mapsize);
  if (startHerbivores < 1) startHerbivores = 1;

  var startCarnivores = Math.floor(this.config.startCarnivores*mapsize);
  if (startCarnivores < 1) startCarnivores = 1;

  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (var i = 0; i < startPlants; i++) {
    var x = randomInt(0, this.max_x);
    var y = randomInt(0, this.max_y);
    var plotFree = !(this.plants[x] != null && this.plants[x][y] != null);
    if (plotFree) {
      this.plantsAlive++;
      if (!this.plants[x]) {
        this.plants[x] = [];
      }
      this.plants[x][y] = new Plant(x, y, new Color(0, randomInt(128, 255), 0));
    }
  }
  for (var i = 0; i < startHerbivores; i++) {
    var x = randomInt(0, this.max_x);
    var y = randomInt(0, this.max_y);
    var na = new Animal(x, y, new Color(0, 255, 0), herbivore);
    na.life += 200;
    na.energy += 400;
    this.animals.push(na);
  }
  for (var i = 0; i < startCarnivores; i++) {
    var x = randomInt(0, this.max_x);
    var y = randomInt(0, this.max_y);
    var na = new Animal(x, y, new Color(0, 255, 0), carnivore);
    na.life += 200;
    na.energy += 400;
    this.animals.push(na);
  }

  this.deaths = {
    oldage: 0,
    starvation: 0,
    predation: 0,
    nuke: 0
  }

  this.lastRenderTime = 0;
  this.fpsa = [];
  this.fps = 0;
}
Game.prototype.start = function () {
  this.running = true;
  this.interval = setInterval(function() {
    game.tick();
    game.render();
    game.calculateFPS();
  }, this.config.gamespeed);
  setInterval(function() {
    // TODO: does not behave as intended, is javascripts scheduler weird?
    game.updateStats();
  }, 1000);
}
Game.prototype.updateStats = function () {
  var herbs = 0;
  var carns = 0;
  for (var i = 0; i < this.animals.length; i++) {
    if (this.animals[i].def == herbivore) {
      herbs++;
    } else {
      carns++;
    }
  }
  statsdiv.innerHTML = "Size: " + this.max_x + "x" + this.max_y + "<br>" +
                      "Plants: " + this.plantsAlive + "<br>" +
                      "Herbivores: " + herbs + "<br>" +
                      "Carnivores: " + carns + "<br>" +
                      "FPS: " + this.fps;
}
Game.prototype.calculateFPS = function () {
  var fps;
  if (this.lastRenderTime)
    fps = Math.floor(1000/(Date.now() - this.lastRenderTime));
  else
    fps = 0;

  this.fpsa.push(fps);

  if (this.fpsa.length > 60)
    this.fpsa.shift();

  sum = this.fpsa.reduce((pv, cv) => pv+cv, 0);
  sum = sum/this.fpsa.length;
  if (sum > 10) {
    sum = Math.floor(sum);
  } else {
    sum = Math.floor(sum*10)/10;
  }
  this.fps = sum;
  this.lastRenderTime = Date.now();
}
Game.prototype.stop = function () {
  this.running = false;
  clearInterval(this.interval);
  this.render();
}
Game.prototype.tick = function () {
  for (var i = 0; i <= game.max_x; i++) {
    for (var j = 0; j <= game.max_y; j++) {
      var plant = this.getPlant(i, j);
      if (plant) {
        plant.grow();
      }
    }
  }
  for (var i = 0; i < this.animals.length; i++) {
    this.animals[i].ai();
  }
  if (this.config.endOnEmpty && this.plantsAlive == 0) {
    messagediv.innerHTML = "Plants went extinct";
    messagediv.style.display = "block";
    this.stop();
  } else if (this.config.endOnEmpty && this.animals.length == 0) {
    messagediv.innerHTML = "<p>☠Animals went extinct☠</p>" +
                           "Starvation: " + this.deaths.starvation + "<br>" +
                           "Old age: " + this.deaths.oldage + "<br>" +
                           "Predation: " + this.deaths.predation + "<br>" +
                           "Nuked: " + this.deaths.nuke + "<br>" +
                           "Click to restart";
    messagediv.style.display = "block";
    this.stop();
  }
}
Game.prototype.render = function () {
  this.frameNumber++;

  for (var i = 0; i < this.rerender.length; i++) {
    if (!this.rerender[i])
      continue;
    for (var j = 0; j < this.rerender[i].length; j++) {
      if (!this.rerender[i][j])
        continue;
      this.rerender[i][j].draw(context);
    }
  }

  this.rerender = [[]];
  
  for (var i = 0; i < this.animals.length; i++) {
    this.animals[i].draw(context);
  }

  
}
Game.prototype.rerenderRq = function (obj) {
  if (!this.rerender[obj.x]) {
    this.rerender[obj.x] = [];
    this.rerender[obj.x][obj.y] = obj;
  } else if (!this.rerender[obj.x][obj.y]) {
    this.rerender[obj.x][obj.y] = obj;
  } else if (this.rerender[obj.x][obj.y] instanceof RerenderSq) {
    this.rerender[obj.x][obj.y] = obj;
  } 
}
Game.prototype.getPlant = function (x, y) {
  if (this.plants[x]) {
    return this.plants[x][y];
  }
  return null;
}

function Color(r, g, b) {
  this.r = r !== undefined ? r : randomInt(0, 255);
  this.g = g !== undefined ? g : randomInt(0, 255);
  this.b = b !== undefined ? b : randomInt(0, 255);
}
Color.prototype.toString = function () {
  return "rgb(" + this.r + "," + this.g + "," + this.b + ")";
}
Color.prototype.mutate = function (mut) {
  var c = new Color(this.r, this.g, this.b);
  c.r += randomInt(-mut, mut);
  c.g += randomInt(-mut, mut);
  c.b += randomInt(-mut, mut);
  if (c.r > 255) { c.r = 255; }
  if (c.r < 0) { c.r = 0; }
  if (c.g > 255) { c.g = 255; }
  if (c.g < 0) { c.g = 0; }
  if (c.b > 255) { c.b = 255; }
  if (c.b < 0) { c.b = 0; }
  return c;
}

function RerenderSq(x, y) {
  this.x = x;
  this.y = y;
}
RerenderSq.prototype.draw = function (context) {
  var t = game.config.tilesize;

  context.fillStyle = 'black';
  context.fillRect(this.x*t, this.y*t, t, t);
}

function deleteAnimal(a) {
  var i = game.animals.indexOf(a);
  if (i >= 0) {
    game.animals.splice(i, 1);
    if (a.target) {
      console.log('unset target');
      a.target.targeted = false;
    }
    return true;
  } else {
    return false;
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

function randomDir(x, y) {
  var d = {x, y};
  var r = randomInt(0, 3);
  switch (r) {
    case 0:
      d.x = x+1;
      d.y = y;
      break;
    case 1:
      d.x = x;
      d.y = y+1;
      break;
    case 2:
      d.x = x-1;
      d.y = y;
      break;
    default:
      d.x = x;
      d.y = y-1;
  }
  if (d.x > game.max_x) { d.x = game.max_x; }
  if (d.x < 0) { d.x = 0; }
  if (d.y > game.max_y) { d.y = game.max_y; }
  if (d.y < 0) { d.y = 0; }
  return d;
}

function copyCfg(cfg) {
  return JSON.parse(JSON.stringify(cfg));   // weird way to copy object
}

var handFunction = createHerbivore;
document.addEventListener("click", function (e) {
  if (e.toElement == messagediv && !game.running) {
    messagediv.style.display = "none";
    game = new Game(cfg);
    game.start();
  } else if (e.toElement == canvas) {
    if (messagediv.style.display == "block") {
      messagediv.style.display = "none";
      game.start();
    }

    var x = Math.floor(e.pageX/game.config.tilesize);
    var y = Math.floor(e.pageY/game.config.tilesize);
    handFunction(x, y);
  }
});

var prevspdbtn = document.getElementsByClassName("selected-speed-btn")[0];
var pausebtn = document.getElementById("pause");
function uiSetSpeed(speed, caller) {
  if (speed == 0 && game.running) { // puase button selected
    pausebtn.classList.add("selected-speed-btn");
    game.stop();
  } else if (speed == 0) { // pause button re-selected
    pausebtn.classList.remove("selected-speed-btn");
    prevspdbtn.classList.add("selected-speed-btn");
    game.start();
  } else { // other button selected
    pausebtn.classList.remove('selected-speed-btn');
    prevspdbtn.classList.remove('selected-speed-btn');
    prevspdbtn = caller;
    caller.classList.add("selected-speed-btn");
    game.stop();
    game.config.gamespeed = speed;
    cfg.gamespeed = speed;
    game.start();
  }
}

var prevhandbtn = document.getElementsByClassName("selected-hand-btn")[0];
function uiHandSelect(name, caller) {
  if (name == "herbivore") {
    handFunction = createHerbivore;
  } else if (name == 'carnivore') {
    handFunction = createCarnivore;
  } else if (name == 'nuke') {
    handFunction = nuke;
  } else if (name == 'inspect') {
    handFunction = inspect;
  }

  prevhandbtn.classList.remove("selected-hand-btn");
  caller.classList.add("selected-hand-btn");
  prevhandbtn = caller;
}

function createAnimal(x, y, type) {
  var p = game.getPlant(x, y);
  var na;

  if (p) {
    na = new Animal(p.x, p.y, p.color, type);
  } else {
    na = new Animal(x, y, new Color(), type);
  }
  game.animals.push(na);
  console.log("Hand of God created:", na);
  game.render();
}

function createHerbivore(x, y) {
  createAnimal(x, y, herbivore);
}

function createCarnivore(x, y) {
  createAnimal(x, y, carnivore);
}

// TODO click draggable nuke size
function nuke(x, y) {
  console.log('Hand of God nuked', x, y);
  var r = 10;
  for (var i = 0; i <= game.max_x; i++) {
    for (var j = 0; j <= game.max_y; j++) {
      var a = x-i;
      var b = y-j;
      if (a*a + b*b < r*r) {
        game.rerenderRq(new RerenderSq(i, j));
        var p = game.getPlant(i, j);
        if (p) {
          p.size = -1;
          game.plants[p.x][p.y] = null;
          game.plantsAlive--;
        }
      }
    }
  }

  game.animals.forEach((ani) => {
    var a = x - ani.x;
    var b = y - ani.y;
    if (a*a + b*b < r*r) {
      game.rerenderRq(new RerenderSq(ani.x, ani.y));
      game.deaths.nuke++;
      deleteAnimal(ani);
    }
  });

  game.render();
}

function inspect(x, y) {
  // TODO
}

game = new Game(cfg);
game.start();
