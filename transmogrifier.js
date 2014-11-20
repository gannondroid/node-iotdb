/*
 *  transmogrifier.js
 *
 *  David Janes
 *  IOTDB
 *  2014-11-18
 *
 *  Copyright [2013-2014] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

var assert = require('assert');
var _ = require("./helpers");
var ThingArray = require("./thing_array").ThingArray;

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb',
    module: 'transmogrifier',
});

/* --- constants --- */
var VERBOSE = true;

/**
 *  A 'Transmogrifier' changes the way a Thing works
 *  or appears in interface. It lets you do
 *  stuff like:
 *  <ul>
 *  <li>convert Fahrenheit to Celsius for all values
 *  <li>delay sending an event for a certain
 *    period of time
 *  </ul>
 *  <p>
 *  Random thoughts:
 *  </p>
 *  <ul>
 *  <li>when we transform attributes, we have to
 *      rewrite the attributes() function to
 *      return the new version so we can introspect
 *      this properly
 *  <li>we can write caching functions for each Model
 *  </ul>
 */
var Transmogrifier = function () {
    var self = this;
    self.__wrapped = null;
};

/**
 */
Transmogrifier.prototype.transmogrify = function (o) {
    var self = this;
    if (_.isModel(o)) {
        return self._transmogrify_thing(o);
    } else if (_.isThingArray(o)) {
        return self._transmogrify_thing_array(o);
    } else {
        logger.error({
            method: "transmogrify",
            cause: "likely the programmer has called this with the wrong object"
        }, "cannot transmogrify - needs to be a Thing or ThingArray");
    }
};

Transmogrifier.prototype._transmogrify_thing = function (thing) {
    var self = this;

    self.__wrapped = thing;

    for (var key in self.__wrapped) {
        if (key.match(/^_/)) {
            continue;
        }

        var value = self.__wrapped[key];
        if (!_.isFunction(value)) {
            continue;
        }

        self.key = function () {
            return self.__wrapped.call(self.__wrapped, Array.prototype.slice.call(arguments));
        };
    }
    return thing;
};

Transmogrifier.prototype._transmogrify_thing_array = function (thing_array) {
    var self = this;

    // new array, just like the old one
    var new_array = new ThingArray({
        persist: thing_array.is_persist(),
    })

    // all things added to the new array are transmogrified
    new_array.___push = new_array.push;
    new_array.push = function(thing) {
        new_array.___push(self.transmogrify(thing));
    }

    // add things from the old array
    for (var ti = 0; ti < thing_array.length; ti++) {
        new_array.push(thing_array[ti]);
    }


    return thing_array;
};

/*
 *  API
 */
exports.Transmogrifier = Transmogrifier;
