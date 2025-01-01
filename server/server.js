const WebSocket = require('ws');

const server = new WebSocket.Server({port: 8080});
const clients = new Map();
const fireballs  = [];
server.on('connection', (socket) => {
    console.log('New client connected.');
    // Assign a unique ID to the new client
    const id = Date.now();
    clients.set(id, socket);

    const broadcastIt = (message = {}) => {
        clients.forEach((client, clientId) => {
            if (clientId !== id) {
                client.send( JSON.stringify({...message, fromId: id, toId: clientId}));
            }
        });
    }

    // Broadcast new player info to all clients
    const joinMessage = {type: 'newPlayer', id};
    broadcastIt(joinMessage);

    // Handle incoming messages from a client
    socket.on('message', (data) => {
        const message = data ? JSON.parse(data) : {};
        // Broadcast the message to all other clients

        if (message.type !== 'updatePosition') {
            console.log('message ', message)
        }
        switch (message.type) {
            case 'throwFireball':
                const fireball = message.fireball;
                fireballs.push(fireball);

                broadcastIt({
                    type: 'newFireball',
                    fireball
                });
                break;
            default:
                broadcastIt(message);
        }
    });

    // Handle client disconnect
    socket.on('close', () => {
        console.log(`Client ${id} disconnected.`);
        clients.delete(id);

        // Notify all clients about the disconnection
        const disconnectMessage = JSON.stringify({type: 'removePlayer', id});
        clients.forEach((client) => {
            client.send(disconnectMessage);
        });
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
