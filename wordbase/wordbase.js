var fs = require('fs'),
    _u = require('underscore');

// Surprisingly enough, the word list came from here:
// http://faqs.ign.com/articles/648/648569p1.html

module.exports = function() {
  var wordList, usedWords, wordbase, filename = './wordbase/words.txt';

  this.initialize = function() {
    this.resetUsedWords();
    this.getWordList();
  };

  this.getWordList = function(callback) {
    if (wordList) {
      callback(wordList);
    }
    else {
      fs.readFile(filename, 'utf-8', function (err, data) {
        if (err) throw err;
        if (data) {
          wordList = data.split('\n');
        }
        if (callback) {
          callback(wordList);
        }
      });
    }
  };

  this.getUnusedWord = function() {
    // Pick a word at random from wordList. Remove it from
    // wordList and add it to usedWords. Return the word.
    // Once wordList is empty, assign usedWords as the new
    // wordList and create an empty array to be the new
    // usedWords.

    var wordListLength = wordList.length,
        rand = Math.floor(Math.random() * wordListLength),
        word = wordList[rand];

    wordList.splice(rand, 1); // Delete from wordList.
    usedWords.push(word);     // Add to usedWords.
    if (wordList.length === 0) {
      console.info('WordList is empty. Resetting...');
      wordList = usedWords;
      usedWords = [];
    }
    console.log('wordList.length: ' + wordList.length);
    console.log('usedWords.length: ' + usedWords.length);
    return word;
  };

  this.resetUsedWords = function() {
    usedWords = [];
  };

  this.initialize();
};
