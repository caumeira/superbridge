'use strict';

const electron = require('electron');
const path = require('path');

var u$1 = Object.defineProperty;
var o$1 = (s, e, t) => e in s ? u$1(s, e, { enumerable: true, configurable: true, writable: true, value: t }) : s[e] = t;
var i = (s, e, t) => o$1(s, typeof e != "symbol" ? e + "" : e, t);
const r = Symbol("NO_VALUE");
let c$1 = class c {
  constructor() {
    i(this, "listeners", /* @__PURE__ */ new Map());
    i(this, "lastValue", r);
  }
  assertLastValue(e) {
    if (this.lastValue === r)
      throw typeof e == "string" ? new Error(e) : e;
    return this.lastValue;
  }
  get hasLastValue() {
    return this.lastValue !== r;
  }
  get maybeLastValue() {
    return this.lastValue === r ? void 0 : this.lastValue;
  }
  emit(e) {
    this.lastValue = e;
    const t = [...this.listeners.values()];
    for (const a of t)
      try {
        a(e);
      } catch (l) {
        console.error(l);
      }
  }
  subscribe(e) {
    const t = Symbol();
    return this.listeners.set(t, e), () => {
      this.listeners.delete(t);
    };
  }
  subscribeWithCurrentValue(e) {
    return this.lastValue !== r && e(this.lastValue), this.subscribe(e);
  }
  effect(e) {
    let t;
    const a = this.subscribeWithCurrentValue((l) => {
      t && t(), t = e(l);
    });
    return () => {
      a(), t && t();
    };
  }
};
const n$1 = new c$1();
function b$2(s) {
  n$1.emit(s);
}
const d$2 = {
  send(s, e, t) {
    return n$1.assertLastValue(
      "Superbridge is not initialized"
    ).send(s, e, t);
  },
  handle(s, e) {
    return n$1.hasLastValue || Promise.resolve().then(() => {
      n$1.hasLastValue || console.warn("Superbridge is not initialized");
    }), n$1.effect((t) => t.handle(s, e));
  }
};
class h {
  constructor(e) {
    i(this, "input");
    i(this, "output");
    this.type = e;
  }
}
function f$1(s) {
  return new h(s);
}

const $getBody = f$1("$getBodyId");

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

function c(s) {
  const e = "color: #808080;", n = `%c🌉 ${s}:%c`, r = (...o) => {
    console.info(n, e, "", ...o);
  };
  return r.debug = (...o) => {
    console.debug(n, e, "", ...o);
  }, r.warn = (...o) => {
    console.warn(n, e, "", ...o);
  }, r.error = (...o) => {
    console.error(n, e, "", ...o);
  }, r.rename = (o) => c(o), r;
}
c("superbridge");

const f = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function p$1(e = 12) {
  let t = "";
  for (let n = 0; n < e; n++)
    t += f[Math.floor(Math.random() * f.length)];
  return t;
}
const a = /* @__PURE__ */ new Map(), $ = f$1("$abortRemoteSignal");
function S$1(e) {
  const t = `$$signal-${p$1()}`, n = new AbortController();
  return a.set(t, n), e.addEventListener("abort", () => {
    d$2.send($, { signalId: t }), a.delete(t);
  }), A.register(e, t), t;
}
d$2.handle($, async ({ signalId: e }) => {
  const t = a.get(e);
  t && (t.abort(), a.delete(e));
});
const A = new FinalizationRegistry(
  (e) => {
    const t = a.get(e);
    t && (t.abort(), a.delete(e));
  }
);
function M$1(e) {
  const t = new AbortController();
  return a.set(e, t), t.signal;
}
const v = {
  isApplicable: (e) => e instanceof AbortSignal,
  serialize: (e) => S$1(e),
  deserialize: (e) => M$1(e)
}, d$1 = c("superbridge/callbacks"), b$1 = /* @__PURE__ */ new Map(), m$1 = f$1("$removeRemoteCallback"), k$1 = f$1("$triggerRemoteCallback");
d$2.handle(m$1, async ({ callbackId: e }) => {
  d$1.debug(`Handling remove remote callback "${e}"`), b$1.delete(e);
});
d$2.handle(k$1, async ({ callbackId: e, args: t }) => {
  d$1.debug(
    `Handling trigger remote callback "${e}" with callId`,
    t
  );
  const n = b$1.get(e);
  if (!n)
    throw new Error(`Callback "${e}" not found`);
  return await n(...t);
});
function I() {
  let e = `$$callback-${p$1()}`;
  return typeof window < "u" && (e = `${e}-${window.$superbridgeinterface.routingId}`), e;
}
function w(e) {
  const [t, n, o] = e.split("-");
  return o ? parseInt(o, 10) : null;
}
function j$1(e) {
  const t = I();
  return b$1.set(t, e), t;
}
const O = new FinalizationRegistry(
  (e) => {
    d$2.send(
      m$1,
      { callbackId: e },
      w(e) ?? void 0
    );
  }
);
function F$1(e) {
  async function t(...n) {
    return d$1.debug(`Invoking remote callback "${e}" with args`, n), await d$2.send(
      k$1,
      {
        callbackId: e,
        args: n
      },
      w(e) ?? void 0
    );
  }
  return O.register(t, e), t;
}
const L = {
  isApplicable: (e) => typeof e == "function",
  serialize: (e) => j$1(e),
  deserialize: F$1
}, y = new SuperJSON();
y.registerCustom(L, "superbridge-callback");
y.registerCustom(
  v,
  "superbridge-abortSignal"
);
const B$1 = f$1(
  "$execute"
), J = f$1("$reset");
function P$1(e) {
  return (e == null ? void 0 : e.constructor) === Object;
}
function x(e, t) {
  return e ? `${e}.${t}` : t;
}
function C(e, t, n) {
  for (const [o, c] of Object.entries(n)) {
    const i = x(e, o);
    P$1(c) ? C(i, t, c) : t.set(i, c);
  }
}
function K(e) {
  const t = /* @__PURE__ */ new Map();
  return C("", t, e), t;
}

function n(e) {
  return `SUPERBRIDGE__${e}`;
}

var S = Object.defineProperty;
var q = (t, e, n) => e in t ? S(t, e, { enumerable: true, configurable: true, writable: true, value: n }) : t[e] = n;
var o = (t, e, n) => q(t, typeof e != "symbol" ? e + "" : e, n);
function P() {
  let t;
  return [new Promise((n, r) => {
    t = {
      resolve: n,
      reject: r
    };
  }), t];
}
const m = c("superbridge/main/init"), d = /* @__PURE__ */ new Map();
electron.ipcMain.handle(
  n("HANDLE_RESULT"),
  (t, e) => {
    const n = y.deserialize(
      e.payload
    ), r = d.get(n.requestId);
    if (!r)
      throw new Error(`No controller found for requestId: ${n.requestId}`);
    d.delete(n.requestId), n.type === "success" ? r.resolve(n.result) : r.reject(n.error);
  }
);
b$2({
  send(t, e, n$1) {
    if (n$1 === void 0)
      throw new Error("webId is required");
    const r = p$1(), i = electron.webContents.fromId(n$1);
    if (!i)
      throw new Error(`Target webContents not found for id: ${n$1}`);
    m.debug(`Send "${t.type}" with payload`, e);
    const [c, E] = P();
    return d.set(r, E), i.send(n(t.type), {
      requestId: r,
      payload: y.serialize(e)
    }), c;
  },
  handle(t, e) {
    async function n$1(r, i) {
      m.debug(`Handling "${t.type}" with payload`, i);
      const c = await e(
        y.deserialize(i.payload)
      );
      return y.serialize(c);
    }
    return electron.ipcMain.handle(n(t.type), n$1), () => {
      electron.ipcMain.removeHandler(n(t.type));
    };
  }
});
const u = c("superbridge/main/init");
function T(t) {
  u.debug("Initialize Superbridge Main"), process.env.SUPERBRIDGE_SCHEMA = JSON.stringify(t.schema), d$2.handle(B$1, async (e) => (u.debug(`Handling execute "${e.path}" with args`, e.args), t.execute(e.path, e.args))), d$2.handle(J, async () => {
    u.debug("Handling reset"), await t.reset();
  });
}
const l = Symbol("query");
function B(t) {
  return typeof t == "function" && l in t && t[l] === "query";
}
function U(t) {
  const e = async (...n) => t(...n);
  return e[l] = "query", e;
}
const g = Symbol("effect");
function M(t) {
  return typeof t == "function" && g in t && t[g] === "effect";
}
function Y(t) {
  const e = async (...n) => t(...n);
  return e[g] = "effect", e;
}
const p = Symbol("mutation");
function b(t) {
  return typeof t == "function" && p in t && t[p] === "mutation";
}
function j(t) {
  const e = async (...n) => t(...n);
  return e[p] = "mutation", e;
}
function F(t) {
  const e = K(t), n = {};
  for (const [r, i] of e.entries()) {
    if (B(i)) {
      n[r] = {
        type: "query"
      };
      continue;
    }
    if (b(i)) {
      n[r] = {
        type: "mutation"
      };
      continue;
    }
    if (M(i)) {
      n[r] = {
        type: "effect"
      };
      continue;
    }
    if (typeof i == "function") {
      n[r] = {
        type: "query"
      };
      continue;
    }
    console.warn(`Unknown field type: ${r}`, i);
  }
  return n;
}
c("superbridge/main/BridgeHandler");
class R {
  constructor(e) {
    o(this, "handlersMap", /* @__PURE__ */ new Map());
    o(this, "schema");
    o(this, "pendingMutations", /* @__PURE__ */ new Set());
    o(this, "runningEffects", /* @__PURE__ */ new Set());
    this.input = e, this.handlersMap = K(e), this.schema = F(e);
  }
  async waitForPendingMutations() {
    for (; this.pendingMutations.size; ) {
      const e = [...this.pendingMutations];
      for (const n of e)
        try {
          await n;
        } catch {
        }
    }
  }
  addPendingMutation(e) {
    this.pendingMutations.add(e), e.finally(() => {
      this.pendingMutations.delete(e);
    });
  }
  getHandler(e) {
    const n = this.handlersMap.get(e);
    if (!n)
      throw new Error(`Handler not found for path: ${e}`);
    return n;
  }
  async execute(e, n) {
    const r = this.getHandler(e);
    if (b(r)) {
      const i = r(...n);
      return this.addPendingMutation(i), i;
    }
    if (M(r)) {
      const i = r(...n);
      return this.runningEffects.add(i), i;
    }
    return r(...n);
  }
  async cleanAllEffects() {
    const e = [...this.runningEffects];
    for (const n of e)
      try {
        const r = await n;
        typeof r == "function" && r();
      } catch {
      }
    this.runningEffects.clear();
  }
  async reset() {
    await this.cleanAllEffects(), await this.waitForPendingMutations();
  }
}
function k(t) {
  return new R(t);
}

let foo = "foo";
const bridgeHandler = k({
  ping: U(async (date, onProgress) => {
    for (let i = 0; i < 10; i++) {
      onProgress?.(i);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return `pong ${date.toISOString()}`;
  }),
  pings: Y(
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
    change: j(async (message) => {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      foo = message;
    }),
    get: U(async () => {
      return foo;
    })
  }
});

electron.app.commandLine.appendSwitch("js-flags", "--expose-gc");
process.env.DIST = path.join(__dirname, "../..");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
process.env.SUPERBRIDGE_DEBUG = "true";
let win = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  T(bridgeHandler);
  win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });
  win.webContents.on("did-finish-load", async () => {
    const body = await bridge.send($getBody, void 0, win?.webContents.id);
    console.log("body", body);
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.whenReady().then(createWindow);
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//# sourceMappingURL=main.js.map
