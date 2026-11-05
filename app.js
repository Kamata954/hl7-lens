import { parse } from './parser.js';
import { samples } from './samples.js';

const input = document.getElementById('input');
const results = document.getElementById('results');
const error = document.getElementById('error');
const status = document.getElementById('status');
const messageSelect = document.getElementById('message');
const segmentList = document.getElementById('segments');
const fieldList = document.getElementById('field-list');
const search = document.getElementById('search');
const showEmpty = document.getElementById('empty');
let parsed = null;
let selectedSegment = 0;

// Always display message values as text, never as HTML.
function element(tag, text = '', className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
}

function resetResults() {
    parsed = null;
    results.hidden = true;
    error.hidden = true;
    status.textContent = '';
    document.getElementById('json').textContent = '';
    segmentList.replaceChildren();
    fieldList.replaceChildren();
}

function parseInput() {
    resetResults();
    try {
        parsed = parse(input.value);
        messageSelect.replaceChildren();
        for (const [index, message] of parsed.messages.entries()) {
            const label = `${index + 1}. ${message.messageType || 'Unknown type'}`;
            const option = element('option', label);
            option.value = index;
            messageSelect.append(option);
        }
        messageSelect.value = '0';
        selectedSegment = 0;
        results.hidden = false;
        document.getElementById('json').textContent = JSON.stringify(parsed, null, 2);
        renderMessage();
    } catch (problem) {
        resetResults();
        error.textContent = problem.message;
        error.hidden = false;
    }
}

function renderMessage() {
    const message = parsed.messages[Number(messageSelect.value)];
    document.getElementById('warnings').textContent = message.warnings.join('\n');
    segmentList.replaceChildren();
    for (const [index, segment] of message.segments.entries()) {
        const button = element('button', `${segment.id} · ${segment.occurrence}`);
        button.title = segment.description;
        button.className = index === selectedSegment ? 'selected' : '';
        button.setAttribute('aria-pressed', String(index === selectedSegment));
        button.onclick = () => {
            selectedSegment = index;
            renderMessage();
        };
        segmentList.append(button);
    }
    renderFields();
}

function displayValue(value) {
    if (value === null) return '[null]';
    return value === '' ? '[empty]' : value;
}

function fieldDetails(field) {
    const details = element('div', '', 'components');
    for (const repetition of field.repetitions) {
        if (field.repetitions.length > 1) {
            details.append(element('strong', `Repetition ${repetition.index}`));
        }
        for (const component of repetition.components) {
            const path = `${field.path}.${component.number}`;
            const values = component.subcomponents.map(part => displayValue(part.value));
            const label = `${path} · ${component.description}: ${values.join(' · ')}`;
            details.append(element('p', label));
            if (component.subcomponents.length > 1) {
                for (const part of component.subcomponents) {
                    const text = `${path}.${part.number} = ${displayValue(part.value)}`;
                    details.append(element('p', text));
                }
            }
        }
    }
    return details;
}

function renderFields() {
    if (!parsed) return;
    const message = parsed.messages[Number(messageSelect.value)];
    const segment = message.segments[selectedSegment];
    document.getElementById('segment-title').textContent = `${segment.id} · ${segment.description}`;
    fieldList.replaceChildren();
    const query = search.value.toLowerCase();
    for (const field of segment.fields) {
        if (!showEmpty.checked && field.state === 'empty') continue;
        const text = `${field.path} ${field.description} ${field.raw}`.toLowerCase();
        if (!text.includes(query)) continue;
        const row = element('details', '', 'field-row');
        const summary = element('summary', '', 'field-grid');
        let value = field.raw;
        if (field.state === 'empty') value = '[empty]';
        if (field.state === 'null') value = '"" [explicit null]';
        summary.append(
            element('code', field.path),
            element('span', field.description),
            element('code', value)
        );
        row.append(summary, fieldDetails(field));
        fieldList.append(row);
    }
    if (!fieldList.children.length) fieldList.append(element('p', 'No matching fields.'));
}

// User actions stay together so the page is easy to trace.
document.getElementById('parse').onclick = parseInput;
document.getElementById('clear').onclick = () => {
    input.value = '';
    document.getElementById('file').value = '';
    resetResults();
};
input.oninput = resetResults;
messageSelect.onchange = () => {
    selectedSegment = 0;
    renderMessage();
};
search.oninput = renderFields;
showEmpty.onchange = renderFields;
for (const button of document.querySelectorAll('[data-example]')) {
    button.onclick = () => {
        input.value = samples[button.dataset.example];
        search.value = '';
        parseInput();
    };
}
document.getElementById('file').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    resetResults();
    try {
        if (file.size > 1000000) throw Error('Choose a text file smaller than 1 MB.');
        input.value = await file.text();
        parseInput();
    } catch (problem) {
        error.textContent = problem.message;
        error.hidden = false;
    }
};
document.getElementById('download').onclick = () => {
    if (!parsed) return;
    const file = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = element('a');
    link.href = url;
    link.download = 'hl7-lens-export.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'JSON downloaded.';
};
