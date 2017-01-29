# pub-sub-amqp

[![npm version](https://badge.fury.io/js/pub-sub-amqp.svg)](https://www.npmjs.com/package/pub-sub-amqp)
[![build status](https://travis-ci.org/tarunbatra/pub-sub-amqp.svg?branch=master)](https://travis-ci.org/tarunbatra/pub-sub-amqp)

An easy to use, no frills module allowing inter-process publish/subscribe communication on the top of an AMQP broker like [RabbitMQ](https://www.rabbitmq.com/).


## Installation
`npm install pub-sub-amqp`

## Usage
```

var amqpClient = require('pub-sub-amqp');

new amqpClient({ uri: 'amqp://localhost' }, function (err, eventManagar) {

    eventManagar.on('ready', function (err, event) {
      console.log(event.data); // -> { some: 'data' }
    });

    eventManagar.emit('ready', { some: 'data' });
});
```

## API
- [API Reference](https://tarunbatra.github.io/pub-sub-amqp/AMQPClient.html)

## Test
`npm test`

## License
MIT
