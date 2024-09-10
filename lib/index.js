// Golden response

'use strict';

const Boom = require('@hapi/boom');

const internals = {};

// Content-Type regexes
internals.contentTypeRegex = /^([^\/\s]+\/[^\s;]+)(.*)?$/;
internals.charsetParamRegex = /;\s*charset=(?:"([^"]+)"|([^;"\s]+))/i;
internals.boundaryParamRegex = /;\s*boundary=(?:"([^"]+)"|([^;"\s]+))/i;

// Content-Length regex
internals.contentLengthRegex = /^Content-Length:\s*(\d+)$/i;

// Accept header regex
internals.acceptHeaderRegex = /^(\S+\/\S+)(?:;\s*q=([0-1](?:\.\d*)?))?$/i;

// Content-Type parsing
exports.type = function (header) {
    if (!header) {
        throw Boom.badRequest('Invalid content-type header');
    }

    const match = header.match(internals.contentTypeRegex);
    if (!match) {
        throw Boom.badRequest('Invalid content-type header');
    }

    const result = {
        mime: match[1].toLowerCase()
    };

    const params = match[2];
    if (params) {
        const charsetMatch = params.match(internals.charsetParamRegex);
        if (charsetMatch) {
            result.charset = (charsetMatch[1] || charsetMatch[2]).toLowerCase();
        }

        if (result.mime.indexOf('multipart/') === 0) {
            const boundaryMatch = params.match(internals.boundaryParamRegex);
            if (boundaryMatch) {
                result.boundary = boundaryMatch[1] || boundaryMatch[2];
            }

            if (!result.boundary) {
                throw Boom.badRequest('Invalid content-type header: multipart missing boundary');
            }
        }
    }

    return result;
};

// Content-Length parsing
exports.contentLength = function (header) {
    if (!header) {
        throw Boom.badRequest('Missing Content-Length header');
    }

    const match = header.match(internals.contentLengthRegex);
    if (!match) {
        throw Boom.badRequest('Invalid Content-Length header format');
    }

    return parseInt(match[1], 10);
};

// Accept header parsing
exports.accept = function (header) {
    if (!header) {
        throw Boom.badRequest('Missing Accept header');
    }

    const result = [];
    const types = header.split(',');

    types.forEach(type => {
        const match = type.match(internals.acceptHeaderRegex);
        if (match) {
            result.push({
                mime: match[1].toLowerCase(),
                q: match[2] ? parseFloat(match[2]) : 1.0
            });
        } else {
            throw Boom.badRequest('Invalid Accept header format');
        }
    });

    return result;
};

// Content-Disposition regexes
internals.contentDispositionRegex = /^\s*form-data\s*(?:;\s*(.+))?$/i;
internals.contentDispositionParamRegex = /([^\=\*\s]+)(\*)?\s*\=\s*(?:([^;'"\s]+\'[\w-]*\'[^;\s]+)|(?:\"([^"]*)\")|([^;\s]*))(?:\s*(?:;\s*)|$)/g;

// Content-Disposition parsing
exports.disposition = function (header) {
    if (!header) {
        throw Boom.badRequest('Missing content-disposition header');
    }

    const match = header.match(internals.contentDispositionRegex);
    if (!match) {
        throw Boom.badRequest('Invalid content-disposition header format');
    }

    const parameters = match[1];
    if (!parameters) {
        throw Boom.badRequest('Invalid content-disposition header missing parameters');
    }

    const result = {};
    parameters.replace(internals.contentDispositionParamRegex, ($0, $1, $2, $3, $4, $5) => {

        if ($1 === '__proto__') {
            throw Boom.badRequest('Invalid content-disposition header format includes invalid parameters');
        }

        let value;

        if ($2) {
            if (!$3) {
                throw Boom.badRequest('Invalid content-disposition header format includes invalid parameters');
            }

            try {
                value = decodeURIComponent($3.split('\'')[2]);
            }
            catch (err) {
                throw Boom.badRequest('Invalid content-disposition header format includes invalid parameters');
            }
        }
        else {
            value = $4 || $5 || '';
        }

        if ($1 === 'name' && value === '__proto__') {
            throw Boom.badRequest('Invalid content-disposition header format includes invalid parameters');
        }

        result[$1] = value;
    });

    if (!result.name) {
        throw Boom.badRequest('Invalid content-disposition header missing name parameter');
    }

    return result;
};