Pictionary.MessageCollection = Backbone.Collection.extend({
  initialize: function() {
    var _this = this;
    _.extend(this, Backbone.Events);
    _.bindAll(this);
    this.bind('add', function(msg) {
      Pictionary.getEventMediator().trigger('addMessage', msg);
    });
  },

  url: 'chat/messageCollection',

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
      msgObj = { id:      [o.id, date].join(':'),
                 msg:     o.msg,
                 sender:  o.id,
                 name:    o.name,
                 time:    date };

      if (addToOutbound) {
        this.create(msgObj);
        console.log('creating');
      }
      else {
        this.add(msgObj);
        console.log('adding');
      }
    }
  },

  // add a message not associated with any sender
  // if addToOutbound is true, it will add it to
  // the queue of messages to send to the server
  addSysMessage: function(str, addToOutbound) {
    msg = { msg: str,
            sender: -1,
            name: '',
            time: (new Date()).getTime() };

    addToOutbound ? this.create(msg) : this.add(msg);
  },
});
