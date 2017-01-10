var amqp = require('amqplib/callback_api');

function AMQPClient(args, cb) {

  var options = {
    uri: args.uri,                                // URI of the AMQP server to connect
    exchange: args.exchange || 'exchange',        // Exchange name. Defaults to 'exchange'
    exchangeType: args.exchangeType || 'fanout',  // Exchange type. Defaults to 'fanout'
    queue: args.queue || process.pid,             // Queue name. Defaults to random
    durable: args.durable || false                // Queue durability. Defaults to false
  };

  this.options = options;
  var self = this;

  // Connect to AMQP
  amqp.connect(options.uri, function (err, conn) {

    if (err) {
      return cb(err);
    }

    self.conn = conn;

    // Create a channel
    conn.createChannel(function (error, ch) {

      if (error) {
        return cb(error);
      }

      self.ch = ch;

      // Create an exchange if it doesn't exists
      ch.assertExchange(options.exchange, options.exchangeType);

      // Create a queue if it doesn't exists
      ch.assertQueue(options.queue, { durable: options.durable });

      // Bind the queue qith the exchange
      ch.bindQueue(options.queue, options.exchange);

      if (cb) {
        return cb();
      }
    });
  });
}

// Sends a message to AMQP
AMQPClient.prototype.emit = function (type, data, cb) {
  var self = this;

  // Generate message to be published
  var msg = JSON.stringify({
    type: type,
    payload: data
  });

  // Publish the message
  self.ch.publish(self.options.exchange, '', new Buffer(msg));

  if (cb) {
    return cb();
  }
};

module.exports = AMQPClient;
