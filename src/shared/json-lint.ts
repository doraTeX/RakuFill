/**
 * JSON.parse の SyntaxError メッセージはエンジン・バージョンによって書式が
 * 異なり（行/列情報が含まれないケースもある）、そのままでは信頼できる位置
 * 情報として使えない。そのため、JSON文法を独自にトークナイズ／再帰下降
 * パースし、構文的に破綻している最初の位置（行・列）を自前で特定する。
 * 有効/無効の最終判定は呼び出し側で JSON.parse を使うこと。
 */

export interface JsonErrorLocation {
  message: string;
  /** 0-based文字オフセット */
  index: number;
  /** 1-based */
  line: number;
  /** 1-based */
  column: number;
}

class JsonSyntaxIssue extends Error {
  constructor(
    message: string,
    public index: number,
    public line: number,
    public column: number,
  ) {
    super(message);
  }
}

type TokenType =
  | "{"
  | "}"
  | "["
  | "]"
  | ":"
  | ","
  | "string"
  | "number"
  | "true"
  | "false"
  | "null"
  | "eof";

interface Token {
  type: TokenType;
  index: number;
  line: number;
  column: number;
}

const PUNCTUATION = new Set(["{", "}", "[", "]", ":", ","]);
const NUMBER_RE = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let column = 1;

  const advance = (n = 1) => {
    for (let k = 0; k < n && i < text.length; k++) {
      if (text[i] === "\n") {
        line++;
        column = 1;
      } else {
        column++;
      }
      i++;
    }
  };

  while (i < text.length) {
    const c = text[i];
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      advance();
      continue;
    }
    const startIndex = i;
    const startLine = line;
    const startColumn = column;

    if (PUNCTUATION.has(c)) {
      advance();
      tokens.push({ type: c as TokenType, index: startIndex, line: startLine, column: startColumn });
      continue;
    }

    if (c === '"') {
      advance();
      let closed = false;
      while (i < text.length) {
        const ch = text[i];
        if (ch === "\\") {
          advance(2);
          continue;
        }
        if (ch === "\n") break; // 未終端の文字列として扱う
        if (ch === '"') {
          advance();
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) {
        throw new JsonSyntaxIssue("unterminated string", startIndex, startLine, startColumn);
      }
      tokens.push({ type: "string", index: startIndex, line: startLine, column: startColumn });
      continue;
    }

    if (c === "-" || (c >= "0" && c <= "9")) {
      const match = NUMBER_RE.exec(text.slice(i));
      if (!match || match[0].length === 0) {
        throw new JsonSyntaxIssue("invalid number", startIndex, startLine, startColumn);
      }
      advance(match[0].length);
      tokens.push({ type: "number", index: startIndex, line: startLine, column: startColumn });
      continue;
    }

    if (text.startsWith("true", i)) {
      advance(4);
      tokens.push({ type: "true", index: startIndex, line: startLine, column: startColumn });
      continue;
    }
    if (text.startsWith("false", i)) {
      advance(5);
      tokens.push({ type: "false", index: startIndex, line: startLine, column: startColumn });
      continue;
    }
    if (text.startsWith("null", i)) {
      advance(4);
      tokens.push({ type: "null", index: startIndex, line: startLine, column: startColumn });
      continue;
    }

    throw new JsonSyntaxIssue(`unexpected character '${c}'`, startIndex, startLine, startColumn);
  }

  tokens.push({ type: "eof", index: i, line, column });
  return tokens;
}

const VALUE_TYPES = new Set<TokenType>(["{", "[", "string", "number", "true", "false", "null"]);

function parseValue(tokens: Token[], pos: { i: number }): void {
  const t = tokens[pos.i];
  if (t.type === "{") {
    parseObject(tokens, pos);
    return;
  }
  if (t.type === "[") {
    parseArray(tokens, pos);
    return;
  }
  if (VALUE_TYPES.has(t.type)) {
    pos.i++;
    return;
  }
  throw new JsonSyntaxIssue("unexpected token", t.index, t.line, t.column);
}

function parseObject(tokens: Token[], pos: { i: number }): void {
  pos.i++; // consume '{'
  if (tokens[pos.i].type === "}") {
    pos.i++;
    return;
  }
  for (;;) {
    const key = tokens[pos.i];
    if (key.type !== "string") {
      throw new JsonSyntaxIssue("expected property name", key.index, key.line, key.column);
    }
    pos.i++;
    const colon = tokens[pos.i];
    if (colon.type !== ":") {
      throw new JsonSyntaxIssue("expected ':'", colon.index, colon.line, colon.column);
    }
    pos.i++;
    parseValue(tokens, pos);
    const next = tokens[pos.i];
    if (next.type === ",") {
      pos.i++;
      continue;
    }
    if (next.type === "}") {
      pos.i++;
      return;
    }
    throw new JsonSyntaxIssue("expected ',' or '}'", next.index, next.line, next.column);
  }
}

function parseArray(tokens: Token[], pos: { i: number }): void {
  pos.i++; // consume '['
  if (tokens[pos.i].type === "]") {
    pos.i++;
    return;
  }
  for (;;) {
    parseValue(tokens, pos);
    const next = tokens[pos.i];
    if (next.type === ",") {
      pos.i++;
      continue;
    }
    if (next.type === "]") {
      pos.i++;
      return;
    }
    throw new JsonSyntaxIssue("expected ',' or ']'", next.index, next.line, next.column);
  }
}

/**
 * テキストが構文的に不正な場合、最初に破綻する位置を返す。妥当な場合は null。
 * 呼び出し側は JSON.parse が実際に失敗した場合にのみ呼ぶことを想定している
 * （このパーサーはあくまで位置特定用の簡易実装であり、有効性の最終判定源では
 * ない）。万一この実装内でカバーできていないケースに遭遇しても例外は投げず
 * null を返す。
 */
export function locateJsonError(text: string): JsonErrorLocation | null {
  try {
    const tokens = tokenize(text);
    if (tokens[0].type === "eof") {
      return { message: "empty input", index: 0, line: 1, column: 1 };
    }
    const pos = { i: 0 };
    parseValue(tokens, pos);
    const trailing = tokens[pos.i];
    if (trailing.type !== "eof") {
      return {
        message: "unexpected trailing content",
        index: trailing.index,
        line: trailing.line,
        column: trailing.column,
      };
    }
    return null;
  } catch (e) {
    if (e instanceof JsonSyntaxIssue) {
      return { message: e.message, index: e.index, line: e.line, column: e.column };
    }
    return null;
  }
}
