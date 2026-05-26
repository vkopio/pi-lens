/**
 * Lightweight settings.json reader for pi-lens.
 *
 * Reads the user's pi settings file(s) and exposes pi-lens-specific
 * configuration keys under the `piLens` namespace.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const DEFAULT_FORMATTER: KotlinFormatterName = "ktlint";
const DEFAULT_STYLE: KotlinFormatterStyle = "kotlinlang-style";

export type KotlinFormatterName = "ktlint" | "ktfmt";
export type KotlinFormatterStyle = "kotlinlang-style" | "dropbox-style" | "google-style";

export interface PiLensSettings {
	kotlinFormatter: KotlinFormatterName;
	kotlinFormatterStyle: KotlinFormatterStyle;
}

const SETTINGS_PATHS = [
	path.join(os.homedir(), ".pi", "agent", "settings.json"),
	path.join(".pi", "settings.json"),
];

function loadRawSettings(): Record<string, unknown> {
	for (const fp of SETTINGS_PATHS) {
		try {
			const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
			if (data.piLens && typeof data.piLens === "object") {
				return data.piLens as Record<string, unknown>;
			}
		} catch {
			// file missing or invalid — ignore
		}
	}
	return {};
}

function isValidFormatterName(value: unknown): value is KotlinFormatterName {
	return value === "ktlint" || value === "ktfmt";
}

function isValidStyle(value: unknown): value is KotlinFormatterStyle {
	return (
		value === "kotlinlang-style" ||
		value === "dropbox-style" ||
		value === "google-style"
	);
}

let _cachedSettings: PiLensSettings | undefined;
let _formatterOverride: KotlinFormatterName | undefined;
let _styleOverride: KotlinFormatterStyle | undefined;

export function loadPiLensSettings(): PiLensSettings {
	if (_cachedSettings) return _cachedSettings;

	const raw = loadRawSettings();
	const formatter = isValidFormatterName(raw.kotlinFormatter)
		? raw.kotlinFormatter
		: DEFAULT_FORMATTER;
	const style = isValidStyle(raw.kotlinFormatterStyle)
		? raw.kotlinFormatterStyle
		: DEFAULT_STYLE;

	_cachedSettings = { kotlinFormatter: formatter, kotlinFormatterStyle: style };
	return _cachedSettings;
}

export function clearPiLensSettingsCache(): void {
	_cachedSettings = undefined;
}

export function setKotlinFormatterOverride(
	value: KotlinFormatterName | undefined,
): void {
	_formatterOverride = value;
}

export function setKotlinFormatterStyleOverride(
	value: KotlinFormatterStyle | undefined,
): void {
	_styleOverride = value;
}

/**
 * Resolve the effective Kotlin formatter name.
 *
 * Priority:
 * 1. Runtime override (set from CLI flag at extension load)
 * 2. CLI flag --lens-kotlin-formatter (when passed directly)
 * 3. settings.json → piLens.kotlinFormatter
 * 4. Fallback "ktlint"
 */
export function resolveKotlinFormatter(
	flagValue?: string | boolean | undefined,
): KotlinFormatterName {
	if (_formatterOverride && isValidFormatterName(_formatterOverride)) {
		return _formatterOverride;
	}
	if (typeof flagValue === "string" && isValidFormatterName(flagValue)) {
		return flagValue;
	}
	return loadPiLensSettings().kotlinFormatter;
}

/**
 * Resolve the effective Kotlin formatter style.
 *
 * Priority:
 * 1. Runtime override (set from CLI flag at extension load)
 * 2. CLI flag --lens-kotlin-style (when passed directly)
 * 3. settings.json → piLens.kotlinFormatterStyle
 * 4. Fallback "kotlinlang-style"
 */
export function resolveKotlinFormatterStyle(
	flagValue?: string | boolean | undefined,
): KotlinFormatterStyle {
	if (_styleOverride && isValidStyle(_styleOverride)) {
		return _styleOverride;
	}
	if (typeof flagValue === "string" && isValidStyle(flagValue)) {
		return flagValue;
	}
	return loadPiLensSettings().kotlinFormatterStyle;
}
