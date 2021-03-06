var request = require('request'),
hueapi = require('node-hue-api');

module.exports = {

    hostname: null,
    username: null,
    lights: null,

    // utilize both bridge search strategies to find the ip address of the bridge
    findBridge: function(callback) {
        this.nupnpSearch(function(result) {
            if (result[0].ipaddress) {
                console.log(result);
                this.hostname = result[0].ipaddress;
                callback(this.hostname);
            } else {
                this.upnpSearch(5000, function(result) {
                    this.hostname = result[0].ipaddress;
                    callback(this.hostname);
                });
            }
        });
    },

    // better bridge search function that uses someone elses implementation
    nupnpSearch: function(callback) {
        hueapi.nupnpSearch(function(error, result) {
            if (error) throw error;
            callback(result);
        });
    },

    // second priority search function that uses someone elses implementation
    upnpSearch: function(timeout, callback) {
        hueapi.upnpSearch(timeout).then(function(result) {
            callback(result);
        }).done();
    },

    // set the username and hostname to make calls to the api
    setDevice: function(hostname, username) {
        this.hostname = hostname;
        this.username = username;
    },

    // just save the lights, so we know how to update them
    cacheLights: function(lights) {
        this.lights = lights;
    },

    // get info on the hue setup
    getInfo: function(callback) {
        var url = 'http://' + this.hostname + '/api/' + this.username;
        request({url: url}, function(error, response, body) {
            callback(error, response, body);
        });
    },

    // register this app to use the bridge (requires link button pressing)
    registerApp: function(callback) {
        var url = 'http://' + this.hostname + '/api';
        request({
            url: url,
            method: 'POST',
            json: true,
            body: {
                devicetype: "api user",
                username: this.username
            },
            timeout: 5000
        }, callback);
    },

    // get the lights currnet state
    getLightState: function(callback) {
        var url = 'http://' + this.hostname + '/api/' + this.username + '/lights';
        request({url: url}, function(error, response, body) {
            if (error) throw error;
            callback(body);
        });
    },

    // used to control whether the light can be updated or not
    lock: false,

    updateLights: function(state) {

        // do not update the lights if they are locked/being updated
        if (this.lock) return;

        // lock the lights while they are being updated
        this.lock = true;

        // lol, javascript
        var that = this;

        // loop through the lights and set them individually
        for (var i = 0; i < Object.keys(this.lights).length; i++) {
            this.setLight(Object.keys(this.lights)[i], state, function() {
                // on the last iteration, release the lock so the lights can be updated again
                if (i === Object.keys(that.lights).length) {
                    that.lock = false;
                }
            });
        }
    },

    // set a light to a certain state
    setLight: function(lightId, state, callback) {
        var url = 'http://' + this.hostname + '/api/' + this.username + '/lights/' + lightId + '/state';
        request({
            url: url,
            method: 'PUT',
            json: true,
            body: state
        }, function() {
            callback();
        });
    }
};
