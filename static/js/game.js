
const Game = function () {

    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext('2d');
    this.startable = false;

    this.player_img = new Image();
    this.player_img.src = "../static/img/player.png";

    this.snowball_img = new Image();
    this.snowball_img.src = "../static/img/snowball.png";

    this.world = {
        width: 1080,
        height: 720
    };

    this.canvas.width = this.world.width;
    this.canvas.height = this.world.height;
    this.ctx.font = '11px "Helvetica"';
    this.ctx.textAlign = 'center';

    this.player_speed = 150;
    this.player_rotate = 100;
    this.player_radius = 32;
    this.kills = 0;

    this.snowball_radius = 8;
    this.snowball_speed = 400;

    this.delay = 100 / 1000;
    this.cooldown_time = 0;
    this.cooldown = 500 / 1000;
    this.players = {};
    this.snowballs = [];

    this.player_leave = function(id){
        if (this.players.hasOwnProperty(id)) {
            this.players[id].alive = false;
        }
    };

    this.update = function (){
        /* Runs 60 times per second */

        var t = time();

        this.dt = (this.lastframetime ? (t-this.lastframetime) : 0.016);
        this.lastframetime = t;


        this.ctx.clearRect(0,0,this.world.width,this.world.height);

        if (this.self && this.self.alive)
            this.handle_input();

        this.process_net_updates();

        for (var i = this.snowballs.length-1; i >= 0; i--) {
            var snowball = this.snowballs[i];

            if (snowball.x >= -this.snowball_radius && snowball.y >= this.snowball_radius &&
                snowball.x < this.world.width+this.snowball_radius && snowball.y < this.world.height+this.snowball_radius) {
                snowball.draw();
            } else {
                this.snowballs.splice(i, 1);
            }
        }

        for (var key in this.players) {
            if (this.players.hasOwnProperty(key)) {
                this.players[key].draw();
            }
        }

        this.updateid = window.requestAnimationFrame(this.update.bind(this), this.canvas);
    };

    this.handle_input = function (){

        var key_up =  keyboard.pressed("up") || keyboard.pressed("W");
        var key_down = keyboard.pressed("down") || keyboard.pressed("S");
        var key_right = keyboard.pressed("right") || keyboard.pressed("D");
        var key_left = keyboard.pressed("left") || keyboard.pressed("A");

        var move = key_up - key_down;
        var rotate = key_left - key_right;
        var shoot = keyboard.pressed('space') || keyboard.pressed('return');

        this.self.dir += rotate * this.dt * game.player_rotate;

        var rad = this.self.dir * Math.PI / 180.0;
        this.self.x += move * this.dt * game.player_speed * Math.sin(rad);
        this.self.y += move * this.dt * game.player_speed * Math.cos(rad);



        var use_snowball = false;

        if (shoot && this.cooldown_time+this.cooldown < time()) {
            use_snowball = true;
            this.snowballs.push(new Snowball(this.self.x, this.self.y, this.self.dir, this.self.id, -1, time()));
            this.cooldown_time = time();
        }

        if (this.self.x < this.player_radius) this.self.x = this.player_radius;
        if (this.self.y < this.player_radius) this.self.y = this.player_radius;
        if (this.self.x > this.world.width - this.player_radius) this.self.x = this.world.width - this.player_radius;
        if (this.self.y > this.world.height - this.player_radius) this.self.y = this.world.height - this.player_radius;


        var killer = null;
        // Check death
        for (var i = 0; i < this.snowballs.length; i++) {
            var snowball = this.snowballs[i];

            if (snowball.owner === this.self_id) continue;

            if (Math.pow(snowball.x - this.self.x, 2)+Math.pow(snowball.y-this.self.y, 2) <= Math.pow(this.snowball_radius+this.player_radius, 2)) {
                this.self.alive = false;
                killer = snowball.id;
                this.snowballs.splice(i, 1);
                break;
            }
        }


        var out = {
            x: this.self.x,
            y: this.self.y,
            dir: this.self.dir,
            snowball: use_snowball,
            alive: this.self.alive,
            killer: killer,
            time: time()
        };
        // Fake lag: setTimeout(function(){socket.emit('move', out);}, 80);
        socket.emit('move', out);
    };

    this.process_net_updates = function (){

        for (var key in this.players) {
            if (this.players.hasOwnProperty(key)) {
                if (this.players[key] !== this.self_id) {
                    this.players[key].move();
                }
            }
        }
    };

    this.update_kills = function (){
        document.getElementById("kills").innerHTML = "Kills: " + this.kills;
    };

    this.lastframetime = 0;

};


const Player = function(x, y, dir, name, alive, id) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.name = name;
    this.id = id;
    this.alive = alive;
    this.updates = [];

    this.move = function() {

        if (!this.alive) return;

        while (this.updates.length && this.updates[0].time <= time() - game.delay) {
            var v = this.updates.shift();

            this.x = v.x;
            this.y = v.y;
            this.dir = v.dir;

            this.alive = v.alive;
            this.killer = v.killer;

            if (!this.alive) {
                for (var j = 0; j < game.snowballs.length; j++) {
                    if (game.snowballs[j].id === v.killer) {
                        if (game.snowballs[j].owner === game.self_id) {
                            game.kills++;
                            game.update_kills();
                        }
                        game.snowballs.splice(j, 1);
                        break;
                    }
                }
            }

            if (v.snowball) {
                game.snowballs.push(new Snowball(this.x, this.y, this.dir, this.id, v.snowball_id, v.time));
            }
        }

        // Interpolation

        if (!this.updates.length) return;

        var at = this.updates[0].time - (time() - game.delay) + game.dt;


        var diff_x = this.updates[0].x - this.x;
        var diff_y = this.updates[0].y - this.y;
        var diff_dir = this.updates[0].dir - this.dir;

        this.x += game.dt / at * diff_x;
        this.y += game.dt / at * diff_y;
        this.dir += game.dt / at * diff_dir;


    };

    this.draw = function() {
        // Draw to canvas

        if (!this.alive) return;

        var rad = this.dir * Math.PI / 180;

        game.ctx.translate(this.x, this.y);
        game.ctx.rotate(-rad);
        game.ctx.translate(-this.x, -this.y);

        game.ctx.drawImage(game.player_img, this.x-game.player_radius, this.y-game.player_radius);

        game.ctx.translate(this.x, this.y);
        game.ctx.rotate(rad);
        game.ctx.translate(-this.x, -this.y);

        if (this.id === game.self_id) {
            game.ctx.fillStyle = 'blue';
        } else {
            game.ctx.fillStyle = 'red';
        }

        game.ctx.fillText(this.name, this.x, this.y-game.player_radius-4);
        game.ctx.fillStyle = 'black';

    }
};


const Snowball = function(start_x, start_y, dir, owner, id, start_time) {
    this.start_x = start_x;
    this.start_y = start_y;
    this.x = start_x;
    this.y = start_y;
    this.dir = dir;
    this.owner = owner;
    this.id = id;
    this.start_time = start_time;

    this.move = function() {

        var t = time() - this.start_time;

        var rad = this.dir * Math.PI / 180.0;
        this.x = t * game.snowball_speed * Math.sin(rad) + this.start_x;
        this.y = t * game.snowball_speed * Math.cos(rad) + this.start_y;
    };

    this.draw = function() {

        this.move();

        game.ctx.drawImage(game.snowball_img, this.x-game.snowball_radius, this.y-game.snowball_radius);

    }
};

var game = new Game();
var keyboard = new Keyboard();


function time(){
    return new Date().getTime() / 1000.0;
}

function join(data){
    game.self_id = data.id;
    start(data);

    game.startable = data.startable;
    game.update_kills();

    if (game.startable) {
        document.getElementById("startButton").removeAttribute("hidden");
    } else {
        document.getElementById("startButton").setAttribute("hidden", "hidden");
    }
}

function start(data) {

    game.players = {};
    game.snowballs = [];

    for (var i = 0; i < data.players.length; i++) {
        var player = data.players[i];
        game.players[player.id] = new Player(player.x, player.y, player.dir, player.name, player.alive, player.id);
    }

    if (game.players.hasOwnProperty(game.self_id)) {
        game.self = game.players[game.self_id];
    }

    if (game.updateid) window.cancelAnimationFrame( game.updateid );
    game.update(time());
}