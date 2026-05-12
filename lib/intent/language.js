/**
 * Multi-language Support Module
 * @module lib/intent/language
 * @version 2.1.10
 */

/**
 * Supported languages
 */
const SUPPORTED_LANGUAGES = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'it'];

/**
 * Agent trigger patterns for 8 languages
 */
const AGENT_TRIGGER_PATTERNS = {
  // v2.1.13 QA-3 fix: sprint-* agents declared FIRST so first-match-wins favors
  // the more specific multi-token sprint patterns over generic single-token
  // matches (e.g. "sprint report" must match sprint-report-writer, not
  // report-generator's 'report' single-token trigger).
  'sprint-orchestrator': {
    en: ['sprint orchestrator', 'sprint orchestration', 'sprint coordination', 'sprint lifecycle', 'sprint cycle'],
    ko: ['스프린트 조율', '스프린트 진행', '스프린트 사이클', '스프린트 오케스트레이션'],
    ja: ['スプリント調整', 'スプリント進行', 'スプリントサイクル'],
    zh: ['冲刺协调', '冲刺进行', '冲刺周期'],
    es: ['orquestador sprint', 'orquestracion sprint', 'coordinacion sprint', 'ciclo sprint'],
    fr: ['orchestrateur sprint', 'orchestration sprint', 'coordination sprint', 'cycle sprint'],
    de: ['Sprint-Orchestrator', 'Sprint-Orchestrierung', 'Sprint-Koordination', 'Sprint-Zyklus'],
    it: ['orchestratore sprint', 'orchestrazione sprint', 'coordinamento sprint', 'ciclo sprint']
  },
  'sprint-master-planner': {
    en: ['sprint master plan', 'sprint planning', 'sprint plan', 'sprint design'],
    ko: ['스프린트 마스터 플랜', '스프린트 계획', '스프린트 설계'],
    ja: ['スプリントマスタープラン', 'スプリント計画', 'スプリント設計'],
    zh: ['冲刺主计划', '冲刺规划', '冲刺设计'],
    es: ['plan maestro sprint', 'planificacion sprint', 'diseno sprint'],
    fr: ['plan maitre sprint', 'planification sprint', 'conception sprint'],
    de: ['Sprint-Hauptplan', 'Sprint-Planung', 'Sprint-Design'],
    it: ['piano principale sprint', 'pianificazione sprint', 'progettazione sprint']
  },
  'sprint-qa-flow': {
    en: ['sprint qa', 'sprint qa flow', 'data flow integrity', '7 layer qa'],
    ko: ['스프린트 QA', '데이터 흐름 검증', '7 계층 검증'],
    ja: ['スプリントQA', 'データフロー検証', '7階層検証'],
    zh: ['冲刺QA', '数据流验证', '7层验证'],
    es: ['QA sprint', 'integridad flujo datos', 'verificacion 7 capas'],
    fr: ['QA sprint', 'integrite flux donnees', 'verification 7 couches'],
    de: ['Sprint QA', 'Datenfluss-Integritat', '7-Schichten-Verifikation'],
    it: ['QA sprint', 'integrita flusso dati', 'verifica 7 livelli']
  },
  'sprint-report-writer': {
    en: ['sprint report', 'sprint completion', 'sprint kpi', 'sprint carry items'],
    ko: ['스프린트 보고서', '스프린트 완료', '스프린트 KPI', '인계 항목'],
    ja: ['スプリントレポート', 'スプリント完了', 'スプリントKPI', '持ち越し項目'],
    zh: ['冲刺报告', '冲刺完成', '冲刺KPI', '结转项'],
    es: ['reporte sprint', 'finalizacion sprint', 'KPI sprint', 'items pendientes'],
    fr: ['rapport sprint', 'achevement sprint', 'KPI sprint', 'elements reportes'],
    de: ['Sprint-Bericht', 'Sprint-Abschluss', 'Sprint-KPI', 'Ubertragungselemente'],
    it: ['rapporto sprint', 'completamento sprint', 'KPI sprint', 'elementi riportati']
  },
  'gap-detector': {
    en: ['verify', 'check', 'gap', 'compare', 'validate'],
    ko: ['검증', '확인', '갭', '비교', '검사', '맞아?', '이거 괜찮아?'],
    ja: ['検証', '確認', 'ギャップ', '比較', '正しい?', '合ってる?'],
    zh: ['验证', '确认', '差距', '比较', '对吗?', '对不对?'],
    es: ['verificar', 'comprobar', 'brecha', 'comparar', 'está bien?'],
    fr: ['vérifier', 'contrôler', 'écart', 'comparer', "c'est correct?"],
    de: ['prüfen', 'überprüfen', 'Lücke', 'vergleichen', 'ist das richtig?'],
    it: ['verificare', 'controllare', 'divario', 'confrontare', 'è giusto?']
  },
  'pdca-iterator': {
    en: ['improve', 'iterate', 'fix', 'auto-fix', 'optimize'],
    ko: ['개선', '반복', '수정', '자동 수정', '고쳐줘', '개선해줘'],
    ja: ['改善', '反復', '修正', '自動修正', '直して', 'もっと良く'],
    zh: ['改进', '迭代', '修复', '自动修复', '优化'],
    es: ['mejorar', 'iterar', 'arreglar', 'auto-arreglar', 'optimizar'],
    fr: ['améliorer', 'itérer', 'corriger', 'auto-corriger', 'optimiser'],
    de: ['verbessern', 'iterieren', 'reparieren', 'auto-reparieren', 'optimieren'],
    it: ['migliorare', 'iterare', 'correggere', 'auto-correggere', 'ottimizzare']
  },
  'code-analyzer': {
    en: ['analyze', 'quality', 'security', 'code review', 'any issues?'],
    ko: ['분석', '품질', '보안', '코드 리뷰', '이상해', '뭔가 이상해'],
    ja: ['分析', '品質', 'セキュリティ', 'コードレビュー', 'おかしい'],
    zh: ['分析', '质量', '安全', '代码审查', '有问题?'],
    es: ['analizar', 'calidad', 'seguridad', 'revisión de código', 'hay problemas?'],
    fr: ['analyser', 'qualité', 'sécurité', 'revue de code', 'il y a des problèmes?'],
    de: ['analysieren', 'Qualität', 'Sicherheit', 'Code-Review', 'gibt es Probleme?'],
    it: ['analizzare', 'qualità', 'sicurezza', 'revisione codice', 'ci sono problemi?']
  },
  'report-generator': {
    en: ['report', 'summary', 'status', 'what did we do?', 'progress'],
    ko: ['보고서', '요약', '상태', '뭐 했어?', '진행 상황'],
    ja: ['報告書', '要約', '状態', '何をした?', '進捗'],
    zh: ['报告', '摘要', '状态', '做了什么?', '进度'],
    es: ['informe', 'resumen', 'estado', 'qué hicimos?', 'progreso'],
    fr: ['rapport', 'résumé', 'statut', "qu'avons-nous fait?", 'progrès'],
    de: ['Bericht', 'Zusammenfassung', 'Status', 'was haben wir?', 'Fortschritt'],
    it: ['rapporto', 'riepilogo', 'stato', 'cosa abbiamo fatto?', 'progresso']
  },
  'starter-guide': {
    en: ['help', 'beginner', 'first time', 'how to', 'explain'],
    ko: ['도움', '초보자', '처음', '어떻게', '설명해', '모르겠'],
    ja: ['助けて', '初心者', '初めて', 'どうやって', '説明して', 'わからない'],
    zh: ['帮助', '初学者', '第一次', '怎么', '解释', '不懂'],
    es: ['ayuda', 'principiante', 'primera vez', 'cómo', 'explicar', 'no entiendo'],
    fr: ['aide', 'débutant', 'première fois', 'comment', 'expliquer', 'je ne comprends pas'],
    de: ['Hilfe', 'Anfänger', 'erste Mal', 'wie', 'erklären', 'verstehe nicht'],
    it: ['aiuto', 'principiante', 'prima volta', 'come', 'spiegare', 'non capisco']
  },
  'cto-lead': {
    en: ['team', 'project lead', 'CTO', 'team mode', 'coordinate team'],
    ko: ['팀', '팀장', '프로젝트 리드', 'CTO', '팀 구성', '팀 모드'],
    ja: ['チーム', 'チームリード', 'プロジェクトリード', 'CTO', 'チーム編成'],
    zh: ['团队', '团队领导', '项目负责人', 'CTO', '团队模式'],
    es: ['equipo', 'líder del equipo', 'CTO', 'modo equipo'],
    fr: ['équipe', "chef d'équipe", 'CTO', 'mode équipe'],
    de: ['Team', 'Teamleiter', 'CTO', 'Team-Modus'],
    it: ['team', 'leader del team', 'CTO', 'modalità team']
  },
  'pm-lead': {
    en: ['pm', 'product discovery', 'PRD', 'market analysis', 'product management'],
    ko: ['PM 분석', '제품 기획', '제품 발견', 'PM팀', 'PRD 작성'],
    ja: ['PM分析', 'プロダクト分析', '製品企画', 'PRD作成'],
    zh: ['产品分析', '产品发现', '产品管理', 'PRD编写'],
    es: ['análisis PM', 'descubrimiento de producto', 'gestión de producto'],
    fr: ['analyse PM', 'découverte produit', 'gestion de produit'],
    de: ['PM-Analyse', 'Produktentdeckung', 'Produktmanagement'],
    it: ['analisi PM', 'scoperta prodotto', 'gestione prodotto']
  },
  // v2.1.12 Sprint D (#21 fix): broaden natural-language patterns so casual
  // user prompts ("회원가입 만들어줘") match without requiring exact phrases
  // like "회원가입 기능". Single-token nouns added when unambiguous.
  'bkend-expert': {
    en: ['bkend', 'BaaS', 'backend service', 'database setup', 'user auth', 'file upload', 'REST API', 'signup feature', 'login feature', 'signup', 'sign up', 'auth flow', 'oauth login'],
    ko: ['bkend', '백엔드 서비스', '데이터베이스 설정', '사용자 인증', '파일 업로드', '회원가입 기능', '로그인 기능', '회원가입', '회원 가입', '로그인 만들', '소셜 로그인', '인증 흐름'],
    ja: ['bkend', 'バックエンドサービス', 'データベース設定', '認証設定', 'ファイルアップロード', '会員登録', 'サインアップ', 'ログイン機能'],
    zh: ['bkend', '后端服务', '数据库设置', '用户认证', '文件上传', '注册', '登录功能', '社交登录'],
    es: ['bkend', 'servicio backend', 'base de datos', 'autenticación', 'carga de archivos', 'registro', 'iniciar sesion'],
    fr: ['bkend', 'service backend', 'base de données', 'authentification', 'téléchargement', 'inscription', 'connexion'],
    de: ['bkend', 'Backend-Dienst', 'Datenbank-Setup', 'Authentifizierung', 'Datei-Upload', 'Registrierung', 'Anmeldung'],
    it: ['bkend', 'servizio backend', 'database', 'autenticazione', 'caricamento file', 'registrazione', 'accesso']
  }
};

// v1.5.7: CC Built-in Command Awareness Patterns
const CC_COMMAND_PATTERNS = {
  'simplify': {
    en: ['simplify', 'clean up code', 'refactor', 'code cleanup', 'reduce complexity'],
    ko: ['정리', '코드 정리', '리팩터', '복잡도 줄이기', '간소화'],
    ja: ['簡素化', 'コード整理', 'リファクタ', '複雑度削減'],
    zh: ['简化', '代码整理', '重构', '降低复杂度'],
    es: ['simplificar', 'limpiar código', 'refactorizar'],
    fr: ['simplifier', 'nettoyer le code', 'refactoriser'],
    de: ['vereinfachen', 'Code aufräumen', 'refaktorieren'],
    it: ['semplificare', 'pulire codice', 'rifattorizzare']
  },
  'batch': {
    en: ['batch', 'multiple features', 'bulk process', 'parallel PDCA'],
    ko: ['배치', '다중 피처', '일괄 처리', '병렬 PDCA'],
    ja: ['バッチ', '複数機能', '一括処理', '並列PDCA'],
    zh: ['批量', '多功能', '批处理', '并行PDCA'],
    es: ['lote', 'múltiples funciones', 'procesamiento masivo'],
    fr: ['lot', 'fonctionnalités multiples', 'traitement par lots'],
    de: ['Batch', 'mehrere Funktionen', 'Massenverarbeitung'],
    it: ['batch', 'funzionalità multiple', 'elaborazione in blocco']
  }
};

/**
 * Skill trigger patterns for 8 languages
 */
const SKILL_TRIGGER_PATTERNS = {
  starter: {
    en: ['static site', 'simple website', 'landing page', 'portfolio'],
    ko: ['정적 사이트', '간단한 웹사이트', '랜딩 페이지', '포트폴리오'],
    ja: ['静的サイト', 'シンプルなウェブサイト', 'ランディングページ'],
    zh: ['静态网站', '简单网站', '着陆页', '作品集'],
    es: ['sitio estático', 'sitio web simple', 'página de destino'],
    fr: ['site statique', 'site web simple', 'page de destination'],
    de: ['statische Seite', 'einfache Website', 'Landingpage'],
    it: ['sito statico', 'sito web semplice', 'landing page']
  },
  dynamic: {
    en: ['login', 'fullstack', 'database', 'authentication', 'backend'],
    ko: ['로그인', '풀스택', '데이터베이스', '인증', '백엔드'],
    ja: ['ログイン', 'フルスタック', 'データベース', '認証', 'バックエンド'],
    zh: ['登录', '全栈', '数据库', '认证', '后端'],
    es: ['iniciar sesión', 'fullstack', 'base de datos', 'autenticación'],
    fr: ['connexion', 'fullstack', 'base de données', 'authentification'],
    de: ['Anmeldung', 'Fullstack', 'Datenbank', 'Authentifizierung'],
    it: ['accesso', 'fullstack', 'database', 'autenticazione']
  },
  enterprise: {
    en: ['microservices', 'kubernetes', 'k8s', 'terraform', 'architecture'],
    ko: ['마이크로서비스', '쿠버네티스', '테라폼', '아키텍처'],
    ja: ['マイクロサービス', 'クバネティス', 'テラフォーム', 'アーキテクチャ'],
    zh: ['微服务', 'kubernetes', 'terraform', '架构'],
    es: ['microservicios', 'kubernetes', 'terraform', 'arquitectura'],
    fr: ['microservices', 'kubernetes', 'terraform', 'architecture'],
    de: ['Microservices', 'Kubernetes', 'Terraform', 'Architektur'],
    it: ['microservizi', 'kubernetes', 'terraform', 'architettura']
  },
  'mobile-app': {
    en: ['mobile app', 'react native', 'flutter', 'ios', 'android'],
    ko: ['모바일 앱', '리액트 네이티브', '플러터', 'iOS', '안드로이드'],
    ja: ['モバイルアプリ', 'React Native', 'Flutter', 'iOS', 'Android'],
    zh: ['移动应用', 'React Native', 'Flutter', 'iOS', 'Android'],
    es: ['aplicación móvil', 'react native', 'flutter', 'ios', 'android'],
    fr: ['application mobile', 'react native', 'flutter', 'ios', 'android'],
    de: ['mobile App', 'React Native', 'Flutter', 'iOS', 'Android'],
    it: ['app mobile', 'react native', 'flutter', 'ios', 'android']
  },
  // v2.1.10 Sprint 7c (G-J-01): 11 skills 신규 등록 → total 15
  pdca: {
    en: ['pdca cycle', 'plan design do', 'full pdca', 'pdca workflow'],
    ko: ['pdca 사이클', '계획 설계 구현', 'pdca 진행'],
    ja: ['PDCAサイクル', '計画設計実装'],
    zh: ['pdca流程', '计划设计实施'],
    es: ['ciclo pdca', 'plan diseño implementación'],
    fr: ['cycle pdca', 'plan conception exécution'],
    de: ['pdca zyklus'],
    it: ['ciclo pdca']
  },
  'pm-discovery': {
    en: ['product discovery', 'prd', 'user research', 'feature spec', 'product plan'],
    ko: ['프로덕트 기획', '제품 발굴', '사용자 리서치', '기능 기획', '프로덕트 계획'],
    ja: ['プロダクト発見', 'ユーザーリサーチ', '機能仕様'],
    zh: ['产品发现', '用户研究', '功能规格'],
    es: ['descubrimiento de producto', 'investigación de usuario'],
    fr: ['découverte produit', 'recherche utilisateur'],
    de: ['Produktentdeckung', 'Nutzerforschung'],
    it: ['scoperta prodotto', 'ricerca utente']
  },
  'plan-plus': {
    en: ['brainstorm plan', 'deep plan', 'intent discovery', 'alternatives exploration'],
    ko: ['브레인스토밍', '심층 계획', '의도 분석', '대안 탐색'],
    ja: ['ブレインストーミング計画', '深い計画'],
    zh: ['头脑风暴计划', '深入计划'],
    es: ['lluvia de ideas plan', 'plan profundo'],
    fr: ['brainstorming plan', 'plan approfondi'],
    de: ['Brainstorming-Plan'],
    it: ['brainstorming piano']
  },
  'qa-phase': {
    en: ['run qa', 'full qa', 'test everything', 'qa phase', 'quality assurance', 'qa cycle'],
    ko: ['qa 실행', '전체 테스트', 'qa 단계', '품질 검증', 'qa 돌려', 'qa 돌려봐', 'qa 해', 'qa 사이클'],
    ja: ['QA実行', '全体テスト', 'QAを回して'],
    zh: ['执行qa', '全面测试', '运行qa'],
    es: ['ejecutar qa', 'prueba completa'],
    fr: ['exécuter qa', 'test complet'],
    de: ['QA ausführen'],
    it: ['esegui qa']
  },
  'code-review': {
    en: ['review code', 'code review', 'code quality check'],
    ko: ['코드 리뷰', '코드 검토', '코드 품질'],
    ja: ['コードレビュー'],
    zh: ['代码审查', '代码评审'],
    es: ['revisión de código'],
    fr: ['revue de code'],
    de: ['Codeüberprüfung'],
    it: ['revisione del codice']
  },
  deploy: {
    en: ['deploy', 'release', 'ship to prod', 'ship'],
    ko: ['배포', '릴리스', '프로덕션 배포', '배포해'],
    ja: ['デプロイ', 'リリース'],
    zh: ['部署', '发布'],
    es: ['desplegar', 'lanzar'],
    fr: ['déployer', 'publier'],
    de: ['bereitstellen', 'veröffentlichen'],
    it: ['distribuire', 'rilasciare']
  },
  rollback: {
    en: ['rollback', 'revert', 'undo deployment'],
    ko: ['롤백', '되돌리', '배포 취소'],
    ja: ['ロールバック', '元に戻す'],
    zh: ['回滚', '撤销'],
    es: ['revertir', 'deshacer'],
    fr: ['rollback', 'annuler'],
    de: ['zurückrollen', 'rückgängig machen'],
    it: ['rollback', 'annulla']
  },
  'skill-create': {
    en: ['create skill', 'new skill', 'build skill'],
    ko: ['스킬 생성', '새 스킬', '스킬 만들'],
    ja: ['スキル作成', '新しいスキル'],
    zh: ['创建技能', '新技能'],
    es: ['crear habilidad', 'nueva habilidad'],
    fr: ['créer compétence'],
    de: ['Fähigkeit erstellen'],
    it: ['crea abilità']
  },
  control: {
    en: ['automation level', 'control level', 'trust score', 'l0 l1 l2 l3 l4'],
    ko: ['자동화 레벨', '제어 레벨', '신뢰 점수'],
    ja: ['自動化レベル', '制御レベル'],
    zh: ['自动化级别', '控制级别'],
    es: ['nivel de automatización'],
    fr: ['niveau d\'automatisation'],
    de: ['Automatisierungsstufe'],
    it: ['livello automazione']
  },
  audit: {
    // v2.1.13 fix: typo 'err' → 'en' (관점 1-1 A1 부수 수정)
    en: ['audit log', 'decision trace', 'session history'],
    ko: ['감사 로그', '결정 추적', '세션 이력'],
    ja: ['監査ログ'],
    zh: ['审计日志'],
    es: ['registro de auditoría'],
    fr: ['journal d\'audit'],
    de: ['Audit-Log'],
    it: ['registro di controllo']
  },
  'phase-4-api': {
    en: ['api design', 'rest api', 'endpoint design', 'backend api'],
    ko: ['api 설계', '엔드포인트 설계', 'rest api 설계'],
    ja: ['API設計', 'エンドポイント設計'],
    zh: ['api 设计', '端点设计'],
    es: ['diseño api'],
    fr: ['conception api'],
    de: ['API-Design'],
    it: ['design api']
  },
  // v2.1.13 Sprint Management: sprint skill + master-plan sub-action triggers (관점 1-1 A1)
  sprint: {
    en: ['sprint', 'sprint init', 'sprint start', 'sprint status', 'sprint phase', 'master plan'],
    ko: ['스프린트', '스프린트 시작', '스프린트 상태', '스프린트 페이즈', '마스터 플랜'],
    ja: ['スプリント', 'スプリント開始', 'スプリント状態', 'マスタープラン'],
    zh: ['冲刺', '冲刺开始', '冲刺状态', '主计划', '冲刺主计划'],
    es: ['sprint', 'iniciar sprint', 'estado sprint', 'plan maestro'],
    fr: ['sprint', 'demarrer sprint', 'etat sprint', 'plan principal'],
    de: ['Sprint', 'Sprint starten', 'Sprint-Status', 'Hauptplan'],
    it: ['sprint', 'avvia sprint', 'stato sprint', 'piano principale']
  }
};

/**
 * Latin-script stopword dictionaries for language disambiguation.
 * Chosen to be language-exclusive within the 4 target languages (ES/FR/DE/IT)
 * so single-hit matches are meaningful signals.
 */
const LATIN_STOPWORDS = {
  es: ['por', 'para', 'este', 'esta', 'esto', 'pero', 'cómo', 'qué', 'muy', 'está', 'código', 'ayúdame', 'gracias'],
  fr: ['vous', 'pour', 'avec', 'sans', 'mais', 'où', 'plaît', 'aidez', 'moi', "s'il", 'déboguer', 'nous', 'avons'],
  de: ['bitte', 'hilf', 'mir', 'diesen', 'dieser', 'sein', 'ich', 'und', 'nicht', 'auch', 'mit', 'zum', 'für'],
  it: ['favore', 'aiutami', 'questo', 'questa', 'eseguire', 'sono', 'anche', 'della', 'degli', 'molto', 'ogni', 'fino']
};

/**
 * Diacritic/sequence hints. Ordered from most language-specific to general.
 */
const LATIN_DIACRITIC_HINTS = [
  { lang: 'es', re: /[ñ¿¡]/ },
  { lang: 'de', re: /[äöüß]/i },
  { lang: 'fr', re: /[çœæ]|\bs'[a-zàâäéèêëîïôöùûüÿ]/i },
  { lang: 'it', re: /\b(gli|della|dello|degli|delle)\b/i }
];

/**
 * Detect language from text
 * @param {string} text
 * @returns {string}
 */
function detectLanguage(text) {
  if (!text) return 'en';

  // Korean detection
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';

  // Japanese detection (Hiragana, Katakana)
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';

  // Chinese detection (CJK Unified Ideographs, not Korean/Japanese)
  if (/[\u4E00-\u9FFF]/.test(text) && !/[\uAC00-\uD7AF\u3040-\u30FF]/.test(text)) return 'zh';

  // Latin-script disambiguation (ES/FR/DE/IT) via stopword + diacritic scoring
  const lower = text.toLowerCase();
  const tokens = lower.split(/[^a-zàâäáãåāéèêëēíìîïīñóòôöõøœúùûüūÿçß'-]+/).filter(Boolean);
  if (tokens.length > 0) {
    const scores = { es: 0, fr: 0, de: 0, it: 0 };
    for (const token of tokens) {
      for (const lang of Object.keys(scores)) {
        if (LATIN_STOPWORDS[lang].includes(token)) scores[lang]++;
      }
    }
    for (const hint of LATIN_DIACRITIC_HINTS) {
      if (hint.re.test(lower)) scores[hint.lang]++;
    }
    let bestLang = 'en';
    let bestScore = 0;
    for (const lang of ['es', 'fr', 'de', 'it']) {
      if (scores[lang] > bestScore) {
        bestScore = scores[lang];
        bestLang = lang;
      }
    }
    // Require ≥1 hit to avoid false positives on neutral English text
    if (bestScore >= 1) return bestLang;
  }

  // Default to English
  return 'en';
}

/**
 * Get patterns for all languages combined
 * @param {Object} patternMap - Language pattern map
 * @returns {string[]}
 */
function getAllPatterns(patternMap) {
  const allPatterns = [];
  for (const lang of SUPPORTED_LANGUAGES) {
    if (patternMap[lang]) {
      allPatterns.push(...patternMap[lang]);
    }
  }
  return [...new Set(allPatterns)]; // Remove duplicates
}

/**
 * Match text against multi-language patterns
 * @param {string} text
 * @param {Object} patternMap
 * @returns {boolean}
 */
function matchMultiLangPattern(text, patternMap) {
  const lowerText = text.toLowerCase();

  for (const lang of SUPPORTED_LANGUAGES) {
    const patterns = patternMap[lang];
    if (!patterns) continue;

    for (const pattern of patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

module.exports = {
  SUPPORTED_LANGUAGES,
  AGENT_TRIGGER_PATTERNS,
  SKILL_TRIGGER_PATTERNS,
  CC_COMMAND_PATTERNS,
  detectLanguage,
  getAllPatterns,
  matchMultiLangPattern,
};
