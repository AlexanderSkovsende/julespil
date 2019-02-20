from time import time
from collections import deque
import random

class Game:

    def __init__(self, sio):
        self.sio = sio
        self.turned_on = True
        self.startable = False
        self.players = {}
        self.next_snowball = 0

    def run(self):
        self.next = time()

        while self.turned_on:
            self.is_startable()
            self.tick()
            self.next += 0.015
            self.sio.sleep(max(0, self.next - time()))

    def is_startable(self) -> bool:
        if len(self.players) >= 2 and self.count_alive() <= 1:
            if not self.startable:
                self.startable = True
                self.sio.emit('startable', True)
        else:
            if self.startable:
                self.startable = False
                self.sio.emit('startable', False)

    def tick(self):
        """Function that runs every 15 ms"""

        for player in self.players.values():

            while len(player.q) > 0:
                json = player.q.popleft()

                try:
                    player.x = json['x']
                    player.y = json['y']
                    player.dir = json['dir']
                    player.time = json['time']
                    player.alive = json['alive']
                    player.killer = json['killer']

                except Exception:
                    pass

    def count_alive(self) -> int:
        count = 0
        for player in self.players.values():
            if player.alive:
                count += 1
        return count

    def start(self):
        if self.startable:
            out = {'players': []}

            for player in self.players.values():
                player.alive = True
                player.x = random.randint(80, 1000)
                player.y = random.randint(80, 640)
                player.dir = random.randint(0, 360)
                out['players'].append({'id': player.id, 'name': player.name, 'alive': player.alive, 'x': player.x, 'y': player.y, 'dir': player.dir})

            self.sio.emit('start', out)

    def join(self):
        out = {'players': [], 'startable': self.startable}

        for player in self.players.values():
            out['players'].append(
                {'id': player.id, 'name': player.name, 'alive': player.alive, 'x': player.x, 'y': player.y,
                 'dir': player.dir})

        return out


class Player:
    def __init__(self, x, y, direction, name, sid, id):

        self.x = x
        self.y = y
        self.dir = direction

        self.name = name
        self.alive = False
        self.killer = None
        self.time = time()
        self.sid = sid
        self.id = id
        self.q = deque()


class Snowball:
    def __init__(self, x, y, direction, owner, id, start_time):
        self.x = x
        self.y = y
        self.dir = direction
        self.owner = owner
        self.id = id
        self.start_time = start_time
