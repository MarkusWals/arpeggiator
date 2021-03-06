var midi = require('midi');

var input = [];

// I'd love to sync with midi clock at some point, but for now I just have
// a rudimentary clock that ticks at a specific tempo. 'tick' is a function
// I pass in that gets called every time the clock ticks.
var Clock = function(tempo, tick) {
    var interval; // might want to be able to turn this off

    this.run = function() { 
        interval = setInterval(function() {tick()}, 60 * 1000 / tempo);
    }
}
function Arp(modeNext) {
    var songStarted = false;

    var midiInput = new midi.input();
    midiInput.on("message", function(deltaTime,message) {
        console.log(message);
        if (message[0] < 144 || message[0] > 159) // ignore everything but notes
            return;
        if (message[2] == 0) {  // note release
            var removeIndex = -1;
            for (var i = 0; i < input.length; i++) {
                if (input[i][1] == message[1]) {
                    removeIndex = i;
                    break;
                }
            }
            input.splice(removeIndex,1);
        }
        else
            input.push(message);
    });
    try {
        midiInput.openPort(0);
    }
    catch (error) {
        console.log("midi port is unavailable. exiting.");
        process.exit(1);
    }


    var midiOutput = new midi.output();
    midiOutput.openVirtualPort("Arpeggiator");

    this.note = function() {
        var note = modeNext();
        if (typeof note != 'undefined') { // Simple "Thread Safety"
            if (!songStarted){
                midiOutput.sendMessage([ 176, 25, 0 ]); // song start. Why doesn't this work?
                songStarted = true;
            }
            midiOutput.sendMessage(note) ;
        }
    }
}
// cycle through the notes
function Up() {
    var i = 0;

    var next = function() {
        var j = i++;
        if (i > input.length - 1) i = 0;
        return input[j];
    }
    return next;
}
// back and forth through the notes
function UpDown() {
    var i = 0, mode = 0;

    var next = function() {
        var j = i;
        if (mode == 0) i++; else i--;
        if (i == input.length - 1) mode = 1;
        if (i == 0) mode = 0;
        return input[j];
    }
    return next;
}

// Skip ahead two notes, step back one, ...
function OneThree() {
    var i = 0, up = true;

    var next = function() {
        var j = i;
        if (up) i += 2; else i -= 1;
        if (i > input.length - 1) i = i - input.length;
        if (i < 0) i = input.length-1;
        up = !up;
        return input[j];
    }
    return next;
}

var tempo = process.argv[2]; // take the tempo as a command-line argument
var arp1 = new Arp(OneThree());
var clock1 = new Clock(tempo,arp1.note);
clock1.run();
