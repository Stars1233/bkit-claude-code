/**
 * CCPayloadPort — Type-only Port (DIP) for CC hook payload IO.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §2.3
 * Plan SC: Clean Architecture Layer - Domain depends on this Port, Infrastructure implements it.
 *
 * This file is a Type-only module. Runtime export is empty ({}).
 * JSDoc typedefs below are consumed by `tsc --checkJs --noEmit` in CI.
 *
 * @module lib/domain/ports/cc-payload.port
 */

/**
 * @typedef {Object} HookInput
 * @property {string} [tool_name] - Name of the CC tool invoked (Write/Edit/Bash/etc.)
 * @property {Object} [tool_input] - Tool-specific arguments
 * @property {string} [session_id] - CC session identifier
 * @property {Object} [cwd] - Current working directory context
 * @property {Object} [permissions] - Permission flags (bypassPermissions, dangerouslyDisableSandbox)
 */

/**
 * @typedef {Object} HookOutput
 * @property {'allow'|'deny'|'ask'|'defer'} [decision]
 * @property {'allow'|'deny'|'ask'|'defer'} [permissionDecision]
 * @property {string} [reason]
 * @property {string} [additionalContext]
 * @property {Object} [updatedInput]
 * @property {string} [stopReason]
 */

/**
 * @typedef {Object} CCPayloadPort
 * @property {() => Promise<HookInput>} read - Parse stdin JSON into HookInput
 * @property {(out: HookOutput) => void} write - Serialize HookOutput to stdout JSON
 * @property {(msg: string) => void} warn - Write warning to stderr
 */

module.exports = {};
