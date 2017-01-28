var amqp = require('amqplib/callback_api');
var debug = require('debug')('pub-sub-amqp');
var constants = require('./constants.json');
var Event = require('./event');

/**
 * A wrapper over AMQP, providing methods to publish and subscribe.
 * @constructor
 * @author tbking <tarun.batra00@gmail.com>
 * @param {object} options - Options passed to the AMQP client
 * @param {string} options.uri - URI of the AMQP broker to connect
 * @param {string} [options.exchange=exchange] - Exchange name
 * @param {string} [options.exchangeType=topic] - Exchange type
 * @param {string} [options.queue=$pid] - Queue name
 * @param {string} [options.durable=false] - Queue durability
 * @param {function} [callback] - Callback
 */
function AMQPClient(options, callback) {

  this.options = {
    uri: options.uri,                                // URI of the AMQP broker to connect
    exchange: options.exchange || 'exchange',        // Exchange name. Defaults to 'exchange'
    exchangeType: options.exchangeType || 'topic',   // Exchange type. Defaults to 'topic'
    queue: options.queue || String(process.pid),     // Queue name. Defaults to process id
    durable: options.durable || false                // Queue durability. Defaults to false
  };

  var self = this;

  debug(constants.CONNECTING);

  // Connect to AMQP broker
  amqp.connect(self.options.uri, function (err, connection) {

    if (err) {
      debug(err);
      if (callback) {
        return callback(err);
      }
      throw err;
    }

    debug(constants.CONNECTED);

    // Create a channel
    connection.createChannel(function (error, channel) {

      if (error) {
        debug(error);
        if (callback) {
          return callback(error);
        }
        throw error;
      }

      // Saves reference of channel for future use
      self.channel = channel;

      // Create an exchange if it doesn't exists
      channel.assertExchange(self.options.exchange, self.options.exchangeType);

      // Create a queue if it doesn't exists
      channel.assertQueue(self.options.queue, { durable: self.options.durable });

      debug(constants.INITIALIZED);

      if (callback) {
        return callback(null, self);
      }
    });
  });
}

/**
 * Publishes message for any client interested to subscribe and listen to.
 * @param {string} type - Type of the message
 * @param {*} data - Data to be sent
 * @param {function} [callback] - Callback
 */
AMQPClient.prototype.emit = function (type, data, callback) {
  var self = this;

  // If channnel not initialized, throw error
  if (!self.channel) {
    var error = new Error(constants.NOT_CONNECTED);
    debug(error);
    if (callback) {
      return callback(error);
    }
    throw error;
  }

  // Generate message to be published
  var msg = JSON.stringify(data);

  // Publish the message
  self.channel.publish(self.options.exchange, type, new Buffer(msg));

  debug('PUBLISHED: [%s] %o', type, data);

  if (callback) {
    return callback();
  }
};

/**
 * Registers a listener for messages of a particular type.
 * @param {string} type - Type of the message
 * @param {messageReceivedCallback} callback - Callback
 */
AMQPClient.prototype.on = function (type, callback) {
  var self = this;

  // If channnel not initialized, return error
  if (!self.channel) {
    var notConnectedError = new Error(constants.NOT_CONNECTED);
    debug(notConnectedError);
    if (callback) {
      return callback(notConnectedError);
    }

    // If no callback, throw the error
    throw notConnectedError;
  }

  // Bind the queue qith the exchange
  self.channel.bindQueue(self.options.queue, self.options.exchange, type);

  debug('LISTENING: %s', type);

  // Listen for messages
  self.channel.consume(self.options.queue, function (msg) {

    // Create the event
    var event = new Event(self, msg);

    debug('RECEVIED: [%s] %o', type, event.data);

    // Return the event
    if (callback) {
      return callback(null, event);
    }
  });
};

module.exports = AMQPClient;


/**
 * Callback called when a subscribed message is received
 * @callback messageReceivedCallback
 * @param {object|null} error - Error
 * @param {Event} event - Event object containing message details
 * @param {object} event.data - Data received in the message
 * @param {object} event.ack - Method to acknowledge the message
 * @param {object} event.reject - Method to reject the message
 */
