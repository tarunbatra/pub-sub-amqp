/**
 * Creates an event object with received message
 * @class Event
 * @private
 * @author tbking <tarun.batra00@gmail.com>
 */
var Event = function (self, msg) {

  // Data received in the message
  this.data;

  try {
    // Try to parse the message received
    this.data = JSON.parse(msg.content.toString());
  } catch (err) {

    // If message is not valid JSON,
    // return the message as it is
    this.data = msg.content.toString();
  }

  // Method to acknowledge the message
  this.ack = function () {
    self.channel.ack(msg);
  };


  // Method to reject the message
  this.reject = function () {
    self.channel.reject(msg);
  };
};

module.exports = Event;

/**
 * @typedef event
 * @type {object}
 * @property {string} data - Data received in the message
 * @property {function} ack - Method to acknowledge the message
 * @property {function} reject - Method to reject the message
 */
