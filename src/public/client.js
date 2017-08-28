"use strict";

(function() {

    /**
     * Add an event to a DOM element
     * @param {DOMElement} element - the element who listen
     * @param {String} eventName - the name of the event
     * @param {Function} callback - the function to execute
     */
    function on(element, eventName, callback) {
        return element.addEventListener(eventName, callback);
    }

    /**
     * document.getElementById
     * @param {String} id - the id of the DOMElement
     * @return {DOMELement} 
     */
    function getElementById(id) {
        return document.getElementById(id);
    }

    /**
     * Wipes all element from a given DOMElement
     * @param {DOMElement} element 
     */
    function wipeElementsFrom(element) {
        while(element.children.length) {
            element.removeChild(element.children[element.children.length-1]);
        }
    }

    var elementsOn = {},
        startMenu = getElementById('start-menu');

    function toggle(element, force) {
        elementsOn[element.id] = element.className.includes('off');
        if (elementsOn[element.id] && !force) {
            element.classList.remove('off');
        } else {
            element.classList.add('off');
        }
    }

    var gamesList = getElementById('games-menu'),
        gamesUl = getElementById('games-list'),
        optionList = getElementById('option-list'),
        optionListUl = optionList.getElementsByTagName('ul')[0],
        selectedGameId;

    function updateGameListUI() {
        var listArray = Array.prototype.slice.apply(gamesUl.children);
        listArray.forEach(function (li) {
            if (li.getAttribute('data-game-id') === selectedGameId) li.classList.add('selected')
            else li.classList.remove('selected');
        });
    }

    function selectGame(event) {
        selectedGameId = event.target.getAttribute('data-game-id');
        updateGameListUI();
    }

    function updateGamesList(games) {
        wipeElementsFrom(gamesUl);
        games.forEach(function (game) {
            var li = document.createElement('li');
            li.setAttribute('data-game-id', game.id);
            li.innerHTML = "id: " + game.id + "<br>"
                            + "players: " + game.dungeons.length;
            on(li, 'click', selectGame);
            gamesUl.appendChild(li);
        });
    }

    
    function updateGameOptionsSelected() {
        var optionButtons = Array.prototype.slice.apply(optionListUl.getElementsByTagName('button'));

        optionButtons.forEach(function (button) {
            var dataIndex = button.getAttribute('data-option-index');
            if (parseInt(dataIndex, 10) === parseInt(selectedOption, 10)) button.classList.add('selected');
            else button.classList.remove('selected');
        });

        game.selectedOption = game.options[selectedOption];
    }

    function selectOption(event) {
        var optionIndex = event.target.getAttribute('data-option-index');
        selectedOption = optionIndex;
        updateGameOptionsSelected();
    }

    function updateGameOptions(options) {
        wipeElementsFrom(optionListUl);
        options.forEach(function (option, index) {
            var li = createUIElement('li');
            var button = createUIElement('button', {
                'data-option-index': index,
            }, {
                click: selectOption,
            });
            button.innerHTML = option;
            
            li.appendChild(button);
            optionListUl.appendChild(li);
        });
        if (typeof selectedOption === 'undefined') {
            selectedOption = 0;
        }
        updateGameOptionsSelected();
    }



    var socket, //Socket.IO client
        game,
        selectedOption = 0,
        mouseX = 0,
        mouseY = 0;

    /**
     * Binde Socket.IO and button events
     */
    function bind() {

        socket.on("room-list", function (rooms) {
            updateGamesList(rooms);
            toggle(gamesList);
            toggle(startMenu);
        });

        socket.on("game-created", function (newGame) {
            game = new Game(socket, false);
            game.updateGame(newGame);
            updateGameOptions(game.options);
            toggle(startMenu);
            optionList.classList.remove('off');
        });

        socket.on("update", function(updatedGame) {
            if (!game) game = new Game(socket, false);
            game.updateGame(updatedGame);
            var dungeon = find(game.dungeons, socket.id);
            toggle(startMenu, true);
            toggle(gamesList, true);
            if (game.options.length) updateGameOptions(game.options);
        });

        socket.on("error", function () {});

        socket.on('game-lost', function (data) {
          alert(data.message);
          socket.disconnect(false);
        });

        var buttons = Array.prototype.slice.apply(document.getElementsByTagName('button'));

        // add events to button based on id

        buttons.forEach(function (button) {
            on(button, 'click', function () {
                switch(button.id) {
                    case 'join-game':
                        socket.emit(button.id, selectedGameId);
                        break;
                    default:
                        socket.emit(button.id, socket.id);
                }
            });
        });

        window.addEventListener('mousemove', function(event) {
            mouseX = event.screenX;
            mouseY = event.screenY;
        });

        window.addEventListener('contextmenu', function(event) {
            event.preventDefault();
            event.stopPropagation();
            toggle(optionList);
            if (elementsOn[optionList.id]) {
                var x = mouseX;
                var y = mouseY;
                optionList.style.left = x + 'px';
                optionList.style.top = y + 'px';
            }
        });

        // add keyboard events
        window.addEventListener('keyup', function (event) {
            var key = event.keyCode;
            var direction;
            if (game) {
                if (key === 87 || key === 38) {
                    direction = 'up';
                } else if (key === 40 || key === 83) {
                    direction = 'down';
                } else if (key === 65 || key === 37) {
                    direction = 'left';
                } else if (key === 68 || key === 39) {
                    direction = 'right';
                }
                if (direction) socket.emit('move-player', direction);
            }
        });
    }

    /**
     * Client module init
     */
    function init() {
        socket = io({ upgrade: false, transports: ["websocket"] });
        bind();
    }

    window.addEventListener("load", init, false);

})();
