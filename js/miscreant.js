(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.miscreant = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const webcrypto_1 = require("./providers/webcrypto");
const siv_1 = require("./siv");
/** AEAD interface provider for ISIVLike types */
class AEAD {
    /** Create a new AEAD instance with the given key */
    static importKey(keyData, alg, provider = new webcrypto_1.WebCryptoProvider()) {
        return __awaiter(this, void 0, void 0, function* () {
            return new AEAD(yield siv_1.SIV.importKey(keyData, alg, provider));
        });
    }
    constructor(siv) {
        this._siv = siv;
    }
    /** Encrypt and authenticate data using AES-SIV */
    seal(plaintext, nonce, associatedData = new Uint8Array(0)) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._siv.seal(plaintext, [associatedData, nonce]);
        });
    }
    /** Decrypt and authenticate data using AES-SIV */
    open(ciphertext, nonce, associatedData = new Uint8Array(0)) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._siv.open(ciphertext, [associatedData, nonce]);
        });
    }
    /** Make a best effort to wipe memory used by this instance */
    clear() {
        this._siv.clear();
        return this;
    }
}
exports.AEAD = AEAD;

},{"./providers/webcrypto":14,"./siv":17}],2:[function(require,module,exports){
"use strict";
// tslint:disable:max-classes-per-file
Object.defineProperty(exports, "__esModule", { value: true });
/** Thrown when ciphertext fails to verify as authentic */
class IntegrityError extends Error {
    constructor(m) {
        super(m);
        Object.setPrototypeOf(this, IntegrityError.prototype);
    }
}
exports.IntegrityError = IntegrityError;
/** Thrown when we attempt to use an unsupported crypto algorithm via WebCrypto */
class NotImplementedError extends Error {
    constructor(m) {
        super(m);
        Object.setPrototypeOf(this, NotImplementedError.prototype);
    }
}
exports.NotImplementedError = NotImplementedError;

},{}],3:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
/** Exceptions */
__export(require("./exceptions"));
/** Symmetric encryption APIs */
var aead_1 = require("./aead");
exports.AEAD = aead_1.AEAD;
var siv_1 = require("./siv");
exports.SIV = siv_1.SIV;
/** STREAM streaming encryption */
var stream_1 = require("./stream");
exports.StreamEncryptor = stream_1.StreamEncryptor;
exports.StreamDecryptor = stream_1.StreamDecryptor;
/** MAC functions */
var cmac_1 = require("./mac/cmac");
exports.CMAC = cmac_1.CMAC;
var pmac_1 = require("./mac/pmac");
exports.PMAC = pmac_1.PMAC;
/** Crypto providers */
var polyfill_1 = require("./providers/polyfill");
exports.PolyfillCryptoProvider = polyfill_1.PolyfillCryptoProvider;
var webcrypto_1 = require("./providers/webcrypto");
exports.WebCryptoProvider = webcrypto_1.WebCryptoProvider;

},{"./aead":1,"./exceptions":2,"./mac/cmac":9,"./mac/pmac":10,"./providers/polyfill":11,"./providers/webcrypto":14,"./siv":17,"./stream":18}],4:[function(require,module,exports){
"use strict";
/** Type which represents AES blocks */
Object.defineProperty(exports, "__esModule", { value: true });
const constant_time_1 = require("./constant-time");
const wipe_1 = require("./wipe");
/** An AES block (128-bits) */
class Block {
    constructor() {
        this.data = new Uint8Array(Block.SIZE);
    }
    /**
     * Clear the given array by setting its values to zero.
     *
     * WARNING: The fact that it sets bytes to zero can be relied on.
     *
     * There is no guarantee that this function makes data disappear from memory,
     * as runtime implementation can, for example, have copying garbage collector
     * that will make copies of sensitive data before we wipe it. Or that an
     * operating system will write our data to swap or sleep image. Another thing
     * is that an optimizing compiler can remove calls to this function or make it
     * no-op. There's nothing we can do with it, so we just do our best and hope
     * that everything will be okay and good will triumph over evil.
     */
    clear() {
        wipe_1.wipe(this.data);
    }
    /**
     * Make a copy of this block, returning a new block
     */
    clone() {
        const ret = new Block();
        ret.copy(this);
        return ret;
    }
    /** Copy the contents of another block into this one */
    copy(other) {
        this.data.set(other.data);
    }
    /**
     * Double a value over GF(2^128):
     *
     *     a<<1 if firstbit(a)=0
     *     (a<<1) ⊕ 0¹²⁰10000111 if firstbit(a)=1
     */
    dbl() {
        let carry = 0;
        for (let i = Block.SIZE - 1; i >= 0; i--) {
            const b = (this.data[i] >>> 7) & 0xff;
            this.data[i] = (this.data[i] << 1) | carry;
            carry = b;
        }
        this.data[Block.SIZE - 1] ^= constant_time_1.select(carry, Block.R, 0);
        carry = 0;
    }
}
/** Size of a block as used by the AES cipher */
Block.SIZE = 16;
/** Minimal irreducible polynomial for a 128-bit block size */
Block.R = 0x87;
exports.default = Block;

},{"./constant-time":5,"./wipe":7}],5:[function(require,module,exports){
"use strict";
// Copyright (C) 2016 Dmitry Chestnykh
// MIT License. See LICENSE file for details.
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * NOTE! Due to the inability to guarantee real constant time evaluation of
 * anything in JavaScript VM, this is module is the best effort.
 */
/**
 * Returns resultIfOne if subject is 1, or resultIfZero if subject is 0.
 *
 * Supports only 32-bit integers, so resultIfOne or resultIfZero are not
 * integers, they'll be converted to them with bitwise operations.
 */
function select(subject, resultIfOne, resultIfZero) {
    return (~(subject - 1) & resultIfOne) | ((subject - 1) & resultIfZero);
}
exports.select = select;
/**
 * Returns 1 if a and b are of equal length and their contents
 * are equal, or 0 otherwise.
 *
 * Note that unlike in equal(), zero-length inputs are considered
 * the same, so this function will return 1.
 */
function compare(a, b) {
    if (a.length !== b.length) {
        return 0;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i];
    }
    return (1 & ((result - 1) >>> 8));
}
exports.compare = compare;
/**
 * Returns true if a and b are of equal non-zero length,
 * and their contents are equal, or false otherwise.
 *
 * Note that unlike in compare() zero-length inputs are considered
 * _not_ equal, so this function will return false.
 */
function equal(a, b) {
    if (a.length === 0 || b.length === 0) {
        return false;
    }
    return compare(a, b) !== 0;
}
exports.equal = equal;

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Number of trailing zeros in a given byte value */
const CTZ_TABLE = new Uint8Array([
    8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
    4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0,
]);
/** Count the number of trailing zeroes in a given number */
function ctz(value) {
    return CTZ_TABLE[value];
}
exports.ctz = ctz;

},{}],7:[function(require,module,exports){
"use strict";
// Copyright (C) 2016 Dmitry Chestnykh
// MIT License. See LICENSE file for details.
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Sets all values in the given array to zero and returns it.
 *
 * The fact that it sets bytes to zero can be relied on.
 *
 * There is no guarantee that this function makes data disappear from memory,
 * as runtime implementation can, for example, have copying garbage collector
 * that will make copies of sensitive data before we wipe it. Or that an
 * operating system will write our data to swap or sleep image. Another thing
 * is that an optimizing compiler can remove calls to this function or make it
 * no-op. There's nothing we can do with it, so we just do our best and hope
 * that everything will be okay and good will triumph over evil.
 */
function wipe(array) {
    // Right now it's similar to array.fill(0). If it turns
    // out that runtimes optimize this call away, maybe
    // we can try something else.
    for (let i = 0; i < array.length; i++) {
        array[i] = 0;
    }
    return array;
}
exports.wipe = wipe;

},{}],8:[function(require,module,exports){
"use strict";
// Copyright (C) 2016 Dmitry Chestnykh
// MIT License. See LICENSE file for details.
Object.defineProperty(exports, "__esModule", { value: true });
/** Perform an in-place bitwise XOR operation on two bytestrings */
function xor(a, b) {
    for (let i = 0; i < b.length; i++) {
        a[i] ^= b[i];
    }
}
exports.xor = xor;

},{}],9:[function(require,module,exports){
"use strict";
// Copyright (C) 2016-2017 Dmitry Chestnykh, Tony Arcieri
// MIT License. See LICENSE file for details.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = require("../internals/block");
const xor_1 = require("../internals/xor");
/**
 * The AES-CMAC message authentication code
 */
class CMAC {
    constructor(_cipher, _subkey1, _subkey2) {
        this._cipher = _cipher;
        this._subkey1 = _subkey1;
        this._subkey2 = _subkey2;
        this._bufferPos = 0;
        this._finished = false;
        this._buffer = new block_1.default();
    }
    /** Create a new CMAC instance from the given key */
    static importKey(provider, keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            const cipher = yield provider.importBlockCipherKey(keyData);
            // Generate subkeys.
            const subkey1 = new block_1.default();
            yield cipher.encryptBlock(subkey1);
            subkey1.dbl();
            const subkey2 = subkey1.clone();
            subkey2.dbl();
            return new CMAC(cipher, subkey1, subkey2);
        });
    }
    reset() {
        this._buffer.clear();
        this._bufferPos = 0;
        this._finished = false;
        return this;
    }
    clear() {
        this.reset();
        this._subkey1.clear();
        this._subkey2.clear();
    }
    update(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const left = block_1.default.SIZE - this._bufferPos;
            let dataPos = 0;
            let dataLength = data.length;
            if (dataLength > left) {
                for (let i = 0; i < left; i++) {
                    this._buffer.data[this._bufferPos + i] ^= data[i];
                }
                dataLength -= left;
                dataPos += left;
                yield this._cipher.encryptBlock(this._buffer);
                this._bufferPos = 0;
            }
            // TODO: use AES-CBC with a span of multiple blocks instead of encryptBlock
            // to encrypt many blocks in a single call to the WebCrypto API
            while (dataLength > block_1.default.SIZE) {
                for (let i = 0; i < block_1.default.SIZE; i++) {
                    this._buffer.data[i] ^= data[dataPos + i];
                }
                dataLength -= block_1.default.SIZE;
                dataPos += block_1.default.SIZE;
                yield this._cipher.encryptBlock(this._buffer);
            }
            for (let i = 0; i < dataLength; i++) {
                this._buffer.data[this._bufferPos++] ^= data[dataPos + i];
            }
            return this;
        });
    }
    finish() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._finished) {
                // Select which subkey to use.
                const subkey = (this._bufferPos < block_1.default.SIZE) ? this._subkey2 : this._subkey1;
                // XOR in the subkey.
                xor_1.xor(this._buffer.data, subkey.data);
                // Pad if needed.
                if (this._bufferPos < block_1.default.SIZE) {
                    this._buffer.data[this._bufferPos] ^= 0x80;
                }
                // Encrypt buffer to get the final digest.
                yield this._cipher.encryptBlock(this._buffer);
                // Set finished flag.
                this._finished = true;
            }
            return this._buffer.clone().data;
        });
    }
}
exports.CMAC = CMAC;

},{"../internals/block":4,"../internals/xor":8}],10:[function(require,module,exports){
"use strict";
// Copyright (C) 2016-2017 Tony Arcieri, Dmitry Chestnykh
// MIT License. See LICENSE file for details.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = require("../internals/block");
const constant_time_1 = require("../internals/constant-time");
const ctz_1 = require("../internals/ctz");
const xor_1 = require("../internals/xor");
// Number of L blocks to precompute (i.e. µ in the PMAC paper)
// TODO: dynamically compute these as needed
const PRECOMPUTED_BLOCKS = 31;
/**
 * Polyfill for the AES-PMAC message authentication code
 *
 * Uses a non-constant-time (lookup table-based) AES polyfill.
 * See polyfill/aes.ts for more information on the security impact.
 */
class PMAC {
    constructor(cipher, l, lInv) {
        /**
         * finished is set true when we are done processing a message, and forbids
         * any subsequent writes until we reset the internal state
         */
        this._finished = false;
        this._cipher = cipher;
        this._L = l;
        this._LInv = lInv;
        this._buffer = new block_1.default();
        this._bufferPos = 0;
        this._counter = 0;
        this._offset = new block_1.default();
        this._tag = new block_1.default();
    }
    /** Create a new CMAC instance from the given key */
    static importKey(provider, keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            const cipher = yield provider.importBlockCipherKey(keyData);
            /**
             * L is defined as follows (quoted from the PMAC paper):
             *
             * Equation 1:
             *
             *     a · x =
             *         a<<1 if firstbit(a)=0
             *         (a<<1) ⊕ 0¹²⁰10000111 if firstbit(a)=1
             *
             * Equation 2:
             *
             *     a · x⁻¹ =
             *         a>>1 if lastbit(a)=0
             *         (a>>1) ⊕ 10¹²⁰1000011 if lastbit(a)=1
             *
             * Let L(0) ← L. For i ∈ [1..µ], compute L(i) ← L(i − 1) · x by
             * Equation (1) using a shift and a conditional xor.
             *
             * Compute L(−1) ← L · x⁻¹ by Equation (2), using a shift and a
             * conditional xor.
             *
             * Save the values L(−1), L(0), L(1), L(2), ..., L(µ) in a table.
             * (Alternatively, [ed: as we have done in this codebase] defer computing
             * some or  all of these L(i) values until the value is actually needed.)
             */
            const tmp = new block_1.default();
            yield cipher.encryptBlock(tmp);
            const l = new Array(PRECOMPUTED_BLOCKS);
            for (let i = 0; i < PRECOMPUTED_BLOCKS; i++) {
                l[i] = tmp.clone();
                tmp.dbl();
            }
            /**
             * Compute L(−1) ← L · x⁻¹:
             *
             *     a>>1 if lastbit(a)=0
             *     (a>>1) ⊕ 10¹²⁰1000011 if lastbit(a)=1
             */
            const lInv = l[0].clone();
            const lastBit = lInv.data[block_1.default.SIZE - 1] & 0x01;
            for (let i = block_1.default.SIZE - 1; i > 0; i--) {
                const carry = constant_time_1.select(lInv.data[i - 1] & 1, 0x80, 0);
                lInv.data[i] = (lInv.data[i] >>> 1) | carry;
            }
            lInv.data[0] >>>= 1;
            lInv.data[0] ^= constant_time_1.select(lastBit, 0x80, 0);
            lInv.data[block_1.default.SIZE - 1] ^= constant_time_1.select(lastBit, block_1.default.R >>> 1, 0);
            return new PMAC(cipher, l, lInv);
        });
    }
    reset() {
        this._buffer.clear();
        this._bufferPos = 0;
        this._counter = 0;
        this._offset.clear();
        this._tag.clear();
        this._finished = false;
        return this;
    }
    clear() {
        this.reset();
        this._cipher.clear();
    }
    update(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._finished) {
                throw new Error("pmac: already finished");
            }
            const left = block_1.default.SIZE - this._bufferPos;
            let dataPos = 0;
            let dataLength = data.length;
            // Finish filling the internal buf with the message
            if (dataLength > left) {
                this._buffer.data.set(data.slice(0, left), this._bufferPos);
                dataPos += left;
                dataLength -= left;
                yield this._processBuffer();
            }
            // So long as we have more than a blocks worth of data, compute
            // whole-sized blocks at a time.
            while (dataLength > block_1.default.SIZE) {
                this._buffer.data.set(data.slice(dataPos, dataPos + block_1.default.SIZE));
                dataPos += block_1.default.SIZE;
                dataLength -= block_1.default.SIZE;
                yield this._processBuffer();
            }
            if (dataLength > 0) {
                this._buffer.data.set(data.slice(dataPos, dataPos + dataLength), this._bufferPos);
                this._bufferPos += dataLength;
            }
            return this;
        });
    }
    finish() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._finished) {
                throw new Error("pmac: already finished");
            }
            if (this._bufferPos === block_1.default.SIZE) {
                xor_1.xor(this._tag.data, this._buffer.data);
                xor_1.xor(this._tag.data, this._LInv.data);
            }
            else {
                xor_1.xor(this._tag.data, this._buffer.data.slice(0, this._bufferPos));
                this._tag.data[this._bufferPos] ^= 0x80;
            }
            yield this._cipher.encryptBlock(this._tag);
            this._finished = true;
            return this._tag.clone().data;
        });
    }
    // Update the internal tag state based on the buffer contents
    _processBuffer() {
        return __awaiter(this, void 0, void 0, function* () {
            xor_1.xor(this._offset.data, this._L[ctz_1.ctz(this._counter + 1)].data);
            xor_1.xor(this._buffer.data, this._offset.data);
            this._counter++;
            yield this._cipher.encryptBlock(this._buffer);
            xor_1.xor(this._tag.data, this._buffer.data);
            this._bufferPos = 0;
        });
    }
}
exports.PMAC = PMAC;

},{"../internals/block":4,"../internals/constant-time":5,"../internals/ctz":6,"../internals/xor":8}],11:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const aes_1 = require("./polyfill/aes");
const aes_ctr_1 = require("./polyfill/aes_ctr");
/**
 * Pure JavaScript cryptography implementations
 *
 * WARNING: Not constant time! May leak keys or have other security issues.
 */
class PolyfillCryptoProvider {
    constructor() {
        // This class doesn't do anything, it just signals that polyfill impls should be used
    }
    importBlockCipherKey(keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            return new aes_1.default(keyData);
        });
    }
    importCTRKey(keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            return new aes_ctr_1.default(new aes_1.default(keyData));
        });
    }
}
exports.PolyfillCryptoProvider = PolyfillCryptoProvider;

},{"./polyfill/aes":12,"./polyfill/aes_ctr":13}],12:[function(require,module,exports){
"use strict";
// Copyright (C) 2016-2017 Dmitry Chestnykh, Tony Arcieri
// MIT License. See LICENSE file for details.
Object.defineProperty(exports, "__esModule", { value: true });
const wipe_1 = require("../../internals/wipe");
// Powers of x mod poly in GF(2).
const POWX = new Uint8Array([
    0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80,
    0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f,
]);
// FIPS-197 Figure 7. S-box substitution values in hexadecimal format.
const SBOX0 = new Uint8Array([
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]);
// FIPS-197 Figure 14.  Inverse S-box substitution values in hexadecimal format.
const SBOX1 = new Uint8Array([
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
    0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
    0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
    0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
    0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
    0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
    0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
    0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
    0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
    0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
    0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d,
]);
// Encryption and decryption tables.
// Will be computed by initialize() when the first AES instance is created.
let isInitialized = false;
let Te0;
let Te1;
let Te2;
let Te3;
let Td0;
let Td1;
let Td2;
let Td3;
/**
 * Polyfill for the AES block cipher.
 *
 * This implementation uses lookup tables, so it's susceptible to cache-timing
 * side-channel attacks. A constant-time version we tried was super slow (a few
 * kilobytes per second), so we'll have to live with it.
 *
 * Key size: 16 or 32 bytes, block size: 16 bytes.
 */
class PolyfillAes {
    /**
     * Constructs AES with the given 16 or 32-byte key
     * for AES-128 or AES-256.
     */
    constructor(keyData) {
        if (!isInitialized) {
            initialize();
        }
        // Only AES-128 and AES-256 supported. AES-192 is not.
        if (keyData.length !== 16 && keyData.length !== 32) {
            throw new Error(`Miscreant: invalid key length: ${keyData.length} (expected 16 or 32 bytes)`);
        }
        this._encKey = expandKey(keyData);
        this._emptyPromise = Promise.resolve(this);
    }
    /**
     * Cleans expanded keys from memory, setting them to zeros.
     */
    clear() {
        if (this._encKey) {
            wipe_1.wipe(this._encKey);
        }
        return this;
    }
    /**
     * Encrypt 16-byte block in-place, replacing its contents with ciphertext.
     *
     * This function should not be used to encrypt data without any
     * cipher mode! It should only be used to implement a cipher mode.
     * This library uses it to implement AES-SIV.
     */
    encryptBlock(block) {
        const src = block.data;
        const dst = block.data;
        let s0 = readUint32BE(src, 0);
        let s1 = readUint32BE(src, 4);
        let s2 = readUint32BE(src, 8);
        let s3 = readUint32BE(src, 12);
        // First round just XORs input with key.
        s0 ^= this._encKey[0];
        s1 ^= this._encKey[1];
        s2 ^= this._encKey[2];
        s3 ^= this._encKey[3];
        let t0 = 0;
        let t1 = 0;
        let t2 = 0;
        let t3 = 0;
        // Middle rounds shuffle using tables.
        // Number of rounds is set by length of expanded key.
        const nr = this._encKey.length / 4 - 2; // - 2: one above, one more below
        let k = 4;
        for (let r = 0; r < nr; r++) {
            t0 = this._encKey[k + 0] ^ Te0[(s0 >>> 24) & 0xff] ^ Te1[(s1 >>> 16) & 0xff] ^
                Te2[(s2 >>> 8) & 0xff] ^ Te3[s3 & 0xff];
            t1 = this._encKey[k + 1] ^ Te0[(s1 >>> 24) & 0xff] ^ Te1[(s2 >>> 16) & 0xff] ^
                Te2[(s3 >>> 8) & 0xff] ^ Te3[s0 & 0xff];
            t2 = this._encKey[k + 2] ^ Te0[(s2 >>> 24) & 0xff] ^ Te1[(s3 >>> 16) & 0xff] ^
                Te2[(s0 >>> 8) & 0xff] ^ Te3[s1 & 0xff];
            t3 = this._encKey[k + 3] ^ Te0[(s3 >>> 24) & 0xff] ^ Te1[(s0 >>> 16) & 0xff] ^
                Te2[(s1 >>> 8) & 0xff] ^ Te3[s2 & 0xff];
            k += 4;
            s0 = t0;
            s1 = t1;
            s2 = t2;
            s3 = t3;
        }
        // Last round uses s-box directly and XORs to produce output.
        s0 = (SBOX0[t0 >>> 24] << 24) | (SBOX0[(t1 >>> 16) & 0xff]) << 16 |
            (SBOX0[(t2 >>> 8) & 0xff]) << 8 | (SBOX0[t3 & 0xff]);
        s1 = (SBOX0[t1 >>> 24] << 24) | (SBOX0[(t2 >>> 16) & 0xff]) << 16 |
            (SBOX0[(t3 >>> 8) & 0xff]) << 8 | (SBOX0[t0 & 0xff]);
        s2 = (SBOX0[t2 >>> 24] << 24) | (SBOX0[(t3 >>> 16) & 0xff]) << 16 |
            (SBOX0[(t0 >>> 8) & 0xff]) << 8 | (SBOX0[t1 & 0xff]);
        s3 = (SBOX0[t3 >>> 24] << 24) | (SBOX0[(t0 >>> 16) & 0xff]) << 16 |
            (SBOX0[(t1 >>> 8) & 0xff]) << 8 | (SBOX0[t2 & 0xff]);
        s0 ^= this._encKey[k + 0];
        s1 ^= this._encKey[k + 1];
        s2 ^= this._encKey[k + 2];
        s3 ^= this._encKey[k + 3];
        writeUint32BE(s0, dst, 0);
        writeUint32BE(s1, dst, 4);
        writeUint32BE(s2, dst, 8);
        writeUint32BE(s3, dst, 12);
        return this._emptyPromise;
    }
}
exports.default = PolyfillAes;
// Initialize generates encryption and decryption tables.
function initialize() {
    const poly = (1 << 8) | (1 << 4) | (1 << 3) | (1 << 1) | (1 << 0);
    function mul(b, c) {
        let i = b;
        let j = c;
        let s = 0;
        for (let k = 1; k < 0x100 && j !== 0; k <<= 1) {
            // Invariant: k == 1<<n, i == b * x^n
            if ((j & k) !== 0) {
                // s += i in GF(2); xor in binary
                s ^= i;
                j ^= k; // turn off bit to end loop early
            }
            // i *= x in GF(2) modulo the polynomial
            i <<= 1;
            if ((i & 0x100) !== 0) {
                i ^= poly;
            }
        }
        return s;
    }
    const rot = (x) => (x << 24) | (x >>> 8);
    // Generate encryption tables.
    Te0 = new Uint32Array(256);
    Te1 = new Uint32Array(256);
    Te2 = new Uint32Array(256);
    Te3 = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        const s = SBOX0[i];
        let w = (mul(s, 2) << 24) | (s << 16) | (s << 8) | mul(s, 3);
        Te0[i] = w;
        w = rot(w);
        Te1[i] = w;
        w = rot(w);
        Te2[i] = w;
        w = rot(w);
        Te3[i] = w;
        w = rot(w);
    }
    // Generate decryption tables.
    Td0 = new Uint32Array(256);
    Td1 = new Uint32Array(256);
    Td2 = new Uint32Array(256);
    Td3 = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        const s = SBOX1[i];
        let w = (mul(s, 0xe) << 24) | (mul(s, 0x9) << 16) |
            (mul(s, 0xd) << 8) | mul(s, 0xb);
        Td0[i] = w;
        w = rot(w);
        Td1[i] = w;
        w = rot(w);
        Td2[i] = w;
        w = rot(w);
        Td3[i] = w;
        w = rot(w);
    }
    isInitialized = true;
}
// Reads 4 bytes from array starting at offset as big-endian
// unsigned 32-bit integer and returns it.
function readUint32BE(array, offset = 0) {
    return ((array[offset] << 24) |
        (array[offset + 1] << 16) |
        (array[offset + 2] << 8) |
        array[offset + 3]) >>> 0;
}
// Writes 4-byte big-endian representation of 32-bit unsigned
// value to byte array starting at offset.
//
// If byte array is not given, creates a new 4-byte one.
//
// Returns the output byte array.
function writeUint32BE(value, out = new Uint8Array(4), offset = 0) {
    out[offset + 0] = value >>> 24;
    out[offset + 1] = value >>> 16;
    out[offset + 2] = value >>> 8;
    out[offset + 3] = value >>> 0;
    return out;
}
// Apply sbox0 to each byte in w.
function subw(w) {
    return ((SBOX0[(w >>> 24) & 0xff]) << 24) |
        ((SBOX0[(w >>> 16) & 0xff]) << 16) |
        ((SBOX0[(w >>> 8) & 0xff]) << 8) |
        (SBOX0[w & 0xff]);
}
// Rotate
function rotw(w) {
    return (w << 8) | (w >>> 24);
}
function expandKey(key) {
    const encKey = new Uint32Array(key.length + 28);
    const nk = key.length / 4 | 0;
    const n = encKey.length;
    for (let i = 0; i < nk; i++) {
        encKey[i] = readUint32BE(key, i * 4);
    }
    for (let i = nk; i < n; i++) {
        let t = encKey[i - 1];
        if (i % nk === 0) {
            t = subw(rotw(t)) ^ (POWX[i / nk - 1] << 24);
        }
        else if (nk > 6 && i % nk === 4) {
            t = subw(t);
        }
        encKey[i] = encKey[i - nk] ^ t;
    }
    return encKey;
}

},{"../../internals/wipe":7}],13:[function(require,module,exports){
"use strict";
// Copyright (C) 2016 Dmitry Chestnykh
// MIT License. See LICENSE file for details.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = require("../../internals/block");
/**
 * Polyfill for the AES-CTR (counter) mode of operation.
 *
 * Uses a non-constant-time (lookup table-based) AES polyfill.
 * See polyfill/aes.ts for more information on the security impact.
 *
 * Note that CTR mode is malleable and generally should not be used without
 * authentication. Instead, use an authenticated encryption mode, like AES-SIV!
 */
class PolyfillAesCtr {
    constructor(cipher) {
        // Set cipher.
        this._cipher = cipher;
        // Allocate space for counter.
        this._counter = new block_1.default();
        // Allocate buffer for encrypted block.
        this._buffer = new block_1.default();
    }
    clear() {
        this._buffer.clear();
        this._counter.clear();
        this._cipher.clear();
        return this;
    }
    encryptCtr(iv, plaintext) {
        return __awaiter(this, void 0, void 0, function* () {
            if (iv.length !== block_1.default.SIZE) {
                throw new Error("CTR: iv length must be equal to cipher block size");
            }
            // Copy IV to counter, overwriting it.
            this._counter.data.set(iv);
            // Set buffer position to length of buffer
            // so that the first cipher block is generated.
            let bufferPos = block_1.default.SIZE;
            const result = new Uint8Array(plaintext.length);
            for (let i = 0; i < plaintext.length; i++) {
                if (bufferPos === block_1.default.SIZE) {
                    this._buffer.copy(this._counter);
                    this._cipher.encryptBlock(this._buffer);
                    bufferPos = 0;
                    incrementCounter(this._counter);
                }
                result[i] = plaintext[i] ^ this._buffer.data[bufferPos++];
            }
            return result;
        });
    }
}
exports.default = PolyfillAesCtr;
// Increment an AES-CTR mode counter, intentionally wrapping/overflowing
function incrementCounter(counter) {
    let carry = 1;
    for (let i = block_1.default.SIZE - 1; i >= 0; i--) {
        carry += (counter.data[i] & 0xff) | 0;
        counter.data[i] = carry & 0xff;
        carry >>>= 8;
    }
}

},{"../../internals/block":4}],14:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const exceptions_1 = require("../exceptions");
const aes_1 = require("./webcrypto/aes");
const aes_ctr_1 = require("./webcrypto/aes_ctr");
/** Placeholder backend for using pure JavaScript crypto implementations */
class WebCryptoProvider {
    constructor(crypto = window.crypto) {
        this.crypto = crypto;
    }
    importBlockCipherKey(keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            return aes_1.default.importKey(this.crypto, keyData);
        });
    }
    importCTRKey(keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield aes_ctr_1.default.importKey(this.crypto, keyData);
            }
            catch (e) {
                if (e.message.includes("unsupported")) {
                    throw new exceptions_1.NotImplementedError("WebCryptoProvider: AES-CTR unsupported. Use PolyfillCryptoProvider.");
                }
                else {
                    throw e;
                }
            }
        });
    }
}
exports.WebCryptoProvider = WebCryptoProvider;

},{"../exceptions":2,"./webcrypto/aes":15,"./webcrypto/aes_ctr":16}],15:[function(require,module,exports){
"use strict";
// Copyright (C) 2017 Tony Arcieri
// MIT License. See LICENSE file for details.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = require("../../internals/block");
/**
 * WebCrypto-based implementation of the AES block cipher.
 *
 * This implementation (ab)uses AES-CBC mode to implement AES-ECB. This is
 * likely to be rather slow, as it requires an async call per block, and
 * discards half the buffer.
 *
 * In theory it should be constant time due to the use of WebCrypto (provided
 * the browser's implementation is constant time), but it could probably benefit
 * from some clever optimization work, or improvements to the WebCrypto API.
 *
 * Some WebCrypto implementations (e.g. node-webcrypto-ossl) support ECB mode
 * natively, so we could take advantage of that to potentially encrypt multiple
 * blocks in a single invocation.
 *
 * Key size: 16 or 32 bytes, block size: 16 bytes.
 */
class WebCryptoAes {
    constructor(_crypto, _key) {
        this._crypto = _crypto;
        this._key = _key;
        // An initialization vector of all zeros, exposing the raw AES function
        this._iv = new block_1.default();
        this._emptyPromise = Promise.resolve(this);
    }
    /**
     * Create a new WebCryptoAes instance
     *
     * @param {Crypto} crypto - the Web Cryptography provider
     * @param {Uint8Array} keyData - the AES secret key
     * @returns {Promise<WebCryptoAes}
     */
    static importKey(crypto, keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Only AES-128 and AES-256 supported. AES-192 is not.
            if (keyData.length !== 16 && keyData.length !== 32) {
                throw new Error(`Miscreant: invalid key length: ${keyData.length} (expected 16 or 32 bytes)`);
            }
            const key = yield crypto.subtle.importKey("raw", keyData, "AES-CBC", false, ["encrypt"]);
            return new WebCryptoAes(crypto, key);
        });
    }
    /**
     * Cleans expanded keys from memory, setting them to zeros.
     */
    clear() {
        // TODO: perhaps we should clear something, but what, and how?
        return this;
    }
    /**
     * Encrypt a single AES block. While ordinarily this might let us see penguins, we're using it safely
     *
     * @param {Block} block - block to be encrypted in-place
     * @returns {Promise<this>}
     */
    encryptBlock(block) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = { name: "AES-CBC", iv: this._iv.data };
            const ctBlock = yield this._crypto.subtle.encrypt(params, this._key, block.data);
            // TODO: a more efficient way to do in-place encryption?
            block.data.set(new Uint8Array(ctBlock, 0, block_1.default.SIZE));
            return this._emptyPromise;
        });
    }
}
exports.default = WebCryptoAes;

},{"../../internals/block":4}],16:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * AES-CTR using a WebCrypto (or similar) API
 */
class WebCryptoAesCtr {
    constructor(key, crypto) {
        this.key = key;
        this.crypto = crypto;
    }
    static importKey(crypto, keyData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Only AES-128 and AES-256 supported. AES-192 is not.
            if (keyData.length !== 16 && keyData.length !== 32) {
                throw new Error(`Miscreant: invalid key length: ${keyData.length} (expected 16 or 32 bytes)`);
            }
            const key = yield crypto.subtle.importKey("raw", keyData, "AES-CTR", false, ["encrypt"]);
            return new WebCryptoAesCtr(key, crypto);
        });
    }
    encryptCtr(iv, plaintext) {
        return __awaiter(this, void 0, void 0, function* () {
            const ciphertext = yield this.crypto.subtle.encrypt({ name: "AES-CTR", counter: iv, length: 16 }, this.key, plaintext);
            return new Uint8Array(ciphertext);
        });
    }
    clear() {
        // TODO: actually clear something. Do we need to?
        return this;
    }
}
exports.default = WebCryptoAesCtr;

},{}],17:[function(require,module,exports){
"use strict";
// Copyright (C) 2017-2018 Dmitry Chestnykh, Tony Arcieri
// MIT License. See LICENSE file for details.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const constant_time_1 = require("./internals/constant-time");
const wipe_1 = require("./internals/wipe");
const xor_1 = require("./internals/xor");
const exceptions_1 = require("./exceptions");
const block_1 = require("./internals/block");
const cmac_1 = require("./mac/cmac");
const pmac_1 = require("./mac/pmac");
const webcrypto_1 = require("./providers/webcrypto");
/** Maximum number of associated data items */
exports.MAX_ASSOCIATED_DATA = 126;
/** The AES-SIV mode of authenticated encryption */
class SIV {
    /** Create a new AES-SIV instance with the given 32-byte or 64-byte key */
    static importKey(keyData, alg, provider = new webcrypto_1.WebCryptoProvider()) {
        return __awaiter(this, void 0, void 0, function* () {
            // We only support AES-128 and AES-256. AES-SIV needs a key 2X as long the intended security level
            if (keyData.length !== 32 && keyData.length !== 64) {
                throw new Error(`AES-SIV: key must be 32 or 64-bytes (got ${keyData.length}`);
            }
            const macKey = keyData.subarray(0, keyData.length / 2 | 0);
            const encKey = keyData.subarray(keyData.length / 2 | 0);
            let mac;
            switch (alg) {
                case "AES-SIV":
                    mac = yield cmac_1.CMAC.importKey(provider, macKey);
                    break;
                case "AES-CMAC-SIV":
                    mac = yield cmac_1.CMAC.importKey(provider, macKey);
                    break;
                case "AES-PMAC-SIV":
                    mac = yield pmac_1.PMAC.importKey(provider, macKey);
                    break;
                default:
                    throw new exceptions_1.NotImplementedError(`Miscreant: algorithm not supported: ${alg}`);
            }
            const ctr = yield provider.importCTRKey(encKey);
            return new SIV(mac, ctr);
        });
    }
    constructor(mac, ctr) {
        this._mac = mac;
        this._ctr = ctr;
        this._tmp1 = new block_1.default();
        this._tmp2 = new block_1.default();
    }
    /** Encrypt and authenticate data using AES-SIV */
    seal(plaintext, associatedData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (associatedData.length > exports.MAX_ASSOCIATED_DATA) {
                throw new Error("AES-SIV: too many associated data items");
            }
            // Allocate space for sealed ciphertext.
            const resultLength = block_1.default.SIZE + plaintext.length;
            const result = new Uint8Array(resultLength);
            // Authenticate.
            const iv = yield this._s2v(associatedData, plaintext);
            result.set(iv);
            // Encrypt.
            zeroIVBits(iv);
            result.set(yield this._ctr.encryptCtr(iv, plaintext), iv.length);
            return result;
        });
    }
    /** Decrypt and authenticate data using AES-SIV */
    open(sealed, associatedData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (associatedData.length > exports.MAX_ASSOCIATED_DATA) {
                throw new Error("AES-SIV: too many associated data items");
            }
            if (sealed.length < block_1.default.SIZE) {
                throw new exceptions_1.IntegrityError("AES-SIV: ciphertext is truncated");
            }
            // Decrypt.
            const tag = sealed.subarray(0, block_1.default.SIZE);
            const iv = this._tmp1.data;
            iv.set(tag);
            zeroIVBits(iv);
            // NOTE: "encryptCtr" is intentional. CTR encryption/decryption are the same
            const result = yield this._ctr.encryptCtr(iv, sealed.subarray(block_1.default.SIZE));
            // Authenticate.
            const expectedTag = yield this._s2v(associatedData, result);
            if (!constant_time_1.equal(expectedTag, tag)) {
                wipe_1.wipe(result);
                throw new exceptions_1.IntegrityError("AES-SIV: ciphertext verification failure!");
            }
            return result;
        });
    }
    /** Make a best effort to wipe memory used by this instance */
    clear() {
        this._tmp1.clear();
        this._tmp2.clear();
        this._ctr.clear();
        this._mac.clear();
        return this;
    }
    /**
     * The S2V operation consists of the doubling and XORing of the outputs
     * of the pseudo-random function CMAC (or PMAC in the case of AES-PMAC-SIV).
     *
     * See Section 2.4 of RFC 5297 for more information
     */
    _s2v(associated_data, plaintext) {
        return __awaiter(this, void 0, void 0, function* () {
            this._mac.reset();
            this._tmp1.clear();
            // Note: the standalone S2V returns CMAC(1) if the number of passed
            // vectors is zero, however in SIV construction this case is never
            // triggered, since we always pass plaintext as the last vector (even
            // if it's zero-length), so we omit this case.
            yield this._mac.update(this._tmp1.data);
            this._tmp2.clear();
            this._tmp2.data.set(yield this._mac.finish());
            this._mac.reset();
            for (const ad of associated_data) {
                yield this._mac.update(ad);
                this._tmp1.clear();
                this._tmp1.data.set(yield this._mac.finish());
                this._mac.reset();
                this._tmp2.dbl();
                xor_1.xor(this._tmp2.data, this._tmp1.data);
            }
            this._tmp1.clear();
            if (plaintext.length >= block_1.default.SIZE) {
                const n = plaintext.length - block_1.default.SIZE;
                this._tmp1.data.set(plaintext.subarray(n));
                yield this._mac.update(plaintext.subarray(0, n));
            }
            else {
                this._tmp1.data.set(plaintext);
                this._tmp1.data[plaintext.length] = 0x80;
                this._tmp2.dbl();
            }
            xor_1.xor(this._tmp1.data, this._tmp2.data);
            yield this._mac.update(this._tmp1.data);
            return this._mac.finish();
        });
    }
}
exports.SIV = SIV;
/** Zero out the top bits in the last 32-bit words of the IV */
function zeroIVBits(iv) {
    // "We zero-out the top bit in each of the last two 32-bit words
    // of the IV before assigning it to Ctr"
    //  — http://web.cs.ucdavis.edu/~rogaway/papers/siv.pdf
    iv[iv.length - 8] &= 0x7f;
    iv[iv.length - 4] &= 0x7f;
}

},{"./exceptions":2,"./internals/block":4,"./internals/constant-time":5,"./internals/wipe":7,"./internals/xor":8,"./mac/cmac":9,"./mac/pmac":10,"./providers/webcrypto":14}],18:[function(require,module,exports){
"use strict";
/**
 * The STREAM online authenticated encryption construction.
 * See <https://eprint.iacr.org/2015/189.pdf> for definition.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const aead_1 = require("./aead");
const webcrypto_1 = require("./providers/webcrypto");
/** Size of a nonce required by STREAM in bytes */
exports.NONCE_SIZE = 8;
/** Byte flag indicating this is the last block in the STREAM (otherwise 0) */
exports.LAST_BLOCK_FLAG = 1;
/** Maximum value of the counter STREAM uses internally to identify messages */
exports.COUNTER_MAX = 0xFFFFFFFF;
/**
 * A STREAM encryptor with a 32-bit counter, generalized for any AEAD algorithm
 *
 * This corresponds to the ℰ stream encryptor object as defined in the paper
 * Online Authenticated-Encryption and its Nonce-Reuse Misuse-Resistance
 */
class StreamEncryptor {
    /** Create a new StreamEncryptor instance with the given key */
    static importKey(keyData, nonce, alg, provider = new webcrypto_1.WebCryptoProvider()) {
        return __awaiter(this, void 0, void 0, function* () {
            return new StreamEncryptor(yield aead_1.AEAD.importKey(keyData, alg, provider), nonce);
        });
    }
    constructor(aead, nonce) {
        this._aead = aead;
        this._nonce_encoder = new NonceEncoder(nonce);
    }
    /** Encrypt and authenticate data using the selected AEAD algorithm */
    seal(plaintext, lastBlock = false, associatedData = new Uint8Array(0)) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._aead.seal(plaintext, this._nonce_encoder.next(lastBlock), associatedData);
        });
    }
    /** Make a best effort to wipe memory used by this instance */
    clear() {
        this._aead.clear();
        return this;
    }
}
exports.StreamEncryptor = StreamEncryptor;
/**
 * A STREAM decryptor with a 32-bit counter, generalized for any AEAD algorithm
 *
 * This corresponds to the 𝒟 stream decryptor object as defined in the paper
 * Online Authenticated-Encryption and its Nonce-Reuse Misuse-Resistance
 */
class StreamDecryptor {
    /** Create a new StreamDecryptor instance with the given key */
    static importKey(keyData, nonce, alg, provider = new webcrypto_1.WebCryptoProvider()) {
        return __awaiter(this, void 0, void 0, function* () {
            return new StreamDecryptor(yield aead_1.AEAD.importKey(keyData, alg, provider), nonce);
        });
    }
    constructor(aead, nonce) {
        this._aead = aead;
        this._nonce_encoder = new NonceEncoder(nonce);
    }
    /** Decrypt and authenticate data using the selected AEAD algorithm */
    open(ciphertext, lastBlock = false, associatedData = new Uint8Array(0)) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._aead.open(ciphertext, this._nonce_encoder.next(lastBlock), associatedData);
        });
    }
    /** Make a best effort to wipe memory used by this instance */
    clear() {
        this._aead.clear();
        return this;
    }
}
exports.StreamDecryptor = StreamDecryptor;
/** Computes STREAM nonces based on the current position in the STREAM. */
class NonceEncoder {
    constructor(noncePrefix) {
        if (noncePrefix.length !== exports.NONCE_SIZE) {
            throw new Error(`STREAM: nonce must be 8-bits (got ${noncePrefix.length}`);
        }
        this.buffer = new ArrayBuffer(exports.NONCE_SIZE + 4 + 1);
        this.view = new DataView(this.buffer);
        this.array = new Uint8Array(this.buffer);
        this.array.set(noncePrefix);
        this.counter = 0;
        this.finished = false;
    }
    /** Compute the next nonce value, incrementing the internal counter */
    next(lastBlock) {
        if (this.finished) {
            throw new Error("STREAM: already finished");
        }
        this.view.setInt32(8, this.counter, false);
        if (lastBlock) {
            this.view.setInt8(12, exports.LAST_BLOCK_FLAG);
            this.finished = true;
        }
        else {
            this.counter += 1;
            if (this.counter > exports.COUNTER_MAX) {
                throw new Error("STREAM counter overflowed");
            }
        }
        return this.array;
    }
}

},{"./aead":1,"./providers/webcrypto":14}]},{},[3])(3)
});
