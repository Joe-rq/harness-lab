import fs from 'node:fs';
import path from 'node:path';

const DIRECT_WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
const SEGMENT_SEPARATORS = new Set([';', '&&', '||', '|', '&', '(', ')']);
const WRITE_REDIRECTS = new Set(['>', '>>', '1>', '1>>', '2>', '2>>', '&>', '&>>']);
const GOVERNANCE_PREFIXES = ['requirements', 'docs/plans', '.claude'];

function pushToken(tokens, buffer) {
  if (buffer.value === '') return;
  tokens.push({ type: 'word', value: buffer.value, dynamic: buffer.dynamic });
  buffer.value = '';
  buffer.dynamic = false;
}

function readOperator(command, index, buffer, tokens) {
  const rest = command.slice(index);
  const fdMatch = buffer.value.match(/^\d+$/);
  const redirect = rest.match(/^(>>|>|<<|<)/)?.[1] || null;
  if (redirect && fdMatch) {
    const fd = buffer.value;
    buffer.value = '';
    buffer.dynamic = false;
    tokens.push({ type: 'operator', value: `${fd}${redirect}` });
    return redirect.length;
  }

  const operator = ['&&', '||', '&>>', '&>', '>>', '<<', ';', '|', '&', '(', ')', '>', '<']
    .find((candidate) => rest.startsWith(candidate));
  if (!operator) return 0;
  pushToken(tokens, buffer);
  tokens.push({ type: 'operator', value: operator });
  return operator.length;
}

/**
 * Small, non-evaluating shell tokenizer for the explicitly supported write patterns.
 * It preserves Windows-style backslashes unless they escape shell syntax.
 */
export function tokenizeShell(command) {
  if (typeof command !== 'string' || command.trim() === '') return [];
  const tokens = [];
  const buffer = { value: '', dynamic: false };
  let quote = null;

  for (let index = 0; index < command.length;) {
    const char = command[index];

    if (quote) {
      if (char === quote) {
        quote = null;
        index += 1;
        continue;
      }
      if (char === '\\' && quote === '"' && index + 1 < command.length) {
        const next = command[index + 1];
        if ('"\\$`'.includes(next)) {
          buffer.value += next;
          if ('$`'.includes(next)) buffer.dynamic = true;
          index += 2;
          continue;
        }
      }
      if (quote !== "'" && '$`'.includes(char)) buffer.dynamic = true;
      buffer.value += char;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      index += 1;
      continue;
    }
    if (char === '\n' || char === '\r') {
      pushToken(tokens, buffer);
      tokens.push({ type: 'operator', value: ';' });
      if (char === '\r' && command[index + 1] === '\n') index += 1;
      index += 1;
      continue;
    }
    if (/\s/.test(char)) {
      pushToken(tokens, buffer);
      index += 1;
      continue;
    }
    if (char === '\\' && index + 1 < command.length) {
      const next = command[index + 1];
      if (/\s/.test(next) || '"\'\\;|&><()'.includes(next)) {
        buffer.value += next;
        index += 2;
        continue;
      }
      buffer.value += char;
      index += 1;
      continue;
    }
    if (
      char === '&' &&
      /\d/.test(command[index + 1] || '') &&
      tokens.at(-1)?.type === 'operator' &&
      WRITE_REDIRECTS.has(tokens.at(-1).value)
    ) {
      buffer.value += char;
      index += 1;
      continue;
    }

    const operatorLength = readOperator(command, index, buffer, tokens);
    if (operatorLength > 0) {
      index += operatorLength;
      continue;
    }

    if ('$`*?['.includes(char)) buffer.dynamic = true;
    buffer.value += char;
    index += 1;
  }

  pushToken(tokens, buffer);
  if (quote) {
    tokens.push({ type: 'error', value: 'unterminated-quote' });
  }
  return tokens;
}

function splitSegments(tokens) {
  const segments = [];
  let current = [];
  for (const token of tokens) {
    if (token.type === 'operator' && SEGMENT_SEPARATORS.has(token.value)) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

function commandAndArgs(segment) {
  const words = [];
  for (let index = 0; index < segment.length; index += 1) {
    const token = segment[index];
    if (token.type === 'operator' && (WRITE_REDIRECTS.has(token.value) || token.value === '<' || token.value === '<<')) {
      index += 1;
      continue;
    }
    if (token.type === 'word') words.push(token);
  }

  let index = 0;
  while (index < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[index].value)) index += 1;
  while (index < words.length && ['env', 'command', 'builtin', 'nohup', 'sudo'].includes(path.posix.basename(words[index].value))) {
    index += 1;
    while (index < words.length && words[index].value.startsWith('-')) index += 1;
  }
  if (index >= words.length) return { command: null, args: [] };
  return {
    command: path.posix.basename(words[index].value.replace(/\\/g, '/')),
    args: words.slice(index + 1),
  };
}

function operands(args, optionsWithValues = new Set()) {
  const result = [];
  let optionsEnded = false;
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!optionsEnded && token.value === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && token.value.startsWith('-') && token.value !== '-') {
      const optionName = token.value.split('=')[0];
      if (optionsWithValues.has(optionName) && !token.value.includes('=') && index + 1 < args.length) {
        index += 1;
      }
      continue;
    }
    result.push(token);
  }
  return result;
}

function optionValue(args, shortName, longName) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index].value;
    if (value === shortName || value === longName) return args[index + 1] || null;
    if (value.startsWith(`${longName}=`)) {
      return { type: 'word', value: value.slice(longName.length + 1), dynamic: args[index].dynamic };
    }
  }
  return null;
}

function addTarget(result, token, operation, role) {
  if (!token || token.type !== 'word' || !token.value || token.value === '/dev/null' || /^&\d+$/.test(token.value)) {
    result.unresolved = true;
    return;
  }
  if (token.dynamic || token.value.startsWith('~')) result.unresolved = true;
  const key = `${operation}:${role}:${token.value}`;
  if (result.seen.has(key)) return;
  result.seen.add(key);
  result.targets.push({ raw: token.value, dynamic: Boolean(token.dynamic), operation, role });
}

function destinationTargets(sources, destination, operation) {
  if (!destination) return [];
  if (sources.length <= 1) return [{ ...destination, operation, role: 'destination' }];
  return sources.map((source) => ({
    type: 'word',
    value: `${destination.value.replace(/[\\/]$/, '')}/${path.posix.basename(source.value.replace(/\\/g, '/'))}`,
    dynamic: Boolean(destination.dynamic || source.dynamic),
    operation,
    role: 'destination',
  }));
}

function classifyFileOperation(command, args, result) {
  const simpleAllOperands = new Set(['rm', 'touch', 'mkdir']);
  if (simpleAllOperands.has(command)) {
    const optionValues = command === 'touch'
      ? new Set(['-d', '--date', '-r', '--reference', '-t'])
      : command === 'mkdir'
        ? new Set(['-m', '--mode', '-Z', '--context'])
        : new Set();
    const values = operands(args, optionValues);
    if (values.length === 0) result.unresolved = true;
    for (const token of values) addTarget(result, token, command, 'target');
    result.operations.add(command);
    return;
  }

  if (command === 'cp' || command === 'mv') {
    const targetDirectory = optionValue(args, '-t', '--target-directory');
    const values = operands(args, new Set(['-t', '--target-directory']));
    const sources = targetDirectory ? values : values.slice(0, -1);
    const destination = targetDirectory || values.at(-1) || null;
    if (sources.length === 0 || !destination) result.unresolved = true;
    if (command === 'mv') {
      for (const source of sources) addTarget(result, source, command, 'source-delete');
    }
    for (const target of destinationTargets(sources, destination, command)) {
      addTarget(result, target, command, 'destination');
    }
    result.operations.add(command);
    return;
  }

  if (command === 'ln') {
    const targetDirectory = optionValue(args, '-t', '--target-directory');
    const values = operands(args, new Set(['-t', '--target-directory']));
    const sources = targetDirectory ? values : values.slice(0, -1);
    const destination = targetDirectory || values.at(-1) || null;
    if (!destination || sources.length === 0) result.unresolved = true;
    for (const target of destinationTargets(sources, destination, command)) {
      addTarget(result, target, command, 'link');
    }
    result.operations.add(command);
  }
}

function classifyInPlace(command, args, result) {
  const isAwk = command === 'gawk' || command === 'awk';
  const hasInPlace = isAwk
    ? args.some((token, index) => token.value === '-i' && args[index + 1]?.value === 'inplace')
    : args.some((token) => (/^-[A-Za-z]*i/.test(token.value) || token.value.startsWith('--in-place')));
  if (!hasInPlace || !['sed', 'perl', 'gawk', 'awk'].includes(command)) return false;

  const files = [];
  let scriptConsumed = false;
  let backupSuffix = '';
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token.value === '-e' || token.value === '--expression') {
      index += 1;
      scriptConsumed = true;
      continue;
    }
    if (token.value === '-f' || token.value === '--file') {
      index += 1;
      scriptConsumed = true;
      continue;
    }
    if (isAwk && token.value === '-i' && args[index + 1]?.value === 'inplace') {
      index += 1;
      continue;
    }
    const inPlaceMatch = token.value.match(/^(?:-[A-Za-z]*i|--in-place=)(.+)$/);
    if (inPlaceMatch) {
      backupSuffix = inPlaceMatch[1];
      continue;
    }
    if (token.value === '-i') {
      if (args[index + 1]?.value.startsWith('.') && !args[index + 1]?.dynamic) {
        backupSuffix = args[index + 1].value;
        index += 1;
      }
      continue;
    }
    if (token.value === '--in-place' || token.value.startsWith('-')) continue;
    if (!scriptConsumed) {
      scriptConsumed = true;
      continue;
    }
    files.push(token);
  }

  if (files.length === 0) result.unresolved = true;
  for (const file of files) {
    addTarget(result, file, `${command}-inplace`, 'target');
    if (backupSuffix) {
      addTarget(result, { ...file, value: `${file.value}${backupSuffix}` }, `${command}-inplace`, 'backup');
    }
  }
  result.operations.add(`${command}-inplace`);
  return true;
}

/**
 * Classify explicitly supported Bash writes. Unrecognized commands stay reads;
 * recognized writes with incomplete targets set unresolved=true.
 */
export function classifyBashWrites(command) {
  const tokens = tokenizeShell(command);
  const result = { writes: false, operations: new Set(), targets: [], unresolved: false, seen: new Set() };
  if (tokens.some((token) => token.type === 'error')) result.unresolved = true;

  for (const segment of splitSegments(tokens)) {
    for (let index = 0; index < segment.length; index += 1) {
      const token = segment[index];
      if (token.type !== 'operator' || !WRITE_REDIRECTS.has(token.value)) continue;
      const target = segment[index + 1];
      if (target?.type === 'word' && (target.value === '/dev/null' || /^&\d+$/.test(target.value))) continue;
      addTarget(result, target, 'redirect', 'target');
      result.operations.add('redirect');
    }

    const { command: commandName, args } = commandAndArgs(segment);
    if (!commandName) continue;
    if (commandName === 'tee' || commandName === 'sponge') {
      const values = operands(args);
      if (values.length === 0) result.unresolved = true;
      for (const token of values) addTarget(result, token, commandName, 'target');
      result.operations.add(commandName);
      continue;
    }
    if (classifyInPlace(commandName, args, result)) continue;
    classifyFileOperation(commandName, args, result);
  }

  result.writes = result.operations.size > 0 || result.targets.length > 0;
  return {
    writes: result.writes,
    operations: [...result.operations],
    targets: result.targets,
    unresolved: result.writes && result.unresolved,
  };
}

function realpathWithMissingTail(absolutePath) {
  const tail = [];
  let probe = absolutePath;
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    tail.unshift(path.basename(probe));
    probe = parent;
  }
  const realAncestor = fs.realpathSync(probe);
  return path.resolve(realAncestor, ...tail);
}

function isWithin(parentDir, childPath) {
  const relative = path.relative(parentDir, childPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function canonicalizeWriteTarget(rootDir, target) {
  const raw = typeof target === 'string' ? target : target?.raw;
  const dynamic = Boolean(typeof target === 'object' && target?.dynamic);
  if (typeof raw !== 'string' || raw === '' || dynamic || raw.startsWith('~') || raw.includes('\0')) {
    return {
      raw: typeof raw === 'string' ? raw : '',
      resolved: false,
      insideRepo: false,
      relativePath: null,
      reason: 'dynamic-or-invalid-target',
    };
  }

  const portable = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  if (/^[A-Za-z]:\//.test(portable) && process.platform !== 'win32') {
    return { raw, resolved: false, insideRepo: false, relativePath: null, reason: 'foreign-absolute-path' };
  }

  try {
    const canonicalRoot = fs.realpathSync(rootDir);
    const lexicalAbsolute = path.isAbsolute(portable)
      ? path.resolve(portable)
      : path.resolve(rootDir, portable);
    const canonicalAbsolute = realpathWithMissingTail(lexicalAbsolute);
    const insideRepo = isWithin(canonicalRoot, canonicalAbsolute);
    const relativePath = insideRepo
      ? path.relative(canonicalRoot, canonicalAbsolute).replace(/\\/g, '/') || '.'
      : null;
    return {
      raw,
      resolved: true,
      insideRepo,
      absolutePath: canonicalAbsolute,
      relativePath,
      reason: insideRepo ? 'inside-repo' : 'outside-repo',
    };
  } catch (error) {
    return { raw, resolved: false, insideRepo: false, relativePath: null, reason: `canonicalize-failed: ${error.message}` };
  }
}

export function analyzeHookWrite(event, rootDir) {
  const toolName = event?.tool_name || '';
  if (DIRECT_WRITE_TOOLS.has(toolName)) {
    const raw = event?.tool_input?.file_path;
    const target = typeof raw === 'string'
      ? canonicalizeWriteTarget(rootDir, { raw, dynamic: false })
      : null;
    return {
      writes: true,
      operations: [toolName.toLowerCase()],
      targets: target ? [target] : [],
      unresolved: !target || !target.resolved,
    };
  }
  if (toolName !== 'Bash') {
    return { writes: false, operations: [], targets: [], unresolved: false };
  }

  const classification = classifyBashWrites(event?.tool_input?.command || '');
  const targets = classification.targets.map((target) => ({
    ...target,
    ...canonicalizeWriteTarget(rootDir, target),
  }));
  return {
    ...classification,
    targets,
    unresolved: classification.unresolved || targets.some((target) => !target.resolved),
  };
}

export function isGovernanceWriteTarget(target) {
  if (!target?.resolved || !target.insideRepo || !target.relativePath) return false;
  return GOVERNANCE_PREFIXES.some((prefix) => (
    target.relativePath === prefix || target.relativePath.startsWith(`${prefix}/`)
  ));
}

export function allTargetsAreGovernanceWrites(analysis) {
  return Boolean(
    analysis?.writes &&
    !analysis.unresolved &&
    analysis.targets.length > 0 &&
    analysis.targets.every(isGovernanceWriteTarget)
  );
}
