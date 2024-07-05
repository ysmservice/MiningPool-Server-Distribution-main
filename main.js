const net = require('net');

const mainServer = net.createServer((receiverSocket) => {
  const miningPoolSockets = {};

  receiverSocket.on('data', (data) => {
    const message = JSON.parse(data.toString('utf-8'));
    forwardToMiningPool(message.minerIdentifier, message.data, message.port, receiverSocket, miningPoolSockets);
  });
});

function forwardToMiningPool(minerIdentifier, data, port, receiverSocket, miningPoolSockets) {
  if (!miningPoolSockets[minerIdentifier]) {
    miningPoolSockets[minerIdentifier] = new net.Socket();

    miningPoolSockets[minerIdentifier].connect(port, 'localhost', () => {
      miningPoolSockets[minerIdentifier].write(data);
    });

    miningPoolSockets[minerIdentifier].on('data', (response) => {
      receiverSocket.write(JSON.stringify({ minerIdentifier, data: response.toString('utf-8') }));
    });

    miningPoolSockets[minerIdentifier].on('close', () => {
      delete miningPoolSockets[minerIdentifier];
    });
  } else {
    miningPoolSockets[minerIdentifier].write(data);
  }
}

mainServer.listen(15299, '0.0.0.0', () => {
  console.log('Main server is listening on port 15299');
});
