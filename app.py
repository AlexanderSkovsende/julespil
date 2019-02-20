from flask_socketio import SocketIO, emit
from flask import Flask, render_template, request
from server import utils
import random, string
from server.game import Game, Player

utils.init()
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret key'

sio = SocketIO(app)

thread = None
game = Game(sio)

clients = []

def random_key(length=64):
    return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))


@app.route("/")
def index():
    global thread, game

    if thread is None:
        thread = sio.start_background_task(target=game.run)

    return render_template("index.html")


@sio.on('connect')
def connection_handler():
    print("Connected: {}".format(request.sid))


@sio.on('join')
def join_handler(name):
    player = Player(0, 0, 0, name, request.sid, utils.current_id)
    game.players[request.sid] = player
    utils.current_id += 1

    out = game.join()
    out['id'] = player.id

    emit('init', out)


@sio.on('disconnect')
def disconnection_handler():
    print("Disconnected: {}".format(request.sid))
    if request.sid in game.players:
        sio.emit('player_leave', game.players[request.sid].id)
        del game.players[request.sid]


@sio.on('start')
def start_handler():
    game.start()


@sio.on('move')
def move_handler(json):
    try:
        game.players[request.sid].q.append(json)

        player = game.players[request.sid]

        player.x = json['x']
        player.y = json['y']
        player.dir = json['dir']
        player.time = json['time']
        player.alive = json['alive']
        player.killer = json['killer']

        json['id'] = player.id

        if json['snowball']:
            json['snowball_id'] = game.next_snowball
            game.next_snowball += 1

        sio.emit('move', json)
    except KeyError:
        pass


if __name__ == '__main__':
    sio.run(app, debug=False, host='0.0.0.0', port=5000)
    game.turned_on = False
