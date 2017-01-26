var amqp = require('amqplib/callback_api');
var debug = require('debug')('pub-sub-amqp');
var constants = require('./constants.json');

/**
 * A wrapper over AMQP, providing methods to publish and subscribe.
 * @constructor
 * @param {object} options - Options passed to the AMQP client
 * @param {string} options.uri - URI of the AMQP server to connect
 * @param {string} [options.exchange=exchange] - Exchange name
 * @param {string} [options.exchangeType=topic] - Exchange type
 * @param {string} [options.queue=$pid] - Queue name
 * @param {string} [options.durable=false] - Queue durability
 * @param {function} [cb] - Callback
 */
function AMQPClient(options, cb) {

  this.options = {
    uri: options.uri,                                // URI of the AMQP server to connect
    exchange: options.exchange || 'exchange',        // Exchange name. Defaults to 'exchange'
    exchangeType: options.exchangeType || 'topic',   // Exchange type. Defaults to 'topic'
    queue: options.queue || String(process.pid),     // Queue name. Defaults to random
    durable: options.durable || false                // Queue durability. Defaults to false
  };

  var self = this;

  debug(constants.CONNECTING);

  // Connect to AMQP
  amqp.connect(self.options.uri, function (err, conn) {

    if (err) {
      debug(err);
      if (cb) {
        return cb(err);
      }
      throw err;
    }

    debug(constants.CONNECTED);

    self.conn = conn;

    // Create a channel
    conn.createChannel(function (error, ch) {

      if (error) {
        debug(error);
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

      debug(constants.INITIALIZED);

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
 * @param {function} [cb] - Callback
 */
AMQPClient.prototype.emit = function (type, data, cb) {
  var self = this;

  // If channnel not initialized, throw error
  if (!self.ch) {
    var error = new Error(constants.NOT_CONNECTED);
    debug(error);
    if (cb) {
      return cb(error);
    }
    throw error;
  }

  // Generate message to be published
  var msg = JSON.stringify(data);

  // Publish the message
  self.ch.publish(self.options.exchange, type, new Buffer(msg));

  debug('PUBLISHED: [%s] %o', type, data);

  if (cb) {
    return cb();
  }
};

/**
 * Listens for message of a type
 * @param {string} type - Type of the message
 * @param {messageReceivedCallback} cb - Callback
 */
AMQPClient.prototype.on = function (type, cb) {
  var self = this;

  // If channnel not initialized, throw error
  if (!self.ch) {
    var error = new Error(constants.NOT_CONNECTED);
    debug(error);
    if (cb) {
      return cb(error);
    }
    throw error;
  }

  // Bind the queue qith the exchange
  self.ch.bindQueue(self.options.queue, self.options.exchange, type);

  debug('LISTENING: %s', type);

  // Listen for messages
  self.ch.consume(self.options.queue, function (msg) {

    var data;

    try {
      // Try to parse the message received
      data = JSON.parse(msg.content.toString());
    } catch (err) {

      // If message is not valid JSON, return error
      var error = new Error(constants.CORRUPTED_MSG);
      debug(error);
      if (cb) {
        return cb(error);
      }
    }

    debug('RECEVIED: [%s] %o', type, data);

    // Construct the event object
    var event = {
      data: data,
      ack: self.ch.ack,
      reject: self.ch.reject
    };

    // Return the message
    if (cb) {
      return cb(null, event);
    }
  });
};

module.exports = AMQPClient;


/**
 * Callback called when a subscribed message is received
 * @callback messageReceivedCallback
 * @param {object|null} error - Error
 * @param {object} event - Message details
 * @param {object} event.data - Message received
 * @param {object} event.ack - Method to acknowledge the message
 * @param {object} event.reject - Method to reject the message
 */
