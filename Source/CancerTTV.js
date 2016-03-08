/*jshint multistr: true */
// Constants
var regExSpaces = / +/g;
var antiGlobalTimeLimit = 31;
var antiGlobalMessageLimit = 20;
var antiGlobalDisplaySizeMin = 12;
var antiGlobalDisplaySizeMax = 72;
var repeatSpamArr = [',', '.', '-', '\'', '_', ':', ';'];
var sendingTooFastCooldown = 1000;

// Storage helpers
var getBoolFromStorage = function(varName, defaultCase) {
    var val = window.localStorage.getItem(varName);
    if (val === null)
        return defaultCase;
    return (val === "true");
};
// Storage/Configuration
var cttvSelectedEmote = window.localStorage.getItem("cttvSelectedEmote") || "Kappa";
var showSendingTooFastIndicator = getBoolFromStorage("cttvShowSendTooFast", true);
var showGlobalMessageLimitCounter = getBoolFromStorage("cttvShowGlobalMessageLimit", true);
var showHelpPopupQuestionMark = getBoolFromStorage("cttvShowQuestionMark", true);
var showAutoSend = getBoolFromStorage("cttvShowAutoSend", true);
var firstTime = getBoolFromStorage("cttvFirstTime", true);

var devDebug = getBoolFromStorage("cttvDevDebug", false); // Set manually for debugging

// Variables
var currentChatMessage = "";
var antiGlobalTimekeeper = [];
var repeatSpamIndex = 0;
var chatBoxHasProgramChange = false;
var lastMessage = "";
var chatBoxRepeatSpamEndLength = 0;
var ctrlIsHeld = false;
var main = function() {

    console.log("CTTV Main called");

    var chatMessageArea = $('.chat-lines');
    var chatArea = $('.ember-chat .chat-interface');
    var chatBox = chatArea.find('textarea');
    var chatSend = chatArea.find('.send-chat-button');

    var cttvStyleTag = $("<style type='text/css'>\n\
.help-popup-cttv-visible { left: -45px !important; opacity: 1 !important; pointer-events: auto !important; cursor: pointer;}\n\
.help-popup-cttv { text-align: center; vertical-align: middle; line-height: 22px;\n\
border-radius: 50%; position: absolute; left: 0px; top: calc(50% - 10px); width: 20px; height: 20px; opacity: 0;\n\
background-color: rgb(100, 65, 165); transition: opacity .3s, left .3s, transform .3s; pointer-events: none; }\n\
.help-popup-cttv:hover { box-shadow: 0px 0px 12px rgb(100, 65, 165); transform: scale(1.2); }\n\
\
.help-popup-message-cttv { text-align: center; background-color: rgb(60, 60, 60); box-shadow: 0px 1px 0px rgba(255, 255, 255, 0.15) inset;\n\
border-bottom: black solid 2px; padding: 8px 6px 10px 6px; color: rgb(211, 211, 211); }\n\
.help-popup-message-cttv:last-child { border-bottom: none; }\n\
.help-popup-message-cttv:first-child { box-shadow: none; }\n\
.help-popup-message-cttv:nth-child(2n) { background-color: rgb(40, 40, 40); }\n\
\
.kbd { padding: 0.1em 0.6em; border: 1px solid rgb(204, 204, 204); font-size: 11px; font-family: Arial,Helvetica,sans-serif;\
background-color: rgb(247, 247, 247); color: rgb(51, 51, 51); box-shadow: 0 1px 0px rgba(0, 0, 0, 0.2),0 0 0 2px rgb(255, 255, 255) inset;\
border-radius: 3px; display: inline-block; margin: 0 0.1em; text-shadow: 0 1px 0 rgb(255, 255, 255);\
line-height: 1.5; white-space: nowrap;}</style>").appendTo("head");

    var helpPopupDiv = function(addString) {
        return "<div class='help-popup-message-cttv' " + addString + ">";
    };
    var kappaImage = "<img class='emoticon' src='https://static-cdn.jtvnw.net/emoticons/v1/25/1.0' />";
    var getKbd = function(key1, key2) {
        return "<span class='kbd'>" + key1 + "</span> + <span class='kbd'>" + key2 + "</span>";
    };
    var helpPopup;
    var lastHelpPopupScrollPosition = 2;
    var cttvMenuShown = false;
    var showCttvMenu = function() {
        if (cttvMenuShown)
            return false;
        cttvMenuShown = true;

        if (helpPopup) helpPopup.css('display', 'none');

        var helpAreaTop = $("<div style='position:absolute; right: 100%; bottom: 50px; float: right; z-index: 9999999;\
border: rgba(100, 100, 100, 0.5) solid 1px; background-color: rgb(37, 24, 61); width: 250px; height: 350px;'\
class='tse-scrollable scroll scroll-dark help-area-top-cttv'>")
        .appendTo('#right_col');

        var helpArea = $("<div class='tse-content'>").appendTo(helpAreaTop);

        var helpDropdown = $("<label class='help-popup-message-cttv' style='margin: 0px; background-color: rgb(117, 80, 186); cursor: pointer;'\
title='Click this to open the options menu.'>\
<span class='VVVVVV' style='text-align: left; position: absolute; left: 5px;'>VV</span>\
<span style='text-align: center;'>OPTIONS</span>\
<span class='VVVVVV' style='text-align: right; position: absolute; right: 5px;'>VV</span></label>").appendTo(helpArea);


        helpDropdownShown = false;
        var helpDropdownChildren = [];
        helpDropdown.on('click', function(e) {
            if (!helpDropdownShown)
            {
                helpDropdown.find(".VVVVVV").text("^^");

                helpDropdownChildren = [];

                // These are created in reverse order.
                // ¯\_(ツ)_/¯
                
                helpDropdownChildren.push($(helpPopupDiv("title='Hit enter to set. It doesn&#39;t have to be just an emote.&#10;Any characters are allowed, \
including spaces.'") + "Stored emote<br><input type='textarea' value='" + cttvSelectedEmote + "' style='width: 90%;' />")
                                          .insertAfter(helpDropdown)
                                          .on('keydown', function(e) {
                    var keyCode = e.which || e.keycode;
                    if (keyCode === keycodes.ENTER)
                        setSelectedEmote(e.target.value);
                }));

                helpDropdownChildren.push($("<label class='help-popup-message-cttv' style='margin: 0px;'>\
<input  type='checkbox' " + (showAutoSend ? "checked" : "") + "/> Show auto send checkbox</label>")
                    .insertAfter(helpDropdown)
                    .on('change', function(e) {
                    setShowAutoSend(e.target.checked);
                    if (showAutoSend)
                        createAutoSend();
                    else
                        removeAutoSend();
                }));

                helpDropdownChildren.push($("<label class='help-popup-message-cttv' style='margin: 0px;'>\
<input  type='checkbox' " + (showSendingTooFastIndicator ? "checked" : "") + "/> Show sending messages too fast</label>")
                    .insertAfter(helpDropdown)
                    .on('change', function(e) {
                    setShowSendingTooFast(e.target.checked);
                    if (showSendingTooFastIndicator)
                        createSendingTooFastIndicator();
                    else
                        removeSendingTooFastIndicator();
                }));



                helpDropdownChildren.push($("<label class='help-popup-message-cttv' style='margin: 0px;'>\
<input  type='checkbox' " + (showGlobalMessageLimitCounter ? "checked" : "") + "/> Show global message limit</label>")
                    .insertAfter(helpDropdown)
                    .on('change', function(e) {
                    setShowGlobalLimitDisplay(e.target.checked);
                    if (showGlobalMessageLimitCounter)
                        createGlobalLimitDisplay();
                    else
                        removeGlobalLimitDisplay();
                }));

                helpDropdownChildren.push($("<label class='help-popup-message-cttv' style='margin: 0px;'>\
<input  type='checkbox' " + (showHelpPopupQuestionMark ? "checked" : "") + " /> Show question mark</label>")
                    .insertAfter(helpDropdown)
                    .on('change', function(e) {
                    setShowHelpPopup(e.target.checked);
                    if (!showHelpPopupQuestionMark)
                    {
                        removeHelpPopup();
                    }
                    else
                    {
                        createHelpPopup();
                        helpPopup.css('display', 'none');
                    }
                }));

                helpDropdownChildren[0].css("border-bottom", "rgb(117, 80, 186) solid 6px");

                helpDropdownShown = true;
            }
            else
            {
                helpDropdown.find(".VVVVVV").text("VV");
                helpDropdownChildren.forEach(function(el) { el.remove(); });
                helpDropdownShown = false;
            }
            helpAreaTop.TrackpadScrollEmulator('recalculate');
        });

        var hints = [];

        hints.push($(helpPopupDiv("title='Or middle click to copy their name too!'") + "<span class='kbd'>Ctrl</span><br>\
Hold down and left click any message to copy it to your chatbox!</div>").appendTo(helpArea));

        hints.push($(helpPopupDiv("title='Attaches a random squiggly at the end to bypass twitch spam filters.'") + getKbd("Ctrl", "O") + "<br>\
Sends your previous message again!</div>").appendTo(helpArea));

        hints.push($(helpPopupDiv("title='Inserts the stored emote between all spaces in the current chat box text.&#10;\
Uses your stored emote defined in options.'") + "Test Message Test<br>" + getKbd("Ctrl", "L") + "<br>\
" + kappaImage + " Test " + kappaImage + " Message " + kappaImage + " Test " + kappaImage + "</div>").appendTo(helpArea));

        hints.push($(helpPopupDiv("title='Inserts the stored emote at the beginning and end of the current chat box text.&#10;\
Uses your stored emote defined in options.'") + "Test Message Test<br>" + getKbd("Ctrl", "K") + "<br>\
" + kappaImage + " Test Message Test " + kappaImage + "</div>").appendTo(helpArea));

        hints.push($(helpPopupDiv("title='Repeats the current chat box message in a nice, convenient way.'") + kappaImage + " \
Test Message Test " + kappaImage + "<br>" + getKbd("Ctrl", "I") + "<br>\
" + kappaImage + " Test Message Test " + kappaImage + " Test Message Test " + kappaImage + "</div>").appendTo(helpArea));

        hints.push($(helpPopupDiv("title='Inserts the first word of the chat box betwen all spaces.'") + kappaImage + " \
Test Message Test<br>" + getKbd("Ctrl", "J") + "<br>\
" + kappaImage + " Test " + kappaImage + " Message " + kappaImage + " Test " + kappaImage + "</div>").appendTo(helpArea));

        hints.push($(helpPopupDiv("title='Inserts the first word of the chat box at the end.'") + kappaImage + " Test Message Test<br>\
" + getKbd("Ctrl", "U") + "<br>" + kappaImage + " Test Message Test " + kappaImage + "</div>").appendTo(helpArea));

        hints.push($(helpPopupDiv("title='Inserts a space between every character in the chat box.'") + "TESTMESSAGE<br>\
" + getKbd("Ctrl", "SPACE") + "<br>T E S T M E S S A G E</div>").appendTo(helpArea));

        hints.forEach(function(el) {
            el.on('click', function(e) {
                helpPopupCleanup();
            });
        });

        helpAreaTop.TrackpadScrollEmulator({ 
            // ヽ༼ಢ_ಢ༽ﾉ (thank you BTTV)
            scrollbarHideStrategy: 'rightAndBottom' });
        var helpScrollBar = $('.help-area-top-cttv .tse-scroll-content');
        helpScrollBar.scrollTop(lastHelpPopupScrollPosition);

        var helpPopupCleanup = function() {
            lastHelpPopupScrollPosition = helpScrollBar.scrollTop();
            if (helpPopup) helpPopup.css('display', 'inline');
            cttvMenuShown = false;
            helpAreaTop.remove();
        };

        var closeHelpArea = $("<span style='position: absolute; top: 10px; right: 10px; z-index: 9999999; \
font-size: 40px; opacity: 0.3; cursor: pointer;'>X</span>")
        .appendTo(helpAreaTop);
        closeHelpArea.on('click', function(e) {
            helpPopupCleanup();
        });
    };

    var createHelpPopup = function() {
        if (helpPopup)
            return false;

        helpPopup = $("<div class=help-popup-cttv><font size=4 color=black><b>?</b></font></div>")
            .appendTo(chatBox.parent());

        helpPopup.on('click', function(e) {
            e.stopPropagation();
            showCttvMenu();
        });
    };

    var removeHelpPopup = function() {
        helpPopup.remove();
        helpPopup = false;
    };

    var setShowHelpPopup = function(newValue) {
        showHelpPopupQuestionMark = newValue;
        window.localStorage.setItem("cttvShowQuestionMark", newValue.toString());
    };

    if (showHelpPopupQuestionMark)
    {
        createHelpPopup();
    }

    var globalLimitDisplay;
    var globalLimitDisplayInterval;
    var createGlobalLimitDisplay = function()
    {
        if (globalLimitDisplay)
            return;

        globalLimitDisplay = $("<p> Test").appendTo(chatArea);
        globalLimitDisplay.css("position", "absolute").css("text-align", "center").css("width", "100%")
            .css("bottom", "calc(100% + 12px)").css("pointer-events", "none")
            .css("text-shadow", "0px 0px 12px rgb(126, 126, 126)").css("transition", "font-size .2s, color .2s");

        var lastLen = -1;
        var antiGlobalMessageLoop = function() {
            var diff = new Date().getTime() - antiGlobalTimekeeper[0];
            if (diff > antiGlobalTimeLimit * 1000)
            {
                antiGlobalTimekeeper.shift();

            }
            var gtlen = antiGlobalTimekeeper.length;
            if (gtlen === lastLen)
                return;
            lastLen = gtlen;

            var textScaler = scaleNumberRange(Math.min(gtlen, 17), 0, 17, antiGlobalDisplaySizeMin, antiGlobalDisplaySizeMax);
            var colorScaler = scaleNumberRange(Math.min(gtlen, 17), 0, 17, 126, 255);
            var gbInverseScaler = scaleNumberRangeInverse(Math.min(gtlen, 17), 0, 17, 0, 126);
            globalLimitDisplay.css("font-size", (textScaler) + "px")
                .css("color", rgb(colorScaler, gbInverseScaler, gbInverseScaler));
            globalLimitDisplay.css("opacity", (gtlen < 3 ? 0 : 1));
            globalLimitDisplay.text(gtlen === 20 ? "MAX" : gtlen);

        };

        globalLimitDisplayInterval = setInterval(antiGlobalMessageLoop, 100);
    };

    var removeGlobalLimitDisplay = function() {
        if (!globalLimitDisplay)
            return;

        clearInterval(globalLimitDisplayInterval);
        globalLimitDisplay.remove();
        globalLimitDisplay = false;
    };

    var setShowGlobalLimitDisplay = function(newValue) {
        showGlobalMessageLimitCounter = newValue;
        window.localStorage.setItem("cttvShowGlobalMessageLimit", newValue.toString());
    };

    if (showGlobalMessageLimitCounter)
        createGlobalLimitDisplay();

    var sendingTooFastIndicator;
    var sendingTooFastInterval;
    var createSendingTooFastIndicator = function()
    {
        if (sendingTooFastIndicator)
            return;

        sendingTooFastIndicator = $("<p class=sending-too-fast-indicator>X").appendTo(chatBox.parent());
        sendingTooFastIndicator.css("position", "absolute").css("bottom", "calc(100% + 30px)").css("pointer-events", "none")
            .css("text-shadow", "0px 0px 12px rgb(126, 126, 126)").css("font-size", "60px");

        var lastState = -1;
        var sendTooFastIsLastState = function(currentState) {
            if (currentState === lastState)
            {
                return true;
            }
            else
            {
                lastState = currentState;
                return false;
            }
        };

        var sendingTooFastLoop = function() {

            var diff = new Date().getTime() - antiGlobalTimekeeper[antiGlobalTimekeeper.length - 1];
            if (diff > sendingTooFastCooldown || isNaN(diff))
            {
                if (diff > sendingTooFastCooldown + 1000 || isNaN(diff))
                {
                    if (sendTooFastIsLastState(3))
                        return;

                    sendingTooFastIndicator.css("opacity", "0");
                }
                else
                {
                    if (sendTooFastIsLastState(2))
                        return;

                    sendingTooFastIndicator.text("O");
                    sendingTooFastIndicator.css("color", "green").css("opacity", "1");
                }
            }
            else
            {
                if (sendTooFastIsLastState(1))
                    return;

                sendingTooFastIndicator.text("X");
                sendingTooFastIndicator.css("color", "red").css("opacity", "1");
            }
        };
        sendingTooFastInterval = setInterval(sendingTooFastLoop, 100);
    };

    var removeSendingTooFastIndicator = function()
    {
        if (!sendingTooFastIndicator)
            return;

        clearInterval(sendingTooFastInterval);
        sendingTooFastIndicator.remove();
        sendingTooFastIndicator = false;
    };

    var setShowSendingTooFast = function(newValue) {
        showSendingTooFastIndicator = newValue;
        window.localStorage.setItem("cttvShowSendTooFast", newValue.toString());
    };

    if (showSendingTooFastIndicator)
        createSendingTooFastIndicator();

    var autoSendToggle;
    var createAutoSend = function() {
        if (!autoSendToggle)
        {
            autoSendToggle = $("<label><input type=checkbox title='Auto send messages' style='position: relative;\
margin: 0px 0px 0px 6px; top: 3px;'/>Autosend</label>").appendTo(chatSend.parent()).children()[0];
        }
    };
    var removeAutoSend = function() {
        if (autoSendToggle)
        {
            autoSendToggle.remove();
            autoSendToggle = false;
        }
    };
    var setShowAutoSend = function(newValue) {
        showAutoSend = newValue;
        window.localStorage.setItem("cttvShowAutoSend", newValue.toString());
    };
    if (showAutoSend)
        createAutoSend();

    var cttvShowMenuButton = ($("<p><a href='#'>CTTV Menu</a></p>")
                              .on('click', function(e) {
        showCttvMenu();
    })).appendTo($(".ember-chat .chat-menu-content"));


    var doAutoSend = function() {
        if (autoSendToggle.checked)
        {
            onSendMessage();
            chatSend.trigger('click');
        }
    };

    var onChatBoxChange = function() {
        if (chatBox.val().length > 500)
        {
            chatBox.val(chatBox.val().slice(0,500));
        }
        if (chatBox.val() !== "" && !chatBoxHasProgramChange)
        {
            currentChatMessage = chatBox.val();
            chatBoxRepeatSpamEndLength = 0;
        }
        chatBoxHasProgramChange = false;
    };

    chatBox.on('input', function(e) {
        onChatBoxChange();
    });

    var setSelectedEmote = function(newEmote) {
        cttvSelectedEmote = newEmote;
        window.localStorage.setItem("cttvSelectedEmote", cttvSelectedEmote);
    };

    // I have to hack together this on message solution for BTTV support,
    // as it intercepts the chat box entirely
    var onSendMessage = function() {
        var splitStr = currentChatMessage.split(" ");
        var command = splitStr[0];
        var foundCommand = true;
        switch (command)
        {
            case "/cttvemote":
                var joinedStr = splitStr;
                joinedStr.splice(0, 1);
                joinedStr = joinedStr.join(" ");
                setSelectedEmote(joinedStr);
                break;
            default:
                foundCommand = false;
                break;
        }
        if (!foundCommand) 
        {
            if (currentChatMessage !== "")
            {
                lastMessage = currentChatMessage;
                var tempTime = new Date().getTime();
                antiGlobalTimekeeper.push(tempTime);
            }
        }
        console.log("CTTV send");
    };

    var onChatBoxKeyDown = function(e) {
        var keyCode = e.which || e.keyCode;
        switch (keyCode)
        {
            case keycodes.TAB:
            case keycodes.UP_ARROW:
            case keycodes.DOWN_ARROW:
                onChatBoxChange();
                break;

            case keycodes.ENTER:
                if (!chatBox.is(':focus') && e.ctrlKey)
                {
                    chatSend.trigger('click');
                }
                break;

            case keycodes.CTRL:
                if (!ctrlIsHeld)
                {
                    ctrlIsHeld = true;
                    addChatOnClick();
                    showHelpPopup(true);
                }
                break;
        }
    };

    // We brute-force rebind this function until we have a stable event handler.
    var chatBoxOnKeyDown = function(e) {
        var keyCode = e.keycode || e.which;
        if (keyCode === keycodes.ENTER)
            onSendMessage();
    };

    function hasEventHandler(element, handler) {
        events = jQuery._data(element, "events");

        for (var i in events.keydown) {
            if (typeof(events.keydown[i].handler) != "undefined" && events.keydown[i].handler == handler) {
                return true;
            }
        }

        return false;
    }

    var stableRetries = 30;
    var currentRetries = 0;
    var rebindChat;
    var chatRebindLoop = function() {
        if (!hasEventHandler(chatBox[0], chatBoxOnKeyDown))
        {
            chatBox.on('keydown', chatBoxOnKeyDown);
            currentRetries = 0;
        }
        else
        {
            currentRetries++;
            if (currentRetries === stableRetries)
            {
                clearInterval(rebindChat);
                rebindChat = setInterval(chatRebindLoop, 20 * 1000);
            }
        }

    };
    rebindChat = setInterval(chatRebindLoop, 200);

    // Instead of hooking the button, which BTTV eats, we hook the chat area. \o/
    chatArea.on('click', function(e) {
        if ($(e.target).hasClass("send-chat-button"))
            onSendMessage();
    });

    var parseNonBttvChat = function(element) {
        var message = element.find(".message");
        var content = message.contents();
        var finalMessage = "";
        content.each(function(i) {
            var c = $(this);
            if (c.is("img"))
            {
                finalMessage += c.attr("alt");
            }
            else
            {
                finalMessage += c.text();
            }
        });
        finalMessage = finalMessage.trim();
        return finalMessage;
    };

    var chatOnClickCssTag;
	var onClickCss = $("<style scoped type='text/css'>.chat-line { cursor: pointer !important; } \n\
.chat-line:hover { background-color: rgb(126, 126, 126) !important; } \n\
.chat-line > * { pointer-events: none!important; }</style>");

    var addChatOnClick = function() {
        chatMessageArea.on('mousedown', function(e) {
            var button = e.which;
            chatMessageOnClick($(e.target), e, button);
        });
		chatOnClickCssTag = onClickCss.appendTo(chatMessageArea.parent());
    };

    var chatMessageOnClick = function($this, e, button) {
        if (button === 1 || button === 2)
        {
            var newMessage;
            var dataRaw = $this.find(".message").attr("data-raw");
            if (typeof dataRaw === "undefined")
            {
                newMessage = parseNonBttvChat($this);
            }
            else
            {
                newMessage = decodeURIComponent(dataRaw);
            }
            if (button === 2)
            {
                newMessage = newMessage.insertAt(0, $this.find(".from").text() + ": ");
            }
            var colCss = $this.find(".colon").css("display");
            if (colCss === "none")
            {
                newMessage = newMessage.insertAt(0, "/me ");
            }
            chatBox.val(newMessage).focus();
            onChatBoxChange();
            e.preventDefault();
            doAutoSend();
        }
    };

    document.addEventListener('keydown', function(e) {
        var keyCode = e.keyCode || e.which;
        var switchFocus = false;

        if (e.ctrlKey && keyCode !== keycodes.CTRL)
        {
            switchFocus = true;
            var autoSend = false;
            var tempChatText = chatBox.val();
            var mMod = new MessageModification(tempChatText);
            if (chatBoxRepeatSpamEndLength !== 0)
            {
                mMod.text = mMod.text.slice(0, -chatBoxRepeatSpamEndLength);
                chatBoxRepeatSpamEndLength = 0;
            }
            mMod.checkSlashMeme();
            mMod.text = mMod.text.trim();
            switch (keyCode)
            {
                default:
                    // Do nothing
                    switchFocus = false;
                    break;

                case keycodes.KEY_O:
                    // Repeat last message with a cycling squiggly at the end to avoid the same message cooldown

                    // Set current chat message manually in case something was entered between spamming
                    currentChatMessage = lastMessage;

                    mMod.disableCleanup = true;
                    repeatSpamIndex++;
                    mMod.text = lastMessage;
                    if (antiGlobalTimekeeper.length !== 0)
                    {
                        mMod.text += " "  + repeatSpamArr[repeatSpamIndex%repeatSpamArr.length];
                        chatBoxRepeatSpamEndLength = 2;
                        chatBoxHasProgramChange = true;
                    }
                    autoSend = true;
                    break;

                case keycodes.KEY_L:
                    // Surround the message with the stored emote and replace all spaces with it
                    mMod.text = cttvSelectedEmote + " " + mMod.text.replace(regExSpaces, " " + cttvSelectedEmote + " ") +
                        " " + cttvSelectedEmote;
                    break;

                case keycodes.KEY_K:
                    // Surround the message with the stored emote
                    mMod.text = cttvSelectedEmote + " " + mMod.text + " " + cttvSelectedEmote;
                    break;

                case keycodes.KEY_I:
                    // Remove the last word, repeat the message, then insert the last word at the end
                    tempText = mMod.text.split(" ");
                    tempLast = tempText.pop();
                    tempText = tempText.concat(tempText);
                    tempText.push(tempLast);
                    mMod.text = tempText.join(" ");
                    break;

                case keycodes.KEY_J:
                    // Take the first word in message and insert it in every space + start and end
                    tempText = mMod.text.split(" ");
                    tempEmote = tempText.shift();
                    tempText = tempText.join(" ");
                    mMod.text = tempEmote + " " + tempText.replace(regExSpaces, " " + tempEmote + " ") +
                        " " + tempEmote;
                    break;

                case keycodes.KEY_U:
                    // Take the first word in message and insert it in start and end
                    tempText = mMod.text.split(" ");
                    tempText.push(tempText[0]);
                    mMod.text = tempText.join(" ");
                    break;

                case keycodes.SPACE:
                    // Add spaces between every letter
                    mMod.text = mMod.text.split("").join(" ");
                    break;
            }
            if (switchFocus)
            {
                mMod.restoreSlashMeme();
                chatBox.val(mMod.text).focus();
                onChatBoxChange();
                e.preventDefault();
                if (autoSend)
                {
                    doAutoSend();
                }
            }
        }
        if (!switchFocus)
        {
            onChatBoxKeyDown(e);
        }
    });

    window.addEventListener("blur", function(e) {
        cleanupCtrlDown();
    });

    document.addEventListener('keyup', function(e) {
        var keyCode = e.keyCode || e.which;

        if (keyCode === keycodes.CTRL)
        {
            cleanupCtrlDown();
        }
    });

    var cleanupCtrlDown = function() {
        chatMessageArea.off("mousedown");
        if (chatOnClickCssTag) chatOnClickCssTag.remove();
        showHelpPopup(false);
        ctrlIsHeld = false;
    };

    var showHelpPopup = function(show) {
        if (showHelpPopupQuestionMark)
        {
            if (show)
            {
                helpPopup.addClass('help-popup-cttv-visible');
            }
            else
            {
                helpPopup.removeClass('help-popup-cttv-visible');
            }
        }
    };

    if (firstTime)
    {
        var helpText = $("<div style='z-index: 99999; display: flex; justify-content: center; align-items: center; position: absolute; top: 0px;\
left: 0px; width: 100%; height: 100%; text-align: center; white-space: nowrap; background-color: rgba(203, 203, 203, 0.4);\
box-shadow: 0px 0px 12px rgba(203, 203, 203, 0.4);'>\
<span style='vertical-align: middle; text-shadow: rgb(180, 0, 255) 0px 0px 15px; color: rgb(255, 255, 255); font-size: 25px;\
margin-left: -100%; margin-right: -100%;'>\
Hold CTRL for Cancer</span></div>").appendTo(chatBox.parent());
        helpText.on('click', function(e) {
            helpText.remove();
        });
        var firstCtrl =  function(e) {
            var keyCode = e.which || e.keyCode;
            if (keyCode === keycodes.CTRL)
            {
                helpText.remove();
                firstTime = false;
                window.localStorage.setItem("cttvFirstTime", "false");
                document.removeEventListener(firstCtrl);
            }
        };
        document.addEventListener('keydown', firstCtrl);
    }

    if (devDebug) chatBox.val("haHAA");
};

// Thank you BTTV for this piece of code
var waitForChatLoad = function() {
    Ember.subscribe('render', {
        before: function() {
        },
        after: function(name, ts, payload) {
            if (payload.template === "shared/right-column")
            {
                main();
            }
        }
    });
};

$(document).ready(function() {
    waitForChatLoad();
});

// Handle message modifications
function MessageModification(text) {
    this.foundSlashMeme = false;
    this.text = text;
    this.disableCleanup = false;
    this.checkSlashMeme = function() {
        if (this.text.indexOf("/me ") === 0)
        {
            this.text = this.text.slice(4);
            this.foundSlashMeme = true;
        }
        return this.text;
    };
    this.restoreSlashMeme = function() {
        if (this.foundSlashMeme && !this.disableCleanup)
        {
            this.text = this.text.insertAt(0, "/me ");
        }
        return this.text;
    };
}

// Returns a value between 0 and 1
var scaleNumber = function(num, min, max) {
    return (num - min) / (max - min);
};

// Returns num between originalMin and originalMax scaled up to between scaledMin and scaledMax
var scaleNumberRange = function(num, originalMin, originalMax, scaledMin, scaledMax) {
    return scaleNumber(num, originalMin, originalMax) * (scaledMax - scaledMin) + scaledMin;
};

// Same as above but inverted (if num = scaledMax it returns scaledMin)
var scaleNumberRangeInverse = function(num, originalMin, originalMax, scaledMin, scaledMax) {
    return (1 - scaleNumber(num, originalMin, originalMax)) * (scaledMax - scaledMin) + scaledMin;
};

// Thank you stack overflow
String.prototype.insertAt=function(index, string) { 
    return this.substr(0, index) + string + this.substr(index);
};
function rgb(r, g, b){
    return "rgb("+Math.floor(r)+","+Math.floor(g)+","+Math.floor(b)+")";
}

// Thank you guy in google search results for this
var keycodes = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    SHIFT: 16,
    CTRL: 17,
    ALT: 18,
    PAUSE: 19,
    CAPS_LOCK: 20,
    ESCAPE: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    LEFT_ARROW: 37,
    UP_ARROW: 38,
    RIGHT_ARROW: 39,
    DOWN_ARROW: 40,
    INSERT: 45,
    DELETE: 46,
    KEY_0: 48,
    KEY_1: 49,
    KEY_2: 50,
    KEY_3: 51,
    KEY_4: 52,
    KEY_5: 53,
    KEY_6: 54,
    KEY_7: 55,
    KEY_8: 56,
    KEY_9: 57,
    KEY_A: 65,
    KEY_B: 66,
    KEY_C: 67,
    KEY_D: 68,
    KEY_E: 69,
    KEY_F: 70,
    KEY_G: 71,
    KEY_H: 72,
    KEY_I: 73,
    KEY_J: 74,
    KEY_K: 75,
    KEY_L: 76,
    KEY_M: 77,
    KEY_N: 78,
    KEY_O: 79,
    KEY_P: 80,
    KEY_Q: 81,
    KEY_R: 82,
    KEY_S: 83,
    KEY_T: 84,
    KEY_U: 85,
    KEY_V: 86,
    KEY_W: 87,
    KEY_X: 88,
    KEY_Y: 89,
    KEY_Z: 90,
    LEFT_META: 91,
    RIGHT_META: 92,
    SELECT: 93,
    NUMPAD_0: 96,
    NUMPAD_1: 97,
    NUMPAD_2: 98,
    NUMPAD_3: 99,
    NUMPAD_4: 100,
    NUMPAD_5: 101,
    NUMPAD_6: 102,
    NUMPAD_7: 103,
    NUMPAD_8: 104,
    NUMPAD_9: 105,
    MULTIPLY: 106,
    ADD: 107,
    SUBTRACT: 109,
    DECIMAL: 110,
    DIVIDE: 111,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    NUM_LOCK: 144,
    SCROLL_LOCK: 145,
    SEMICOLON: 186,
    EQUALS: 187,
    COMMA: 188,
    DASH: 189,
    PERIOD: 190,
    FORWARD_SLASH: 191,
    GRAVE_ACCENT: 192,
    OPEN_BRACKET: 219,
    BACK_SLASH: 220,
    CLOSE_BRACKET: 221,
    SINGLE_QUOTE: 222
};