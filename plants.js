function Plant(x, y, color) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.size = 10;
}
Plant.prototype.draw = function(context) {
  var t = game.config.tilesize;

  var startx = this.x*t;
  var starty = this.y*t;

  if (this.visited) {
    context.fillStyle = 'black';
    context.fillRect(startx, starty, t, t);
    this.visited = false;
  }

  var size = t - game.config.plantBorder;
  size = Math.floor(size * this.size/100);

  if (size > 0) {
    context.fillStyle = this.color.toString();
    context.fillRect(startx, starty, size, size);
  }
}
Plant.prototype.grow = function() {
  // TODO: could use a huge rethink
  if (this.size < 100) {
    this.size += randomInt(0, 5);
    game.rerenderRq(this);
  } else {
    var d = randomDir(this.x, this.y);
    var p = game.getPlant(d.x, d.y);
    if (!p) {
      var np = new Plant(d.x, d.y, this.color.mutate(game.config.plantMutation));
      game.plantsAlive++;
      np.size = 30;
      this.size = 60;

      // TODO: addPlant
      if (!game.plants[d.x]) {
        game.plants[d.x] = [];
      }
      game.plants[d.x][d.y] = np;
      game.rerenderRq(this);
    }
  }
}
