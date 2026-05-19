/**
 * Safe serialization for inline JSON-LD inside <script> tags.
 *
 * JSON.stringify produces strings that may contain `<`, `>`, `&`,
 * U+2028, U+2029. A user-controlled `</script>` substring inside a
 * JSON string field is the classic JSON-LD XSS - the HTML parser
 * closes the script tag mid-payload, and everything after becomes
 * markup. Escaping these chars as \\u00XX keeps the JSON
 * semantically identical (parsers decode the escape) while making
 * the byte sequence non-special to the HTML tokenizer.
 *
 * U+2028 / U+2029 are JS line terminators inside string literals
 * (they would break inline <script> blocks that embed the JSON-LD
 * payload), so we escape those too.
 */
const LINE_SEP_2028 = /\u2028/g;
const LINE_SEP_2029 = /\u2029/g;

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEP_2028, "\\u2028")
    .replace(LINE_SEP_2029, "\\u2029");
}
