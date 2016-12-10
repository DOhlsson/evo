// TODO: Herbivores and Carnivores (and Omnivores?)
// TODO: Optionally skip rendering frames to increase ticks per second
// TODO: Use Date.now() in fps calc
var screenW = document.body.clientWidth;
var screenH = document.body.clientHeight;

var datadiv = document.getElementById("datadiv");
var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
canvas.width = screenW;
canvas.height = screenH;

var defaultCfg = {
  tilesize: 20,
  eatlimit: 40,
  endOnEmpty: true,
  startPlants: 100,
  startAnimals: 10,
  plantBorder: 1,
  gamespeed: 17
};
var cfg = copyCfg(defaultCfg);
cfg.startPlants = 100;
cfg.startAnimals = 10;
cfg.endOnEmpty = true;
cfg.gamespeed = 1;
cfg.tilesize = 20;
cfg.plantBorder = 0;
cfg.eatlimit = 40;

var game;

function Game(config) {
  this.config = copyCfg(config);   // weird way to copy object
  this.frameNumber = 0;
  this.interval;

  this.plants = [[]];
  this.plantsAlive = 0;
  this.animals = [];

  // TODO: move these into a map based object?
  this.max_x = Math.floor(screenW/config.tilesize - 1);
  this.max_y = Math.floor(screenH/config.tilesize - 1);

  for (var i = 0; i < this.config.startPlants; i++) {
  	var x = randomInt(0, this.max_x);
  	var y = randomInt(0, this.max_y);
    var plotFree = !(this.plants[x] != null && this.plants[x][y] != null);
    if (plotFree) {
      this.plantsAlive++;
      if (!this.plants[x]) {
        this.plants[x] = [];
      }
  		this.plants[x][y] = new Plant(x, y, new Color(1, 255, 1));
    }

    /*
  	if (plotFree && i%2 == 0) {
  		this.plants[x][y] = new Plant(x, y, new Color(1, 255, 1));
    } else if (plotFree) {
  		this.plants[x][y] = new Plant(x, y, new Color(1, 128, 1));
    }
    */
  }
  for (var i = 0; i < this.config.startAnimals; i++) {
    var x = randomInt(0, this.max_x);
  	var y = randomInt(0, this.max_x);
  	var na = new Animal(x, y, new Color(1, 255, 1));
  	na.life += 100;
  	this.animals.push(na);
  }

  this.lastRenderTime = 0;
  this.fpsa = [];
  for (var i = 0; i < 300; i++) {
    this.fpsa[i] = 0;
  }
}
Game.prototype.start = function (time) {
	this.interval = setInterval(function() {
		game.tick();
		game.render();
	}, this.config.gamespeed);
}
Game.prototype.stop = function () {
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
		console.log("Ran out of plants");
		this.stop();
	} else if (this.config.endOnEmpty && this.animals.length == 0) {
		console.log("Animals went extinct");
		this.stop();
	}
}
Game.prototype.render = function () {
  this.frameNumber++;
  
  var drawCanvas = document.createElement('canvas');
  drawCanvas.height = canvas.height;
  drawCanvas.width = canvas.width;
  var drawContext = drawCanvas.getContext('2d');

	drawContext.fillStyle = "black";
	drawContext.fillRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i <= this.max_x; i++) {
	  for (var j = 0; j <= this.max_y; j++) {
      var plant = this.getPlant(i, j);
      if (plant) {
		    plant.draw(drawContext);
      }
    }
	}
	for (var i = 0; i < this.animals.length; i++) {
		this.animals[i].draw(drawContext);
	}

  context.drawImage(drawCanvas, 0, 0);

  var fps;
  if (this.lastRenderTime)
    fps = Math.floor(1000/(Date.now() - this.lastRenderTime));
  else
    fps = 0;

  this.fpsa.push(fps);
  this.fpsa.shift();
  sum = this.fpsa.reduce((pv, cv) => pv+cv, 0);
  sum = sum/this.fpsa.length;
  if (sum > 10) {
    sum = Math.floor(sum);
  }
  
	datadiv.innerHTML = "Size: " + this.max_x + "x" + this.max_y + "<br>" +
                      "Plants: " + this.plantsAlive + "<br>" +
                      "Animals: " + this.animals.length + "<br>" +
                      "FPS: " + sum;
  this.lastRenderTime = Date.now();
}
Game.prototype.getPlant = function (x, y) {
  if (this.plants[x]) {
    return this.plants[x][y];
  }
  return null;
}

function Color(r, g, b) {
  // TODO: fix this for 0 color
	this.r = r ? r : randomInt(0, 255);
	this.g = g ? g : randomInt(0, 255);
	this.b = b ? b : randomInt(0, 255);
}
Color.prototype.toString = function () {
	return "rgb(" + this.r + "," + this.g + "," + this.b + ")";
}
Color.prototype.mutate = function () {
  // TODO: fix mutation variables
	var c = new Color(this.r, this.g, this.b);
	c.r += randomInt(-10, 10);
	c.g += randomInt(-10, 10);
	c.b += randomInt(-10, 10);
  // TODO: fix for 0 color
	if (c.r > 255) { c.r = 255; }
	if (c.r < 1) { c.r = 1; }
	if (c.g > 255) { c.g = 255; }
	if (c.g < 1) { c.g = 1; }
	if (c.b > 255) { c.b = 255; }
	if (c.b < 1) { c.b = 1; }
	return c;
}

function Plant(x, y, color) {
  // TODO: should probably track energy appart from size
	this.x = x;
	this.y = y;
	this.color = color;
	this.size = 10;
}
Plant.prototype.draw = function(context) {
  // TODO: needs variability
  // TODO: grow from center (this was really hard to make look right)
  // TODO: more efficient rendering

  var t = game.config.tilesize;

  var startx = this.x*t;
  var starty = this.y*t;
  var width = t - game.config.plantBorder;
  var height = t - game.config.plantBorder;

  /*
  startx = startx + Math.floor((t/2)*100/this.size);
  starty = starty + Math.floor((t/2)*100/this.size);
  */

  width = Math.floor(width * this.size/100);
  height = Math.floor(height * this.size/100);

	context.fillStyle = this.color.toString();
	context.fillRect(startx, starty, width, height);
}
Plant.prototype.grow = function() {
  // TODO: could use a huge rethink
	this.size += randomInt(1, 10);
	if (this.size > 100) {
		var f;
		var nx, ny;
    // TODO: position object? with generalized features
    //       or just have inheritance shared with Animals
		var r = randomInt(0, 3);
		switch (r) {
			case 0:
				nx = this.x+1;
				ny = this.y;
				break;
			case 1:
				nx = this.x;
				ny = this.y+1;
				break;
			case 2:
				nx = this.x-1;
				ny = this.y;
				break;
			default:
				nx = this.x;
				ny = this.y-1;
		}
		if (nx > game.max_x) { nx = game.max_x; }
		if (nx < 0) { nx = 0; }
		if (ny > game.max_y) { ny = game.max_y; }
		if (ny < 0) { ny = 0; }
		f = game.getPlant(nx, ny);
		if (!f) {
			nf = new Plant(nx, ny, this.color.mutate());
      game.plantsAlive++;
			nf.size = 40;
			this.size = 60;
      if (!game.plants[nx]) {
        game.plants[nx] = [];
      }
			game.plants[nx][ny] = nf;
		} else {
			this.size = 100;
		}
	}
}

function Animal(x, y, color) {
	this.x = x;
	this.y = y;
	this.color = color;
	this.life = randomInt(50, 100);
	this.energy = 0;
}
Animal.prototype.draw = function(context) {
	context.beginPath();
	context.arc(this.x*game.config.tilesize+game.config.tilesize/2,
              this.y*game.config.tilesize+game.config.tilesize/2,
              game.config.tilesize/2-2, 0, 2 * Math.PI, false);
	context.fillStyle = this.color.toString();
	context.fill();
	context.lineWidth = 1;
	context.strokeStyle = '#003300';
	context.stroke();
}
Animal.prototype.move = function() {
  // TODO: generalized class, inherit this func. See Plant
	var nx, ny;
	var r = randomInt(0, 3);
	switch (r) {
		case 0:
			nx = this.x+1;
			ny = this.y;
			break;
		case 1:
			nx = this.x;
			ny = this.y+1;
			break;
		case 2:
			nx = this.x-1;
			ny = this.y;
			break;
		default:
			nx = this.x;
			ny = this.y-1;
	}
	if (nx >= game.max_x) { nx = game.max_x; }
	if (nx < 0) { nx = 0; }
	if (ny >= game.max_y) { ny = game.max_y; }
	if (ny < 0) { ny = 0; }
	this.x = nx;
	this.y = ny;
}
Animal.prototype.ai = function() {
  // TODO: split ai into parts, and make it modular
	var f = game.getPlant(this.x, this.y);
	this.life--;
	if (this.life <= 0) {
		deleteAnimal(this);
		return null;
	}
	if (f == null) {	// move
		this.move();
	} else {	// eat
		var eff = Math.abs(this.color.r - f.color.r);
		eff += Math.abs(this.color.g - f.color.g);
		eff += Math.abs(this.color.b - f.color.b);
		eff = 1-eff/765;
		var eat = Math.floor(50*eff);
	 	if (eat < game.config.eatlimit) {
	 		this.move();
			return null;
	 	}
		this.energy += eat;
		f.size -= eat;
		if (f.size <= 0) {
      game.plants[f.x][f.y] = null;
      game.plantsAlive--;
		}
	}
	if (this.energy > 1000) {	// breed
		var na = new Animal(this.x, this.y, this.color.mutate());
		this.energy = 0;
		game.animals.push(na);
	}
}

function deleteAnimal(a) {
	var i = game.animals.indexOf(a);
	game.animals.splice(i, 1);
}

function randomInt(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

function copyCfg(cfg) {
  return JSON.parse(JSON.stringify(cfg));
}

game = new Game(cfg);
game.render();
game.start();
