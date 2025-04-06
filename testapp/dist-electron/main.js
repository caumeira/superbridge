'use strict';

const electron$1 = require('electron');
const path$1 = require('path');

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
const NO_VALUE$1 = Symbol("NO_VALUE");
let Signal$1 = class Signal {
  constructor() {
    __publicField$1(this, "listeners", /* @__PURE__ */ new Map());
    __publicField$1(this, "lastValue", NO_VALUE$1);
  }
  assertLastValue(error) {
    if (this.lastValue === NO_VALUE$1) {
      throw typeof error === "string" ? new Error(error) : error;
    }
    return this.lastValue;
  }
  get hasLastValue() {
    return this.lastValue !== NO_VALUE$1;
  }
  get maybeLastValue() {
    return this.lastValue === NO_VALUE$1 ? void 0 : this.lastValue;
  }
  emit(value) {
    this.lastValue = value;
    const listeners = [...this.listeners.values()];
    for (const listener of listeners) {
      try {
        listener(value);
      } catch (error) {
        console.error(error);
      }
    }
  }
  subscribe(listener) {
    const id = Symbol();
    this.listeners.set(id, listener);
    return () => {
      this.listeners.delete(id);
    };
  }
  subscribeWithCurrentValue(listener) {
    if (this.lastValue !== NO_VALUE$1) {
      listener(this.lastValue);
    }
    return this.subscribe(listener);
  }
  effect(initializer) {
    let currentCleanup;
    const cancelSubscription = this.subscribeWithCurrentValue((value) => {
      if (currentCleanup) {
        currentCleanup();
      }
      currentCleanup = initializer(value);
    });
    return () => {
      cancelSubscription();
      if (currentCleanup) {
        currentCleanup();
      }
    };
  }
};
const currentSuperbridgeChannel$1 = new Signal$1();
function initializeSuperbridge(superbridge) {
  currentSuperbridgeChannel$1.emit(superbridge);
}
const bridge$1 = {
  send(message, payload, webId) {
    const link = currentSuperbridgeChannel$1.assertLastValue(
      "Superbridge is not initialized"
    );
    return link.send(message, payload, webId);
  },
  handle(message, handler) {
    if (!currentSuperbridgeChannel$1.hasLastValue) {
      Promise.resolve().then(() => {
        if (!currentSuperbridgeChannel$1.hasLastValue) {
          console.warn("Superbridge is not initialized");
        }
      });
    }
    return currentSuperbridgeChannel$1.effect((currentBridge) => {
      return currentBridge.handle(message, handler);
    });
  }
};
class BridgeMessageType {
  constructor(type) {
    __publicField$1(this, "input");
    __publicField$1(this, "output");
    this.type = type;
  }
}
function defineBridgeMessage(name) {
  return new BridgeMessageType(name);
}

const $getBody = defineBridgeMessage("$getBodyId");

const NO_VALUE = Symbol("NO_VALUE");
class Signal {
  listeners = /* @__PURE__ */ new Map();
  lastValue = NO_VALUE;
  assertLastValue(error) {
    if (this.lastValue === NO_VALUE) {
      throw typeof error === "string" ? new Error(error) : error;
    }
    return this.lastValue;
  }
  get hasLastValue() {
    return this.lastValue !== NO_VALUE;
  }
  get maybeLastValue() {
    return this.lastValue === NO_VALUE ? void 0 : this.lastValue;
  }
  emit(value) {
    this.lastValue = value;
    const listeners = [...this.listeners.values()];
    for (const listener of listeners) {
      try {
        listener(value);
      } catch (error) {
        console.error(error);
      }
    }
  }
  subscribe(listener) {
    const id = Symbol();
    this.listeners.set(id, listener);
    return () => {
      this.listeners.delete(id);
    };
  }
  subscribeWithCurrentValue(listener) {
    if (this.lastValue !== NO_VALUE) {
      listener(this.lastValue);
    }
    return this.subscribe(listener);
  }
  effect(initializer) {
    let currentCleanup;
    const cancelSubscription = this.subscribeWithCurrentValue((value) => {
      if (currentCleanup) {
        currentCleanup();
      }
      currentCleanup = initializer(value);
    });
    return () => {
      cancelSubscription();
      if (currentCleanup) {
        currentCleanup();
      }
    };
  }
}

const currentSuperbridgeChannel = new Signal();
const bridge = {
  send(message, payload, webId) {
    const link = currentSuperbridgeChannel.assertLastValue(
      "Superbridge is not initialized"
    );
    return link.send(message, payload, webId);
  },
  handle(message, handler) {
    if (!currentSuperbridgeChannel.hasLastValue) {
      Promise.resolve().then(() => {
        if (!currentSuperbridgeChannel.hasLastValue) {
          console.warn("Superbridge is not initialized");
        }
      });
    }
    return currentSuperbridgeChannel.effect((currentBridge) => {
      return currentBridge.handle(message, handler);
    });
  }
};

class DoubleIndexedKV {
    constructor() {
        this.keyToValue = new Map();
        this.valueToKey = new Map();
    }
    set(key, value) {
        this.keyToValue.set(key, value);
        this.valueToKey.set(value, key);
    }
    getByKey(key) {
        return this.keyToValue.get(key);
    }
    getByValue(value) {
        return this.valueToKey.get(value);
    }
    clear() {
        this.keyToValue.clear();
        this.valueToKey.clear();
    }
}

class Registry {
    constructor(generateIdentifier) {
        this.generateIdentifier = generateIdentifier;
        this.kv = new DoubleIndexedKV();
    }
    register(value, identifier) {
        if (this.kv.getByValue(value)) {
            return;
        }
        if (!identifier) {
            identifier = this.generateIdentifier(value);
        }
        this.kv.set(identifier, value);
    }
    clear() {
        this.kv.clear();
    }
    getIdentifier(value) {
        return this.kv.getByValue(value);
    }
    getValue(identifier) {
        return this.kv.getByKey(identifier);
    }
}

class ClassRegistry extends Registry {
    constructor() {
        super(c => c.name);
        this.classToAllowedProps = new Map();
    }
    register(value, options) {
        if (typeof options === 'object') {
            if (options.allowProps) {
                this.classToAllowedProps.set(value, options.allowProps);
            }
            super.register(value, options.identifier);
        }
        else {
            super.register(value, options);
        }
    }
    getAllowedProps(value) {
        return this.classToAllowedProps.get(value);
    }
}

function valuesOfObj(record) {
    if ('values' in Object) {
        // eslint-disable-next-line es5/no-es6-methods
        return Object.values(record);
    }
    const values = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const key in record) {
        if (record.hasOwnProperty(key)) {
            values.push(record[key]);
        }
    }
    return values;
}
function find(record, predicate) {
    const values = valuesOfObj(record);
    if ('find' in values) {
        // eslint-disable-next-line es5/no-es6-methods
        return values.find(predicate);
    }
    const valuesNotNever = values;
    for (let i = 0; i < valuesNotNever.length; i++) {
        const value = valuesNotNever[i];
        if (predicate(value)) {
            return value;
        }
    }
    return undefined;
}
function forEach(record, run) {
    Object.entries(record).forEach(([key, value]) => run(value, key));
}
function includes(arr, value) {
    return arr.indexOf(value) !== -1;
}
function findArr(record, predicate) {
    for (let i = 0; i < record.length; i++) {
        const value = record[i];
        if (predicate(value)) {
            return value;
        }
    }
    return undefined;
}

class CustomTransformerRegistry {
    constructor() {
        this.transfomers = {};
    }
    register(transformer) {
        this.transfomers[transformer.name] = transformer;
    }
    findApplicable(v) {
        return find(this.transfomers, transformer => transformer.isApplicable(v));
    }
    findByName(name) {
        return this.transfomers[name];
    }
}

const getType$1 = (payload) => Object.prototype.toString.call(payload).slice(8, -1);
const isUndefined = (payload) => typeof payload === 'undefined';
const isNull = (payload) => payload === null;
const isPlainObject$1 = (payload) => {
    if (typeof payload !== 'object' || payload === null)
        return false;
    if (payload === Object.prototype)
        return false;
    if (Object.getPrototypeOf(payload) === null)
        return true;
    return Object.getPrototypeOf(payload) === Object.prototype;
};
const isEmptyObject = (payload) => isPlainObject$1(payload) && Object.keys(payload).length === 0;
const isArray$1 = (payload) => Array.isArray(payload);
const isString = (payload) => typeof payload === 'string';
const isNumber = (payload) => typeof payload === 'number' && !isNaN(payload);
const isBoolean = (payload) => typeof payload === 'boolean';
const isRegExp = (payload) => payload instanceof RegExp;
const isMap = (payload) => payload instanceof Map;
const isSet = (payload) => payload instanceof Set;
const isSymbol = (payload) => getType$1(payload) === 'Symbol';
const isDate = (payload) => payload instanceof Date && !isNaN(payload.valueOf());
const isError = (payload) => payload instanceof Error;
const isNaNValue = (payload) => typeof payload === 'number' && isNaN(payload);
const isPrimitive = (payload) => isBoolean(payload) ||
    isNull(payload) ||
    isUndefined(payload) ||
    isNumber(payload) ||
    isString(payload) ||
    isSymbol(payload);
const isBigint = (payload) => typeof payload === 'bigint';
const isInfinite = (payload) => payload === Infinity || payload === -Infinity;
const isTypedArray = (payload) => ArrayBuffer.isView(payload) && !(payload instanceof DataView);
const isURL = (payload) => payload instanceof URL;

const escapeKey = (key) => key.replace(/\./g, '\\.');
const stringifyPath = (path) => path
    .map(String)
    .map(escapeKey)
    .join('.');
const parsePath = (string) => {
    const result = [];
    let segment = '';
    for (let i = 0; i < string.length; i++) {
        let char = string.charAt(i);
        const isEscapedDot = char === '\\' && string.charAt(i + 1) === '.';
        if (isEscapedDot) {
            segment += '.';
            i++;
            continue;
        }
        const isEndOfSegment = char === '.';
        if (isEndOfSegment) {
            result.push(segment);
            segment = '';
            continue;
        }
        segment += char;
    }
    const lastSegment = segment;
    result.push(lastSegment);
    return result;
};

function simpleTransformation(isApplicable, annotation, transform, untransform) {
    return {
        isApplicable,
        annotation,
        transform,
        untransform,
    };
}
const simpleRules = [
    simpleTransformation(isUndefined, 'undefined', () => null, () => undefined),
    simpleTransformation(isBigint, 'bigint', v => v.toString(), v => {
        if (typeof BigInt !== 'undefined') {
            return BigInt(v);
        }
        console.error('Please add a BigInt polyfill.');
        return v;
    }),
    simpleTransformation(isDate, 'Date', v => v.toISOString(), v => new Date(v)),
    simpleTransformation(isError, 'Error', (v, superJson) => {
        const baseError = {
            name: v.name,
            message: v.message,
        };
        superJson.allowedErrorProps.forEach(prop => {
            baseError[prop] = v[prop];
        });
        return baseError;
    }, (v, superJson) => {
        const e = new Error(v.message);
        e.name = v.name;
        e.stack = v.stack;
        superJson.allowedErrorProps.forEach(prop => {
            e[prop] = v[prop];
        });
        return e;
    }),
    simpleTransformation(isRegExp, 'regexp', v => '' + v, regex => {
        const body = regex.slice(1, regex.lastIndexOf('/'));
        const flags = regex.slice(regex.lastIndexOf('/') + 1);
        return new RegExp(body, flags);
    }),
    simpleTransformation(isSet, 'set', 
    // (sets only exist in es6+)
    // eslint-disable-next-line es5/no-es6-methods
    v => [...v.values()], v => new Set(v)),
    simpleTransformation(isMap, 'map', v => [...v.entries()], v => new Map(v)),
    simpleTransformation((v) => isNaNValue(v) || isInfinite(v), 'number', v => {
        if (isNaNValue(v)) {
            return 'NaN';
        }
        if (v > 0) {
            return 'Infinity';
        }
        else {
            return '-Infinity';
        }
    }, Number),
    simpleTransformation((v) => v === 0 && 1 / v === -Infinity, 'number', () => {
        return '-0';
    }, Number),
    simpleTransformation(isURL, 'URL', v => v.toString(), v => new URL(v)),
];
function compositeTransformation(isApplicable, annotation, transform, untransform) {
    return {
        isApplicable,
        annotation,
        transform,
        untransform,
    };
}
const symbolRule = compositeTransformation((s, superJson) => {
    if (isSymbol(s)) {
        const isRegistered = !!superJson.symbolRegistry.getIdentifier(s);
        return isRegistered;
    }
    return false;
}, (s, superJson) => {
    const identifier = superJson.symbolRegistry.getIdentifier(s);
    return ['symbol', identifier];
}, v => v.description, (_, a, superJson) => {
    const value = superJson.symbolRegistry.getValue(a[1]);
    if (!value) {
        throw new Error('Trying to deserialize unknown symbol');
    }
    return value;
});
const constructorToName = [
    Int8Array,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    Uint8ClampedArray,
].reduce((obj, ctor) => {
    obj[ctor.name] = ctor;
    return obj;
}, {});
const typedArrayRule = compositeTransformation(isTypedArray, v => ['typed-array', v.constructor.name], v => [...v], (v, a) => {
    const ctor = constructorToName[a[1]];
    if (!ctor) {
        throw new Error('Trying to deserialize unknown typed array');
    }
    return new ctor(v);
});
function isInstanceOfRegisteredClass(potentialClass, superJson) {
    if (potentialClass?.constructor) {
        const isRegistered = !!superJson.classRegistry.getIdentifier(potentialClass.constructor);
        return isRegistered;
    }
    return false;
}
const classRule = compositeTransformation(isInstanceOfRegisteredClass, (clazz, superJson) => {
    const identifier = superJson.classRegistry.getIdentifier(clazz.constructor);
    return ['class', identifier];
}, (clazz, superJson) => {
    const allowedProps = superJson.classRegistry.getAllowedProps(clazz.constructor);
    if (!allowedProps) {
        return { ...clazz };
    }
    const result = {};
    allowedProps.forEach(prop => {
        result[prop] = clazz[prop];
    });
    return result;
}, (v, a, superJson) => {
    const clazz = superJson.classRegistry.getValue(a[1]);
    if (!clazz) {
        throw new Error(`Trying to deserialize unknown class '${a[1]}' - check https://github.com/blitz-js/superjson/issues/116#issuecomment-773996564`);
    }
    return Object.assign(Object.create(clazz.prototype), v);
});
const customRule = compositeTransformation((value, superJson) => {
    return !!superJson.customTransformerRegistry.findApplicable(value);
}, (value, superJson) => {
    const transformer = superJson.customTransformerRegistry.findApplicable(value);
    return ['custom', transformer.name];
}, (value, superJson) => {
    const transformer = superJson.customTransformerRegistry.findApplicable(value);
    return transformer.serialize(value);
}, (v, a, superJson) => {
    const transformer = superJson.customTransformerRegistry.findByName(a[1]);
    if (!transformer) {
        throw new Error('Trying to deserialize unknown custom value');
    }
    return transformer.deserialize(v);
});
const compositeRules = [classRule, symbolRule, customRule, typedArrayRule];
const transformValue = (value, superJson) => {
    const applicableCompositeRule = findArr(compositeRules, rule => rule.isApplicable(value, superJson));
    if (applicableCompositeRule) {
        return {
            value: applicableCompositeRule.transform(value, superJson),
            type: applicableCompositeRule.annotation(value, superJson),
        };
    }
    const applicableSimpleRule = findArr(simpleRules, rule => rule.isApplicable(value, superJson));
    if (applicableSimpleRule) {
        return {
            value: applicableSimpleRule.transform(value, superJson),
            type: applicableSimpleRule.annotation,
        };
    }
    return undefined;
};
const simpleRulesByAnnotation = {};
simpleRules.forEach(rule => {
    simpleRulesByAnnotation[rule.annotation] = rule;
});
const untransformValue = (json, type, superJson) => {
    if (isArray$1(type)) {
        switch (type[0]) {
            case 'symbol':
                return symbolRule.untransform(json, type, superJson);
            case 'class':
                return classRule.untransform(json, type, superJson);
            case 'custom':
                return customRule.untransform(json, type, superJson);
            case 'typed-array':
                return typedArrayRule.untransform(json, type, superJson);
            default:
                throw new Error('Unknown transformation: ' + type);
        }
    }
    else {
        const transformation = simpleRulesByAnnotation[type];
        if (!transformation) {
            throw new Error('Unknown transformation: ' + type);
        }
        return transformation.untransform(json, superJson);
    }
};

const getNthKey = (value, n) => {
    if (n > value.size)
        throw new Error('index out of bounds');
    const keys = value.keys();
    while (n > 0) {
        keys.next();
        n--;
    }
    return keys.next().value;
};
function validatePath(path) {
    if (includes(path, '__proto__')) {
        throw new Error('__proto__ is not allowed as a property');
    }
    if (includes(path, 'prototype')) {
        throw new Error('prototype is not allowed as a property');
    }
    if (includes(path, 'constructor')) {
        throw new Error('constructor is not allowed as a property');
    }
}
const getDeep = (object, path) => {
    validatePath(path);
    for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (isSet(object)) {
            object = getNthKey(object, +key);
        }
        else if (isMap(object)) {
            const row = +key;
            const type = +path[++i] === 0 ? 'key' : 'value';
            const keyOfRow = getNthKey(object, row);
            switch (type) {
                case 'key':
                    object = keyOfRow;
                    break;
                case 'value':
                    object = object.get(keyOfRow);
                    break;
            }
        }
        else {
            object = object[key];
        }
    }
    return object;
};
const setDeep = (object, path, mapper) => {
    validatePath(path);
    if (path.length === 0) {
        return mapper(object);
    }
    let parent = object;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (isArray$1(parent)) {
            const index = +key;
            parent = parent[index];
        }
        else if (isPlainObject$1(parent)) {
            parent = parent[key];
        }
        else if (isSet(parent)) {
            const row = +key;
            parent = getNthKey(parent, row);
        }
        else if (isMap(parent)) {
            const isEnd = i === path.length - 2;
            if (isEnd) {
                break;
            }
            const row = +key;
            const type = +path[++i] === 0 ? 'key' : 'value';
            const keyOfRow = getNthKey(parent, row);
            switch (type) {
                case 'key':
                    parent = keyOfRow;
                    break;
                case 'value':
                    parent = parent.get(keyOfRow);
                    break;
            }
        }
    }
    const lastKey = path[path.length - 1];
    if (isArray$1(parent)) {
        parent[+lastKey] = mapper(parent[+lastKey]);
    }
    else if (isPlainObject$1(parent)) {
        parent[lastKey] = mapper(parent[lastKey]);
    }
    if (isSet(parent)) {
        const oldValue = getNthKey(parent, +lastKey);
        const newValue = mapper(oldValue);
        if (oldValue !== newValue) {
            parent.delete(oldValue);
            parent.add(newValue);
        }
    }
    if (isMap(parent)) {
        const row = +path[path.length - 2];
        const keyToRow = getNthKey(parent, row);
        const type = +lastKey === 0 ? 'key' : 'value';
        switch (type) {
            case 'key': {
                const newKey = mapper(keyToRow);
                parent.set(newKey, parent.get(keyToRow));
                if (newKey !== keyToRow) {
                    parent.delete(keyToRow);
                }
                break;
            }
            case 'value': {
                parent.set(keyToRow, mapper(parent.get(keyToRow)));
                break;
            }
        }
    }
    return object;
};

function traverse(tree, walker, origin = []) {
    if (!tree) {
        return;
    }
    if (!isArray$1(tree)) {
        forEach(tree, (subtree, key) => traverse(subtree, walker, [...origin, ...parsePath(key)]));
        return;
    }
    const [nodeValue, children] = tree;
    if (children) {
        forEach(children, (child, key) => {
            traverse(child, walker, [...origin, ...parsePath(key)]);
        });
    }
    walker(nodeValue, origin);
}
function applyValueAnnotations(plain, annotations, superJson) {
    traverse(annotations, (type, path) => {
        plain = setDeep(plain, path, v => untransformValue(v, type, superJson));
    });
    return plain;
}
function applyReferentialEqualityAnnotations(plain, annotations) {
    function apply(identicalPaths, path) {
        const object = getDeep(plain, parsePath(path));
        identicalPaths.map(parsePath).forEach(identicalObjectPath => {
            plain = setDeep(plain, identicalObjectPath, () => object);
        });
    }
    if (isArray$1(annotations)) {
        const [root, other] = annotations;
        root.forEach(identicalPath => {
            plain = setDeep(plain, parsePath(identicalPath), () => plain);
        });
        if (other) {
            forEach(other, apply);
        }
    }
    else {
        forEach(annotations, apply);
    }
    return plain;
}
const isDeep = (object, superJson) => isPlainObject$1(object) ||
    isArray$1(object) ||
    isMap(object) ||
    isSet(object) ||
    isInstanceOfRegisteredClass(object, superJson);
function addIdentity(object, path, identities) {
    const existingSet = identities.get(object);
    if (existingSet) {
        existingSet.push(path);
    }
    else {
        identities.set(object, [path]);
    }
}
function generateReferentialEqualityAnnotations(identitites, dedupe) {
    const result = {};
    let rootEqualityPaths = undefined;
    identitites.forEach(paths => {
        if (paths.length <= 1) {
            return;
        }
        // if we're not deduping, all of these objects continue existing.
        // putting the shortest path first makes it easier to parse for humans
        // if we're deduping though, only the first entry will still exist, so we can't do this optimisation.
        if (!dedupe) {
            paths = paths
                .map(path => path.map(String))
                .sort((a, b) => a.length - b.length);
        }
        const [representativePath, ...identicalPaths] = paths;
        if (representativePath.length === 0) {
            rootEqualityPaths = identicalPaths.map(stringifyPath);
        }
        else {
            result[stringifyPath(representativePath)] = identicalPaths.map(stringifyPath);
        }
    });
    if (rootEqualityPaths) {
        if (isEmptyObject(result)) {
            return [rootEqualityPaths];
        }
        else {
            return [rootEqualityPaths, result];
        }
    }
    else {
        return isEmptyObject(result) ? undefined : result;
    }
}
const walker = (object, identities, superJson, dedupe, path = [], objectsInThisPath = [], seenObjects = new Map()) => {
    const primitive = isPrimitive(object);
    if (!primitive) {
        addIdentity(object, path, identities);
        const seen = seenObjects.get(object);
        if (seen) {
            // short-circuit result if we've seen this object before
            return dedupe
                ? {
                    transformedValue: null,
                }
                : seen;
        }
    }
    if (!isDeep(object, superJson)) {
        const transformed = transformValue(object, superJson);
        const result = transformed
            ? {
                transformedValue: transformed.value,
                annotations: [transformed.type],
            }
            : {
                transformedValue: object,
            };
        if (!primitive) {
            seenObjects.set(object, result);
        }
        return result;
    }
    if (includes(objectsInThisPath, object)) {
        // prevent circular references
        return {
            transformedValue: null,
        };
    }
    const transformationResult = transformValue(object, superJson);
    const transformed = transformationResult?.value ?? object;
    const transformedValue = isArray$1(transformed) ? [] : {};
    const innerAnnotations = {};
    forEach(transformed, (value, index) => {
        if (index === '__proto__' ||
            index === 'constructor' ||
            index === 'prototype') {
            throw new Error(`Detected property ${index}. This is a prototype pollution risk, please remove it from your object.`);
        }
        const recursiveResult = walker(value, identities, superJson, dedupe, [...path, index], [...objectsInThisPath, object], seenObjects);
        transformedValue[index] = recursiveResult.transformedValue;
        if (isArray$1(recursiveResult.annotations)) {
            innerAnnotations[index] = recursiveResult.annotations;
        }
        else if (isPlainObject$1(recursiveResult.annotations)) {
            forEach(recursiveResult.annotations, (tree, key) => {
                innerAnnotations[escapeKey(index) + '.' + key] = tree;
            });
        }
    });
    const result = isEmptyObject(innerAnnotations)
        ? {
            transformedValue,
            annotations: !!transformationResult
                ? [transformationResult.type]
                : undefined,
        }
        : {
            transformedValue,
            annotations: !!transformationResult
                ? [transformationResult.type, innerAnnotations]
                : innerAnnotations,
        };
    if (!primitive) {
        seenObjects.set(object, result);
    }
    return result;
};

function getType(payload) {
  return Object.prototype.toString.call(payload).slice(8, -1);
}

function isArray(payload) {
  return getType(payload) === "Array";
}

function isPlainObject(payload) {
  if (getType(payload) !== "Object")
    return false;
  const prototype = Object.getPrototypeOf(payload);
  return !!prototype && prototype.constructor === Object && prototype === Object.prototype;
}

function assignProp(carry, key, newVal, originalObject, includeNonenumerable) {
  const propType = {}.propertyIsEnumerable.call(originalObject, key) ? "enumerable" : "nonenumerable";
  if (propType === "enumerable")
    carry[key] = newVal;
  if (includeNonenumerable && propType === "nonenumerable") {
    Object.defineProperty(carry, key, {
      value: newVal,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
}
function copy(target, options = {}) {
  if (isArray(target)) {
    return target.map((item) => copy(item, options));
  }
  if (!isPlainObject(target)) {
    return target;
  }
  const props = Object.getOwnPropertyNames(target);
  const symbols = Object.getOwnPropertySymbols(target);
  return [...props, ...symbols].reduce((carry, key) => {
    if (isArray(options.props) && !options.props.includes(key)) {
      return carry;
    }
    const val = target[key];
    const newVal = copy(val, options);
    assignProp(carry, key, newVal, target, options.nonenumerable);
    return carry;
  }, {});
}

class SuperJSON {
    /**
     * @param dedupeReferentialEqualities  If true, SuperJSON will make sure only one instance of referentially equal objects are serialized and the rest are replaced with `null`.
     */
    constructor({ dedupe = false, } = {}) {
        this.classRegistry = new ClassRegistry();
        this.symbolRegistry = new Registry(s => s.description ?? '');
        this.customTransformerRegistry = new CustomTransformerRegistry();
        this.allowedErrorProps = [];
        this.dedupe = dedupe;
    }
    serialize(object) {
        const identities = new Map();
        const output = walker(object, identities, this, this.dedupe);
        const res = {
            json: output.transformedValue,
        };
        if (output.annotations) {
            res.meta = {
                ...res.meta,
                values: output.annotations,
            };
        }
        const equalityAnnotations = generateReferentialEqualityAnnotations(identities, this.dedupe);
        if (equalityAnnotations) {
            res.meta = {
                ...res.meta,
                referentialEqualities: equalityAnnotations,
            };
        }
        return res;
    }
    deserialize(payload) {
        const { json, meta } = payload;
        let result = copy(json);
        if (meta?.values) {
            result = applyValueAnnotations(result, meta.values, this);
        }
        if (meta?.referentialEqualities) {
            result = applyReferentialEqualityAnnotations(result, meta.referentialEqualities);
        }
        return result;
    }
    stringify(object) {
        return JSON.stringify(this.serialize(object));
    }
    parse(string) {
        return this.deserialize(JSON.parse(string));
    }
    registerClass(v, options) {
        this.classRegistry.register(v, options);
    }
    registerSymbol(v, identifier) {
        this.symbolRegistry.register(v, identifier);
    }
    registerCustom(transformer, name) {
        this.customTransformerRegistry.register({
            name,
            ...transformer,
        });
    }
    allowErrorProps(...props) {
        this.allowedErrorProps.push(...props);
    }
}
SuperJSON.defaultInstance = new SuperJSON();
SuperJSON.serialize = SuperJSON.defaultInstance.serialize.bind(SuperJSON.defaultInstance);
SuperJSON.deserialize = SuperJSON.defaultInstance.deserialize.bind(SuperJSON.defaultInstance);
SuperJSON.stringify = SuperJSON.defaultInstance.stringify.bind(SuperJSON.defaultInstance);
SuperJSON.parse = SuperJSON.defaultInstance.parse.bind(SuperJSON.defaultInstance);
SuperJSON.registerClass = SuperJSON.defaultInstance.registerClass.bind(SuperJSON.defaultInstance);
SuperJSON.registerSymbol = SuperJSON.defaultInstance.registerSymbol.bind(SuperJSON.defaultInstance);
SuperJSON.registerCustom = SuperJSON.defaultInstance.registerCustom.bind(SuperJSON.defaultInstance);
SuperJSON.allowErrorProps = SuperJSON.defaultInstance.allowErrorProps.bind(SuperJSON.defaultInstance);

function createLogger(name) {
  const LOG_COLOR = "#808080";
  const LOG_STYLE = `color: ${LOG_COLOR};`;
  const LABEL = `%c🌉 ${name}:%c`;
  const log2 = (...args) => {
    console.info(LABEL, LOG_STYLE, "", ...args);
  };
  log2.debug = (...args) => {
    console.debug(LABEL, LOG_STYLE, "", ...args);
  };
  log2.warn = (...args) => {
    console.warn(LABEL, LOG_STYLE, "", ...args);
  };
  log2.error = (...args) => {
    console.error(LABEL, LOG_STYLE, "", ...args);
  };
  log2.rename = (name2) => {
    return createLogger(name2);
  };
  return log2;
}
createLogger("superbridge");

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function generateId(length = 12) {
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}
const signalRemoteController = /* @__PURE__ */ new Map();
const $abortRemoteSignal = defineBridgeMessage("$abortRemoteSignal");
function registerSignal(localSignal) {
  const id = `$$signal-${generateId()}`;
  const remoteController = new AbortController();
  signalRemoteController.set(id, remoteController);
  localSignal.addEventListener("abort", () => {
    bridge$1.send($abortRemoteSignal, { signalId: id });
    signalRemoteController.delete(id);
  });
  signalFinalizationRegistry.register(localSignal, id);
  return id;
}
bridge$1.handle($abortRemoteSignal, async ({ signalId }) => {
  const controller = signalRemoteController.get(signalId);
  if (!controller) return;
  controller.abort();
  signalRemoteController.delete(signalId);
});
const signalFinalizationRegistry = new FinalizationRegistry(
  (remoteSignalId) => {
    const controller = signalRemoteController.get(remoteSignalId);
    if (!controller) return;
    controller.abort();
    signalRemoteController.delete(remoteSignalId);
  }
);
function deserializeSignalId(signalId) {
  const controller = new AbortController();
  signalRemoteController.set(signalId, controller);
  return controller.signal;
}
const abortSignalSerializer = {
  isApplicable: (value) => value instanceof AbortSignal,
  serialize: (signal) => registerSignal(signal),
  deserialize: (signalId) => deserializeSignalId(signalId)
};
const log$2 = createLogger("superbridge/callbacks");
const callbacks = /* @__PURE__ */ new Map();
const $removeRemoteCallback = defineBridgeMessage("$removeRemoteCallback");
const $triggerRemoteCallback = defineBridgeMessage("$triggerRemoteCallback");
bridge$1.handle($removeRemoteCallback, async ({ callbackId }) => {
  log$2.debug(`Handling remove remote callback "${callbackId}"`);
  callbacks.delete(callbackId);
});
bridge$1.handle($triggerRemoteCallback, async ({ callbackId, args }) => {
  log$2.debug(
    `Handling trigger remote callback "${callbackId}" with callId`,
    args
  );
  const callback = callbacks.get(callbackId);
  if (!callback) {
    throw new Error(`Callback "${callbackId}" not found`);
  }
  return await callback(...args);
});
function getCallbackId() {
  let id = `$$callback-${generateId()}`;
  if (typeof window !== "undefined") {
    id = `${id}-${window.$superbridgeinterface.routingId}`;
  }
  return id;
}
function getCallbackRoutingId(callbackId) {
  const [_callbackLabel, _callbackId, routingId] = callbackId.split("-");
  if (!routingId) return null;
  return parseInt(routingId, 10);
}
function registerCallback(callback) {
  const id = getCallbackId();
  callbacks.set(id, callback);
  return id;
}
const callbackFinalizationRegistry = new FinalizationRegistry(
  (remoteCallbackId) => {
    bridge$1.send(
      $removeRemoteCallback,
      { callbackId: remoteCallbackId },
      getCallbackRoutingId(remoteCallbackId) ?? void 0
    );
  }
);
function deserializeCallbackId(callbackId) {
  async function remoteCallbackInvoker(...args) {
    log$2.debug(`Invoking remote callback "${callbackId}" with args`, args);
    return await bridge$1.send(
      $triggerRemoteCallback,
      {
        callbackId,
        args
      },
      getCallbackRoutingId(callbackId) ?? void 0
    );
  }
  callbackFinalizationRegistry.register(remoteCallbackInvoker, callbackId);
  return remoteCallbackInvoker;
}
const callbackSerializer = {
  isApplicable: (value) => typeof value === "function",
  serialize: (callback) => registerCallback(callback),
  deserialize: deserializeCallbackId
};
const bridgeSerializer = new SuperJSON();
bridgeSerializer.registerCustom(callbackSerializer, "superbridge-callback");
bridgeSerializer.registerCustom(
  abortSignalSerializer,
  "superbridge-abortSignal"
);
const $execute = defineBridgeMessage(
  "$execute"
);
const $reset = defineBridgeMessage("$reset");
function getIsPlainObject(value) {
  return (value == null ? void 0 : value.constructor) === Object;
}
function getPath(currentPath, key) {
  if (!currentPath) return key;
  return `${currentPath}.${key}`;
}
function buildPropertiesMap(currentPath, result, input) {
  for (const [key, value] of Object.entries(input)) {
    const path = getPath(currentPath, key);
    if (getIsPlainObject(value)) {
      buildPropertiesMap(path, result, value);
    } else {
      result.set(path, value);
    }
  }
}
function createNestedRecordPropertiesMap(input) {
  const map = /* @__PURE__ */ new Map();
  buildPropertiesMap("", map, input);
  return map;
}

function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
const __viteBrowserExternal = {};
const __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: __viteBrowserExternal
}, Symbol.toStringTag, { value: "Module" }));
const require$$1 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
const fs = require$$1;
const path = require$$1;
const pathFile = path.join(__dirname, "path.txt");
function getElectronPath() {
  let executablePath;
  if (fs.existsSync(pathFile)) {
    executablePath = fs.readFileSync(pathFile, "utf-8");
  }
  if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
    return path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || "electron");
  }
  if (executablePath) {
    return path.join(__dirname, "dist", executablePath);
  } else {
    throw new Error("Electron failed to install correctly, please delete node_modules/electron and try installing again");
  }
}
var electron = getElectronPath();
function getIPCChannelName(name) {
  return `SUPERBRIDGE__${name}`;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
function createControlledPromise() {
  let controller;
  const promise = new Promise((_resolve, _reject) => {
    controller = {
      resolve: _resolve,
      reject: _reject
    };
  });
  return [promise, controller];
}
const log$1 = createLogger("superbridge/main/init");
const pendingRequests = /* @__PURE__ */ new Map();
electron.ipcMain.handle(
  getIPCChannelName("HANDLE_RESULT"),
  (_event, payload) => {
    const result = bridgeSerializer.deserialize(
      payload.payload
    );
    const pendingRequestController = pendingRequests.get(result.requestId);
    if (!pendingRequestController) {
      throw new Error(`No controller found for requestId: ${result.requestId}`);
    }
    pendingRequests.delete(result.requestId);
    if (result.type === "success") {
      pendingRequestController.resolve(result.result);
    } else {
      pendingRequestController.reject(result.error);
    }
  }
);
initializeSuperbridge({
  send(message, payload, webId) {
    if (webId === void 0) {
      throw new Error("webId is required");
    }
    const requestId = generateId();
    const targetWebContents = electron.webContents.fromId(webId);
    if (!targetWebContents) {
      throw new Error(`Target webContents not found for id: ${webId}`);
    }
    log$1.debug(`Send "${message.type}" with payload`, payload);
    const [promise, controller] = createControlledPromise();
    pendingRequests.set(requestId, controller);
    targetWebContents.send(getIPCChannelName(message.type), {
      requestId,
      payload: bridgeSerializer.serialize(payload)
    });
    return promise;
  },
  handle(message, handler) {
    async function handleMessage(_event, payload) {
      log$1.debug(`Handling "${message.type}" with payload`, payload);
      const result = await handler(
        bridgeSerializer.deserialize(payload.payload)
      );
      return bridgeSerializer.serialize(result);
    }
    electron.ipcMain.handle(getIPCChannelName(message.type), handleMessage);
    return () => {
      electron.ipcMain.removeHandler(getIPCChannelName(message.type));
    };
  }
});
const log = createLogger("superbridge/main/init");
function initializeSuperbridgeMain(handler) {
  log.debug("Initialize Superbridge Main");
  process.env.SUPERBRIDGE_SCHEMA = JSON.stringify(handler.schema);
  bridge$1.handle($execute, async (payload) => {
    log.debug(`Handling execute "${payload.path}" with args`, payload.args);
    return handler.execute(payload.path, payload.args);
  });
  bridge$1.handle($reset, async () => {
    log.debug("Handling reset");
    await handler.reset();
  });
}
const QUERY_SYMBOL = Symbol("query");
function getIsQuery(value) {
  return typeof value === "function" && QUERY_SYMBOL in value && value[QUERY_SYMBOL] === "query";
}
function query(handler) {
  const queryFunction = async (...args) => {
    return handler(...args);
  };
  queryFunction[QUERY_SYMBOL] = "query";
  return queryFunction;
}
const EFFECT_SYMBOL = Symbol("effect");
function getIsEffect(value) {
  return typeof value === "function" && EFFECT_SYMBOL in value && value[EFFECT_SYMBOL] === "effect";
}
function effect(handler) {
  const effectFunction = async (...args) => {
    return handler(...args);
  };
  effectFunction[EFFECT_SYMBOL] = "effect";
  return effectFunction;
}
const MUTATION_SYMBOL = Symbol("mutation");
function getIsMutation(value) {
  return typeof value === "function" && MUTATION_SYMBOL in value && value[MUTATION_SYMBOL] === "mutation";
}
function mutation(handler) {
  const mutationFunction = async (...args) => {
    return handler(...args);
  };
  mutationFunction[MUTATION_SYMBOL] = "mutation";
  return mutationFunction;
}
function getBridgeHandlerSchema(input) {
  const map = createNestedRecordPropertiesMap(input);
  const schema = {};
  for (const [key, value] of map.entries()) {
    if (getIsQuery(value)) {
      schema[key] = {
        type: "query"
      };
      continue;
    }
    if (getIsMutation(value)) {
      schema[key] = {
        type: "mutation"
      };
      continue;
    }
    if (getIsEffect(value)) {
      schema[key] = {
        type: "effect"
      };
      continue;
    }
    if (typeof value === "function") {
      schema[key] = {
        type: "query"
      };
      continue;
    }
    console.warn(`Unknown field type: ${key}`, value);
  }
  return schema;
}
createLogger("superbridge/main/BridgeHandler");
class BridgeHandler {
  constructor(input) {
    __publicField(this, "handlersMap", /* @__PURE__ */ new Map());
    __publicField(this, "schema");
    __publicField(this, "pendingMutations", /* @__PURE__ */ new Set());
    __publicField(this, "runningEffects", /* @__PURE__ */ new Set());
    this.input = input;
    this.handlersMap = createNestedRecordPropertiesMap(input);
    this.schema = getBridgeHandlerSchema(input);
  }
  async waitForPendingMutations() {
    while (this.pendingMutations.size) {
      const promises = [...this.pendingMutations];
      for (const promise of promises) {
        try {
          await promise;
        } catch {
        }
      }
    }
  }
  addPendingMutation(promise) {
    this.pendingMutations.add(promise);
    promise.finally(() => {
      this.pendingMutations.delete(promise);
    });
  }
  getHandler(path) {
    const handler = this.handlersMap.get(path);
    if (!handler) {
      throw new Error(`Handler not found for path: ${path}`);
    }
    return handler;
  }
  async execute(path, args) {
    const handler = this.getHandler(path);
    if (getIsMutation(handler)) {
      const promise = handler(...args);
      this.addPendingMutation(promise);
      return promise;
    }
    if (getIsEffect(handler)) {
      const cleanup = handler(...args);
      this.runningEffects.add(cleanup);
      return cleanup;
    }
    return handler(...args);
  }
  async cleanAllEffects() {
    const effects = [...this.runningEffects];
    for (const effect2 of effects) {
      try {
        const cleanup = await effect2;
        if (typeof cleanup === "function") {
          cleanup();
        }
      } catch {
      }
    }
    this.runningEffects.clear();
  }
  async reset() {
    await this.cleanAllEffects();
    await this.waitForPendingMutations();
  }
}
function createBridgeHandler(input) {
  return new BridgeHandler(input);
}

let foo = "foo";
const bridgeHandler = createBridgeHandler({
  ping: query(async (date, onProgress) => {
    for (let i = 0; i < 10; i++) {
      onProgress?.(i);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return `pong ${date.toISOString()}`;
  }),
  pings: effect(
    (interval, callback) => {
      console.log("setting interval");
      function main(main2) {
        console.log("mainaaaa", main2);
      }
      const intervalId = setInterval(() => {
        callback(/* @__PURE__ */ new Date(), main);
      }, interval);
      return () => {
        console.log("clearing interval");
        clearInterval(intervalId);
      };
    }
  ),
  foo: {
    change: mutation(async (message) => {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      foo = message;
    }),
    get: query(async () => {
      return foo;
    })
  }
});

electron$1.app.commandLine.appendSwitch("js-flags", "--expose-gc");
process.env.DIST = path$1.join(__dirname, "../..");
process.env.VITE_PUBLIC = electron$1.app.isPackaged ? process.env.DIST : path$1.join(process.env.DIST, "../public");
process.env.SUPERBRIDGE_DEBUG = "true";
let win = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  initializeSuperbridgeMain(bridgeHandler);
  win = new electron$1.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path$1.join(__dirname, "preload.js")
    }
  });
  win.webContents.on("did-finish-load", async () => {
    const body = await bridge.send($getBody, void 0, win?.webContents.id);
    console.log("body", body);
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(process.env.DIST, "index.html"));
  }
}
electron$1.app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") {
    electron$1.app.quit();
  }
});
electron$1.app.whenReady().then(createWindow);
electron$1.app.on("activate", () => {
  if (electron$1.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//# sourceMappingURL=main.js.map
