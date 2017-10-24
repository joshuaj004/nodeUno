var username = prompt('Enter your name');

$(function () {
    var socket = io();
    // Handle username
    socket.emit('new user', username);

    // New Game
    $("#newGame").click(function() {
        socket.emit('new game');
        console.log('New Game Button Clicked -- Client');
    });

    // Draw cards
    $("#drawCard").click(function() {
        socket.emit('card get');
        console.log("Draw Card Button Clicked -- Client");
    });

    $("#draw2Cards").click(function() {
        socket.emit('card get x', 2);
        console.log("Draw Card 2 Button Clicked -- Client");
    });

    $("#draw4Cards").click(function() {
        socket.emit('card get x', 4);
        console.log("Draw Card 4 Button Clicked -- Client");
    });

    $("#draw7Cards").click(function() {
        socket.emit('card get x', 7);
        console.log("Draw Card 7 Button Clicked -- Client");
    });

    // Call uno
    $("#unoCall").click(function() {
        socket.emit('call uno');
        console.log("Uno Call Button Clicked -- Client");
    });

    // Undo Card
    $("#undoCard").click(function() {
        socket.emit('card undo');
        console.log("Undo Card Button Clicked -- Client");
    });

    socket.on('card get', function(card){
        var tempCard = $('<li>').text(JSON.stringify(card));
        tempCard.addClass("list-group-item");
        var tempColor = getColor(card);
        var tempUrl = getURL(card);
        var tempImageString = '<img class="' + tempColor + '" src="' + tempUrl +  '" alt=' + JSON.stringify(card) + '>';
        var tempImage = $(tempImageString);
        $(tempCard).append(tempImage);
        tempCard.click(function(e) {
            // Handles the user clicking on the img
            if (e.target.tagName == 'IMG') {
                var tempLi = $(e.target).parent()[0];
            } else {
                var tempLi = e.target;
            }
            socket.emit('card play', JSON.parse(tempLi.innerText));
            tempLi.remove();
            victoryCheck();
        });
        $('#cards').append(tempCard);
    });

    socket.on('display card', function(card) {
        var tempColor = getColor(card);
        var tempUrl = getURL(card);
        var tempImageString = '<img class="' + tempColor + '" src="' + tempUrl +  '" alt=' + JSON.stringify(card) + '>';
        var tempImage = $(tempImageString);
        $('#imageContainer').empty();
        $('#imageContainer').append(tempImage);

        // Prompts the user to pick a color on wild card.
        // Sends to server to persist change.
        if (card.value == "wild" || card.value == "draw four") {
            var color = prompt('What color?')
            if (color == null) {
                socket.emit('change color', card.color);
                return;
            }
            color = color.toLowerCase();
            while (color != "red" && color != "blue" && color != "green" && color != "yellow") {
                color = prompt("Pick a proper color you ass.");
                if (color == null) {
                    socket.emit('change color', card.color);
                    return;
                }
                color = color.toLowerCase();
            }
            socket.emit('change color', color);
        }
    });

    socket.on('message', function(msg){
        var tempLi = $('<li>').text(msg);
        tempLi.addClass("list-group-item");
      $('#messages').append(tempLi);
      $('#messages').scrollTop($('#messages')[0].scrollHeight);
    });

    socket.on('card clear', function(msg){
       $('#cards').empty(); 
    });

    function getURL(card) {
        if (isNaN(card.value)) {
            if (card.value == 'reverse') {
                var cardNum = 10;
            } else if (card.value == 'skip') {
                var cardNum = 11;
            } else if (card.value == 'draw two') {
                var cardNum = 12;
            } else if (card.value == 'wild') {
                var cardNum = 13;
            } else if (card.value == 'draw four') {
                var cardNum = 14;
            } else {
                console.log("Error with getURL method");
                var cardNum = 0;
            }
        } else {
            var cardNum = card.value;
        }
        return "/(" + cardNum + ").jpeg";
        
    }

    function getColor(card) {
        if (card.value != "wild" && card.value != "draw four") {
            return card.color;
        } else {
            return '';
        }
    }

    // Checks if the game was won.
    function victoryCheck() {
        if (document.getElementById("cards").children.length == 1) {
            socket.emit('uno');
        } else if (document.getElementById("cards").children.length == 0) {
            socket.emit('victory');
        } else {
        
        }
    }
});