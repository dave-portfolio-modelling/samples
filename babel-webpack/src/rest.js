'use strict';

function rest(method, url, content, headers) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        for(let key of Object.keys(headers)) {
            xhr.setRequestHeader(key, headers[key]);
        }
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    message: "Failure communicating with the server" + (xhr.statusText ? (" (" + xhr.statusText + ")") : ""),
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                message: `Failure communicating with the server (${method}: ${url})`
            });
        };
        if (content) {
            xhr.send(content);
        }
        else {
            xhr.send();
        }
    });
}

export default rest;