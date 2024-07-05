const net = require('net');

const mainServer = net.createServer((receiverSocket) => {
  const miningPoolSockets = {};

  receiverSocket.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString('utf-8'));
      forwardToMiningPool(message.minerIdentifier, message.data, message.port, receiverSocket, miningPoolSockets);
    } catch (err) {
      console.error(`Received data is not valid JSON: ${data.toString('utf-8')}`);
    }
  });

  receiverSocket.on('error', (err) => {
    console.error(`Receiver socket error: ${err}`);
  });

  receiverSocket.on('close', () => {
    for (let minerIdentifier in miningPoolSockets) {
      miningPoolSockets[minerIdentifier].end();
      delete miningPoolSockets[minerIdentifier];
    }
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

    miningPoolSockets[minerIdentifier].on('error', (err) => {
      console.error(`Mining pool socket error: ${err}`);
      delete miningPoolSockets[minerIdentifier];
    });
  } else {
    miningPoolSockets[minerIdentifier].write(data);
  }
}

mainServer.listen(15299, '0.0.0.0', () => {
  console.log('Main server is listening on port 15299');
});

mainServer.on('error', (err) => {
  console.error(`Main server error: ${err}`);
});
