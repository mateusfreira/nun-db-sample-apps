/**
 * Lightweight LWW-Register CRDT (Last-Writer-Wins)
 * Provides an Automerge-like API without WASM dependency.
 *
 * Each document has a unique actorId. Every field tracks (actorId, counter, value).
 * merge() picks the highest (counter, actorId) for each field — conflict-free.
 */

function generateActorId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function from(initialData) {
    const actorId = generateActorId();
    const fields = {};
    for (const [key, value] of Object.entries(initialData)) {
        fields[key] = { value, actorId, counter: 0 };
    }
    return { actorId, fields };
}

export function change(doc, callback) {
    // Create a proxy-like mutable copy
    const mutable = {};
    for (const [key, field] of Object.entries(doc.fields)) {
        mutable[key] = field.value;
    }

    callback(mutable);

    // Detect changes and bump counters
    const newFields = {};
    for (const [key, field] of Object.entries(doc.fields)) {
        if (mutable[key] !== field.value) {
            newFields[key] = {
                value: mutable[key],
                actorId: doc.actorId,
                counter: field.counter + 1,
            };
        } else {
            newFields[key] = { ...field };
        }
    }

    return { actorId: doc.actorId, fields: newFields };
}

export function save(doc) {
    const json = JSON.stringify(doc);
    return new TextEncoder().encode(json);
}

export function load(bytes) {
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
}

export function merge(localDoc, remoteDoc) {
    const mergedFields = {};

    const allKeys = new Set([
        ...Object.keys(localDoc.fields),
        ...Object.keys(remoteDoc.fields),
    ]);

    for (const key of allKeys) {
        const local = localDoc.fields[key];
        const remote = remoteDoc.fields[key];

        if (!local) {
            mergedFields[key] = { ...remote };
        } else if (!remote) {
            mergedFields[key] = { ...local };
        } else if (remote.counter > local.counter) {
            mergedFields[key] = { ...remote };
        } else if (remote.counter === local.counter && remote.actorId > local.actorId) {
            mergedFields[key] = { ...remote };
        } else {
            mergedFields[key] = { ...local };
        }
    }

    return { actorId: localDoc.actorId, fields: mergedFields };
}

/** Read a field value from the document. */
export function getValue(doc, field) {
    return doc.fields[field] ? doc.fields[field].value : undefined;
}
