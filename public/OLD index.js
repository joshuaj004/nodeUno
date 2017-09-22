var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/style.css', function(req, res) {
  res.sendFile(__dirname + "/" + "style.css");
});

var unoDeck = [];
var playedCards = [];

io.on('connection', function(socket){
    socket.on('new user', function(name) {
        io.emit('message', name + ' has connected.');
        socket.username = name;
    });
    
    socket.on('disconnect', function() {
        io.emit('message', socket.username + ' has disconnected.');
    });
    
    socket.on('new game', function(){
        console.log("New Game Button Clicked -- Server");
        io.emit('message', socket.username + " started a new game.");
        // Get a shuffled uno deck
        unoDeck = deckHandler();
        var tempCard = unoDeck.pop();
        playedCards.push(tempCard);
        io.emit('message', "The current card is " + JSON.stringify(tempCard));
    });
    
    socket.on('card get', function(msg){
        var tempCard = cardDrawHandler();
        io.emit('message', socket.username + " drew a card.");
        socket.emit('card get', tempCard);
    });
    
    socket.on('card get 7', function(msg){
        for (var i = 0; i < 7; i++) {
            var tempCard = cardDrawHandler();
            socket.emit('card get', tempCard);
        }
        
        io.emit('message', socket.username + " drew 7 cards.");
    });
      
    socket.on('card play', function(card){
        if (card == undefined) {
            return;
        }
        var lastPlayed = playedCards.slice(-1)[0];
        
        // Handle Wild Scenarios
        if (lastPlayed.value == "wild" || lastPlayed.value == "draw four" || card.value == "wild" || card.value == "draw four" ) {
            playedCards.push(card);
        } else if (lastPlayed.value == card.value || lastPlayed.color == card.color) {
            // Handle matching values or colors
            playedCards.push(card);
        } else {
            // Cards was not valid
            io.emit('message', socket.username + " tried to play a " + JSON.stringify(card) + ", an action deemed invalid. Card was returned to hand.");
            socket.emit('card get', card);
            return;
        }
        io.emit('message', socket.username + " played a " + JSON.stringify(card));
        //cardPlayHandler();
    });
      
    socket.on('card undo', function(){
        if (playedCards.length < 2) {
            io.emit('message', socket.username + " selected undo. This is not an option at the moment, so nothing will be done.");
        } else {
            var undoCard = playedCards.pop();
            socket.emit('card get', undoCard);
            io.emit('message', socket.username + " selected undo and the card " + JSON.stringify(undoCard) + " was returned to hand.");
        }
        //cardUndoHandler();
    });
});

// This function handles drawing a card and returning it to the player
function cardDrawHandler() {
    console.log("Draw Card Button Clicked -- Server");
    if (unoDeck.length < 1) {
        unoDeck = deckHandler();
    }
    var tempCard = unoDeck.pop();
    console.log("The drawn card was -- " + JSON.stringify(tempCard));
    return tempCard;
}

/*function cardPlayHandler() {
    console.log("Play Card Button Clicked -- Server");
}*/

function cardUndoHandler() {
    console.log("Undo Card Button Clicked -- Server");
}

// Creates and returns a full Uno deck
function deckHandler() {
    var tempDeck = [];
    var colors = ["red", "blue", "green", "yellow"];
    var values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, "skip", "skip", "reverse", "reverse", "wild", "wild","draw two", "draw two", "draw four"];
    for (var i = 0; i < colors.length; i++) {
        for (var j = 0; j < values.length; j++) {
            tempDeck.push(new UnoCard(values[j], colors[i]));
        }
    }
    shuffle(tempDeck);
    return tempDeck;
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items The array containing the items.
 */
function shuffle(a) {
    for (let i = a.length; i; i--) {
        let j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}

http.listen(3030, function(){
  console.log('listening on *:3030');
});

class UnoCard {
    constructor(value, color) {
        this.value = value;
        this.color = color;
    }
}