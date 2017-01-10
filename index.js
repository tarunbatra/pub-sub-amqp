var amqp = require('amqplib/callback_api');

function AMQPClient(args, cb) {

  var options = {
    uri: args.uri,
    exchange: args.exchange || 'exchange',
    exchangeType: args.exchangeType || 'fanout',
    queue: args.queue || process.pid,
    durable: args.durable || false
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

module.exports = AMQPClient;
