var MessageModel = Backbone.Model.extend(),

MessageCollection = Backbone.Collection.extend({
  model: MessageModel,

  initialize: function() {
    _.extend(this, Backbone.Events);
  },

  comparator: function(message) {
    return message.get('time') || 0;
  }
}),

ChatModel = Backbone.Model.extend({
  initialize: function() {
    var _this = this;

    _.bindAll(this,
              'addMessage',
              'addMessages');

    _.extend(this, Backbone.Events);
    this.set({ 'outboundMessages': [] });
    this.get('messages').bind('add', function(msg) {
      _this.trigger('addMessage', msg);
    });
  },

  addMessages: function(newMessages) {
    this.get('messages').add(newMessages);
  },

  addMessage: function(msg) {
    // if msg is typeof String, treat as single message.
    // if msg is typeof Object and has a length, treat as an array of messages.
    try {
    var messages       = this.get('messages'),
        newMessages    = this.get('outboundMessages'),
        currPlayerId   = this.currPlayer.id,
        name           = this.currPlayer.get('name'),
        date           = (new Date()).getTime(),
        sender, msgObj, msgObjList;

    if (typeof msg === 'string') {
      msgObj = { message: msg,
                 sender:  currPlayerId,
                 name:    name,
                 time:    date };

      messages.add(msgObj);
      newMessages.push(msgObj);
    }
    else if (typeof msg === 'object' && msg.length) {
      msgObjList = [];
      _.each(msg, function(m) {
        msgObj = { message: m,
                   sender:  currPlayerId,
                   name: name,
                   time: date };

        msgObjList.push(msgObj);
        newMessages.push(msgObj);
      });
      messages.add(msgObjList);
    }

    // TODO: associate message with name.
    }
    catch(e) {
      console.log(e);
    }
  }
});
