# bkit v2.0.0 영역 6 — MCP Server 번들링 상세 설계

> **Summary**: bkit-pdca-server + bkit-analysis-server MCP 서버 구현, .mcp.json 번들 설정, Studio 연동 API 스키마 전체 정의
>
> **Project**: bkit
> **Version**: 2.0.0
> **Author**: bkend-expert Agent
> **Date**: 2026-03-19
> **Status**: Draft
> **Planning Doc**: [bkit-v200-enhancement.plan.md](../../01-plan/features/bkit-v200-enhancement.plan.md)
> **영역**: 영역 6 (MCP Server 번들링)

---

## 1. 개요

### 1.1 설계 목표

영역 6은 bkit Plugin 내부 상태를 외부 도구(bkit Studio, 다른 AI 에이전트, CI/CD 시스템)가 표준 MCP 프로토콜로 조회할 수 있는 데이터 레이어를 구축한다.

| 서버 | 역할 | 주요 소비자 |
|------|------|------------|
| `bkit-pdca-server` | PDCA 상태/문서/메트릭 조회 | bkit Studio, AI 에이전트, CI |
| `bkit-analysis-server` | 코드 분석 결과 캐싱/갭 분석/감사 로그 | bkit Studio, code-analyzer 에이전트 |

### 1.2 설계 원칙

- **읽기 전용 우선**: 두 서버 모두 기본적으로 읽기 도구. 쓰기 도구는 명시적으로 표시
- **외부 의존성 금지**: `@modelcontextprotocol/sdk`만 허용, 그 외 npm 패키지 불가
- **파일 기반**: `.bkit/` 디렉토리 파일을 직접 읽음 (DB/네트워크 없음)
- **stdio transport**: CC Plugin에 번들되어 subprocess로 실행
- **에러 표준화**: 모든 오류는 MCP `isError: true` + `BkitMcpError` 형식으로 응답

### 1.3 MCP 프로토콜 버전

```
MCP Protocol Version: 2024-11-05 (또는 최신 안정 버전)
SDK: @modelcontextprotocol/sdk ^1.0.0
Transport: stdio (StdioServerTransport)
```

---

## 2. 디렉토리 구조

```
servers/
├── bkit-pdca-server/
│   ├── package.json
│   ├── index.js                  # 서버 진입점 (stdio transport)
│   ├── lib/
│   │   ├── tools/
│   │   │   ├── pdca-status.js    # bkit_pdca_status
│   │   │   ├── pdca-history.js   # bkit_pdca_history
│   │   │   ├── feature-list.js   # bkit_feature_list
│   │   │   ├── feature-detail.js # bkit_feature_detail
│   │   │   ├── plan-read.js      # bkit_plan_read
│   │   │   ├── design-read.js    # bkit_design_read
│   │   │   ├── analysis-read.js  # bkit_analysis_read
│   │   │   ├── report-read.js    # bkit_report_read
│   │   │   ├── metrics-get.js    # bkit_metrics_get
│   │   │   └── metrics-history.js # bkit_metrics_history
│   │   ├── resources/
│   │   │   ├── pdca-status.js    # bkit://pdca/status
│   │   │   ├── quality-metrics.js # bkit://quality/metrics
│   │   │   └── audit-latest.js   # bkit://audit/latest
│   │   └── utils/
│   │       ├── file-reader.js    # 파일 읽기 유틸리티 (안전한 경로 검증)
│   │       ├── path-resolver.js  # BKIT_ROOT 기반 경로 해석
│   │       └── error.js          # BkitMcpError 클래스
│   └── __tests__/
│       ├── tools.test.js
│       └── resources.test.js
│
└── bkit-analysis-server/
    ├── package.json
    ├── index.js
    ├── lib/
    │   ├── tools/
    │   │   ├── code-quality.js       # bkit_code_quality
    │   │   ├── gap-analysis.js       # bkit_gap_analysis
    │   │   ├── regression-rules.js   # bkit_regression_rules
    │   │   ├── checkpoint-list.js    # bkit_checkpoint_list
    │   │   ├── checkpoint-detail.js  # bkit_checkpoint_detail
    │   │   └── audit-search.js       # bkit_audit_search
    │   └── utils/
    │       ├── file-reader.js
    │       ├── path-resolver.js
    │       ├── jsonl-reader.js       # JSONL 파싱 유틸리티
    │       └── error.js
    └── __tests__/
        └── tools.test.js
```

---

## 3. bkit-pdca-server 상세 설계

### 3.1 package.json

```json
{
  "name": "bkit-pdca-server",
  "version": "2.0.0",
  "description": "bkit PDCA status and document MCP server",
  "type": "module",
  "main": "index.js",
  "bin": {
    "bkit-pdca-server": "./index.js"
  },
  "scripts": {
    "start": "node index.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 3.2 index.js — 서버 진입점

```javascript
#!/usr/bin/env node
/**
 * bkit-pdca-server: PDCA 상태/문서/메트릭 MCP 서버
 *
 * stdio transport로 실행됨.
 * BKIT_ROOT 환경변수로 프로젝트 루트를 전달받음.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Tool handlers
import { handlePdcaStatus, PDCA_STATUS_TOOL } from './lib/tools/pdca-status.js';
import { handlePdcaHistory, PDCA_HISTORY_TOOL } from './lib/tools/pdca-history.js';
import { handleFeatureList, FEATURE_LIST_TOOL } from './lib/tools/feature-list.js';
import { handleFeatureDetail, FEATURE_DETAIL_TOOL } from './lib/tools/feature-detail.js';
import { handlePlanRead, PLAN_READ_TOOL } from './lib/tools/plan-read.js';
import { handleDesignRead, DESIGN_READ_TOOL } from './lib/tools/design-read.js';
import { handleAnalysisRead, ANALYSIS_READ_TOOL } from './lib/tools/analysis-read.js';
import { handleReportRead, REPORT_READ_TOOL } from './lib/tools/report-read.js';
import { handleMetricsGet, METRICS_GET_TOOL } from './lib/tools/metrics-get.js';
import { handleMetricsHistory, METRICS_HISTORY_TOOL } from './lib/tools/metrics-history.js';

// Resource handlers
import { handlePdcaStatusResource, PDCA_STATUS_RESOURCE } from './lib/resources/pdca-status.js';
import { handleQualityMetricsResource, QUALITY_METRICS_RESOURCE } from './lib/resources/quality-metrics.js';
import { handleAuditLatestResource, AUDIT_LATEST_RESOURCE } from './lib/resources/audit-latest.js';

const TOOLS = [
  PDCA_STATUS_TOOL, PDCA_HISTORY_TOOL, FEATURE_LIST_TOOL, FEATURE_DETAIL_TOOL,
  PLAN_READ_TOOL, DESIGN_READ_TOOL, ANALYSIS_READ_TOOL, REPORT_READ_TOOL,
  METRICS_GET_TOOL, METRICS_HISTORY_TOOL,
];

const RESOURCES = [
  PDCA_STATUS_RESOURCE, QUALITY_METRICS_RESOURCE, AUDIT_LATEST_RESOURCE,
];

const TOOL_HANDLERS = {
  bkit_pdca_status: handlePdcaStatus,
  bkit_pdca_history: handlePdcaHistory,
  bkit_feature_list: handleFeatureList,
  bkit_feature_detail: handleFeatureDetail,
  bkit_plan_read: handlePlanRead,
  bkit_design_read: handleDesignRead,
  bkit_analysis_read: handleAnalysisRead,
  bkit_report_read: handleReportRead,
  bkit_metrics_get: handleMetricsGet,
  bkit_metrics_history: handleMetricsHistory,
};

const RESOURCE_HANDLERS = {
  'bkit://pdca/status': handlePdcaStatusResource,
  'bkit://quality/metrics': handleQualityMetricsResource,
  'bkit://audit/latest': handleAuditLatestResource,
};

const server = new Server(
  { name: 'bkit-pdca-server', version: '2.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  }
  return handler(args);
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const handler = RESOURCE_HANDLERS[uri];
  if (!handler) {
    throw new Error(`Unknown resource: ${uri}`);
  }
  return handler();
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`[bkit-pdca-server] Fatal: ${err.message}\n`);
  process.exit(1);
});
```

### 3.3 공통 유틸리티

#### utils/error.js

```javascript
/**
 * BkitMcpError: MCP 도구 응답에서 사용하는 표준 에러 클래스
 */
export class BkitMcpError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'BkitMcpError';
    this.code = code; // 'NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_ARGS' | 'IO_ERROR' | 'PARSE_ERROR'
    this.details = details;
  }

  toMcpResponse() {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: { code: this.code, message: this.message, details: this.details }
        }, null, 2),
      }],
      isError: true,
    };
  }
}

/**
 * 모든 Tool handler에서 try/catch 없이 에러 응답을 보장하는 래퍼
 */
export function withErrorHandling(handler) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (err) {
      if (err instanceof BkitMcpError) return err.toMcpResponse();
      return new BkitMcpError('IO_ERROR', err.message).toMcpResponse();
    }
  };
}
```

#### utils/path-resolver.js

```javascript
import path from 'path';
import fs from 'fs';

/**
 * BKIT_ROOT 환경변수 기반 경로 해석기
 * 보안: ../를 통한 경로 탈출 방지
 */
export class PathResolver {
  constructor() {
    this.root = process.env.BKIT_ROOT || process.cwd();
    this.bkitDir = path.join(this.root, '.bkit');
    this.docsDir = path.join(this.root, 'docs');
  }

  /**
   * 프로젝트 내부 경로인지 검증
   */
  resolve(relativePath) {
    const resolved = path.resolve(this.root, relativePath);
    if (!resolved.startsWith(this.root)) {
      throw new BkitMcpError('PERMISSION_DENIED', `Path outside project root: ${relativePath}`);
    }
    return resolved;
  }

  state(filename) {
    return path.join(this.bkitDir, 'state', filename);
  }

  audit(filename) {
    return path.join(this.bkitDir, 'audit', filename);
  }

  decisions(filename) {
    return path.join(this.bkitDir, 'decisions', filename);
  }

  checkpoints() {
    return path.join(this.bkitDir, 'checkpoints');
  }

  docs(phase, feature) {
    // phase: 'plan' | 'design' | 'analysis' | 'report'
    const phaseMap = {
      plan: '01-plan',
      design: '02-design',
      analysis: '03-analysis',
      report: '04-report',
    };
    const dir = phaseMap[phase];
    if (!dir) throw new BkitMcpError('INVALID_ARGS', `Unknown phase: ${phase}`);
    return path.join(this.docsDir, dir, 'features', `${feature}.${phase}.md`);
  }
}

import { BkitMcpError } from './error.js';

export const pathResolver = new PathResolver();
```

#### utils/file-reader.js

```javascript
import fs from 'fs';
import { BkitMcpError } from './error.js';

/**
 * 안전한 파일 읽기 (존재하지 않으면 NOT_FOUND 에러)
 */
export function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new BkitMcpError('NOT_FOUND', `File not found: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new BkitMcpError('PARSE_ERROR', `JSON parse error: ${filePath}`, err.message);
  }
}

export function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new BkitMcpError('NOT_FOUND', `File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

export function readJsonOrNull(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}
```

### 3.4 도구(Tool) 전체 정의

#### Tool 1: bkit_pdca_status

**목적**: 현재 PDCA 전체 상태 조회 (전체 또는 특정 Feature)

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "description": "조회할 Feature 이름. 생략 시 전체 요약 반환"
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "version": { "type": "string" },
    "lastUpdated": { "type": "string", "format": "date-time" },
    "primaryFeature": { "type": "string" },
    "activeFeatures": {
      "type": "array",
      "items": { "type": "string" }
    },
    "summary": {
      "type": "object",
      "properties": {
        "total": { "type": "integer" },
        "byPhase": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        }
      }
    },
    "feature": {
      "type": "object",
      "description": "feature 파라미터가 지정된 경우에만 포함",
      "properties": {
        "name": { "type": "string" },
        "phase": { "type": "string", "enum": ["pm", "plan", "design", "do", "check", "act", "report", "completed", "archived"] },
        "phaseNumber": { "type": "integer" },
        "matchRate": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
        "iterationCount": { "type": "integer" },
        "timestamps": {
          "type": "object",
          "properties": {
            "started": { "type": "string", "format": "date-time" },
            "completed": { "type": ["string", "null"], "format": "date-time" },
            "lastUpdated": { "type": "string", "format": "date-time" }
          }
        },
        "documents": {
          "type": "object",
          "properties": {
            "plan": { "type": "string" },
            "design": { "type": "string" },
            "analysis": { "type": "string" },
            "report": { "type": "string" }
          }
        },
        "metrics": { "type": "object", "additionalProperties": true }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/pdca-status.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJson } from '../utils/file-reader.js';
import { BkitMcpError, withErrorHandling } from '../utils/error.js';

export const PDCA_STATUS_TOOL = {
  name: 'bkit_pdca_status',
  description: '현재 PDCA 전체 상태를 조회합니다. feature 파라미터로 특정 Feature의 상세 상태를 조회할 수 있습니다.',
  inputSchema: {
    type: 'object',
    properties: {
      feature: {
        type: 'string',
        description: '조회할 Feature 이름. 생략 시 전체 요약 반환',
      },
    },
    additionalProperties: false,
  },
};

export const handlePdcaStatus = withErrorHandling(async ({ feature } = {}) => {
  const statusPath = pathResolver.state('pdca-status.json');
  const status = readJson(statusPath);

  let result;
  if (feature) {
    const featureData = status.features?.[feature];
    if (!featureData) {
      throw new BkitMcpError('NOT_FOUND', `Feature not found: ${feature}`);
    }
    result = {
      version: status.version,
      lastUpdated: status.lastUpdated,
      primaryFeature: status.primaryFeature,
      activeFeatures: status.activeFeatures || [],
      feature: { name: feature, ...featureData },
    };
  } else {
    const features = status.features || {};
    const byPhase = {};
    for (const f of Object.values(features)) {
      byPhase[f.phase] = (byPhase[f.phase] || 0) + 1;
    }
    result = {
      version: status.version,
      lastUpdated: status.lastUpdated,
      primaryFeature: status.primaryFeature,
      activeFeatures: status.activeFeatures || [],
      summary: { total: Object.keys(features).length, byPhase },
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});
```

---

#### Tool 2: bkit_pdca_history

**목적**: PDCA 히스토리 조회 (타임라인 이벤트 목록)

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "description": "특정 Feature 필터. 생략 시 전체"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 200,
      "default": 50,
      "description": "반환할 최대 항목 수"
    },
    "since": {
      "type": "string",
      "format": "date-time",
      "description": "이 시각 이후 이벤트만 반환"
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "total": { "type": "integer" },
    "filtered": { "type": "integer" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "feature": { "type": "string" },
          "phase": { "type": "string" },
          "action": { "type": "string" },
          "details": { "type": ["string", "null"] }
        },
        "required": ["timestamp", "feature", "phase", "action"]
      }
    }
  }
}
```

**구현 파일**: `lib/tools/pdca-history.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJson } from '../utils/file-reader.js';
import { withErrorHandling } from '../utils/error.js';

export const PDCA_HISTORY_TOOL = {
  name: 'bkit_pdca_history',
  description: 'PDCA 히스토리 이벤트를 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      feature: { type: 'string', description: '특정 Feature 필터. 생략 시 전체' },
      limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      since: { type: 'string', format: 'date-time', description: '이 시각 이후 이벤트만 반환' },
    },
    additionalProperties: false,
  },
};

export const handlePdcaHistory = withErrorHandling(async ({ feature, limit = 50, since } = {}) => {
  const status = readJson(pathResolver.state('pdca-status.json'));
  let history = status.history || [];

  if (feature) history = history.filter(h => h.feature === feature);
  if (since) {
    const sinceMs = new Date(since).getTime();
    history = history.filter(h => new Date(h.timestamp).getTime() >= sinceMs);
  }

  const total = (status.history || []).length;
  const filtered = history.length;
  const items = history.slice(-limit);

  return {
    content: [{ type: 'text', text: JSON.stringify({ total, filtered, items }, null, 2) }],
  };
});
```

---

#### Tool 3: bkit_feature_list

**목적**: 활성/완료 Feature 목록 조회

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["active", "completed", "archived", "all"],
      "default": "all",
      "description": "필터: active=진행중, completed=완료, archived=아카이브, all=전체"
    },
    "phase": {
      "type": "string",
      "enum": ["pm", "plan", "design", "do", "check", "act", "report", "completed", "archived"],
      "description": "특정 Phase로 필터"
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "total": { "type": "integer" },
    "features": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "phase": { "type": "string" },
          "matchRate": { "type": ["number", "null"] },
          "iterationCount": { "type": "integer" },
          "startedAt": { "type": "string", "format": "date-time" },
          "lastUpdatedAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/feature-list.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJson } from '../utils/file-reader.js';
import { withErrorHandling } from '../utils/error.js';

export const FEATURE_LIST_TOOL = {
  name: 'bkit_feature_list',
  description: '활성/완료 Feature 목록을 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'completed', 'archived', 'all'],
        default: 'all',
      },
      phase: {
        type: 'string',
        enum: ['pm', 'plan', 'design', 'do', 'check', 'act', 'report', 'completed', 'archived'],
      },
    },
    additionalProperties: false,
  },
};

const ACTIVE_PHASES = new Set(['pm', 'plan', 'design', 'do', 'check', 'act', 'report']);

export const handleFeatureList = withErrorHandling(async ({ status = 'all', phase } = {}) => {
  const data = readJson(pathResolver.state('pdca-status.json'));
  const features = data.features || {};

  let list = Object.entries(features).map(([name, f]) => ({
    name,
    phase: f.phase,
    matchRate: f.matchRate ?? null,
    iterationCount: f.iterationCount ?? 0,
    startedAt: f.timestamps?.started ?? null,
    lastUpdatedAt: f.timestamps?.lastUpdated ?? null,
  }));

  if (status === 'active') list = list.filter(f => ACTIVE_PHASES.has(f.phase));
  else if (status === 'completed') list = list.filter(f => f.phase === 'completed');
  else if (status === 'archived') list = list.filter(f => f.phase === 'archived');

  if (phase) list = list.filter(f => f.phase === phase);

  return {
    content: [{ type: 'text', text: JSON.stringify({ total: list.length, features: list }, null, 2) }],
  };
});
```

---

#### Tool 4: bkit_feature_detail

**목적**: 특정 Feature의 상세 정보 (단계, 메트릭, 타임스탬프, 연결 문서)

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "description": "조회할 Feature 이름"
    }
  },
  "required": ["feature"],
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "phase": { "type": "string" },
    "phaseNumber": { "type": "integer" },
    "matchRate": { "type": ["number", "null"] },
    "iterationCount": { "type": "integer" },
    "requirements": { "type": "array", "items": { "type": "string" } },
    "documents": {
      "type": "object",
      "properties": {
        "plan": { "type": ["string", "null"] },
        "design": { "type": ["string", "null"] },
        "analysis": { "type": ["string", "null"] },
        "report": { "type": ["string", "null"] }
      }
    },
    "timestamps": {
      "type": "object",
      "properties": {
        "started": { "type": ["string", "null"] },
        "completed": { "type": ["string", "null"] },
        "lastUpdated": { "type": ["string", "null"] }
      }
    },
    "metrics": {
      "type": ["object", "null"],
      "additionalProperties": true
    }
  }
}
```

**구현 파일**: `lib/tools/feature-detail.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJson } from '../utils/file-reader.js';
import { BkitMcpError, withErrorHandling } from '../utils/error.js';

export const FEATURE_DETAIL_TOOL = {
  name: 'bkit_feature_detail',
  description: '특정 Feature의 상세 정보를 조회합니다. 단계, 메트릭, 타임스탬프, 연결 문서 경로를 포함합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      feature: { type: 'string', description: '조회할 Feature 이름' },
    },
    required: ['feature'],
    additionalProperties: false,
  },
};

export const handleFeatureDetail = withErrorHandling(async ({ feature }) => {
  const data = readJson(pathResolver.state('pdca-status.json'));
  const f = data.features?.[feature];
  if (!f) throw new BkitMcpError('NOT_FOUND', `Feature not found: ${feature}`);

  const result = {
    name: feature,
    phase: f.phase,
    phaseNumber: f.phaseNumber ?? null,
    matchRate: f.matchRate ?? null,
    iterationCount: f.iterationCount ?? 0,
    requirements: f.requirements ?? [],
    documents: f.documents ?? {},
    timestamps: f.timestamps ?? {},
    metrics: f.metrics ?? null,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});
```

---

#### Tool 5~8: PDCA 문서 읽기 (bkit_plan_read / bkit_design_read / bkit_analysis_read / bkit_report_read)

**공통 패턴** — 4개 도구는 동일한 구조를 사용하며 `phase` 파라미터만 다름.

**JSON Schema — 입력 (4개 공통)**:
```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "description": "조회할 Feature 이름"
    }
  },
  "required": ["feature"],
  "additionalProperties": false
}
```

**JSON Schema — 출력 (4개 공통)**:
```json
{
  "type": "object",
  "properties": {
    "feature": { "type": "string" },
    "phase": { "type": "string" },
    "filePath": { "type": "string" },
    "content": { "type": "string", "description": "마크다운 문서 전체 내용" },
    "sizeBytes": { "type": "integer" }
  }
}
```

**구현 패턴** (`lib/tools/plan-read.js` 예시 — design/analysis/report도 동일):
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readText } from '../utils/file-reader.js';
import { withErrorHandling } from '../utils/error.js';

export const PLAN_READ_TOOL = {
  name: 'bkit_plan_read',
  description: 'Feature의 Plan 문서(docs/01-plan/features/{feature}.plan.md)를 읽습니다.',
  inputSchema: {
    type: 'object',
    properties: {
      feature: { type: 'string', description: '조회할 Feature 이름' },
    },
    required: ['feature'],
    additionalProperties: false,
  },
};

export const handlePlanRead = withErrorHandling(async ({ feature }) => {
  const filePath = pathResolver.docs('plan', feature);
  const content = readText(filePath);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ feature, phase: 'plan', filePath, content, sizeBytes: Buffer.byteLength(content) }, null, 2),
    }],
  };
});
```

`design-read.js`, `analysis-read.js`, `report-read.js`는 위 파일에서 `'plan'` → 각 phase 이름으로만 교체.

---

#### Tool 9: bkit_metrics_get

**목적**: 최신 품질 메트릭 조회

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "description": "특정 Feature의 메트릭만 조회. 생략 시 전체"
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "version": { "type": "string" },
    "collectedAt": { "type": "string", "format": "date-time" },
    "metrics": {
      "type": "object",
      "properties": {
        "matchRate": { "type": ["number", "null"], "description": "M1: 설계-구현 일치율 (%)" },
        "codeQualityScore": { "type": ["number", "null"], "description": "M2: 코드 품질 점수 (0-100)" },
        "criticalIssueCount": { "type": ["integer", "null"], "description": "M3: Critical 이슈 수" },
        "apiComplianceRate": { "type": ["number", "null"], "description": "M4: API 준수율 (%)" },
        "runtimeErrorRate": { "type": ["number", "null"], "description": "M5: 런타임 에러율 (%)" },
        "p95ResponseTime": { "type": ["number", "null"], "description": "M6: P95 응답시간 (ms)" },
        "conventionCompliance": { "type": ["number", "null"], "description": "M7: 컨벤션 준수율 (%)" },
        "designCompleteness": { "type": ["number", "null"], "description": "M8: 설계 완성도 (0-100)" },
        "iterationEfficiency": { "type": ["number", "null"], "description": "M9: 반복 효율 (%p/회)" },
        "pdcaCycleTimeHours": { "type": ["number", "null"], "description": "M10: PDCA 사이클 시간 (h)" }
      }
    },
    "thresholds": {
      "type": "object",
      "description": "각 메트릭의 임계값",
      "additionalProperties": true
    }
  }
}
```

**구현 파일**: `lib/tools/metrics-get.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJsonOrNull, readJson } from '../utils/file-reader.js';
import { BkitMcpError, withErrorHandling } from '../utils/error.js';

export const METRICS_GET_TOOL = {
  name: 'bkit_metrics_get',
  description: '최신 품질 메트릭을 조회합니다. 10개 핵심 메트릭(M1~M10)과 임계값을 반환합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      feature: { type: 'string', description: '특정 Feature 메트릭 조회. 생략 시 전체' },
    },
    additionalProperties: false,
  },
};

export const handleMetricsGet = withErrorHandling(async ({ feature } = {}) => {
  const metricsPath = pathResolver.state('quality-metrics.json');
  const data = readJsonOrNull(metricsPath);

  if (!data) {
    // quality-metrics.json이 아직 없으면 빈 구조 반환
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          version: '2.0',
          collectedAt: null,
          metrics: {},
          thresholds: {
            matchRate: 90, codeQualityScore: 70, criticalIssueCount: 0,
            apiComplianceRate: 95, runtimeErrorRate: 1, p95ResponseTime: 1000,
            conventionCompliance: 90, designCompleteness: 85,
          },
        }, null, 2),
      }],
    };
  }

  let result = data;
  if (feature && data.byFeature) {
    const fm = data.byFeature[feature];
    if (!fm) throw new BkitMcpError('NOT_FOUND', `No metrics for feature: ${feature}`);
    result = { ...data, metrics: fm, byFeature: undefined };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});
```

---

#### Tool 10: bkit_metrics_history

**목적**: 메트릭 히스토리 조회 (시계열)

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "metric": {
      "type": "string",
      "enum": ["matchRate", "codeQualityScore", "criticalIssueCount", "apiComplianceRate",
               "runtimeErrorRate", "p95ResponseTime", "conventionCompliance",
               "designCompleteness", "iterationEfficiency", "pdcaCycleTimeHours"],
      "description": "조회할 특정 메트릭. 생략 시 전체"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 30
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "metric": { "type": ["string", "null"] },
    "total": { "type": "integer" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "feature": { "type": "string" },
          "values": { "type": "object", "additionalProperties": true }
        }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/metrics-history.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJsonOrNull } from '../utils/file-reader.js';
import { withErrorHandling } from '../utils/error.js';

export const METRICS_HISTORY_TOOL = {
  name: 'bkit_metrics_history',
  description: '품질 메트릭 히스토리를 시계열로 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      metric: {
        type: 'string',
        enum: ['matchRate', 'codeQualityScore', 'criticalIssueCount', 'apiComplianceRate',
               'runtimeErrorRate', 'p95ResponseTime', 'conventionCompliance',
               'designCompleteness', 'iterationEfficiency', 'pdcaCycleTimeHours'],
      },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
    },
    additionalProperties: false,
  },
};

export const handleMetricsHistory = withErrorHandling(async ({ metric, limit = 30 } = {}) => {
  const data = readJsonOrNull(pathResolver.state('quality-history.json'));
  if (!data) {
    return { content: [{ type: 'text', text: JSON.stringify({ metric: metric ?? null, total: 0, items: [] }, null, 2) }] };
  }

  let items = data.history || [];
  if (metric) {
    items = items.map(entry => ({
      timestamp: entry.timestamp,
      feature: entry.feature,
      values: { [metric]: entry.values?.[metric] ?? null },
    }));
  }

  items = items.slice(-limit);
  return {
    content: [{ type: 'text', text: JSON.stringify({ metric: metric ?? null, total: (data.history || []).length, items }, null, 2) }],
  };
});
```

### 3.5 리소스(Resource) 전체 정의

#### Resource 1: bkit://pdca/status

```javascript
// lib/resources/pdca-status.js
import { pathResolver } from '../utils/path-resolver.js';
import { readJsonOrNull } from '../utils/file-reader.js';

export const PDCA_STATUS_RESOURCE = {
  uri: 'bkit://pdca/status',
  name: 'PDCA Current Status',
  description: '현재 PDCA 전체 상태 (60초 캐시)',
  mimeType: 'application/json',
};

export async function handlePdcaStatusResource() {
  const data = readJsonOrNull(pathResolver.state('pdca-status.json')) ?? {};
  return {
    contents: [{
      uri: 'bkit://pdca/status',
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    }],
  };
}
```

#### Resource 2: bkit://quality/metrics

```javascript
// lib/resources/quality-metrics.js
import { pathResolver } from '../utils/path-resolver.js';
import { readJsonOrNull } from '../utils/file-reader.js';

export const QUALITY_METRICS_RESOURCE = {
  uri: 'bkit://quality/metrics',
  name: 'Latest Quality Metrics',
  description: '최신 품질 메트릭 10개 (M1~M10)',
  mimeType: 'application/json',
};

export async function handleQualityMetricsResource() {
  const data = readJsonOrNull(pathResolver.state('quality-metrics.json')) ?? { metrics: {} };
  return {
    contents: [{
      uri: 'bkit://quality/metrics',
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    }],
  };
}
```

#### Resource 3: bkit://audit/latest

```javascript
// lib/resources/audit-latest.js
import { pathResolver } from '../utils/path-resolver.js';
import { readJsonOrNull } from '../utils/file-reader.js';
import fs from 'fs';
import path from 'path';

export const AUDIT_LATEST_RESOURCE = {
  uri: 'bkit://audit/latest',
  name: 'Latest Audit Log',
  description: '오늘 날짜 감사 로그 (JSONL)',
  mimeType: 'application/json',
};

export async function handleAuditLatestResource() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const auditPath = pathResolver.audit(`${today}.jsonl`);

  if (!fs.existsSync(auditPath)) {
    return {
      contents: [{
        uri: 'bkit://audit/latest',
        mimeType: 'application/json',
        text: JSON.stringify({ date: today, entries: [] }, null, 2),
      }],
    };
  }

  const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
  const entries = lines.map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);

  return {
    contents: [{
      uri: 'bkit://audit/latest',
      mimeType: 'application/json',
      text: JSON.stringify({ date: today, total: entries.length, entries: entries.slice(-100) }, null, 2),
    }],
  };
}
```

---

## 4. bkit-analysis-server 상세 설계

### 4.1 package.json

```json
{
  "name": "bkit-analysis-server",
  "version": "2.0.0",
  "description": "bkit code analysis and audit MCP server",
  "type": "module",
  "main": "index.js",
  "bin": {
    "bkit-analysis-server": "./index.js"
  },
  "scripts": {
    "start": "node index.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 4.2 공통 유틸리티 추가: utils/jsonl-reader.js

```javascript
import fs from 'fs';
import path from 'path';
import { BkitMcpError } from './error.js';

/**
 * JSONL 파일 읽기 유틸리티
 */
export function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

/**
 * 디렉토리 내 모든 JSONL 파일 읽기 (날짜 순)
 */
export function readAllJsonLines(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.jsonl'))
    .sort();
  return files.flatMap(f => readJsonLines(path.join(dirPath, f)));
}
```

### 4.3 도구(Tool) 전체 정의

#### Tool 1: bkit_code_quality

**목적**: 코드 품질 분석 결과 캐시 조회 (code-analyzer 에이전트가 기록한 결과)

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "description": "특정 Feature의 결과 조회. 생략 시 최신 전체 결과"
    },
    "includeIssues": {
      "type": "boolean",
      "default": true,
      "description": "개별 이슈 목록 포함 여부"
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "analyzedAt": { "type": "string", "format": "date-time" },
    "feature": { "type": ["string", "null"] },
    "overallScore": { "type": "number", "minimum": 0, "maximum": 100 },
    "summary": {
      "type": "object",
      "properties": {
        "critical": { "type": "integer" },
        "warning": { "type": "integer" },
        "info": { "type": "integer" }
      }
    },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "type": "string", "enum": ["critical", "warning", "info"] },
          "category": { "type": "string" },
          "message": { "type": "string" },
          "file": { "type": ["string", "null"] },
          "line": { "type": ["integer", "null"] }
        }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/code-quality.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJsonOrNull } from '../utils/file-reader.js';
import { withErrorHandling } from '../utils/error.js';

export const CODE_QUALITY_TOOL = {
  name: 'bkit_code_quality',
  description: '코드 품질 분석 결과(code-analyzer 캐시)를 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      feature: { type: 'string' },
      includeIssues: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
};

export const handleCodeQuality = withErrorHandling(async ({ feature, includeIssues = true } = {}) => {
  const data = readJsonOrNull(pathResolver.state('quality-metrics.json'));
  if (!data) {
    return { content: [{ type: 'text', text: JSON.stringify({ analyzedAt: null, overallScore: null, summary: {}, issues: [] }, null, 2) }] };
  }

  const result = {
    analyzedAt: data.collectedAt ?? null,
    feature: feature ?? null,
    overallScore: feature ? data.byFeature?.[feature]?.codeQualityScore ?? null : data.metrics?.codeQualityScore ?? null,
    summary: data.issueSummary ?? { critical: 0, warning: 0, info: 0 },
    issues: includeIssues ? (feature ? data.issuesByFeature?.[feature] ?? [] : data.issues ?? []) : [],
  };

  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
```

---

#### Tool 2: bkit_gap_analysis

**목적**: 최근 갭 분석 결과 조회 (gap-detector 에이전트 출력)

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "description": "특정 Feature의 갭 분석 조회"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50,
      "default": 10,
      "description": "반환할 최대 갭 항목 수"
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "feature": { "type": ["string", "null"] },
    "analyzedAt": { "type": ["string", "null"] },
    "matchRate": { "type": ["number", "null"], "description": "설계-구현 일치율 (%)" },
    "totalGaps": { "type": "integer" },
    "gaps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "type": { "type": "string", "enum": ["missing_impl", "spec_drift", "undocumented", "api_mismatch"] },
          "severity": { "type": "string", "enum": ["critical", "major", "minor"] },
          "description": { "type": "string" },
          "designRef": { "type": ["string", "null"] },
          "codeRef": { "type": ["string", "null"] }
        }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/gap-analysis.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJsonOrNull } from '../utils/file-reader.js';
import { withErrorHandling } from '../utils/error.js';

export const GAP_ANALYSIS_TOOL = {
  name: 'bkit_gap_analysis',
  description: '최근 갭 분석 결과를 조회합니다. 설계-구현 불일치 항목과 matchRate를 반환합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      feature: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
    },
    additionalProperties: false,
  },
};

export const handleGapAnalysis = withErrorHandling(async ({ feature, limit = 10 } = {}) => {
  // gap-detector 에이전트는 .bkit/state/gap-analysis.json에 결과를 캐시함
  const data = readJsonOrNull(pathResolver.state('gap-analysis.json'));
  if (!data) {
    return { content: [{ type: 'text', text: JSON.stringify({ feature: feature ?? null, analyzedAt: null, matchRate: null, totalGaps: 0, gaps: [] }, null, 2) }] };
  }

  let gaps = feature ? (data.byFeature?.[feature]?.gaps ?? []) : (data.gaps ?? []);
  const matchRate = feature ? (data.byFeature?.[feature]?.matchRate ?? null) : (data.matchRate ?? null);

  gaps = gaps.slice(0, limit);
  return {
    content: [{ type: 'text', text: JSON.stringify({
      feature: feature ?? null,
      analyzedAt: data.analyzedAt ?? null,
      matchRate,
      totalGaps: gaps.length,
      gaps,
    }, null, 2) }],
  };
});
```

---

#### Tool 3: bkit_regression_rules

**목적**: 회귀 방지 규칙 조회 및 추가 (읽기/쓰기 혼용)

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": ["list", "add"],
      "default": "list",
      "description": "list: 규칙 목록 조회, add: 새 규칙 추가"
    },
    "category": {
      "type": "string",
      "description": "필터: 특정 카테고리 규칙만 조회"
    },
    "rule": {
      "type": "object",
      "description": "action=add일 때 필수. 추가할 규칙 정의",
      "properties": {
        "id": { "type": "string" },
        "category": { "type": "string" },
        "description": { "type": "string" },
        "pattern": { "type": "string", "description": "위반 감지 패턴 (정규식 또는 자연어)" },
        "severity": { "type": "string", "enum": ["critical", "major", "minor"] }
      },
      "required": ["id", "category", "description", "severity"]
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공 — list)**:
```json
{
  "type": "object",
  "properties": {
    "total": { "type": "integer" },
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "category": { "type": "string" },
          "description": { "type": "string" },
          "pattern": { "type": ["string", "null"] },
          "severity": { "type": "string" },
          "addedAt": { "type": "string" },
          "violationCount": { "type": "integer" }
        }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/regression-rules.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readJsonOrNull } from '../utils/file-reader.js';
import { BkitMcpError, withErrorHandling } from '../utils/error.js';
import fs from 'fs';

export const REGRESSION_RULES_TOOL = {
  name: 'bkit_regression_rules',
  description: '회귀 방지 규칙을 조회하거나 새 규칙을 추가합니다. action=list로 목록 조회, action=add로 규칙 추가.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'add'], default: 'list' },
      category: { type: 'string' },
      rule: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          pattern: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        },
        required: ['id', 'category', 'description', 'severity'],
      },
    },
    additionalProperties: false,
  },
};

export const handleRegressionRules = withErrorHandling(async ({ action = 'list', category, rule } = {}) => {
  const rulesPath = pathResolver.state('regression-rules.json');
  const data = readJsonOrNull(rulesPath) ?? { version: '2.0', rules: [] };

  if (action === 'add') {
    if (!rule) throw new BkitMcpError('INVALID_ARGS', 'rule object is required for action=add');
    const exists = data.rules.find(r => r.id === rule.id);
    if (exists) throw new BkitMcpError('INVALID_ARGS', `Rule already exists: ${rule.id}`);
    data.rules.push({ ...rule, addedAt: new Date().toISOString(), violationCount: 0 });
    fs.writeFileSync(rulesPath, JSON.stringify(data, null, 2));
    return { content: [{ type: 'text', text: JSON.stringify({ added: true, rule }) }] };
  }

  let rules = data.rules;
  if (category) rules = rules.filter(r => r.category === category);
  return { content: [{ type: 'text', text: JSON.stringify({ total: rules.length, rules }, null, 2) }] };
});
```

---

#### Tool 4: bkit_checkpoint_list

**목적**: 체크포인트 목록 조회

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "feature": {
      "type": "string",
      "description": "특정 Feature의 체크포인트만 조회"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50,
      "default": 20
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "total": { "type": "integer" },
    "checkpoints": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "description": "cp-{timestamp}" },
          "feature": { "type": "string" },
          "phase": { "type": "string" },
          "type": { "type": "string", "enum": ["auto", "manual", "phase_transition"] },
          "createdAt": { "type": "string", "format": "date-time" },
          "description": { "type": "string" },
          "filesCount": { "type": "integer" }
        }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/checkpoint-list.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { BkitMcpError, withErrorHandling } from '../utils/error.js';
import fs from 'fs';
import path from 'path';

export const CHECKPOINT_LIST_TOOL = {
  name: 'bkit_checkpoint_list',
  description: '저장된 체크포인트 목록을 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      feature: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    },
    additionalProperties: false,
  },
};

export const handleCheckpointList = withErrorHandling(async ({ feature, limit = 20 } = {}) => {
  const cpDir = pathResolver.checkpoints();
  if (!fs.existsSync(cpDir)) {
    return { content: [{ type: 'text', text: JSON.stringify({ total: 0, checkpoints: [] }, null, 2) }] };
  }

  const files = fs.readdirSync(cpDir).filter(f => f.endsWith('.json')).sort().reverse();
  let checkpoints = files.map(f => {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(cpDir, f), 'utf8'));
      return { id: meta.id, feature: meta.feature, phase: meta.phase, type: meta.type,
               createdAt: meta.createdAt, description: meta.description ?? '', filesCount: (meta.files ?? []).length };
    } catch { return null; }
  }).filter(Boolean);

  if (feature) checkpoints = checkpoints.filter(c => c.feature === feature);
  checkpoints = checkpoints.slice(0, limit);

  return { content: [{ type: 'text', text: JSON.stringify({ total: checkpoints.length, checkpoints }, null, 2) }] };
});
```

---

#### Tool 5: bkit_checkpoint_detail

**목적**: 특정 체크포인트 상세 조회

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "체크포인트 ID (cp-{timestamp})"
    }
  },
  "required": ["id"],
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "feature": { "type": "string" },
    "phase": { "type": "string" },
    "type": { "type": "string" },
    "createdAt": { "type": "string" },
    "description": { "type": "string" },
    "gitRef": { "type": ["string", "null"], "description": "저장 시점의 git 커밋 해시" },
    "pdcaStatusSnapshot": { "type": "object", "description": "저장 시점의 pdca-status 스냅샷" },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "checksum": { "type": "string" },
          "sizeBytes": { "type": "integer" }
        }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/checkpoint-detail.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { BkitMcpError, withErrorHandling } from '../utils/error.js';
import fs from 'fs';
import path from 'path';

export const CHECKPOINT_DETAIL_TOOL = {
  name: 'bkit_checkpoint_detail',
  description: '특정 체크포인트의 상세 정보를 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: '체크포인트 ID (cp-{timestamp})' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

export const handleCheckpointDetail = withErrorHandling(async ({ id }) => {
  const cpPath = path.join(pathResolver.checkpoints(), `${id}.json`);
  if (!fs.existsSync(cpPath)) {
    throw new BkitMcpError('NOT_FOUND', `Checkpoint not found: ${id}`);
  }
  const data = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
```

---

#### Tool 6: bkit_audit_search

**목적**: 감사 로그 전문 검색

**JSON Schema — 입력**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "검색어 (대소문자 무시)"
    },
    "feature": {
      "type": "string",
      "description": "특정 Feature 필터"
    },
    "action": {
      "type": "string",
      "description": "특정 action 타입 필터 (e.g., tool_call, phase_transition, decision)"
    },
    "dateFrom": {
      "type": "string",
      "format": "date",
      "description": "YYYY-MM-DD. 이 날짜 이후 로그만 검색"
    },
    "dateTo": {
      "type": "string",
      "format": "date",
      "description": "YYYY-MM-DD. 이 날짜까지의 로그만 검색"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 200,
      "default": 50
    }
  },
  "additionalProperties": false
}
```

**JSON Schema — 출력 (성공)**:
```json
{
  "type": "object",
  "properties": {
    "total": { "type": "integer", "description": "검색된 전체 항목 수" },
    "returned": { "type": "integer", "description": "실제 반환된 항목 수 (limit 적용)" },
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "action": { "type": "string" },
          "feature": { "type": ["string", "null"] },
          "phase": { "type": ["string", "null"] },
          "actor": { "type": "string", "description": "bkit | agent:{name} | user" },
          "data": { "type": "object", "additionalProperties": true }
        }
      }
    }
  }
}
```

**구현 파일**: `lib/tools/audit-search.js`
```javascript
import { pathResolver } from '../utils/path-resolver.js';
import { readAllJsonLines } from '../utils/jsonl-reader.js';
import { withErrorHandling } from '../utils/error.js';

export const AUDIT_SEARCH_TOOL = {
  name: 'bkit_audit_search',
  description: '감사 로그를 검색합니다. 날짜 범위, Feature, action 타입, 전문 검색을 지원합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      feature: { type: 'string' },
      action: { type: 'string' },
      dateFrom: { type: 'string', format: 'date' },
      dateTo: { type: 'string', format: 'date' },
      limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
};

export const handleAuditSearch = withErrorHandling(async ({ query, feature, action, dateFrom, dateTo, limit = 50 } = {}) => {
  const auditDir = pathResolver.audit('');
  let entries = readAllJsonLines(auditDir);

  if (feature) entries = entries.filter(e => e.feature === feature);
  if (action) entries = entries.filter(e => e.action === action);
  if (dateFrom) entries = entries.filter(e => e.timestamp >= dateFrom);
  if (dateTo) entries = entries.filter(e => e.timestamp <= dateTo + 'T23:59:59Z');
  if (query) {
    const q = query.toLowerCase();
    entries = entries.filter(e => JSON.stringify(e).toLowerCase().includes(q));
  }

  const total = entries.length;
  const returned = Math.min(total, limit);
  return {
    content: [{ type: 'text', text: JSON.stringify({ total, returned, entries: entries.slice(-limit) }, null, 2) }],
  };
});
```

---

## 5. .mcp.json 번들 설정

### 5.1 프로젝트 루트 .mcp.json

CC Plugin의 `.mcp.json`은 `${CLAUDE_PLUGIN_ROOT}` 환경변수로 Plugin 설치 경로를 참조한다.

```json
{
  "mcpServers": {
    "bkit-pdca": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/bkit-pdca-server/index.js"],
      "env": {
        "BKIT_ROOT": "${workspaceFolder}",
        "NODE_ENV": "production"
      }
    },
    "bkit-analysis": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/bkit-analysis-server/index.js"],
      "env": {
        "BKIT_ROOT": "${workspaceFolder}",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 5.2 환경변수 설명

| 환경변수 | 값 | 용도 |
|----------|----|----- |
| `BKIT_ROOT` | `${workspaceFolder}` | 프로젝트 루트 (`.bkit/` 디렉토리 탐색 기준) |
| `CLAUDE_PLUGIN_ROOT` | CC Plugin이 자동 주입 | `servers/` 디렉토리 절대 경로 |
| `NODE_ENV` | `production` | 불필요한 개발 로그 억제 |

### 5.3 MCP 프로토콜 버전 호환성

| 항목 | 값 |
|------|-----|
| MCP 프로토콜 버전 | `2024-11-05` |
| SDK 최소 버전 | `@modelcontextprotocol/sdk ^1.0.0` |
| Node.js 최소 버전 | `18.0.0` (ES Module + crypto 내장) |
| CC 최소 버전 | `v2.1.78+` (stdio MCP bundle 지원) |
| Transport | `stdio` (subprocess) |

### 5.4 서버 시작 검증

```javascript
// 서버 시작 시 BKIT_ROOT 검증 (index.js에 추가)
const BKIT_ROOT = process.env.BKIT_ROOT;
if (!BKIT_ROOT) {
  process.stderr.write('[bkit-pdca-server] ERROR: BKIT_ROOT env not set\n');
  process.exit(1);
}
if (!fs.existsSync(path.join(BKIT_ROOT, '.bkit'))) {
  process.stderr.write(`[bkit-pdca-server] WARNING: .bkit directory not found at ${BKIT_ROOT}\n`);
  // 경고만 출력, 종료 안 함 (초기 설치 직후 상황 허용)
}
```

---

## 6. Studio 연동 API 스키마

### 6.1 연동 구조

```
bkit Studio (MCP Client)
    │
    │ MCP Protocol (stdio)
    │
    ├── bkit-pdca-server ──── .bkit/state/*.json 읽기
    │                    ──── docs/*/*.md 읽기
    │
    └── bkit-analysis-server ─ .bkit/audit/*.jsonl 읽기
                             ─ .bkit/decisions/*.jsonl 읽기
                             ─ .bkit/checkpoints/*.json 읽기
                             ─ .bkit/state/regression-rules.json 읽기/쓰기
```

### 6.2 Studio 화면별 도구 매핑

| Studio 화면 | 사용 도구/리소스 | 폴링 주기 |
|------------|----------------|----------|
| PDCA 대시보드 | `bkit://pdca/status` | 5초 |
| Feature 상세 뷰 | `bkit_feature_detail` | 요청 시 |
| Feature 목록 | `bkit_feature_list` | 30초 |
| 품질 메트릭 차트 | `bkit://quality/metrics`, `bkit_metrics_history` | 60초 |
| 문서 뷰어 | `bkit_plan_read`, `bkit_design_read`, `bkit_analysis_read`, `bkit_report_read` | 요청 시 |
| 감사 로그 뷰어 | `bkit_audit_search`, `bkit://audit/latest` | 10초 |
| 코드 품질 패널 | `bkit_code_quality`, `bkit_gap_analysis` | 60초 |
| 체크포인트 브라우저 | `bkit_checkpoint_list`, `bkit_checkpoint_detail` | 요청 시 |
| 회귀 규칙 편집기 | `bkit_regression_rules` (list+add) | 요청 시 |
| PDCA 히스토리 타임라인 | `bkit_pdca_history` | 30초 |

### 6.3 에러 응답 표준화

모든 도구는 에러 시 아래 형식으로 응답한다:

```json
{
  "content": [{
    "type": "text",
    "text": "{\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"Feature not found: foo\",\"details\":null}}"
  }],
  "isError": true
}
```

**에러 코드 정의**:

| 코드 | HTTP 유사 | 설명 | 예시 상황 |
|------|-----------|------|----------|
| `NOT_FOUND` | 404 | 요청한 리소스가 없음 | Feature 없음, 파일 없음 |
| `INVALID_ARGS` | 400 | 입력 파라미터 오류 | 필수값 누락, enum 불일치 |
| `PERMISSION_DENIED` | 403 | 경로 탈출 시도 감지 | `../` 포함 경로 |
| `IO_ERROR` | 500 | 파일 읽기/쓰기 실패 | 디스크 에러 |
| `PARSE_ERROR` | 422 | JSON/JSONL 파싱 실패 | 손상된 상태 파일 |

### 6.4 전체 도구 목록 요약

#### bkit-pdca-server

| 도구명 | 읽기/쓰기 | 소스 파일 | 주요 출력 |
|--------|----------|----------|----------|
| `bkit_pdca_status` | R | `pdca-status.json` | 현재 PDCA 상태 전체 |
| `bkit_pdca_history` | R | `pdca-status.json` | 이벤트 히스토리 배열 |
| `bkit_feature_list` | R | `pdca-status.json` | Feature 요약 목록 |
| `bkit_feature_detail` | R | `pdca-status.json` | Feature 상세 (메트릭 포함) |
| `bkit_plan_read` | R | `docs/01-plan/**` | Plan 마크다운 전문 |
| `bkit_design_read` | R | `docs/02-design/**` | Design 마크다운 전문 |
| `bkit_analysis_read` | R | `docs/03-analysis/**` | Analysis 마크다운 전문 |
| `bkit_report_read` | R | `docs/04-report/**` | Report 마크다운 전문 |
| `bkit_metrics_get` | R | `quality-metrics.json` | 최신 M1~M10 메트릭 |
| `bkit_metrics_history` | R | `quality-history.json` | 메트릭 시계열 |

#### bkit-analysis-server

| 도구명 | 읽기/쓰기 | 소스 파일 | 주요 출력 |
|--------|----------|----------|----------|
| `bkit_code_quality` | R | `quality-metrics.json` | 코드 품질 점수 + 이슈 목록 |
| `bkit_gap_analysis` | R | `gap-analysis.json` | matchRate + 갭 목록 |
| `bkit_regression_rules` | R/W | `regression-rules.json` | 회귀 방지 규칙 목록 |
| `bkit_checkpoint_list` | R | `.bkit/checkpoints/*.json` | 체크포인트 요약 목록 |
| `bkit_checkpoint_detail` | R | `.bkit/checkpoints/{id}.json` | 체크포인트 전체 내용 |
| `bkit_audit_search` | R | `.bkit/audit/*.jsonl` | 감사 로그 검색 결과 |

#### bkit-pdca-server 리소스

| URI | 소스 | 캐시 |
|-----|------|------|
| `bkit://pdca/status` | `pdca-status.json` | CC 클라이언트 60초 |
| `bkit://quality/metrics` | `quality-metrics.json` | CC 클라이언트 60초 |
| `bkit://audit/latest` | `.bkit/audit/오늘.jsonl` | CC 클라이언트 60초 |

---

## 7. 구현 우선순위 및 의존성

### 7.1 구현 순서

```
Phase 1 (기반 구조 — 영역 4 선행 필요)
  └─ utils/ (error.js, path-resolver.js, file-reader.js, jsonl-reader.js)
      └─ 요구사항: BKIT_ROOT 환경변수, .bkit/ 디렉토리 구조 확정

Phase 2 (bkit-pdca-server 핵심 도구)
  └─ bkit_pdca_status, bkit_feature_list, bkit_feature_detail
  └─ 리소스 3개 (bkit://pdca/status, bkit://quality/metrics, bkit://audit/latest)
  └─ .mcp.json 번들 설정

Phase 3 (bkit-pdca-server 나머지)
  └─ bkit_pdca_history, bkit_plan_read ~ bkit_report_read
  └─ bkit_metrics_get, bkit_metrics_history

Phase 4 (bkit-analysis-server)
  └─ bkit_code_quality, bkit_gap_analysis (영역 5의 quality-metrics.json 선행)
  └─ bkit_regression_rules, bkit_checkpoint_list, bkit_checkpoint_detail (영역 2 선행)
  └─ bkit_audit_search (영역 2의 audit-logger.js 선행)
```

### 7.2 영역 간 의존성

| 이 설계의 도구 | 의존하는 영역 | 생산 파일 |
|--------------|------------|---------|
| `bkit_pdca_status` | 영역 4 (StateStore) | `pdca-status.json` |
| `bkit_metrics_get` | 영역 5 (quality-metrics) | `quality-metrics.json` |
| `bkit_gap_analysis` | 영역 2 (gap-detector) | `gap-analysis.json` |
| `bkit_regression_rules` | 영역 5 (regression-guard) | `regression-rules.json` |
| `bkit_checkpoint_list/detail` | 영역 2 (checkpoint-manager) | `.bkit/checkpoints/` |
| `bkit_audit_search` | 영역 2 (audit-logger) | `.bkit/audit/*.jsonl` |

### 7.3 예상 규모

| 구성요소 | 파일 수 | 예상 LOC |
|---------|--------|---------|
| bkit-pdca-server | 16 | ~600 |
| bkit-analysis-server | 12 | ~400 |
| 공통 유틸리티 | 8 | ~200 |
| 테스트 | 4 | ~300 |
| **총계** | **40** | **~1,500** |

---

## 8. 테스트 전략

### 8.1 단위 테스트 (Node.js 내장 test runner)

```javascript
// servers/bkit-pdca-server/__tests__/tools.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import { handlePdcaStatus } from '../lib/tools/pdca-status.js';

// BKIT_ROOT를 임시 디렉토리로 설정하여 테스트
test('bkit_pdca_status: feature 없이 전체 요약 반환', async () => {
  process.env.BKIT_ROOT = '/tmp/bkit-test';
  // 임시 pdca-status.json 생성
  // ...
  const result = await handlePdcaStatus({});
  assert.ok(result.content[0].text.includes('summary'));
});

test('bkit_pdca_status: 존재하지 않는 feature → NOT_FOUND 에러', async () => {
  const result = await handlePdcaStatus({ feature: 'nonexistent' });
  assert.ok(result.isError === true);
  assert.ok(result.content[0].text.includes('NOT_FOUND'));
});
```

### 8.2 통합 테스트

- 실제 `.bkit/` 파일 구조를 사용한 E2E 테스트
- `bkit_audit_search` — 다중 날짜 JSONL 파일 검색 검증
- `bkit_checkpoint_list` — 빈 디렉토리 방어 처리 검증

---

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 0.1 | 2026-03-19 | 초안 작성 — bkit-pdca-server (10 도구, 3 리소스), bkit-analysis-server (6 도구), .mcp.json 번들, Studio 연동 스키마 | bkend-expert Agent |
