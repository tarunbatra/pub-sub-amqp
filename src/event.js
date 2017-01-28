/**
 * Creates an event object with received message
 * @class Event
 * @author tbking <tarun.batra00@gmail.com>
 */
var Event = function (self, msg) {

  /**
   * Data received in the message
   * @member Event#data
   */
  this.data;

  try {
    // Try to parse the message received
    this.data = JSON.parse(msg.content.toString());
  } catch (err) {

    // If message is not valid JSON,
    // return the message as it is
    this.data = msg.content.toString();
  }

  /**
   * Method to acknowledge the message
   * @function Event#ack
   */
  this.ack = function () {
    self.channel.ack(msg);
  };

  /**
   * Method to reject the message
   * @function Event#reject
   */
  this.reject = function () {
    self.channel.reject(msg);
  };
};

module.exports = Event;
