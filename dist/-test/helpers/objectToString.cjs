'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function objectToString(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'bigint') {
            return value + 'n';
        }
        return value;
    });
}

exports.objectToString = objectToString;
