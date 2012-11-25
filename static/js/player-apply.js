importScripts('/js/shade/gl-matrix.js');

var stateBuffer = [];
var goodPos;
var goodRot;
var pos = vec3.create();
var rot = vec3.create();

self.onmessage = function(e) {
    var msg = e.data;

    switch(msg[0]) {
    case 'setGoodStuff':
        goodPos = msg[1];
        goodRot = msg[2];
        vec3.set(goodPos, pos);
        vec3.set(goodRot, rot);
        break;
    case 'saveState':
        stateBuffer.push(msg[1]);
        break;
    case 'applyState':
        applyState(msg[1]);
    }
};

function applyState(state) {
    var buffer = stateBuffer;

    if(state.sequenceId != buffer[0].sequenceId) {
        throw new Error('mismatched sequence ids OH NOES ' +
                        'GOOD LUCK DEBUGGING THAT');
    }

    // Add the new good state to the current good state,
    // ignoring the predicted state
    // console.log('predicted [' + buffer[0].sequenceId + ']: ',
    //             buffer[0].x, buffer[0].y, buffer[0].z);
    // console.log('server [' + state.sequenceId + ']: ',
    //             state.x, state.y, state.z);

    // The last known good state!!!!
    vec3.add(goodPos, [state.x, state.y, state.z]);
    vec3.add(goodRot, [state.rotX, state.rotY, state.rotZ]);

    vec3.set(goodPos, pos);
    vec3.set(goodRot, rot);

    // Apply the rest to get the final state
    for(var i=1, l=buffer.length; i<l; i++) {
        var pState = buffer[i];
        vec3.add(pos, [pState.x, pState.y, pState.z]);
        vec3.add(rot, [pState.rotX, pState.rotY, pState.rotZ]);
    }

    buffer.shift();

    self.postMessage(['setState', pos, rot]);
}