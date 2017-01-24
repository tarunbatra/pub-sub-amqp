var amqp = require('amqplib/callback_api');

/**
 * A wrapper over AMQP, providing methods to publish and subscribe.
 * @constructor
 * @param {object} options - Options passed to the AMQP client
 * @param {string} options.uri - URI of the AMQP server to connect
 * @param {string} [options.exchange=exchange] - Exchange name
 * @param {string} [options.exchangeType=fanout] - Exchange type
 * @param {string} [options.queue=$pid] - Queue name
 * @param {string} [options.durable=false] - Queue durability
 * @param {function} [cb] - callback
 */
function AMQPClient(options, cb) {

  this.options = {
    uri: options.uri,                                // URI of the AMQP server to connect
    exchange: options.exchange || 'exchange',        // Exchange name. Defaults to 'exchange'
    exchangeType: options.exchangeType || 'fanout',  // Exchange type. Defaults to 'fanout'
    queue: options.queue || process.pid,             // Queue name. Defaults to random
    durable: options.durable || false                // Queue durability. Defaults to false
  };

  var self = this;

  // Connect to AMQP
  amqp.connect(self.options.uri, function (err, conn) {

    if (err) {
      if (cb) {
        return cb(err);
      }
      throw err;
    }

    self.conn = conn;

    // Create a channel
    conn.createChannel(function (error, ch) {

      if (error) {
        if (cb) {
          return cb(error);
        }
        throw error;
      }

      self.ch = ch;

      // Create an exchange if it doesn't exists
      ch.assertExchange(self.options.exchange, self.options.exchangeType);

      // Create a queue if it doesn't exists
      ch.assertQueue(self.options.queue, { durable: self.options.durable });

      // Bind the queue qith the exchange
      ch.bindQueue(self.options.queue, self.options.exchange);

      if (cb) {
        return cb();
      }
    });
  });
}

/**
 * Publishes message to AMQP exchange
 * @param {string} type - Type of the message
 * @param {*} data - Data to be sent
 * @param {function} [cb] - callback
 */
AMQPClient.prototype.emit = function (type, data, cb) {
  var self = this;

  // If channnel not initialized, throw error
  if (!self.ch) {
    var error = new Error('Not connected to an AMQP server');
    if (cb) {
      return cb(error);
    }
    throw error;
  }

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

/**
 * Listens for message of a type
 * @param {string} type - Type of the message
 * @param {function} [cb] - callback
 */
AMQPClient.prototype.on = function (type, cb) {
  var self = this;

  // If channnel not initialized, throw error
  if (!self.ch) {
    var error = new Error('Not connected to an AMQP server');
    if (cb) {
      return cb(error);
    }
    throw error;
  }

  // Listen for messages
  self.ch.consume(self.options.queue, function (msg) {

    // Parse the message
    var data = JSON.parse(msg.content.toString());

    // Acknowledge the message
    self.ch.ack(msg);

    // Ignore if the type doesn't match
    if (data.type !== type) {
      return;
    }

    // Return the message
    if (cb) {
      return cb(null, msg.payload);
    }
  });
};

module.exports = AMQPClient;
