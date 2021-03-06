var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static('assets'));
app.use(express.static('public'));

var unoDeck = [];
var playedCards = [];
var players = [];
var turns = 0;
var gameInProgress = false;
// var numPlayers = 0;

// Keeps track of the number of cards the next player
// must draw, or if they need to play a draw two/four
var lastCardDrawX = false;
var drawTotal = 0;

// Helpful Comment:
// io talks to everybody connected to the server
// socket.emit should only talk to the connected socket (player)

io.on('connection', function(socket){
    socket.on('new user', function(name) {
        // numPlayers++;
        io.emit('message', name + ' has connected.');
        socket.username = name;
        players.push({"id": socket.id, "username": socket.username});
        if (gameInProgress) {
            io.emit('disable new game button');
            whosTurn();
            
            var lastPlayed = playedCards.slice(-1)[0];
            socket.emit('display card', lastPlayed);
        }
    });

    socket.on('chat message', function(msg) {
        io.emit('message', socket.username + ': ' + msg);
    });
    
    socket.on('disconnect', function() {
        io.emit('message', socket.username + ' has disconnected.');
        var index = players.findIndex(i => i.id === socket.id);
        players.splice(index, 1);
        
        if (players.length <= 1) {
            turns = 0;
            drawTotal = 0;
            lastCardDrawX = false;
            gameInProgress = false;

            io.emit('card clear');
            io.emit('disable draw buttons');
            io.emit('enable new/draw7 buttons');

        } else if (gameInProgress) {
            whosTurn();
        }
    });
    
    socket.on('new game', function() {
        if (turns == 0) {
            gameInProgress = true;
            io.emit('message', socket.username + " started a new game.");
            io.emit('disable new game button');
            io.emit('disable uno button');
            // Get a shuffled uno deck
            unoDeck = deckHandler();
            var tempCard = unoDeck.pop();
            playedCards.push(tempCard);
            turns = 0;
            if (tempCard.value == "wild" || tempCard.value == "draw four") {
                io.emit('message', "The curent card is a " + tempCard.value + ". The color is " + tempCard.color + ".");
                io.emit('display card', tempCard);
            } else {
                io.emit('message', "The current card is a " + tempCard.color + " " + tempCard.value + ".");
                io.emit('display card', tempCard);
            }

            lastCardDrawX = (tempCard.value == "draw four" || tempCard.value == "draw two");
            if (lastCardDrawX) {
                drawTotal = (tempCard.value == "draw two") ? 2 : 4;
            }
            shuffle(players);

            whosTurn();
        } else {
            io.emit('message', socket.username + " attempted to start a new game in the middle of this game!");
        }
    });
    
    socket.on('card get', function(msg){
        if (!isPlayerTurn(socket.id) && turns > 0) {
            io.emit('message', socket.username + " attempted to play out of turn.");
        } else if (lastCardDrawX && drawTotal > 1) {
            for (var i = 0; i < drawTotal; i++) {
                var tempCard = cardDrawHandler();
                socket.emit('card get', tempCard);
            }

            io.emit('message', socket.username + " drew " + drawTotal + " cards.");
            lastCardDrawX = false;
            drawTotal = 0;
            turns++;
            whosTurn();
        } else {
            var tempCard = cardDrawHandler();
            io.emit('message', socket.username + " drew a card.");
            socket.emit('card get', tempCard);
        }
    });
    
    socket.on('card get x', function(x) {
        if (!isPlayerTurn(socket.id) && turns > 0) {
            io.emit('message', socket.username + " attempted to play out of turn.");
        } else if (lastCardDrawX && drawTotal >= x) {
            for (var i = 0; i < drawTotal; i++) {
                var tempCard = cardDrawHandler();
                socket.emit('card get', tempCard);
            }
            
            io.emit('message', socket.username + " drew " + drawTotal + " cards.");
            lastCardDrawX = false;
            drawTotal = 0;
            turns++;
            whosTurn();
        } else {
            for (var i = 0; i < x; i++) {
                var tempCard = cardDrawHandler();
                socket.emit('card get', tempCard);
            }
            
            io.emit('message', socket.username + " drew " + x + " cards.");
        }
    });

    socket.on('card play', function(card){
        if (card == undefined) {
            return;
        }
        
        if (playedCards.length == 0) {
            socket.emit('card get', card);
            return;
        }
        
        var lastPlayed = playedCards.slice(-1)[0];

        if (isPlayerTurn(socket.id)) {
            // Handles user playing a card that isn't a draw two
            // or draw four when drawTotal is greater than 0
            if (lastCardDrawX && card.value != "draw two" && card.value != "draw four") {
                io.emit('message', socket.username + " tried to play a " + card.color + " " + card.value + ". They must either play a draw two, a draw four, or draw " + drawTotal + " cards.");
                socket.emit('card get', card);
                return;
            }

            // Handle matching values, colors, or wild cards
            if (lastPlayed.value == card.value || lastPlayed.color == card.color || 
                card.value == "wild" || card.value == "draw four") {
                playedCards.push(card);

                lastCardDrawX = (card.value == "draw two" || card.value == "draw four");
                if (lastCardDrawX) {
                    drawTotal += (card.value == "draw two") ? 2: 4;
                } else {
                    drawTotal = 0;
                }

            } else if (lastPlayed.value == "draw four" && card.value == "draw two") {
                playedCards.push(card);
                drawTotal += 2;
            } else {
                // Card was not valid
                io.emit('message', socket.username + " tried to play a " + card.color + " " + card.value + ", an action deemed invalid. Card was returned to hand.");
                socket.emit('card get', card);
                return;
            }
            
            // Handle message if wild card or not
            if (card.value == "wild" || card.value == "draw four") {
                io.emit('message', socket.username + " played a " + card.value + ". The color is now " + card.color + ".");
                io.emit('display card', card);
            } else {
                io.emit('message', socket.username + " played a " + card.color + " " + card.value + ".");
                io.emit('display card', card);
                if (card.value == "reverse") {
                    players.reverse();
                    turns = players.length - (turns % players.length) - 1;
                } else if (card.value == "skip") {
                    turns++;
                }
            }

            turns++;
            whosTurn();
        } else {
            io.emit('message', socket.username + " attempted to play out of turn.");
            socket.emit('card get', card);
            return;
        }
    });
      
    socket.on('card undo', function(){
        if (playedCards.length < 2) {
            io.emit('message', socket.username + " selected undo. This is not an option at the moment, so nothing will be done.");
        } else {
            var undoCard = playedCards.pop();
            if (undoCard.value == "draw two" || undoCard.value == "draw four") {
                drawTotal -= (undoCard.value == "draw two") ? 2 : 4;
                var lastValue = playedCards[playedCards.length - 1].value;
                lastCardDrawX = (lastValue == "draw two" || lastValue == "draw four");
            }
            socket.emit('card get', undoCard);
            io.emit('message', socket.username + " selected undo and the " + undoCard.color + " " + undoCard.value + " was returned to hand.");
            io.emit('display card', playedCards.slice(-1)[0]);
            turns--;
            whosTurn();
        }
    });

    socket.on('call uno', function() {
        io.emit('message', socket.username + " has called Uno!");
        io.emit('disable uno button');
    });
    
    socket.on('uno', function() {
        io.emit('message', socket.username + " has Uno!");
        io.emit('enable uno button');
    });
    
    socket.on('victory', function() { 
        io.emit('message', socket.username + " has won. Congratulations!");
        io.emit('card clear');
        io.emit('disable draw buttons');
        io.emit('disable uno button');

        io.emit('enable new/draw7 buttons');

        // Could combine these two into their own function. Note for later.
        // io.emit('enable draw 7 button');
        // io.emit('enable new game button');

        turns = 0;
        drawTotal = 0;
        lastCardDrawX = false;
        gameInProgress = false;
    });
});

/**
 * Handles drawing a card and returning it to the player.
 */
function cardDrawHandler() {
    if (unoDeck.length < 1) {
        unoDeck = deckHandler();
    }
    var tempCard = unoDeck.pop();
    return tempCard;
}

/**
 * Creates and returns a full Uno deck.
 */
function deckHandler() {
    var tempDeck = [];
    var colors = ["red", "blue", "green", "yellow"];
    var values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, "skip", "skip", "reverse", "reverse", "wild", "wild","draw two", "draw two", "draw four"];
    for (var i = 0; i < colors.length; i++) {
        for (var j = 0; j < values.length; j++) {
            tempDeck.push({"value": values[j], "color": colors[i]});
        }
    }
    shuffle(tempDeck);
    return tempDeck;
}

/**
 * Checks if it is the turn of the player who attempted to play a card.
 * @param {String} id 
 */
function isPlayerTurn(id) {
    return id === players[turns % players.length].id;
}

/**
 * Relays a global message indicating which player's turn it is.
 */
function whosTurn() {
    var player = players[turns % players.length];
    io.emit('message', player.username + "'s turn.");
    io.emit('disable new game button');
    io.emit('disable draw buttons');
    io.emit('hide drawTotal button');
    io.to(player.id).emit('enable draw buttons');
    io.to(player.id).emit('notify');
    if (lastCardDrawX && drawTotal > 4) {
        io.to(player.id).emit('show drawTotal button', drawTotal);
    }
}

/**
 * Shuffles array in place. ES6 version.
 * @param {Array} a items The array containing the items.
 */
function shuffle(a) {
    for (let i = a.length; i; i--) {
        let j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}

var port = process.env.PORT || 3030; //which you can run both on Azure or local
http.listen(process.env.PORT||3030, function() {
  console.log('listening on *:' + port);
});