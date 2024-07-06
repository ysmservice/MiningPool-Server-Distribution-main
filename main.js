const net = require('net');

const mainServer = net.createServer((receiverSocket) => {
  const miningPoolSockets = {};
  const receiverSockets = {};

  const minerIdentifier = `${receiverSocket.remoteAddress}:${receiverSocket.remotePort}`;
  console.log(`Connect from:${minerIdentifier}`);
  receiverSockets[minerIdentifier] = receiverSocket;

  receiverSocket.on('data', (data) => {
    try {
      console.log(`Received data: ${data.toString('utf-8')}`);
      const message = JSON.parse(data.toString('utf-8'));
      forwardToMiningPool(minerIdentifier, message.data, message.port, receiverSockets, miningPoolSockets);
    } catch (err) {
      console.error(`Received data is not valid JSON: ${data.toString('utf-8')}`);
    }
  });

  receiverSocket.on('error', (err) => {
    console.error(`Receiver socket error: ${err}`);
  });

  receiverSocket.on('close', () => {
    delete receiverSockets[minerIdentifier];
    if (miningPoolSockets[minerIdentifier]) {
      miningPoolSockets[minerIdentifier].end();
      delete miningPoolSockets[minerIdentifier];
    }
  });
});

function forwardToMiningPool(minerIdentifier, data, port, receiverSockets, miningPoolSockets) {
  if (!miningPoolSockets[minerIdentifier]) {
    console.log('Connecting to mining pool');
    miningPoolSockets[minerIdentifier] = new net.Socket();

    miningPoolSockets[minerIdentifier].connect(port, '127.0.0.1', () => {
      miningPoolSockets[minerIdentifier].write(data);
    });

    miningPoolSockets[minerIdentifier].on('data', (response) => {
            console.log(`Received data: ${response.toString('utf-8')}`);
      if (receiverSockets[minerIdentifier]) {
        receiverSockets[minerIdentifier].write(JSON.stringify({ minerIdentifier, data: response.toString('utf-8') }));
      }
    });

    miningPoolSockets[minerIdentifier].on('close', () => {
      delete miningPoolSockets[minerIdentifier];
    });

    miningPoolSockets[minerIdentifier].on('error', (err) => {
      console.error(`Mining pool socket error: ${err}`);
      if (receiverSockets[minerIdentifier]) {
        receiverSockets[minerIdentifier].write(JSON.stringify({ minerIdentifier, error: err.message }));
      }
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
