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
 * @param {function} [callback] - Callback
 */
function AMQPClient(options, callback) {

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

      // SAves reference of channel for future use
      self.channel = channel;

      // Create an exchange if it doesn't exists
      channel.assertExchange(self.options.exchange, self.options.exchangeType);

      // Create a queue if it doesn't exists
      channel.assertQueue(self.options.queue, { durable: self.options.durable });

      debug(constants.INITIALIZED);

      if (callback) {
        return callback();
      }
    });
  });
}

/**
 * Publishes message to AMQP exchange
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
 * Listens for message of a type
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

    var data;

    try {
      // Try to parse the message received
      data = JSON.parse(msg.content.toString());
    } catch (err) {

      // If message is not valid JSON,
      // return the message as it is
      data = msg.content.toString();
    }

    debug('RECEVIED: [%s] %o', type, data);

    // Construct the event object
    var event = {
      data: data,
      ack: self.channel.ack,
      reject: self.channel.reject
    };

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
 * @param {object} event - Message details
 * @param {object} event.data - Message received
 * @param {object} event.ack - Method to acknowledge the message
 * @param {object} event.reject - Method to reject the message
 */
