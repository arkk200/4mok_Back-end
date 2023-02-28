import { Socket } from "socket.io";
import { gameOverData, PlayerInfo, PlayerInfoWithId } from "./types";

const http = require("http");
const SocketIO = require('socket.io');
const express = require("express");

const app = express();

const server = http.createServer(app);
const io = SocketIO(server);

io.on('connection', (socket: Socket) => {
    console.log(socket.id + " connected");
    socket.emit('test', 'sdaf');
});

server.listen(8080, '172.30.1.30', () => {
});