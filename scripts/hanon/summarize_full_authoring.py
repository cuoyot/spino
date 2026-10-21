"""Read-only operational progress; intermediate stages are never clearance."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args(); root = args.root.resolve()


def read(path):
    try: return json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError): return None


def relative(path):
    try: return str(Path(path).relative_to(root))
    except ValueError: return str(path)


authoring = read(root / 'full-authoring-batch-01/authoring-batch-state.json') or {}
finishers = read(root / 'full-finishers-01/finisher-state.json') or {}
raw_batch = read(root / 'full-support-01/support-batch-state.json') or {}
manual_handoffs = read(root / 'manual-computation-handoffs.json') or {}
scheduling = {}
for process in (read(root / 'source-scheduling-01.json') or {}).get('processes', []):
    try:
        current = subprocess.check_output(['ps', '-p', str(process['pid']), '-o', 'state='], text=True).strip()
        if 'T' in current: scheduling[process['handTrack']] = process
    except subprocess.CalledProcessError: pass
scheduler_path = root / 'source-resource-scheduler-v3-state.json'
if not scheduler_path.exists(): scheduler_path = root / 'source-resource-scheduler-v2-state.json'
if not scheduler_path.exists(): scheduler_path = root / 'source-resource-scheduler-state.json'
scheduler_state = read(scheduler_path) or {}
for process in scheduler_state.get('suspended', []):
    if process.get('handTrack'): scheduling[process['handTrack']] = process
result = {'updatedUtcEpoch': time.time(), 'productionReady': False,
          'meaning': 'Per-hand operational stages. Raw support selection and candidate routes are intermediate. Only a fresh unpatched all-five-finger scan can clear numerical placement; independent paired native/motion/visual review remains necessary before production export.',
          'rawSupportBatchStatus': raw_batch.get('status'), 'exercises': {}}
for number in range(2, 11):
    exercise = {'hands': {}, 'pairedNativeReview': 'Pending'}
    for side in ('left', 'right'):
        key = f'{number}:{side}'; row = {'stage': 'Original full source prepared; support selection/context review pending',
                                       'productionReady': False, 'unresolvedContexts': []}
        raw = root / f'full-support-01/hanon-{number:02d}/{side}-event-depth-plan.json'
        raw_plan = read(raw)
        if raw_plan:
            row['rawSupport'] = {'report': relative(raw), 'events': len(raw_plan['events']),
                                 'correctedEvents': raw_plan['corrected_events'],
                                 'unresolvedEvents': [{'first': e['first'] + 1, 'last': e['last'] + 1,
                                                       'finger': e['finger'], 'note': e['note']} for e in raw_plan['failures']]}
            row['unresolvedContexts'] = [{'kind': 'Lane-limited support', **e} for e in row['rawSupport']['unresolvedEvents']]
            row['stage'] = 'Lane-limited scored support requires measured context' if raw_plan['failures'] else 'Scored supports selected; free routes and fresh full scan queued'
        else:
            raw_error = next((e for e in raw_batch.get('completed', []) if e['number'] == number and e['hand'] == side), {})
            if raw_error:
                row['rawSupport'] = {'status': raw_error.get('status'), 'log': raw_error.get('log')}
                row['unresolvedContexts'] = [{'kind': 'Original support solver exception', 'log': raw_error.get('log')}]
                row['stage'] = 'Support solver exception requires actual free/held reach review'
        if number == 2:
            selected = root / (f'full-support-02/hanon-02/{side}-event-depth-plan.json' if side == 'left'
                               else f'full-support-01/hanon-02/{side}-event-depth-plan.json')
            plans = [selected]
        else:
            base = root / f'full-authoring-batch-01/hanon-{number:02d}/{side}'
            plans = sorted(base.glob(f'*/{side}-event-depth-plan.json'), key=lambda p: p.stat().st_mtime)
            plans += sorted(root.glob(f'full-pipeline-*/hanon-{number:02d}/{side}/support-01/{side}-event-depth-plan.json'),
                            key=lambda p: p.stat().st_mtime)
        for path in plans:
            plan = read(path)
            if plan:
                row['currentScoredSupports'] = {'report': relative(path), 'events': len(plan['events']),
                                               'unresolved': len(plan['failures'])}
                row['unresolvedContexts'] = [{'kind': 'Lane-limited support', 'first': e['first'] + 1,
                                               'last': e['last'] + 1, 'finger': e['finger'], 'note': e['note']}
                                              for e in plan['failures']]
        diagnostics = [root / f'full-authoring-batch-01/hanon-{number:02d}/{side}/clearance-diagnostic-01/{side}-clearance-diagnostic.json']
        diagnostics += sorted(root.glob(f'full-pipeline-*/hanon-{number:02d}/{side}/diagnostic-01/{side}-clearance-diagnostic.json'),
                              key=lambda p: p.stat().st_mtime)
        for path in diagnostics:
            diagnostic = read(path)
            if diagnostic:
                row['beforeFreeRoutesDiagnostic'] = {'report': relative(path),
                    'meaning': 'Historical input to free routing; these counts do not describe later corrected poses',
                    'inputSha256': diagnostic['source_input_sha256'],
                    'selfCrossingFrames': len(diagnostic['self_crossings']),
                    'byFinger': dict(collections.Counter(str(f) for sample in diagnostic['self_crossings'] for f in sample['crossings'])),
                    'keyReachFailures': len(diagnostic['physics_failures'])}
        active = authoring.get('active', {}).get(key)
        if active: row['stage'] = active['stage']; row['activeCommand'] = active
        problem = next((e for e in authoring.get('openFailures', []) if e['number'] == number and e['hand'] == side), None)
        if problem: row['stage'] = 'Physical source context remains open'; row['unresolvedContexts'].append(problem)
        if number == 3 and side == 'right':
            continuation = read(root / 'no3-right-computation-handoff.json')
            if continuation:
                row['historicalSupersededFailure'] = problem
                row['unresolvedContexts'] = []
                row['stage'] = 'Preserved neighbour vectors rechecked; measured family continuation running'
                row['manualContinuation'] = {'handoff': 'no3-right-computation-handoff.json',
                                              'log': 'full-gaps-03-right-02.log',
                                              'then': 'no3-right-pipeline-queue-02.json'}
        continuation = manual_handoffs.get(key)
        if continuation:
            row['historicalSupersededFailure'] = problem
            row['unresolvedContexts'] = [e for e in row['unresolvedContexts'] if e is not problem]
            row['stage'] = continuation['stage']; row['manualContinuation'] = continuation
            stage_state = read(root / continuation['state']) if continuation.get('state') else None
            if stage_state:
                row['stage'] = stage_state['status']
                if stage_state.get('active'): row['activeCommand'] = stage_state['active']
                if stage_state['status'].startswith('Incomplete'):
                    row['unresolvedContexts'].append({'kind': 'Staged neighbour physical context',
                                                      'state': continuation['state'], 'error': stage_state.get('error')})
            gap_plan = read(root / continuation['gapPlan']) if continuation.get('gapPlan') else None
            if gap_plan and gap_plan.get('failures'):
                row['stage'] = 'Measured free-neighbour physical context remains open'
                row['unresolvedContexts'].append({'kind': 'Gap-family physical context', 'report': continuation['gapPlan'],
                                                  'failures': gap_plan['failures']})
        finished_gap = next((e for e in authoring.get('completed', []) if e['number'] == number and e['hand'] == side), None)
        if finished_gap:
            row['stage'] = finished_gap['status']; row['currentInput'] = finished_gap['input']
        active = finishers.get('active', {}).get(key)
        if active and active['stage'] != 'waiting-for-neighbour-preparation':
            row['stage'] = active['stage']; row['activeCommand'] = active
        pipelines = sorted(root.glob(f'full-pipeline-*/hanon-{number:02d}/{side}/hand-pipeline-state.json'),
                           key=lambda p: p.stat().st_mtime)
        pipelines.append(root / f'full-finishers-01/hanon-{number:02d}/{side}/hand-pipeline-state.json')
        if number == 2: pipelines.append(root / f'full-native-pairs-02/hanon-02/{side}/hand-pipeline-state.json')
        pipelines = sorted([path for path in pipelines if path.exists()], key=lambda p: p.stat().st_mtime)
        current_pipeline = None
        for path in pipelines:
            pipeline = read(path)
            if not pipeline: continue
            current_pipeline = path
            row['pipeline'] = relative(path); row['stage'] = pipeline['status']
            row.pop('activeCommand', None)
            if pipeline.get('active'): row['activeCommand'] = pipeline['active']
            if '/full-pipeline-' in str(path) and pipeline.get('steps', [{}])[0].get('returncode') == 0:
                row['historicalSupersededFailure'] = problem
                row['unresolvedContexts'] = []
            if pipeline['status'].startswith(('Physical', 'Actual')):
                row['unresolvedContexts'].append({'kind': 'Pipeline physical stage stopped', 'state': relative(path)})
        thumb_plans = [root / f'full-thumb-01/hanon-02/{side}-thumb-plan.json'] if number == 2 else []
        thumb_plans += [path.parent / 'thumb-01' / f'{side}-thumb-plan.json' for path in pipelines]
        for path in thumb_plans:
            plan = read(path)
            if plan:
                entry = {'report': relative(path), 'status': plan['status'],
                         'windows': len(plan['windows']), 'failures': plan['failures']}
                current = number == 2 or (current_pipeline is not None and path.parent.parent == current_pipeline.parent)
                if current:
                    row['thumbRoute'] = entry
                    if plan['failures']: row['unresolvedContexts'].append({'kind': 'CMC/prepared-thumb context', 'report': relative(path), 'failures': plan['failures']})
                elif plan['failures']:
                    row.setdefault('historicalSupersededThumbFailures', []).append(entry)
        final_paths = [path.parent / 'fresh-final-01' / f'{side}-full-scan.json' for path in pipelines]
        for path in final_paths:
            scan = read(path)
            if not scan: continue
            errors = {name: len(scan[name]) for name in ('physics_failures', 'self_crossings', 'support_failures')}
            passed = scan.get('fresh_scan_without_search_cache') is True and scan['finger_checks'] == 14400 and not any(errors.values())
            row['freshFinalScan'] = {'report': relative(path), 'complete': scan.get('fresh_scan_without_search_cache') is True,
                                      'passed': passed, 'fingerStates': scan['finger_checks'], 'errors': errors,
                                      'inputSha256': scan['input_sha256'], 'solutionsSha256': scan['solution_cache_sha256'],
                                      'canonicalErrors': scan.get('canonical_note_and_fingering_errors'),
                                      'maximumIkResidualM': scan['maximum_ik_residual_m'],
                                      'minimumIdleClearanceM': scan['minimum_idle_actual_key_clearance_m']}
            if passed:
                row['stage'] = 'Fresh numerical five-finger clearance passed; paired native/visual review pending'
                row['unresolvedContexts'] = []; row['finalDirectory'] = relative(path.parent)
        if number == 2 and 'thumbRoute' not in row:
            checkpoint = read(root / f'full-thumb-01/hanon-02/{side}-thumb-checkpoint.json')
            if checkpoint:
                row['stage'] = 'Measured CMC routing in progress'
                row['thumbCheckpoint'] = {'report': f'full-thumb-01/hanon-02/{side}-thumb-checkpoint.json',
                                          'completedWindows': len(checkpoint['windows']),
                                          'lastCompletedFrame': checkpoint['windows'][-1]['last_frame'] if checkpoint['windows'] else None,
                                          'failures': checkpoint['failures']}
        if continuation and continuation.get('state'):
            staged_path = root / continuation['state']
            staged = read(staged_path)
            newer_than_pipeline = current_pipeline is None or (staged_path.exists() and staged_path.stat().st_mtime > current_pipeline.stat().st_mtime)
            if staged and newer_than_pipeline and not row.get('freshFinalScan', {}).get('passed'):
                row['stage'] = staged['status']
                if staged.get('active'): row['activeCommand'] = staged['active']
        if key in scheduling:
            row['executionScheduling'] = {'status': 'Temporarily suspended for host resource management; task and saved source remain intact',
                                           'pid': scheduling[key]['pid'], 'evidence': scheduler_path.name if scheduler_state else 'source-scheduling-01.json',
                                           'resumption': 'Staged resumption after another numeric producer finishes or root confirms headroom'}
        exercise['hands'][side] = row
    passed_path = root / f'passed-hanon-{number:02d}.json'
    passed = read(passed_path)
    if passed and passed.get('productionReady') is True:
        audit_entry = passed.get('nativeAudit', {})
        audit_path = Path(audit_entry.get('path', ''))
        audit = read(audit_path) if audit_path.is_file() else None
        bound = audit is not None and hashlib.sha256(audit_path.read_bytes()).hexdigest() == audit_entry.get('sha256')
        bound = bound and audit.get('passed') is True and audit.get('nativeFrames') == 2880
        bound = bound and all(exercise['hands'][side].get('freshFinalScan', {}).get('inputSha256') ==
                              audit.get('hands', {}).get(side, {}).get('inputSha256') for side in ('left', 'right'))
        if bound:
            exercise['pairedNativeReview'] = 'Independent native source gate passed; compressed-bank/runtime/package/publication checks remain separate'
            exercise['sourceGate'] = {'passed': True, 'manifest': relative(passed_path),
                                      'nativeAudit': relative(audit_path), 'nativeAuditSha256': audit_entry['sha256']}
            for row in exercise['hands'].values():
                row['stage'] = 'Native source gate passed; compressed-bank/runtime review pending'
    result['exercises'][str(number)] = exercise
result['freshNumericalHandsPassed'] = sum(hand.get('freshFinalScan', {}).get('passed', False)
                                        for exercise in result['exercises'].values() for hand in exercise['hands'].values())
args.output.parent.mkdir(parents=True, exist_ok=True)
temporary = args.output.with_suffix('.json.tmp'); temporary.write_text(json.dumps(result, indent=2) + '\n'); temporary.replace(args.output)
print(json.dumps({'freshNumericalHandsPassed': result['freshNumericalHandsPassed'],
                  'stages': {number: {side: hand['stage'] for side, hand in exercise['hands'].items()}
                             for number, exercise in result['exercises'].items()}}, indent=2))
