Pictionary.MessageCollection = Backbone.Collection.extend({
  initialize: function() {
    var _this = this;
    _.extend(this, Backbone.Events);
    _.bindAll(this, 'addMessage', 'flushOutboundMessages');
    this.bind('add', function(msg) {
      _this.trigger('addMessage', msg);
    });
  },

  outboundMessages: [],

  comparator: function(message) {
    return message.get('time') || 0;
  },

  addMessage: function(o, addToOutbound) {
    // if msg is typeof Object and has a msg, treat as single message.
    // if msg is typeof Object and has a length, treat as an array of messages.
    var date = (new Date()).getTime(),
        _this = this,
        sender, msgObjList;

    if (o.msg) {
      msgObj = { msg: o.msg,
                 sender:  o.id,
                 name:    o.name,
                 time:    date };

      this.add(msgObj);
      if (addToOutbound) { this.outboundMessages.push(msgObj); }
    }
    else if (typeof o === 'object' && o.length) {
      msgObjList = [];
      _.each(o, function(msgObj) {
        msgObjList.push(msgObj);
        if (addToOutbound) { _this.outboundMessages.push(msgObj); }
      });
      this.add(msgObjList);
    }

    // TODO: associate message with name.
  },

  // add a message not associated with any sender
  // if addToOutbound is true, it will add it to
  // the queue of messages to send to the server
  addSysMessage: function(str, addToOutbound) {
    msg = { msg: str,
            sender: -1,
            name: '',
            time: (new Date()).getTime() };
    this.add(msg);
    if (addToOutbound) {
      this.outboundMessages.push(msg);
    }
  },

  // Returns outbound message buffer and clears it.
  flushOutboundMessages: function () {
    var outbound = this.outboundMessages;
    this.outboundMessages = [];
    return outbound;
  }
});
