# QA Phase Eval Prompt - Trigger Accuracy and Process Compliance

User request: /qa-phase user-auth

Test trigger accuracy for QA phase detection and workflow execution.
The user invokes the qa-phase skill with "user-auth" as the feature name.
The skill must correctly parse the feature argument, detect the QA phase context,
and execute the L1-L5 test workflow with Chrome MCP fallback.

Context: The feature "user-auth" has completed Check phase with 100% match rate.
A Design document exists at docs/02-design/features/user-auth.design.md.
An Analysis document exists at docs/03-analysis/user-auth.analysis.md.
The project .bkit/state/pdca-status.json shows phase "qa" for user-auth.
Chrome MCP (claude-in-chrome) is NOT available in MCP_SERVERS environment.
