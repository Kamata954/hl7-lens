import { names, dictionary, componentLabels } from './reference.js';

// MSH-1 and MSH-2 describe the delimiters, so they must stay literal.
function isLiteralHeaderField(segmentId, fieldNumber) {
    return segmentId === 'MSH' && fieldNumber <= 2;
}

function getFieldState(raw) {
    if (raw === '') return 'empty';
    if (raw === '""') return 'null';
    return 'value';
}

function decodeEscapes(raw, delimiters) {
    const escape = delimiters.escape;
    const replacements = {
        F: delimiters.field,
        S: delimiters.component,
        R: delimiters.repetition,
        T: delimiters.subcomponent,
        E: escape,
        '.br': '\n'
    };
    let decoded = '';
    let position = 0;

    while (position < raw.length) {
        if (raw[position] !== escape) {
            decoded += raw[position];
            position += 1;
            continue;
        }

        const closingPosition = raw.indexOf(escape, position + 1);
        if (closingPosition === -1) {
            decoded += raw.slice(position);
            break;
        }

        const code = raw.slice(position + 1, closingPosition);
        if (Object.hasOwn(replacements, code)) {
            decoded += replacements[code];
        } else {
            decoded += raw.slice(position, closingPosition + 1);
        }
        position = closingPosition + 1;
    }

    return decoded;
}

function parseSubcomponent(raw, index, literal, delimiters) {
    let value = raw;
    if (raw === '""') {
        value = null;
    } else if (!literal) {
        value = decodeEscapes(raw, delimiters);
    }
    return { number: index + 1, raw, value };
}

function parseComponent(raw, index, path, literal, delimiters) {
    const values = literal ? [raw] : raw.split(delimiters.subcomponent);
    return {
        number: index + 1,
        description: componentLabels[path]?.[index] || `Component ${index + 1}`,
        raw,
        subcomponents: values.map((value, subcomponentIndex) =>
            parseSubcomponent(value, subcomponentIndex, literal, delimiters)
        )
    };
}

function parseRepetition(raw, index, path, literal, delimiters) {
    const values = literal ? [raw] : raw.split(delimiters.component);
    return {
        index: index + 1,
        raw,
        components: values.map((value, componentIndex) =>
            parseComponent(value, componentIndex, path, literal, delimiters)
        )
    };
}

function parseField(raw, index, segmentId, delimiters) {
    const number = index + 1;
    const path = `${segmentId}-${number}`;
    const literal = isLiteralHeaderField(segmentId, number);
    const values = literal ? [raw] : raw.split(delimiters.repetition);

    return {
        number,
        path,
        description: dictionary[segmentId]?.[index] ||
            'Unmapped field (consult interface specification)',
        raw,
        state: getFieldState(raw),
        repetitions: values.map((value, repetitionIndex) =>
            parseRepetition(value, repetitionIndex, path, literal, delimiters)
        )
    };
}

function isUppercaseLetter(character) {
    return character >= 'A' && character <= 'Z';
}

function isDigit(character) {
    return character >= '0' && character <= '9';
}

function isValidSegmentId(id) {
    if (id.length !== 3 || !isUppercaseLetter(id[0])) return false;
    return Array.from(id.slice(1)).every(character =>
        isUppercaseLetter(character) || isDigit(character)
    );
}

function isInvalidDelimiter(character) {
    const isLowercase = character >= 'a' && character <= 'z';
    const isLetter = isUppercaseLetter(character) || isLowercase;
    const isWhitespace = character.trim() === '';
    return isLetter || isDigit(character) || character === '_' || isWhitespace;
}

function readDelimiters(line, lineNumber) {
    const field = line[3];
    if (!field || isInvalidDelimiter(field)) {
        throw Error(`Line ${lineNumber}: invalid MSH field separator.`);
    }

    const encoding = line.slice(4).split(field)[0];
    const characters = [field, ...encoding];
    const validLength = encoding.length === 4 || encoding.length === 5;
    const allDistinct = new Set(characters).size === characters.length;

    if (!validLength || !allDistinct || characters.some(isInvalidDelimiter)) {
        throw Error(
            `Line ${lineNumber}: MSH-2 must contain four or five distinct ` +
            'encoding characters, different from the field separator.'
        );
    }

    const delimiters = {
        field,
        component: encoding[0],
        repetition: encoding[1],
        escape: encoding[2],
        subcomponent: encoding[3]
    };
    if (encoding[4]) delimiters.truncation = encoding[4];
    return delimiters;
}

function prepareSource(input) {
    if (typeof input !== 'string' || !input.trim()) {
        throw Error('Paste an HL7 v2 message, or load an example to begin.');
    }
    if (input.length > 1000000) {
        throw Error('This explorer supports up to 1 MB of message text.');
    }

    let source = input;
    if (source.startsWith('\uFEFF')) source = source.slice(1);

    // MLLP uses these control characters to frame a transmitted message.
    const startOfFrame = '\x0b';
    const endOfFrame = '\x1c';
    const framed = source.includes(startOfFrame) || source.includes(endOfFrame);
    source = source.split(startOfFrame).join('').split(endOfFrame).join('');
    source = source.split('\r\n').join('\n').split('\r').join('\n');

    return {
        lines: source.split('\n').filter(line => line.trim() !== ''),
        framed
    };
}

function appendSegment(message, line, id, lineNumber) {
    const delimiters = message.delimiters;
    if (line[3] !== delimiters.field) {
        throw Error(
            `Line ${lineNumber}: ${id} must use the field separator declared in MSH-1.`
        );
    }

    const parts = line.split(delimiters.field);
    const values = parts.slice(1);
    // The separator itself counts as MSH-1; other segments start after their ID.
    if (id === 'MSH') values.unshift(delimiters.field);

    const occurrence = message.segments.filter(segment => segment.id === id).length + 1;
    const segment = {
        id,
        occurrence,
        description: names[id] || (id.startsWith('Z') ? 'Custom segment' : 'Unmapped segment'),
        raw: line,
        fields: values.map((raw, index) => parseField(raw, index, id, delimiters))
    };

    if (!names[id]) message.warnings.push(`${id} has no built-in description; raw fields are preserved.`);
    for (const field of segment.fields) {
        if (isLiteralHeaderField(id, field.number)) continue;
        const escapeCount = field.raw.split(delimiters.escape).length - 1;
        if (escapeCount % 2 !== 0) {
            message.warnings.push(`${id}[${occurrence}]-${field.number}: unmatched escape character.`);
        }
    }
    message.segments.push(segment);
    if (id === 'MSH') {
        message.messageType = segment.fields[8]?.raw || '';
        message.controlId = segment.fields[9]?.raw || '';
        message.version = segment.fields[11]?.raw || '';
        if (!message.messageType) message.warnings.push('MSH-9 message type is empty.');
        if (!message.version) message.warnings.push('MSH-12 version is empty.');
    }
}

export function parse(input) {
    const { lines, framed } = prepareSource(input);
    const messages = [];
    let currentMessage = null;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const lineNumber = index + 1;
        const id = line.slice(0, 3);

        if (!isValidSegmentId(id)) {
            throw Error(
                `Line ${lineNumber}: expected a three-character segment ID. ` +
                'Wrapped segments must be joined before parsing.'
            );
        }

        if (id === 'MSH') {
            currentMessage = {
                index: messages.length + 1,
                delimiters: readDelimiters(line, lineNumber),
                messageType: '', version: '', controlId: '',
                segments: [], warnings: []
            };
            messages.push(currentMessage);
        } else if (!currentMessage) {
            throw Error(
                `Line ${lineNumber}: each message must begin with MSH. ` +
                'Batch FHS/BHS envelopes are not supported.'
            );
        }

        appendSegment(currentMessage, line, id, lineNumber);
    }

    return {
        format: 'HL7 Lens structural JSON',
        schemaVersion: 1,
        notes: [
            'Structural parse only; not conformance validation or FHIR.',
            'Field labels cover common fields and may vary by HL7 version/profile.',
            'Raw values are preserved. Standard delimiter escapes and .br are decoded; other escapes remain literal.'
        ],
        transportFramingRemoved: framed,
        messages
    };
}
