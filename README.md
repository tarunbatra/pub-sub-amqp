# pub-sub-amqp
An easy to use, no frills module allowing inter-process publish/subscribe communication over [RabbitMQ](https://www.rabbitmq.com/).

## Installation
`npm install pub-sub-amqp`

## Usage
```

var amqpClient = require('pub-sub-amqp');

// Initialize the connection with RabbitMQ broker
new amqpClient({
  uri: 'amqp://localhost'
  }, function (err, eventManagar) {

    // Register a listener for 'ready' event
    eventManagar.on('ready', function (err, event) {
      console.log(event.data) // -> { some: 'data' }
      event.ack(); // Acknowledge the message
    });

    // Emit a 'ready' event
    eventManagar.emit('ready', { some: 'data' }, function (err) {
      // Do something after publishing message
    });
});
```

## API
- [API Reference](./AMQPClient.html)

## Test
`npm test`

## License
MIT
