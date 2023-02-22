const http = require("http");
const SocketIO = require('socket.io');
const express = require("express");

const app = express();

const server = http.createServer(app);
const io = SocketIO(server);

io.on('connection', socket => {
    console.log('who connected');
});

server.listen(8080, () => {
    console.log(`Listening on http://localhost:8080`);
});