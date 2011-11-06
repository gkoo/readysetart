var fs = require('fs'),
    _u = require('underscore'),
    Backbone = require('backbone');

// Surprisingly enough, the word list came from here:
// http://faqs.ign.com/articles/648/648569p1.html

module.exports = (function() {
  var wordList, usedWords, wordbase,
      //filename = './wordbase/words.txt';
      filename = './wordbase/fruit.txt';

  wordbase = {
    initialize: function() {
      _u.bindAll(this, 'getUnusedWord', 'checkGuesses');
      _u.extend(this, Backbone.Events);
      this.resetUsedWords();
      this.getWordList();
      return this;
    },

    getWordList: function(callback) {
      if (wordList) {
        callback(wordList);
      }
      else {
        fs.readFile(filename, 'utf-8', function (err, data) {
          if (err) throw err;
          if (data) {
            wordList = data.split('\n');
            if (wordList[wordList.length-1] === '') {
              //strip off the last empty string word
              wordList.splice(wordList.length-1, 1);
            }
          }
          if (callback) {
            callback(wordList);
          }
        });
      }
    },

    getUnusedWord: function() {
      // Pick a word at random from wordList. Remove it from
      // wordList and add it to usedWords. Return the word.
      // Once wordList is empty, assign usedWords as the new
      // wordList and create an empty array to be the new
      // usedWords.

      var wordListLength = wordList.length,
          rand = Math.floor(Math.random() * wordListLength),
          word = wordList[rand];

      // Have the word. Update lists now.
      wordList.splice(rand, 1); // Delete from wordList.
      usedWords.push(word);     // Add to usedWords.

      if (wordList.length === 0) {
        console.info('WordList is empty. Resetting...');
        wordList = usedWords;
        usedWords = [];
      }
      this.currentWord = word;
      return word;
    },

    resetUsedWords: function() {
      usedWords = [];
    },

    checkGuesses: function(messages) {
      // Made this word synchronous rather than event-based
      // because for some reason Backbone's event was being
      // triggered twice. Wasn't able to figure it out.
      var guessed = false,
          i, len, message, newMessage;
      if (this.currentWord) {
        for (i=0, len=messages.length; i<len; ++i) {
          newMessage = messages[i];
          if (newMessage.message.toLowerCase() === this.currentWord.toLowerCase()) {
            // Correct guess!
            guessed = true;
            message = newMessage;
            break;
          }
        }
      }
      if (guessed) {
        return message;
      }
      else {
        return 0;
      }
    }
  };

  return wordbase.initialize();
})();
