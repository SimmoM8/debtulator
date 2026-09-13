import type { Currency } from "@/src/features/currencies/model/Currency";
import type { Money } from "@/src/features/currencies/model/Money";

const DECIMAL_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

export function createMoney(amount: string, currencyCode: string): Money {
  return {
    amount: normalizeDecimal(amount),
    currencyCode: requireCurrencyCode(currencyCode),
  };
}

export function zeroMoney(currencyCode: string): Money {
  return createMoney("0", currencyCode);
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);

  return createMoney(
    addDecimalStrings(left.amount, right.amount),
    left.currencyCode,
  );
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);

  return createMoney(
    addDecimalStrings(left.amount, negateDecimal(right.amount)),
    left.currencyCode,
  );
}

export function absoluteMoney(money: Money): Money {
  return createMoney(
    money.amount.startsWith("-") ? money.amount.slice(1) : money.amount,
    money.currencyCode,
  );
}

export function compareMoney(left: Money, right: Money): number {
  assertSameCurrency(left, right);
  return compareDecimals(left.amount, right.amount);
}

export function isPositiveMoney(money: Money): boolean {
  return compareDecimals(money.amount, "0") > 0;
}

export function isNegativeMoney(money: Money): boolean {
  return compareDecimals(money.amount, "0") < 0;
}

export function convertMoney(
  money: Money,
  targetCurrencyCode: string,
): Money {
  /*
   * Currency exchange is intentionally 1:1 for the current product phase.
   * Keep this boundary stable. Future synchronized exchange-rate data should
   * change this implementation rather than changing consumers or UI code.
   */
  return createMoney(money.amount, targetCurrencyCode);
}

export function hasAllowedDecimalPlaces(
  money: Money,
  currency: Currency,
): boolean {
  if (money.currencyCode !== currency.code) {
    return false;
  }

  const fraction = money.amount.replace(/^-/, "").split(".")[1] ?? "";
  return fraction.length <= currency.decimalPlaces;
}

export function hasAllowedIntegerDigits(
  money: Money,
  maximumIntegerDigits = 30,
): boolean {
  const unsigned = money.amount.replace(/^-/, "");
  const integer = unsigned.split(".")[0].replace(/^0+/, "") || "0";
  return integer.length <= maximumIntegerDigits;
}

export function isValidPositiveMoneyInput(value: string): boolean {
  try {
    return compareDecimals(normalizeDecimal(value), "0") > 0;
  } catch {
    return false;
  }
}

export function formatMoney(money: Money): string {
  const significantDigits = money.amount.replace(/[-.]/g, "").replace(/^0+/, "");

  /*
   * Intl.NumberFormat accepts number rather than an exact decimal string. Use
   * it only where conversion to number remains presentation-safe; otherwise
   * preserve the canonical decimal text exactly.
   */
  if (significantDigits.length <= 15) {
    const amount = Number(money.amount);

    if (Number.isFinite(amount)) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: money.currencyCode,
          maximumFractionDigits: 8,
        }).format(amount);
      } catch {
        // Fall through to the exact, code-based representation below.
      }
    }
  }

  return `${money.amount} ${money.currencyCode}`;
}

export function formatSignedMoney(money: Money): string {
  if (isPositiveMoney(money)) {
    return `+${formatMoney(money)}`;
  }

  return formatMoney(money);
}

export function normalizeDecimal(value: string): string {
  const trimmed = value.trim().replace(",", ".");

  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new Error("Invalid decimal amount.");
  }

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [rawInteger, rawFraction = ""] = unsigned.split(".");
  const integer = (rawInteger || "0").replace(/^0+(?=\d)/, "");
  const fraction = rawFraction.replace(/0+$/, "");
  const normalized = fraction.length > 0 ? `${integer}.${fraction}` : integer;

  if (/^0(?:\.0*)?$/.test(normalized)) {
    return "0";
  }

  return negative ? `-${normalized}` : normalized;
}

function requireCurrencyCode(value: string): string {
  const code = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(code)) {
    throw new Error("Invalid currency code.");
  }

  return code;
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currencyCode !== right.currencyCode) {
    throw new Error("Money values must use the same currency.");
  }
}

function negateDecimal(value: string): string {
  const normalized = normalizeDecimal(value);

  if (normalized === "0") {
    return "0";
  }

  return normalized.startsWith("-") ? normalized.slice(1) : `-${normalized}`;
}

function compareDecimals(left: string, right: string): number {
  const a = parseDecimal(left);
  const b = parseDecimal(right);

  if (a.negative !== b.negative) {
    return a.negative ? -1 : 1;
  }

  const magnitude = compareUnsignedAligned(a, b);
  return a.negative ? -magnitude : magnitude;
}

function addDecimalStrings(left: string, right: string): string {
  const a = parseDecimal(left);
  const b = parseDecimal(right);
  const scale = Math.max(a.scale, b.scale);
  const aDigits = a.digits.padEnd(a.digits.length + scale - a.scale, "0");
  const bDigits = b.digits.padEnd(b.digits.length + scale - b.scale, "0");

  if (a.negative === b.negative) {
    return formatScaledInteger(
      addUnsigned(aDigits, bDigits),
      scale,
      a.negative,
    );
  }

  const comparison = compareUnsigned(aDigits, bDigits);

  if (comparison === 0) {
    return "0";
  }

  if (comparison > 0) {
    return formatScaledInteger(
      subtractUnsigned(aDigits, bDigits),
      scale,
      a.negative,
    );
  }

  return formatScaledInteger(
    subtractUnsigned(bDigits, aDigits),
    scale,
    b.negative,
  );
}

type ParsedDecimal = {
  negative: boolean;
  digits: string;
  scale: number;
};

function parseDecimal(value: string): ParsedDecimal {
  const normalized = normalizeDecimal(value);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integer, fraction = ""] = unsigned.split(".");

  return {
    negative,
    digits: `${integer}${fraction}`.replace(/^0+(?=\d)/, "") || "0",
    scale: fraction.length,
  };
}

function compareUnsignedAligned(a: ParsedDecimal, b: ParsedDecimal): number {
  const scale = Math.max(a.scale, b.scale);
  const aDigits = a.digits.padEnd(a.digits.length + scale - a.scale, "0");
  const bDigits = b.digits.padEnd(b.digits.length + scale - b.scale, "0");
  return compareUnsigned(aDigits, bDigits);
}

function compareUnsigned(left: string, right: string): number {
  const a = left.replace(/^0+(?=\d)/, "");
  const b = right.replace(/^0+(?=\d)/, "");

  if (a.length !== b.length) {
    return a.length > b.length ? 1 : -1;
  }

  if (a === b) {
    return 0;
  }

  return a > b ? 1 : -1;
}

function addUnsigned(left: string, right: string): string {
  let carry = 0;
  let result = "";
  let i = left.length - 1;
  let j = right.length - 1;

  while (i >= 0 || j >= 0 || carry > 0) {
    const a = i >= 0 ? left.charCodeAt(i) - 48 : 0;
    const b = j >= 0 ? right.charCodeAt(j) - 48 : 0;
    const sum = a + b + carry;

    result = `${sum % 10}${result}`;
    carry = Math.floor(sum / 10);
    i -= 1;
    j -= 1;
  }

  return result;
}

function subtractUnsigned(left: string, right: string): string {
  let borrow = 0;
  let result = "";
  let i = left.length - 1;
  let j = right.length - 1;

  while (i >= 0) {
    let digit = left.charCodeAt(i) - 48 - borrow;
    const subtract = j >= 0 ? right.charCodeAt(j) - 48 : 0;

    if (digit < subtract) {
      digit += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }

    result = `${digit - subtract}${result}`;
    i -= 1;
    j -= 1;
  }

  return result.replace(/^0+(?=\d)/, "") || "0";
}

function formatScaledInteger(
  digits: string,
  scale: number,
  negative: boolean,
): string {
  const padded = digits.padStart(scale + 1, "0");
  const integer = padded.slice(0, padded.length - scale) || "0";
  const fraction = scale > 0 ? padded.slice(-scale).replace(/0+$/, "") : "";
  const unsigned = fraction ? `${integer}.${fraction}` : integer;

  if (unsigned === "0") {
    return "0";
  }

  return negative ? `-${unsigned}` : unsigned;
}
