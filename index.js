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

  amqp.connect(options.uri, function(err, conn) {
    if (err) {
      if (cb) {
        return cb(err);
      }
      throw err;
    }
    self.conn = conn;

    conn.createChannel(function(error, ch) {
      if (error) {
        if (cb) {
          return cb(error);
        }
        throw error;
      }
      self.ch = ch;

      ch.assertExchange(options.exchange, options.exchangeType);

      ch.assertQueue(options.queue, { durable: options.durable });

      ch.bindQueue(options.queue, options.exchange);

      if (cb) {
        return cb();
      }
    });
  });
}

AMQPClient.prototype.emit = function (type, data, cb) {
  var self =this;

  if (!self.ch) {
    var error = new Error('Not connected to an AMQP server');
    if (cb) {
      return cb(error);
    }
    throw error;
  }

  var msg = JSON.stringify({
    type: type,
    payload: data
  });

  self.ch.publish(self.options.exchange, '', new Buffer(msg));

  if (cb) {
    return cb();
  }
};

AMQPClient.prototype.on = function (type, cb) {
  var self = this;

  if (!self.ch) {
    var error = new Error('Not connected to an AMQP server');
    if (cb) {
      return cb(error);
    }
    throw error;
  }

  self.ch.consume(self.options.queue, function (msg) {

    var data = JSON.parse(msg.content.toString());

    self.ch.ack(msg);

    if (data.type !== type) {
      return;
    }

    if (cb) {
      return cb(null, msg.payload);
    }
  });
};

module.exports = AMQPClient;
